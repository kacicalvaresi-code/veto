import Foundation
import ExpoModulesCore
import AVFoundation
import Speech

/// Expo native module that exposes the Scam Baiter functionality to React Native.
/// Handles: voicemail greeting generation, call-back baiting with live conversation engine,
/// and persona management.
public class ScamBaiterModule: Module {

    private var conversationEngine = ConversationEngine()
    private var greetingGenerator = VoicemailGreetingGenerator()
    private var speechRecognizer: SFSpeechRecognizer?
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var audioEngine = AVAudioEngine()
    private var synthesizer = AVSpeechSynthesizer()
    private var isListening = false
    private var currentPersona: BaiterPersona = .confusedGrandma
    private var callTranscript: [String] = []
    private var baiterTranscript: [String] = []
    private var silenceTimer: Timer?
    private var lastSpeechTimestamp: Date = Date()

    public func definition() -> ModuleDefinition {
        Name("ScamBaiter")

        // MARK: - Events

        Events(
            "onStateChange",        // Conversation state changed
            "onScammerSpeech",      // Scammer said something (transcript)
            "onBaiterResponse",     // Baiter is responding (text)
            "onCallComplete",       // Call-back baiting session ended
            "onGreetingGenerated",  // Voicemail greeting audio file ready
            "onError"               // Something went wrong
        )

        // MARK: - Persona Management

        Function("getPersonas") { () -> [[String: String]] in
            return BaiterPersona.allCases.map { persona in
                [
                    "id": persona.rawValue,
                    "name": persona.displayName,
                    "description": persona.description,
                    "emoji": persona.emoji
                ]
            }
        }

        Function("setPersona") { (personaId: String) in
            guard let persona = BaiterPersona(rawValue: personaId) else {
                throw NSError(domain: "ScamBaiter", code: 1,
                              userInfo: [NSLocalizedDescriptionKey: "Unknown persona: \(personaId)"])
            }
            self.currentPersona = persona
        }

        // MARK: - Voicemail Greeting Generation

        AsyncFunction("generateGreeting") { (personaId: String, promise: Promise) in
            guard let persona = BaiterPersona(rawValue: personaId) else {
                promise.reject(NSError(domain: "ScamBaiter", code: 1,
                                       userInfo: [NSLocalizedDescriptionKey: "Unknown persona"]))
                return
            }

            self.greetingGenerator.writeToFile(for: persona) { url, error in
                if let error = error {
                    promise.reject(error)
                } else if let url = url {
                    promise.resolve([
                        "filePath": url.path,
                        "persona": persona.displayName
                    ])
                } else {
                    promise.reject(NSError(domain: "ScamBaiter", code: 2,
                                           userInfo: [NSLocalizedDescriptionKey: "Failed to generate greeting"]))
                }
            }
        }

        AsyncFunction("generatePreview") { (personaId: String, promise: Promise) in
            guard let persona = BaiterPersona(rawValue: personaId) else {
                promise.reject(NSError(domain: "ScamBaiter", code: 1,
                                       userInfo: [NSLocalizedDescriptionKey: "Unknown persona"]))
                return
            }

            self.greetingGenerator.generatePreview(for: persona) { url, error in
                if let error = error {
                    promise.reject(error)
                } else if let url = url {
                    promise.resolve(["filePath": url.path])
                } else {
                    promise.reject(NSError(domain: "ScamBaiter", code: 2,
                                           userInfo: [NSLocalizedDescriptionKey: "Failed to generate preview"]))
                }
            }
        }

        Function("getAvailableGreetings") { () -> [[String: String]] in
            let greetings = VoicemailGreetingGenerator.availableGreetings()
            return greetings.map { persona, url in
                [
                    "persona": persona.rawValue,
                    "name": persona.displayName,
                    "filePath": url.path
                ]
            }
        }

        // MARK: - Call-Back Baiter (Live Conversation)

        AsyncFunction("startBaiting") { (personaId: String, promise: Promise) in
            guard let persona = BaiterPersona(rawValue: personaId) else {
                promise.reject(NSError(domain: "ScamBaiter", code: 1,
                                       userInfo: [NSLocalizedDescriptionKey: "Unknown persona"]))
                return
            }

            self.currentPersona = persona
            self.conversationEngine.reset()
            self.callTranscript = []
            self.baiterTranscript = []

            // Request speech recognition permission
            SFSpeechRecognizer.requestAuthorization { status in
                guard status == .authorized else {
                    promise.reject(NSError(domain: "ScamBaiter", code: 3,
                                           userInfo: [NSLocalizedDescriptionKey: "Speech recognition not authorized"]))
                    return
                }

                do {
                    try self.startListeningAndResponding()
                    promise.resolve(["status": "started", "persona": persona.displayName])
                } catch {
                    promise.reject(error)
                }
            }
        }

        Function("stopBaiting") { () -> [String: Any] in
            self.stopListening()

            let scamType = self.conversationEngine.getDetectedScamType()
            let turns = self.conversationEngine.getTurnCount()

            return [
                "scammerTranscript": self.callTranscript.joined(separator: "\n"),
                "baiterTranscript": self.baiterTranscript.joined(separator: "\n"),
                "detectedScamType": scamType.rawValue,
                "totalTurns": turns,
                "persona": self.currentPersona.displayName
            ]
        }

        Function("isBaiting") { () -> Bool in
            return self.isListening
        }

        // MARK: - Greeting Script Access (for display in UI)

        Function("getGreetingScript") { (personaId: String) -> [String] in
            guard let persona = BaiterPersona(rawValue: personaId) else {
                return []
            }
            return PersonaDialogues.voicemailGreeting(for: persona)
        }

        Function("getDialoguePreview") { (personaId: String, state: String) -> [String] in
            guard let persona = BaiterPersona(rawValue: personaId),
                  let convState = ConversationState(rawValue: state) else {
                return []
            }
            return PersonaDialogues.lines(for: persona, state: convState)
        }
    }

    // MARK: - Audio Pipeline

    private func startListeningAndResponding() throws {
        speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
        guard let speechRecognizer = speechRecognizer, speechRecognizer.isAvailable else {
            throw NSError(domain: "ScamBaiter", code: 4,
                          userInfo: [NSLocalizedDescriptionKey: "Speech recognizer not available"])
        }

        // Require on-device recognition for privacy
        if speechRecognizer.supportsOnDeviceRecognition {
            recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
            recognitionRequest?.requiresOnDeviceRecognition = true
        } else {
            recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        }

        guard let recognitionRequest = recognitionRequest else {
            throw NSError(domain: "ScamBaiter", code: 5,
                          userInfo: [NSLocalizedDescriptionKey: "Could not create recognition request"])
        }

        recognitionRequest.shouldReportPartialResults = true

        // Configure audio session for speakerphone during call
        let audioSession = AVAudioSession.sharedInstance()
        try audioSession.setCategory(.playAndRecord, mode: .voiceChat, options: [.defaultToSpeaker, .allowBluetooth])
        try audioSession.setActive(true, options: .notifyOthersOnDeactivation)

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { buffer, _ in
            self.recognitionRequest?.append(buffer)
        }

        audioEngine.prepare()
        try audioEngine.start()
        isListening = true

        // Start with the greeting
        speakResponse(for: .greeting)

        // Start the recognition task
        var lastProcessedTranscript = ""

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            guard let self = self else { return }

            if let result = result {
                let transcript = result.bestTranscription.formattedString

                // Only process new speech (delta from last processed)
                if transcript.count > lastProcessedTranscript.count {
                    let newSpeech = String(transcript.dropFirst(lastProcessedTranscript.count)).trimmingCharacters(in: .whitespacesAndNewlines)

                    if !newSpeech.isEmpty {
                        lastProcessedTranscript = transcript
                        self.lastSpeechTimestamp = Date()
                        self.callTranscript.append(newSpeech)

                        self.sendEvent("onScammerSpeech", [
                            "text": newSpeech,
                            "fullTranscript": transcript
                        ])

                        // Reset silence timer — wait for scammer to finish speaking
                        self.resetSilenceTimer()
                    }
                }
            }

            if let error = error {
                self.sendEvent("onError", ["message": error.localizedDescription])
                self.stopListening()
            }
        }

        // Start silence detection — respond when scammer pauses
        startSilenceDetection()
    }

    private func startSilenceDetection() {
        lastSpeechTimestamp = Date()
    }

    private func resetSilenceTimer() {
        silenceTimer?.invalidate()

        // Wait 2.5 seconds of silence before responding
        // This gives the scammer time to finish their sentence
        silenceTimer = Timer.scheduledTimer(withTimeInterval: 2.5, repeats: false) { [weak self] _ in
            guard let self = self, self.isListening else { return }

            // Scammer has been silent for 2.5s — time to respond
            let fullTranscript = self.callTranscript.joined(separator: " ")
            let nextState = self.conversationEngine.processScammerSpeech(fullTranscript)

            self.sendEvent("onStateChange", [
                "state": nextState.rawValue,
                "turn": self.conversationEngine.getTurnCount(),
                "detectedScamType": self.conversationEngine.getDetectedScamType().rawValue
            ])

            self.speakResponse(for: nextState)

            // Check if we should end the call
            if nextState == .goodbye {
                DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
                    self.stopListening()
                    self.sendEvent("onCallComplete", [
                        "scammerTranscript": self.callTranscript.joined(separator: "\n"),
                        "baiterTranscript": self.baiterTranscript.joined(separator: "\n"),
                        "detectedScamType": self.conversationEngine.getDetectedScamType().rawValue,
                        "totalTurns": self.conversationEngine.getTurnCount()
                    ])
                }
            }
        }
    }

    private func speakResponse(for state: ConversationState) {
        let lines = PersonaDialogues.lines(for: currentPersona, state: state)
        guard let line = lines.randomElement() else { return }

        baiterTranscript.append(line)

        sendEvent("onBaiterResponse", [
            "text": line,
            "state": state.rawValue,
            "persona": currentPersona.displayName
        ])

        let utterance = AVSpeechUtterance(string: line)
        utterance.rate = currentPersona.voiceRate
        utterance.pitchMultiplier = currentPersona.voicePitch
        utterance.volume = currentPersona.voiceVolume

        if let voiceID = currentPersona.preferredVoiceIdentifier,
           let voice = AVSpeechSynthesisVoice(identifier: voiceID) {
            utterance.voice = voice
        } else {
            utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        }

        // Add natural pre-delay
        utterance.preUtteranceDelay = Double.random(in: 0.3...1.2)

        synthesizer.speak(utterance)
    }

    private func stopListening() {
        silenceTimer?.invalidate()
        silenceTimer = nil

        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionTask?.cancel()
        recognitionTask = nil
        recognitionRequest = nil
        synthesizer.stopSpeaking(at: .immediate)
        isListening = false
    }
}
