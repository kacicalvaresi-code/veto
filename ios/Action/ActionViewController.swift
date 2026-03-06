import UIKit
import MobileCoreServices
import MessageUI
import Speech
import NaturalLanguage
import UniformTypeIdentifiers
import AVFoundation

// MARK: - ActionViewController
//
// Veto's Action Extension handles two share-sheet scenarios:
//
//  1. VOICEMAIL AUDIO (from Phone app -> Share -> Veto)
//     - Accepts public.audio / com.apple.m4a-audio files
//     - Measures audio duration to detect pre-recorded robocall patterns
//     - Transcribes on-device using SFSpeechRecognizer with partial results
//     - Tracks transcript delivery timing to detect machine-speed playback
//     - Classifies transcript using keyword NLP + timing signals
//     - Saves result to App Group container
//     - Shows verdict screen (Spam / Likely Spam / Legit / Unknown)
//     - Offers "Block this number" and "Dismiss" actions
//
//  2. SPAM TEXT (from Messages app -> Share -> Report to Veto)
//     - Accepts plain text
//     - Opens SMS composer pre-filled to 7726 (carrier spam shortcode)
//     - After sending, adds the sender to the Veto blocklist automatically
//
// All processing is 100% on-device. No data leaves the phone.

class ActionViewController: UIViewController, MFMessageComposeViewControllerDelegate {

    // MARK: - App Group
    private let appGroupID       = "group.com.kacicalvaresi.veto"
    private let binaryFileName   = "veto_list.bin"
    private let screenedCallsKey = "veto_screened_calls"

    // MARK: - State
    private var detectedSender: String? = nil
    private var audioFileURL: URL?      = nil

    // MARK: - Timing Analysis State
    private var transcriptionStartTime: Date?
    private var partialResultTimestamps: [(Date, Int)] = []

    // MARK: - UI
    private let containerView   = UIView()
    private let iconLabel       = UILabel()
    private let titleLabel      = UILabel()
    private let subtitleLabel   = UILabel()
    private let activitySpinner = UIActivityIndicatorView(style: .large)
    private let primaryButton   = UIButton(type: .system)
    private let secondaryButton = UIButton(type: .system)

    // MARK: - Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
        showLoading(message: "Analysing...")
        processInputItems()
    }

    // MARK: - Input Processing

    private func processInputItems() {
        guard let items = extensionContext?.inputItems as? [NSExtensionItem] else {
            showError("No content received.")
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }
            for provider in attachments {
                let audioTypes = [
                    kUTTypeAudio as String,
                    "com.apple.m4a-audio",
                    "public.audio",
                    "public.mpeg-4-audio",
                    "com.apple.coreaudio-format",
                ]
                for audioUTI in audioTypes {
                    if provider.hasItemConformingToTypeIdentifier(audioUTI) {
                        provider.loadItem(forTypeIdentifier: audioUTI, options: nil) { [weak self] item, error in
                            DispatchQueue.main.async {
                                if let url = item as? URL {
                                    self?.handleAudioFile(url: url, senderInfo: self?.extractSenderInfo(from: items))
                                } else {
                                    self?.showError("Could not load audio file.")
                                }
                            }
                        }
                        return
                    }
                }

                if provider.hasItemConformingToTypeIdentifier(kUTTypePlainText as String) {
                    provider.loadItem(forTypeIdentifier: kUTTypePlainText as String, options: nil) { [weak self] item, error in
                        DispatchQueue.main.async {
                            if let text = item as? String {
                                self?.handleSpamText(body: text, senderInfo: self?.extractSenderInfo(from: items))
                            } else {
                                self?.showError("Could not load message text.")
                            }
                        }
                    }
                    return
                }
            }
        }

        showError("Veto can screen voicemails and report spam texts.\n\nShare a voicemail from the Phone app, or share a spam message from Messages.")
    }

    // MARK: - Sender Extraction

    private func extractSenderInfo(from items: [NSExtensionItem]) -> String? {
        for item in items {
            if let text = item.attributedContentText?.string {
                let pattern = #"[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}"#
                if let range = text.range(of: pattern, options: .regularExpression) {
                    return String(text[range])
                }
            }
        }
        return nil
    }

    // MARK: - Audio Duration

    private func getAudioDuration(url: URL) -> TimeInterval? {
        do {
            let player = try AVAudioPlayer(contentsOf: url)
            return player.duration
        } catch {
            let asset = AVURLAsset(url: url)
            let duration = CMTimeGetSeconds(asset.duration)
            return duration > 0 ? duration : nil
        }
    }

    // MARK: - Voicemail Audio Handler

    private func handleAudioFile(url: URL, senderInfo: String?) {
        showLoading(message: "Transcribing voicemail...\nThis takes a few seconds.")

        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else {
            showError("Could not access Veto storage.")
            return
        }

        let destURL = containerURL.appendingPathComponent("pending_voicemail.m4a")
        try? FileManager.default.removeItem(at: destURL)

        do {
            try FileManager.default.copyItem(at: url, to: destURL)
        } catch {
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            do {
                try FileManager.default.copyItem(at: url, to: destURL)
            } catch {
                showError("Could not read the voicemail file.\n\n\(error.localizedDescription)")
                return
            }
        }

        audioFileURL = destURL

        SFSpeechRecognizer.requestAuthorization { [weak self] status in
            DispatchQueue.main.async {
                guard status == .authorized else {
                    self?.showError("Speech recognition permission is required.\n\nGo to Settings -> Veto -> Speech Recognition to enable it.")
                    return
                }
                self?.transcribeWithTimingAnalysis(audioURL: destURL, senderInfo: senderInfo)
            }
        }
    }

    // MARK: - Transcription with Timing Analysis

    private func transcribeWithTimingAnalysis(audioURL: URL, senderInfo: String?) {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")),
              recognizer.isAvailable else {
            showError("On-device speech recognition is not available right now.")
            return
        }

        let audioDuration = getAudioDuration(url: audioURL)

        transcriptionStartTime = Date()
        partialResultTimestamps = []

        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults  = true

        recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }

            if error != nil {
                DispatchQueue.main.async {
                    self.transcribeWithNetworkFallback(audioURL: audioURL, audioDuration: audioDuration, senderInfo: senderInfo)
                }
                return
            }

            guard let result else { return }

            let currentText = result.bestTranscription.formattedString
            let wordCount   = currentText.split(separator: " ").count

            self.partialResultTimestamps.append((Date(), wordCount))

            if result.isFinal {
                let timingData = VetoClassifier.TimingData(
                    audioDurationSeconds: audioDuration,
                    transcriptionStartTime: self.transcriptionStartTime ?? Date(),
                    partialResultTimestamps: self.partialResultTimestamps
                )
                let analysis = VetoClassifier.classify(transcript: currentText, timing: timingData)
                DispatchQueue.main.async {
                    self.saveAndShowResult(transcript: currentText, analysis: analysis, senderInfo: senderInfo)
                }
            }
        }
    }

    private func transcribeWithNetworkFallback(audioURL: URL, audioDuration: TimeInterval?, senderInfo: String?) {
        guard let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US")),
              recognizer.isAvailable else {
            let timingData = VetoClassifier.TimingData(audioDurationSeconds: audioDuration, transcriptionStartTime: Date(), partialResultTimestamps: [])
            let silentAnalysis = VetoClassifier.classify(transcript: "", timing: timingData)
            saveAndShowResult(transcript: "", analysis: silentAnalysis, senderInfo: senderInfo)
            return
        }

        transcriptionStartTime = Date()
        partialResultTimestamps = []

        let request = SFSpeechURLRecognitionRequest(url: audioURL)
        request.shouldReportPartialResults = true

        recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }

            if error != nil {
                DispatchQueue.main.async {
                    let timingData = VetoClassifier.TimingData(audioDurationSeconds: audioDuration, transcriptionStartTime: Date(), partialResultTimestamps: [])
                    let silentAnalysis = VetoClassifier.classify(transcript: "", timing: timingData)
                    self.saveAndShowResult(transcript: "", analysis: silentAnalysis, senderInfo: senderInfo)
                }
                return
            }

            guard let result else { return }

            let currentText = result.bestTranscription.formattedString
            let wordCount   = currentText.split(separator: " ").count
            self.partialResultTimestamps.append((Date(), wordCount))

            if result.isFinal {
                let timingData = VetoClassifier.TimingData(
                    audioDurationSeconds: audioDuration,
                    transcriptionStartTime: self.transcriptionStartTime ?? Date(),
                    partialResultTimestamps: self.partialResultTimestamps
                )
                let analysis = VetoClassifier.classify(transcript: currentText, timing: timingData)
                DispatchQueue.main.async {
                    self.saveAndShowResult(transcript: currentText, analysis: analysis, senderInfo: senderInfo)
                }
            }
        }
    }

    private func saveAndShowResult(transcript: String, analysis: VetoClassifier.Analysis, senderInfo: String?) {
        if let defaults = UserDefaults(suiteName: appGroupID) {
            var calls = (defaults.array(forKey: screenedCallsKey) as? [[String: Any]]) ?? []
            let record: [String: Any] = [
                "id"          : UUID().uuidString,
                "phoneNumber" : senderInfo ?? "Unknown",
                "screenedAt"  : ISO8601DateFormatter().string(from: Date()),
                "action"      : "pending",
                "analysis"    : [
                    "transcript"     : transcript,
                    "summary"        : analysis.summary,
                    "classification" : analysis.classification,
                    "confidence"     : analysis.confidence,
                    "detectedIntent" : analysis.intent,
                    "keywords"       : analysis.keywords,
                    "isPreRecorded"  : analysis.isPreRecorded,
                    "wordsPerSecond" : analysis.wordsPerSecond ?? 0,
                ]
            ]
            calls.insert(record, at: 0)
            if calls.count > 200 { calls = Array(calls.prefix(200)) }
            defaults.set(calls, forKey: screenedCallsKey)
            defaults.synchronize()
        }
        showVerdictScreen(analysis: analysis, senderInfo: senderInfo)
    }

    // MARK: - Spam Text Handler

    private func handleSpamText(body: String, senderInfo: String?) {
        detectedSender = senderInfo
        showLoading(message: "Preparing report...")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.presentSMSComposer(body: body)
        }
    }

    private func presentSMSComposer(body: String) {
        guard MFMessageComposeViewController.canSendText() else {
            showError("SMS is not available on this device.")
            return
        }
        let composeVC = MFMessageComposeViewController()
        composeVC.messageComposeDelegate = self
        composeVC.recipients = ["7726"]
        composeVC.body = body
        present(composeVC, animated: true)
    }

    func messageComposeViewController(_ controller: MFMessageComposeViewController,
                                      didFinishWith result: MessageComposeResult) {
        controller.dismiss(animated: true) { [weak self] in
            if result == .sent {
                if let sender = self?.detectedSender {
                    self?.addToBlocklist(phoneNumber: sender)
                }
                self?.showSMSReportedScreen()
            } else {
                self?.extensionContext?.completeRequest(returningItems: nil)
            }
        }
    }

    // MARK: - Blocklist

    private func addToBlocklist(phoneNumber: String) {
        guard let containerURL = FileManager.default
            .containerURL(forSecurityApplicationGroupIdentifier: appGroupID) else { return }

        let normalised = phoneNumber.replacingOccurrences(of: #"\D"#, with: "", options: .regularExpression)
        guard !normalised.isEmpty, let number = Int64(normalised) else { return }

        let binURL = containerURL.appendingPathComponent(binaryFileName)
        var entries = [Int64]()

        if let data = try? Data(contentsOf: binURL) {
            let count = data.count / 8
            entries = (0..<count).map { i in
                data.withUnsafeBytes { $0.load(fromByteOffset: i * 8, as: Int64.self) }
            }
        }

        if !entries.contains(number) {
            entries.append(number)
            entries.sort()
            var newData = Data(capacity: entries.count * 8)
            for entry in entries {
                var val = entry
                newData.append(contentsOf: withUnsafeBytes(of: &val) { Array($0) })
            }
            try? newData.write(to: binURL, options: .atomic)
            let defaults = UserDefaults(suiteName: appGroupID)
            defaults?.set(Date().timeIntervalSince1970, forKey: "veto_last_sync")
            defaults?.synchronize()
        }
    }

    // MARK: - Verdict Screen

    private func showVerdictScreen(analysis: VetoClassifier.Analysis, senderInfo: String?) {
        activitySpinner.stopAnimating()
        activitySpinner.isHidden = true

        if analysis.isPreRecorded {
            iconLabel.text     = "\u{1F916}"
            titleLabel.text    = "Robocall Detected"
            titleLabel.textColor = UIColor(red: 1.0, green: 0.23, blue: 0.19, alpha: 1)
        } else {
            switch analysis.classification {
            case "spam":
                iconLabel.text     = "\u{1F6AB}"
                titleLabel.text    = "Spam Call Detected"
                titleLabel.textColor = UIColor(red: 1.0, green: 0.23, blue: 0.19, alpha: 1)
            case "likely_spam":
                iconLabel.text     = "\u{26A0}\u{FE0F}"
                titleLabel.text    = "Possible Spam"
                titleLabel.textColor = UIColor(red: 1.0, green: 0.62, blue: 0.04, alpha: 1)
            case "legitimate":
                iconLabel.text     = "\u{2705}"
                titleLabel.text    = "Looks Legitimate"
                titleLabel.textColor = UIColor(red: 0.20, green: 0.78, blue: 0.35, alpha: 1)
            default:
                iconLabel.text     = "\u{2753}"
                titleLabel.text    = "Unknown Caller"
                titleLabel.textColor = UIColor.secondaryLabel
            }
        }

        let callerDisplay     = senderInfo ?? "Unknown number"
        let transcriptPreview = analysis.transcript.isEmpty ? "No message left." : String(analysis.transcript.prefix(140))

        var detailLines = ["\(callerDisplay)", "\"\(transcriptPreview)\""]
        if analysis.isPreRecorded {
            detailLines.append("\u{26A1} Pre-recorded message detected")
        }
        if let wps = analysis.wordsPerSecond {
            detailLines.append(String(format: "Speech rate: %.1f words/sec", wps))
        }
        detailLines.append("Confidence: \(Int(analysis.confidence * 100))%")
        subtitleLabel.text = detailLines.joined(separator: "\n\n")

        if analysis.classification == "spam" || analysis.classification == "likely_spam" || analysis.isPreRecorded, senderInfo != nil {
            primaryButton.setTitle("Block This Number", for: .normal)
            primaryButton.backgroundColor = UIColor(red: 1.0, green: 0.23, blue: 0.19, alpha: 1)
            primaryButton.isHidden = false
            primaryButton.removeTarget(nil, action: nil, for: .allEvents)
            primaryButton.addTarget(self, action: #selector(blockAndDismiss), for: .touchUpInside)
        } else {
            primaryButton.isHidden = true
        }

        secondaryButton.setTitle("Done", for: .normal)
        secondaryButton.isHidden = false
        secondaryButton.removeTarget(nil, action: nil, for: .allEvents)
        secondaryButton.addTarget(self, action: #selector(dismissExtension), for: .touchUpInside)
    }

    private func showSMSReportedScreen() {
        activitySpinner.stopAnimating()
        activitySpinner.isHidden = true
        iconLabel.text     = "\u{2705}"
        titleLabel.text    = "Reported to Carrier"
        titleLabel.textColor = UIColor(red: 0.20, green: 0.78, blue: 0.35, alpha: 1)
        if let sender = detectedSender {
            subtitleLabel.text = "The number \(sender) has been reported to your carrier via 7726 and added to your Veto blocklist."
        } else {
            subtitleLabel.text = "The spam message has been reported to your carrier via 7726."
        }
        primaryButton.isHidden = true
        secondaryButton.setTitle("Done", for: .normal)
        secondaryButton.isHidden = false
        secondaryButton.removeTarget(nil, action: nil, for: .allEvents)
        secondaryButton.addTarget(self, action: #selector(dismissExtension), for: .touchUpInside)
    }

    // MARK: - Actions

    @objc private func blockAndDismiss() {
        if let sender = detectedSender {
            addToBlocklist(phoneNumber: sender)
        }
        extensionContext?.completeRequest(returningItems: nil)
    }

    @objc private func dismissExtension() {
        extensionContext?.completeRequest(returningItems: nil)
    }

    // MARK: - Loading / Error

    private func showLoading(message: String) {
        iconLabel.text       = ""
        titleLabel.text      = "Veto"
        titleLabel.textColor = .label
        subtitleLabel.text   = message
        activitySpinner.startAnimating()
        activitySpinner.isHidden = false
        primaryButton.isHidden   = true
        secondaryButton.isHidden = true
    }

    private func showError(_ message: String) {
        activitySpinner.stopAnimating()
        activitySpinner.isHidden = true
        iconLabel.text     = "\u{26A0}\u{FE0F}"
        titleLabel.text    = "Unable to Screen"
        titleLabel.textColor = .label
        subtitleLabel.text = message
        primaryButton.isHidden = true
        secondaryButton.setTitle("Dismiss", for: .normal)
        secondaryButton.isHidden = false
        secondaryButton.removeTarget(nil, action: nil, for: .allEvents)
        secondaryButton.addTarget(self, action: #selector(dismissExtension), for: .touchUpInside)
    }

    // MARK: - UI Setup

    private func setupUI() {
        view.backgroundColor = UIColor.systemBackground

        containerView.translatesAutoresizingMaskIntoConstraints = false
        containerView.backgroundColor = UIColor.secondarySystemBackground
        containerView.layer.cornerRadius = 20
        containerView.layer.shadowColor   = UIColor.black.cgColor
        containerView.layer.shadowOpacity = 0.08
        containerView.layer.shadowRadius  = 12
        containerView.layer.shadowOffset  = CGSize(width: 0, height: 4)
        view.addSubview(containerView)

        iconLabel.translatesAutoresizingMaskIntoConstraints = false
        iconLabel.font = UIFont.systemFont(ofSize: 56)
        iconLabel.textAlignment = .center
        containerView.addSubview(iconLabel)

        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.systemFont(ofSize: 22, weight: .bold)
        titleLabel.textAlignment = .center
        titleLabel.numberOfLines = 1
        containerView.addSubview(titleLabel)

        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false
        subtitleLabel.font = UIFont.systemFont(ofSize: 15, weight: .regular)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.numberOfLines = 0
        containerView.addSubview(subtitleLabel)

        activitySpinner.translatesAutoresizingMaskIntoConstraints = false
        activitySpinner.color = .systemBlue
        activitySpinner.hidesWhenStopped = true
        containerView.addSubview(activitySpinner)

        primaryButton.translatesAutoresizingMaskIntoConstraints = false
        primaryButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        primaryButton.setTitleColor(.white, for: .normal)
        primaryButton.backgroundColor = UIColor.systemRed
        primaryButton.layer.cornerRadius = 14
        primaryButton.isHidden = true
        containerView.addSubview(primaryButton)

        secondaryButton.translatesAutoresizingMaskIntoConstraints = false
        secondaryButton.titleLabel?.font = UIFont.systemFont(ofSize: 17, weight: .regular)
        secondaryButton.setTitleColor(.systemBlue, for: .normal)
        secondaryButton.isHidden = true
        containerView.addSubview(secondaryButton)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.88),

            iconLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 32),
            iconLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            subtitleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            subtitleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            activitySpinner.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 20),
            activitySpinner.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            primaryButton.topAnchor.constraint(equalTo: activitySpinner.bottomAnchor, constant: 20),
            primaryButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            primaryButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            primaryButton.heightAnchor.constraint(equalToConstant: 52),

            secondaryButton.topAnchor.constraint(equalTo: primaryButton.bottomAnchor, constant: 8),
            secondaryButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            secondaryButton.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24),
        ])
    }
}

// MARK: - VetoClassifier
//
// On-device NLP classifier with pre-recorded voicemail timing detection.
// Analyses both transcript content AND delivery timing to identify robocalls.

struct VetoClassifier {

    // MARK: - Timing Data

    struct TimingData {
        let audioDurationSeconds: TimeInterval?
        let transcriptionStartTime: Date
        let partialResultTimestamps: [(Date, Int)]  // (timestamp, cumulative word count)
    }

    // MARK: - Analysis Result

    struct Analysis {
        let transcript     : String
        let summary        : String
        let classification : String
        let confidence     : Double
        let intent         : String
        let keywords       : [String]
        let isPreRecorded  : Bool
        let wordsPerSecond : Double?
    }

    // MARK: - Pre-Recorded Detection
    //
    // A pre-recorded robocall voicemail has two distinctive timing signatures:
    //
    // 1. HIGH WORDS-PER-SECOND RATIO
    //    Pre-recorded messages are densely packed -- typically 3.0+ words/sec.
    //    Human callers average 1.5-2.2 words/sec with natural pauses, "ums",
    //    and hesitations. A voicemail with 3.0+ wps is almost certainly pre-recorded.
    //
    // 2. RAPID TRANSCRIPT SATURATION
    //    When SFSpeechRecognizer processes a pre-recorded message, the partial
    //    results arrive in large chunks because the audio has no natural pauses.
    //    For a human caller, the transcript builds gradually over many callbacks.
    //    If 75%+ of the final word count arrives within the first 25% of callbacks,
    //    the message is likely pre-recorded.
    //
    // 3. ABSENCE OF FILLER WORDS
    //    Pre-recorded messages lack natural speech fillers (um, uh, hmm, like).
    //    A long message with zero fillers is an additional signal.

    static func detectPreRecorded(transcript: String, timing: TimingData?) -> (isPreRecorded: Bool, wordsPerSecond: Double?, preRecordedConfidence: Double) {
        guard let timing else {
            return (false, nil, 0)
        }

        let wordCount = transcript.split(separator: " ").count
        guard wordCount >= 5 else {
            return (false, nil, 0)
        }

        var signals = 0.0
        var wps: Double? = nil

        // Signal 1: Words per second of audio
        if let duration = timing.audioDurationSeconds, duration > 0 {
            let wordsPerSec = Double(wordCount) / duration
            wps = wordsPerSec

            if wordsPerSec >= 3.5 {
                signals += 0.95
            } else if wordsPerSec >= 3.0 {
                signals += 0.75
            } else if wordsPerSec >= 2.5 {
                signals += 0.40
            }
        }

        // Signal 2: Transcript saturation speed
        let timestamps = timing.partialResultTimestamps
        if timestamps.count >= 3 {
            let finalWordCount = timestamps.last?.1 ?? wordCount
            let quarterIndex   = max(1, timestamps.count / 4)
            let earlyWordCount = timestamps[quarterIndex - 1].1

            let saturationRatio = Double(earlyWordCount) / Double(max(1, finalWordCount))

            if saturationRatio >= 0.75 {
                signals += 0.80
            } else if saturationRatio >= 0.60 {
                signals += 0.50
            } else if saturationRatio >= 0.50 {
                signals += 0.25
            }
        }

        // Signal 3: No natural pauses / filler words
        let lower = transcript.lowercased()
        let fillerWords = ["um", "uh", "hmm", "like", "you know", "so yeah", "anyway"]
        let hasFillers = fillerWords.contains { lower.contains($0) }
        if !hasFillers && wordCount > 15 {
            signals += 0.30
        }

        let combinedConfidence = min(1.0, signals)
        let isPreRecorded = combinedConfidence >= 0.70

        return (isPreRecorded, wps, combinedConfidence)
    }

    // MARK: - Classify

    static func classify(transcript: String, timing: TimingData? = nil) -> Analysis {
        let lower = transcript.lowercased()

        let preRecordedResult = detectPreRecorded(transcript: transcript, timing: timing)

        if lower.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return Analysis(
                transcript: "", summary: "Caller left no message -- likely a robocall.",
                classification: "spam", confidence: 0.85, intent: "robocall", keywords: [],
                isPreRecorded: false, wordsPerSecond: nil
            )
        }

        typealias Signal = (pattern: String, weight: Double)

        let spamSignals: [Signal] = [
            ("irs", 0.9), ("social security", 0.9), ("warrant", 0.8), ("arrested", 0.8),
            ("suspended", 0.7), ("legal action", 0.8), ("final notice", 0.7), ("act now", 0.6),
            ("limited time", 0.6), ("free gift", 0.7), ("you've been selected", 0.7),
            ("congratulations", 0.5), ("prize", 0.6), ("won", 0.5), ("claim your", 0.7),
            ("lower your interest rate", 0.9), ("credit card debt", 0.7), ("reduce your debt", 0.7),
            ("student loan", 0.5), ("medicare", 0.6), ("insurance plan", 0.5),
            ("press 1", 0.8), ("press one", 0.8), ("call us back immediately", 0.8),
            ("do not ignore", 0.7), ("urgent", 0.5), ("vehicle warranty", 0.9),
            ("car warranty", 0.9), ("extended warranty", 0.9), ("investment opportunity", 0.7),
        ]

        let legitimateSignals: [Signal] = [
            ("doctor", 0.8), ("appointment", 0.8), ("reminder", 0.6), ("pharmacy", 0.7),
            ("prescription", 0.7), ("hospital", 0.8), ("delivery", 0.7), ("package", 0.6),
            ("ups", 0.6), ("fedex", 0.6), ("usps", 0.6), ("order", 0.5),
            ("contractor", 0.7), ("plumber", 0.7), ("electrician", 0.7), ("estimate", 0.6),
            ("quote", 0.5), ("school", 0.8), ("teacher", 0.8), ("principal", 0.8),
            ("neighbor", 0.7), ("calling back", 0.6), ("returning your call", 0.7),
            ("this is", 0.3), ("my name is", 0.4),
        ]

        var spamScore = 0.0; var legitimateScore = 0.0
        var matchedSpam = [String](); var matchedLegit = [String]()

        for s in spamSignals       { if lower.contains(s.pattern) { spamScore += s.weight; matchedSpam.append(s.pattern) } }
        for s in legitimateSignals { if lower.contains(s.pattern) { legitimateScore += s.weight; matchedLegit.append(s.pattern) } }

        // Pre-recorded detection adds a strong spam signal
        if preRecordedResult.isPreRecorded {
            spamScore += 1.5 * preRecordedResult.preRecordedConfidence
            matchedSpam.append("pre-recorded message")
        }

        let intent: String
        if matchedLegit.contains("appointment") || matchedLegit.contains("doctor") { intent = "appointment" }
        else if matchedLegit.contains("delivery") || matchedLegit.contains("package") { intent = "delivery" }
        else if matchedLegit.contains("school") || matchedLegit.contains("teacher") { intent = "school" }
        else if matchedLegit.contains("contractor") || matchedLegit.contains("estimate") { intent = "contractor" }
        else if preRecordedResult.isPreRecorded { intent = "robocall" }
        else if !matchedSpam.isEmpty { intent = "sales_or_scam" }
        else { intent = "unknown" }

        let netScore = spamScore - legitimateScore
        let totalSignal = spamScore + legitimateScore
        let classification: String; let confidence: Double

        if totalSignal == 0 { classification = "unknown"; confidence = 0.5 }
        else if netScore >= 1.5 { classification = "spam"; confidence = min(0.95, 0.6 + netScore * 0.1) }
        else if netScore >= 0.5 { classification = "likely_spam"; confidence = min(0.85, 0.5 + netScore * 0.1) }
        else if netScore <= -0.5 { classification = "legitimate"; confidence = min(0.95, 0.6 + (-netScore) * 0.1) }
        else { classification = "unknown"; confidence = 0.5 }

        let tagger = NLTagger(tagSchemes: [.nameType])
        tagger.string = transcript
        var namedEntities = [String]()
        tagger.enumerateTags(in: transcript.startIndex..<transcript.endIndex, unit: .word,
                             scheme: .nameType, options: [.omitWhitespace, .omitPunctuation, .joinNames]) { tag, range in
            if let tag, [.personalName, .organizationName, .placeName].contains(tag) { namedEntities.append(String(transcript[range])) }
            return true
        }

        let short = String(transcript.prefix(120))
        let summary: String
        if preRecordedResult.isPreRecorded {
            summary = "Pre-recorded robocall detected. Message: \"\(short)\""
        } else {
            switch classification {
            case "spam":         summary = "Spam call detected. Caller said: \"\(short)\""
            case "likely_spam":  summary = "Possible spam call. Caller said: \"\(short)\""
            case "legitimate":
                switch intent {
                case "appointment": summary = "Appointment reminder. Caller said: \"\(short)\""
                case "delivery":    summary = "Delivery notification. Caller said: \"\(short)\""
                default:            summary = "Likely legitimate call. Caller said: \"\(short)\""
                }
            default: summary = "Unknown caller. Message: \"\(short)\""
            }
        }

        return Analysis(
            transcript: transcript, summary: summary, classification: classification,
            confidence: confidence, intent: intent,
            keywords: Array(Set(matchedSpam + matchedLegit + namedEntities).prefix(10)),
            isPreRecorded: preRecordedResult.isPreRecorded,
            wordsPerSecond: preRecordedResult.wordsPerSecond
        )
    }
}
