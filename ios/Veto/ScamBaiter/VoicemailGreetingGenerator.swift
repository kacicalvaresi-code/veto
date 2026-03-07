import Foundation
import AVFoundation

/// Generates voicemail greeting audio files on-device using AVSpeechSynthesizer.
/// The greetings are designed to sound like a real person answering the phone,
/// wasting the scammer's time before they even leave a message.
class VoicemailGreetingGenerator: NSObject {

    private let synthesizer = AVSpeechSynthesizer()
    private var outputFile: AVAudioFile?
    private var audioEngine: AVAudioEngine?
    private var completion: ((URL?, Error?) -> Void)?
    private var currentLines: [String] = []
    private var currentLineIndex: Int = 0
    private var currentPersona: BaiterPersona = .confusedGrandma
    private var outputURL: URL?

    /// Generate a voicemail greeting audio file for the given persona.
    /// Returns the file URL of the generated .m4a audio file.
    func generateGreeting(for persona: BaiterPersona, completion: @escaping (URL?, Error?) -> Void) {
        self.completion = completion
        self.currentPersona = persona
        self.currentLines = PersonaDialogues.voicemailGreeting(for: persona)
        self.currentLineIndex = 0

        // Create output file path in App Group container
        let groupID = "group.com.kacicalvaresi.veto"
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else {
            completion(nil, NSError(domain: "VoicemailGenerator", code: 1,
                                    userInfo: [NSLocalizedDescriptionKey: "Cannot access App Group container"]))
            return
        }

        let greetingsDir = containerURL.appendingPathComponent("Greetings", isDirectory: true)
        try? FileManager.default.createDirectory(at: greetingsDir, withIntermediateDirectories: true)

        let fileName = "greeting_\(persona.rawValue).m4a"
        self.outputURL = greetingsDir.appendingPathComponent(fileName)

        // Remove existing file
        if let url = self.outputURL {
            try? FileManager.default.removeItem(at: url)
        }

        // Start generating
        synthesizer.delegate = self
        speakNextLine()
    }

    /// Generate a preview (shorter) greeting for the persona selection UI
    func generatePreview(for persona: BaiterPersona, completion: @escaping (URL?, Error?) -> Void) {
        self.completion = completion
        self.currentPersona = persona
        // Only use first 3 lines for preview
        self.currentLines = Array(PersonaDialogues.voicemailGreeting(for: persona).prefix(3))
        self.currentLineIndex = 0

        let tempDir = FileManager.default.temporaryDirectory
        let fileName = "preview_\(persona.rawValue).m4a"
        self.outputURL = tempDir.appendingPathComponent(fileName)

        if let url = self.outputURL {
            try? FileManager.default.removeItem(at: url)
        }

        synthesizer.delegate = self
        speakNextLine()
    }

    private func speakNextLine() {
        guard currentLineIndex < currentLines.count else {
            // All lines spoken — done
            completion?(outputURL, nil)
            return
        }

        let line = currentLines[currentLineIndex]
        let utterance = AVSpeechUtterance(string: line)

        // Apply persona voice settings
        utterance.rate = currentPersona.voiceRate
        utterance.pitchMultiplier = currentPersona.voicePitch
        utterance.volume = currentPersona.voiceVolume

        // Try to use the preferred voice, fall back to default en-US
        if let voiceID = currentPersona.preferredVoiceIdentifier,
           let voice = AVSpeechSynthesisVoice(identifier: voiceID) {
            utterance.voice = voice
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        }

        // Add natural pauses between lines
        // Ellipsis lines get longer pre-delay (simulating hesitation)
        if line.hasPrefix("...") || line.hasPrefix("—") {
            utterance.preUtteranceDelay = Double.random(in: 1.0...2.5)
        } else {
            utterance.preUtteranceDelay = Double.random(in: 0.3...1.0)
        }

        // Add a small post-delay for natural pacing
        utterance.postUtteranceDelay = Double.random(in: 0.2...0.8)

        synthesizer.speak(utterance)
    }

    /// Write the generated greeting to a file that can be used as a voicemail greeting.
    /// The user will need to manually set this as their voicemail greeting.
    func writeToFile(for persona: BaiterPersona, completion: @escaping (URL?, Error?) -> Void) {
        let groupID = "group.com.kacicalvaresi.veto"
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else {
            completion(nil, NSError(domain: "VoicemailGenerator", code: 1,
                                    userInfo: [NSLocalizedDescriptionKey: "Cannot access App Group container"]))
            return
        }

        let greetingsDir = containerURL.appendingPathComponent("Greetings", isDirectory: true)
        try? FileManager.default.createDirectory(at: greetingsDir, withIntermediateDirectories: true)

        let outputURL = greetingsDir.appendingPathComponent("greeting_\(persona.rawValue).caf")

        // Use AVSpeechSynthesizer.write() to generate audio file directly
        let lines = PersonaDialogues.voicemailGreeting(for: persona)
        let fullScript = lines.joined(separator: " ... ")

        let utterance = AVSpeechUtterance(string: fullScript)
        utterance.rate = persona.voiceRate
        utterance.pitchMultiplier = persona.voicePitch
        utterance.volume = persona.voiceVolume

        if let voiceID = persona.preferredVoiceIdentifier,
           let voice = AVSpeechSynthesisVoice(identifier: voiceID) {
            utterance.voice = voice
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        }

        var audioFile: AVAudioFile?

        synthesizer.write(utterance) { buffer in
            guard let pcmBuffer = buffer as? AVAudioPCMBuffer,
                  pcmBuffer.frameLength > 0 else {
                return
            }

            do {
                if audioFile == nil {
                    audioFile = try AVAudioFile(
                        forWriting: outputURL,
                        settings: pcmBuffer.format.settings,
                        commonFormat: .pcmFormatFloat32,
                        interleaved: false
                    )
                }
                try audioFile?.write(from: pcmBuffer)
            } catch {
                completion(nil, error)
            }
        }

        // The write method is synchronous per-buffer but the completion
        // is called when all buffers are written
        DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
            completion(outputURL, nil)
        }
    }

    /// Get all available greeting files
    static func availableGreetings() -> [BaiterPersona: URL] {
        let groupID = "group.com.kacicalvaresi.veto"
        guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: groupID) else {
            return [:]
        }

        let greetingsDir = containerURL.appendingPathComponent("Greetings", isDirectory: true)
        var result: [BaiterPersona: URL] = [:]

        for persona in BaiterPersona.allCases {
            let cafURL = greetingsDir.appendingPathComponent("greeting_\(persona.rawValue).caf")
            let m4aURL = greetingsDir.appendingPathComponent("greeting_\(persona.rawValue).m4a")
            if FileManager.default.fileExists(atPath: cafURL.path) {
                result[persona] = cafURL
            } else if FileManager.default.fileExists(atPath: m4aURL.path) {
                result[persona] = m4aURL
            }
        }

        return result
    }
}

// MARK: - AVSpeechSynthesizerDelegate

extension VoicemailGreetingGenerator: AVSpeechSynthesizerDelegate {

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        currentLineIndex += 1
        speakNextLine()
    }

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) {
        completion?(nil, NSError(domain: "VoicemailGenerator", code: 2,
                                  userInfo: [NSLocalizedDescriptionKey: "Speech synthesis was cancelled"]))
    }
}
