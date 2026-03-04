import Foundation
import Speech
import NaturalLanguage

// MARK: - VetoVoicemailModule
//
// Native bridge module that provides on-device voicemail transcription and
// AI-powered spam classification to React Native.
//
// All processing is performed entirely on-device using Apple's Speech framework
// (SFSpeechRecognizer) and NaturalLanguage framework (NLTagger).
// No audio data, transcripts, or analysis results ever leave the device.
//
// React Native API:
//   transcribeAndClassify(audioFileURL: String) -> Promise<VoicemailAnalysis>
//   getScreenedCalls()                          -> Promise<[ScreenedCall]>
//   markCallHandled(callId: String, action: String) -> Promise<Bool>
//   deleteScreenedCall(callId: String)          -> Promise<Bool>

@objc(VetoVoicemailModule)
class VetoVoicemailModule: NSObject {

    // MARK: - App Group
    private let appGroupID = "group.com.kacicalvaresi.veto"
    private var sharedDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupID)
    }

    // MARK: - Storage Keys
    private let screenedCallsKey = "veto_screened_calls"

    // MARK: - React Native
    @objc static func requiresMainQueueSetup() -> Bool { false }

    // MARK: - Transcribe & Classify
    //
    // Transcribes an audio file and classifies the transcript using on-device NLP.
    // Returns a dictionary with:
    //   transcript     : String
    //   summary        : String   (one-sentence human-readable summary)
    //   classification : String   ("spam" | "likely_spam" | "legitimate" | "unknown")
    //   confidence     : Double   (0.0 – 1.0)
    //   detectedIntent : String   (e.g. "appointment", "delivery", "sales", "scam")
    //   keywords       : [String]

    @objc func transcribeAndClassify(
        _ audioFileURL: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard SFSpeechRecognizer.authorizationStatus() == .authorized else {
            rejecter("PERMISSION_DENIED",
                     "Speech recognition permission not granted. Please enable it in Settings.",
                     nil)
            return
        }

        guard let url = URL(string: audioFileURL) else {
            rejecter("INVALID_URL", "Invalid audio file URL: \(audioFileURL)", nil)
            return
        }

        let recognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        guard let recognizer, recognizer.isAvailable else {
            rejecter("RECOGNIZER_UNAVAILABLE",
                     "On-device speech recognizer is not available.",
                     nil)
            return
        }

        let request = SFSpeechURLRecognitionRequest(url: url)
        // Force on-device processing — no data leaves the phone
        request.requiresOnDeviceRecognition = true
        request.shouldReportPartialResults  = false

        recognizer.recognitionTask(with: request) { [weak self] result, error in
            guard let self else { return }

            if let error {
                rejecter("TRANSCRIPTION_ERROR", error.localizedDescription, error)
                return
            }

            guard let result, result.isFinal else { return }

            let transcript = result.bestTranscription.formattedString
            let analysis   = self.classifyTranscript(transcript)

            resolver([
                "transcript"     : transcript,
                "summary"        : analysis.summary,
                "classification" : analysis.classification,
                "confidence"     : analysis.confidence,
                "detectedIntent" : analysis.detectedIntent,
                "keywords"       : analysis.keywords,
            ])
        }
    }

    // MARK: - Request Speech Permission
    @objc func requestSpeechPermission(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        SFSpeechRecognizer.requestAuthorization { status in
            switch status {
            case .authorized:
                resolver("authorized")
            case .denied:
                resolver("denied")
            case .restricted:
                resolver("restricted")
            case .notDetermined:
                resolver("notDetermined")
            @unknown default:
                resolver("unknown")
            }
        }
    }

    // MARK: - Screened Calls Store
    //
    // Screened calls are stored as JSON in the App Group UserDefaults so they
    // are accessible from both the main app and any future extensions.

    @objc func saveScreenedCall(
        _ callData: NSDictionary,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group", nil)
            return
        }

        var calls = defaults.array(forKey: screenedCallsKey) as? [[String: Any]] ?? []

        // Build entry — ensure required fields are present
        var entry = callData as? [String: Any] ?? [:]
        if entry["id"] == nil {
            entry["id"] = UUID().uuidString
        }
        if entry["screenedAt"] == nil {
            entry["screenedAt"] = ISO8601DateFormatter().string(from: Date())
        }
        if entry["action"] == nil {
            entry["action"] = "pending"
        }

        calls.insert(entry, at: 0) // newest first
        // Keep last 100 screened calls
        if calls.count > 100 { calls = Array(calls.prefix(100)) }

        defaults.set(calls, forKey: screenedCallsKey)
        resolver(entry["id"] ?? "")
    }

    @objc func getScreenedCalls(
        _ resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            resolver([])
            return
        }
        let calls = defaults.array(forKey: screenedCallsKey) as? [[String: Any]] ?? []
        resolver(calls)
    }

    @objc func markCallHandled(
        _ callId: String,
        action: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group", nil)
            return
        }

        var calls = defaults.array(forKey: screenedCallsKey) as? [[String: Any]] ?? []
        if let idx = calls.firstIndex(where: { ($0["id"] as? String) == callId }) {
            calls[idx]["action"]     = action
            calls[idx]["handledAt"]  = ISO8601DateFormatter().string(from: Date())
            defaults.set(calls, forKey: screenedCallsKey)
            resolver(true)
        } else {
            rejecter("NOT_FOUND", "Screened call not found: \(callId)", nil)
        }
    }

    @objc func deleteScreenedCall(
        _ callId: String,
        resolver: @escaping RCTPromiseResolveBlock,
        rejecter: @escaping RCTPromiseRejectBlock
    ) {
        guard let defaults = sharedDefaults else {
            rejecter("APP_GROUP_ERROR", "Could not access App Group", nil)
            return
        }

        var calls = defaults.array(forKey: screenedCallsKey) as? [[String: Any]] ?? []
        calls.removeAll { ($0["id"] as? String) == callId }
        defaults.set(calls, forKey: screenedCallsKey)
        resolver(true)
    }

    // MARK: - On-Device NLP Classification

    private struct TranscriptAnalysis {
        let summary        : String
        let classification : String   // "spam" | "likely_spam" | "legitimate" | "unknown"
        let confidence     : Double
        let detectedIntent : String
        let keywords       : [String]
    }

    private func classifyTranscript(_ transcript: String) -> TranscriptAnalysis {
        let lower = transcript.lowercased()

        // ── Keyword signal tables ─────────────────────────────────────────────

        // Strong spam / scam signals
        let spamSignals: [(pattern: String, weight: Double)] = [
            ("irs", 0.9), ("tax", 0.6), ("warrant", 0.9), ("arrest", 0.9),
            ("social security", 0.9), ("suspended", 0.8), ("legal action", 0.9),
            ("lawsuit", 0.8), ("final notice", 0.8), ("last chance", 0.7),
            ("credit card", 0.6), ("debt", 0.6), ("loan", 0.5),
            ("prize", 0.8), ("winner", 0.8), ("congratulations", 0.6),
            ("free vacation", 0.9), ("claim your", 0.7),
            ("press 1", 0.9), ("press 2", 0.9), ("press 9", 0.9),
            ("do not hang up", 0.9), ("important message", 0.5),
            ("vehicle warranty", 0.9), ("extended warranty", 0.9),
            ("medicare", 0.7), ("insurance", 0.5),
            ("bitcoin", 0.8), ("crypto", 0.7), ("investment", 0.5),
            ("reduce your", 0.6), ("lower your", 0.6),
        ]

        // Legitimate caller signals
        let legitimateSignals: [(pattern: String, weight: Double)] = [
            ("doctor", 0.8), ("dr.", 0.8), ("clinic", 0.8), ("hospital", 0.8),
            ("appointment", 0.9), ("prescription", 0.8), ("pharmacy", 0.8),
            ("dentist", 0.8), ("office", 0.5),
            ("delivery", 0.7), ("package", 0.7), ("ups", 0.7), ("fedex", 0.7),
            ("usps", 0.7), ("order", 0.5),
            ("contractor", 0.7), ("plumber", 0.7), ("electrician", 0.7),
            ("estimate", 0.6), ("quote", 0.5),
            ("school", 0.8), ("teacher", 0.8), ("principal", 0.8),
            ("neighbor", 0.7), ("calling back", 0.6), ("returning your call", 0.7),
        ]

        // ── Score calculation ─────────────────────────────────────────────────
        var spamScore      = 0.0
        var legitimateScore = 0.0
        var matchedSpam    = [String]()
        var matchedLegit   = [String]()

        for signal in spamSignals {
            if lower.contains(signal.pattern) {
                spamScore += signal.weight
                matchedSpam.append(signal.pattern)
            }
        }
        for signal in legitimateSignals {
            if lower.contains(signal.pattern) {
                legitimateScore += signal.weight
                matchedLegit.append(signal.pattern)
            }
        }

        // Empty voicemail is a strong spam signal (robocalls rarely leave messages)
        if transcript.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            return TranscriptAnalysis(
                summary        : "Caller left no message.",
                classification : "spam",
                confidence     : 0.85,
                detectedIntent : "robocall",
                keywords       : []
            )
        }

        // ── Determine intent ──────────────────────────────────────────────────
        let intent: String
        if matchedLegit.contains("appointment") || matchedLegit.contains("doctor") {
            intent = "appointment"
        } else if matchedLegit.contains("delivery") || matchedLegit.contains("package") {
            intent = "delivery"
        } else if matchedLegit.contains("school") || matchedLegit.contains("teacher") {
            intent = "school"
        } else if matchedLegit.contains("contractor") || matchedLegit.contains("estimate") {
            intent = "contractor"
        } else if !matchedSpam.isEmpty {
            intent = "sales_or_scam"
        } else {
            intent = "unknown"
        }

        // ── Classification ────────────────────────────────────────────────────
        let netScore    = spamScore - legitimateScore
        let totalSignal = spamScore + legitimateScore

        let classification: String
        let confidence    : Double

        if totalSignal == 0 {
            classification = "unknown"
            confidence     = 0.5
        } else if netScore >= 1.5 {
            classification = "spam"
            confidence     = min(0.95, 0.6 + netScore * 0.1)
        } else if netScore >= 0.5 {
            classification = "likely_spam"
            confidence     = min(0.85, 0.5 + netScore * 0.1)
        } else if netScore <= -0.5 {
            classification = "legitimate"
            confidence     = min(0.95, 0.6 + (-netScore) * 0.1)
        } else {
            classification = "unknown"
            confidence     = 0.5
        }

        // ── NaturalLanguage entity extraction for summary ─────────────────────
        let tagger = NLTagger(tagSchemes: [.nameType])
        tagger.string = transcript
        var namedEntities = [String]()
        tagger.enumerateTags(in: transcript.startIndex..<transcript.endIndex,
                             unit: .word,
                             scheme: .nameType,
                             options: [.omitWhitespace, .omitPunctuation, .joinNames]) { tag, range in
            if let tag, [.personalName, .organizationName, .placeName].contains(tag) {
                namedEntities.append(String(transcript[range]))
            }
            return true
        }

        // ── Build human-readable summary ──────────────────────────────────────
        let summary: String
        let shortTranscript = transcript.prefix(120)
        switch classification {
        case "spam":
            summary = "Possible spam call. Caller said: \"\(shortTranscript)\""
        case "likely_spam":
            summary = "Possibly unwanted call. Caller said: \"\(shortTranscript)\""
        case "legitimate":
            if intent == "appointment" {
                summary = "Possible appointment reminder. Caller said: \"\(shortTranscript)\""
            } else if intent == "delivery" {
                summary = "Possible delivery notification. Caller said: \"\(shortTranscript)\""
            } else {
                summary = "Likely legitimate call. Caller said: \"\(shortTranscript)\""
            }
        default:
            summary = "Unknown caller. Message: \"\(shortTranscript)\""
        }

        let allKeywords = Array(Set(matchedSpam + matchedLegit + namedEntities)).prefix(10)

        return TranscriptAnalysis(
            summary        : summary,
            classification : classification,
            confidence     : confidence,
            detectedIntent : intent,
            keywords       : Array(allKeywords)
        )
    }
}
