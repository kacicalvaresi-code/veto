import Foundation
import NaturalLanguage

// MARK: - Conversation States

enum ConversationState: String, CaseIterable {
    case greeting           // Initial pickup - "Hello? Who is this?"
    case confused           // Didn't understand - "I'm sorry, what was that?"
    case interested         // Engaged - "Oh really? Tell me more..."
    case stalling           // Buying time - "Hold on, let me find my glasses..."
    case searching          // Looking for something - "I think I have that somewhere..."
    case tangent            // Going off-topic - "That reminds me of something..."
    case almostThere        // Almost giving info - "Okay I think I found it... wait..."
    case repeatRequest      // Ask to repeat - "Could you say that number again?"
    case technicalTrouble   // Phone issues - "Oh my phone is acting up..."
    case goodbye            // Ending - "Well it was nice talking to you!"
}

// MARK: - Scam Intent Detection

enum ScamIntent: String {
    case moneyRequest       // Payment, fees, credit card
    case urgency            // Immediate action, suspended, warrant
    case identityTheft      // SSN, date of birth, verify identity
    case techSupport        // Computer virus, Microsoft, Apple refund
    case govImpersonation   // IRS, tax, government, federal
    case prizeScam          // Won, prize, lottery, congratulations
    case deliveryScam       // Package, delivery, customs, tracking
    case bankScam           // Account, suspicious activity, fraud department
    case unknown            // Can't determine intent
}

// MARK: - Intent Detector

class ScamIntentDetector {

    private let intentKeywords: [ScamIntent: [String]] = [
        .moneyRequest: [
            "payment", "pay", "fee", "charge", "credit card", "debit card",
            "bank account", "wire", "gift card", "money", "transfer", "zelle",
            "venmo", "cashapp", "bitcoin", "crypto", "western union", "amount",
            "balance", "owe", "debt", "billing"
        ],
        .urgency: [
            "immediately", "urgent", "right away", "suspended", "arrested",
            "warrant", "expire", "deadline", "last chance", "final notice",
            "action required", "right now", "today only", "limited time",
            "emergency", "critical"
        ],
        .identityTheft: [
            "social security", "ssn", "date of birth", "verify", "confirm your",
            "identity", "mother's maiden", "address", "full name", "driver's license",
            "passport", "personal information", "verify your account"
        ],
        .techSupport: [
            "computer", "virus", "malware", "microsoft", "windows", "apple support",
            "refund", "remote access", "teamviewer", "anydesk", "tech support",
            "subscription", "expired", "renew", "norton", "mcafee", "antivirus"
        ],
        .govImpersonation: [
            "irs", "tax", "government", "federal", "social security administration",
            "medicare", "medicaid", "department", "agent", "officer", "badge number",
            "legal action", "court", "lawsuit"
        ],
        .prizeScam: [
            "won", "winner", "prize", "lottery", "congratulations", "sweepstakes",
            "reward", "claim", "selected", "lucky", "jackpot", "million dollars"
        ],
        .deliveryScam: [
            "package", "delivery", "customs", "tracking", "shipment", "ups",
            "fedex", "usps", "amazon", "order", "shipping fee", "held",
            "detained", "clearance"
        ],
        .bankScam: [
            "account", "suspicious activity", "fraud department", "unauthorized",
            "transaction", "security department", "bank of america", "chase",
            "wells fargo", "citibank", "compromised", "locked", "frozen"
        ]
    ]

    func detectIntent(from transcript: String) -> ScamIntent {
        let lowered = transcript.lowercased()
        var scores: [ScamIntent: Int] = [:]

        for (intent, keywords) in intentKeywords {
            var score = 0
            for keyword in keywords {
                if lowered.contains(keyword) {
                    score += 1
                }
            }
            if score > 0 {
                scores[intent] = score
            }
        }

        // Return the intent with the highest keyword match count
        if let best = scores.max(by: { $0.value < $1.value }) {
            return best.key
        }
        return .unknown
    }

    /// Detect if the scammer is asking a direct question (expects an answer)
    func isAskingQuestion(transcript: String) -> Bool {
        let lowered = transcript.lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
        let questionWords = ["what is your", "can you", "do you have", "are you",
                             "could you", "would you", "will you", "is this",
                             "have you", "did you", "may i have", "please provide",
                             "please confirm", "can i get", "tell me your"]
        return questionWords.contains(where: { lowered.contains($0) }) || lowered.hasSuffix("?")
    }
}

// MARK: - Conversation Engine

class ConversationEngine {

    private(set) var currentState: ConversationState = .greeting
    private let intentDetector = ScamIntentDetector()
    private var turnCount: Int = 0
    private var detectedIntent: ScamIntent = .unknown
    private var stateHistory: [ConversationState] = []
    private let maxTurns = 25  // End after ~25 exchanges to avoid infinite loops

    /// Given a new chunk of scammer transcript, determine the next state
    func processScammerSpeech(_ transcript: String) -> ConversationState {
        turnCount += 1
        stateHistory.append(currentState)

        // Detect intent from cumulative conversation
        let newIntent = intentDetector.detectIntent(from: transcript)
        if newIntent != .unknown {
            detectedIntent = newIntent
        }

        let isQuestion = intentDetector.isAskingQuestion(transcript: transcript)

        // After max turns, wrap up
        if turnCount >= maxTurns {
            currentState = .goodbye
            return currentState
        }

        // State transition logic — designed to maximize time waste
        let nextState: ConversationState

        switch currentState {
        case .greeting:
            // After greeting, act confused about what they want
            nextState = .confused

        case .confused:
            if isQuestion {
                // They asked something specific — stall
                nextState = .stalling
            } else {
                // They're explaining — act interested
                nextState = .interested
            }

        case .interested:
            if detectedIntent == .moneyRequest || detectedIntent == .identityTheft {
                // They want money or info — pretend to look for it
                nextState = .searching
            } else if detectedIntent == .urgency {
                // They're pressuring — go on a tangent to defuse
                nextState = .tangent
            } else {
                // Keep asking them to explain
                nextState = .repeatRequest
            }

        case .stalling:
            // Come back from stalling — almost have what they want
            nextState = .almostThere

        case .searching:
            // Searching takes time... then have technical trouble
            if !recentlyVisited(.technicalTrouble) {
                nextState = .technicalTrouble
            } else {
                nextState = .almostThere
            }

        case .tangent:
            // Come back from tangent confused about what they wanted
            nextState = .confused

        case .almostThere:
            // Almost there but need them to repeat something
            if !recentlyVisited(.repeatRequest) {
                nextState = .repeatRequest
            } else {
                // Cycle back to searching
                nextState = .stalling
            }

        case .repeatRequest:
            if isQuestion {
                nextState = .stalling
            } else {
                nextState = .interested
            }

        case .technicalTrouble:
            // Phone trouble resolved, back to confused
            nextState = .confused

        case .goodbye:
            nextState = .goodbye
        }

        currentState = nextState
        return currentState
    }

    /// Check if a state was visited in the last 3 turns
    private func recentlyVisited(_ state: ConversationState) -> Bool {
        let recent = stateHistory.suffix(3)
        return recent.contains(state)
    }

    /// Reset the engine for a new call
    func reset() {
        currentState = .greeting
        turnCount = 0
        detectedIntent = .unknown
        stateHistory = []
    }

    /// Get the detected scam type for reporting
    func getDetectedScamType() -> ScamIntent {
        return detectedIntent
    }

    /// Get total turns elapsed
    func getTurnCount() -> Int {
        return turnCount
    }
}
