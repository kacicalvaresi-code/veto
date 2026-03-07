import Foundation
import AVFoundation

// MARK: - Persona Definition

enum BaiterPersona: String, CaseIterable, Codable {
    case confusedGrandma = "grandma"
    case hardOfHearingGrandpa = "grandpa"
    case curiousChild = "child"
    case distractedParent = "parent"

    var displayName: String {
        switch self {
        case .confusedGrandma: return "Confused Grandma"
        case .hardOfHearingGrandpa: return "Hard-of-Hearing Grandpa"
        case .curiousChild: return "Curious Child"
        case .distractedParent: return "Distracted Parent"
        }
    }

    var description: String {
        switch self {
        case .confusedGrandma:
            return "A sweet elderly woman who can never quite find her reading glasses or remember where she put things."
        case .hardOfHearingGrandpa:
            return "A friendly old man who keeps asking you to speak up and repeat everything."
        case .curiousChild:
            return "A young kid who picked up the phone and asks endless questions about everything."
        case .distractedParent:
            return "A frazzled parent constantly interrupted by kids, the dog, and things boiling over on the stove."
        }
    }

    var emoji: String {
        switch self {
        case .confusedGrandma: return "👵"
        case .hardOfHearingGrandpa: return "👴"
        case .curiousChild: return "👦"
        case .distractedParent: return "🧑‍🍳"
        }
    }

    // MARK: - Voice Configuration

    var voiceRate: Float {
        switch self {
        case .confusedGrandma: return 0.38   // Slow, deliberate
        case .hardOfHearingGrandpa: return 0.42  // Slightly slow, louder
        case .curiousChild: return 0.52      // Fast, excited
        case .distractedParent: return 0.48  // Normal but rushed
        }
    }

    var voicePitch: Float {
        switch self {
        case .confusedGrandma: return 1.3    // Higher, elderly woman
        case .hardOfHearingGrandpa: return 0.85  // Lower, elderly man
        case .curiousChild: return 1.6       // High, childlike
        case .distractedParent: return 1.0   // Normal
        }
    }

    var voiceVolume: Float {
        switch self {
        case .confusedGrandma: return 0.7    // Soft spoken
        case .hardOfHearingGrandpa: return 1.0  // Loud (thinks everyone else is quiet)
        case .curiousChild: return 0.9       // Enthusiastic
        case .distractedParent: return 0.8   // Moderate
        }
    }

    /// Preferred voice identifier — tries to find a natural-sounding voice
    var preferredVoiceIdentifier: String? {
        switch self {
        case .confusedGrandma: return "com.apple.voice.enhanced.en-US.Samantha"
        case .hardOfHearingGrandpa: return "com.apple.voice.enhanced.en-US.Tom"
        case .curiousChild: return "com.apple.voice.enhanced.en-US.Samantha"
        case .distractedParent: return "com.apple.voice.enhanced.en-US.Tom"
        }
    }
}

// MARK: - Dialogue Scripts

struct PersonaDialogues {

    /// Get dialogue lines for a persona in a given conversation state
    static func lines(for persona: BaiterPersona, state: ConversationState) -> [String] {
        switch persona {
        case .confusedGrandma:
            return grandmaLines(for: state)
        case .hardOfHearingGrandpa:
            return grandpaLines(for: state)
        case .curiousChild:
            return childLines(for: state)
        case .distractedParent:
            return parentLines(for: state)
        }
    }

    /// Get voicemail greeting script for a persona
    static func voicemailGreeting(for persona: BaiterPersona) -> [String] {
        switch persona {
        case .confusedGrandma:
            return [
                "Hello?",
                "... Oh... hold on, I'm trying to find the phone...",
                "... There we go. Hello? Who is this?",
                "I'm sorry, you'll have to speak up dear, I can barely hear you.",
                "... Hold on, let me put my hearing aid in...",
                "... Okay, now what were you saying?",
                "Oh my, that sounds important. Let me just find my reading glasses so I can write this down...",
                "... Now where did I put those... I just had them a minute ago...",
                "... Oh here they are, they were on my head the whole time! Silly me.",
                "Okay dear, go ahead, I'm listening now."
            ]
        case .hardOfHearingGrandpa:
            return [
                "HELLO?",
                "... Who? SPEAK UP, I can't hear a darn thing!",
                "... Hold on, let me turn the TV down...",
                "... MARGE! MARGE, WHERE'S THE REMOTE?",
                "... Sorry about that. Now, who did you say you were?",
                "The what department? You're gonna have to say that again, louder this time.",
                "... Oh! Okay, okay. Hold on, let me sit down. My knees aren't what they used to be.",
                "... Alright, I'm sitting. Now start from the beginning."
            ]
        case .curiousChild:
            return [
                "Hello!",
                "... Mommy's not here right now. She's in the shower.",
                "Who are you? Are you mommy's friend?",
                "What's your name? My name is... I'm not supposed to tell strangers my name.",
                "Why are you calling? Is it about the pizza? I want pepperoni!",
                "Do you know any jokes? I know a really good one about a chicken.",
                "Why did the chicken cross the road? ... To get to the other side! Get it?",
                "Are you still there? Hello?",
                "My mom says I'm not supposed to talk to strangers on the phone but you seem nice."
            ]
        case .distractedParent:
            return [
                "Hello? Yes, speaking—",
                "— TYLER, PUT THAT DOWN! Sorry, go ahead.",
                "You said you're from where? Hold on—",
                "— No, you cannot have ice cream before dinner! Because I said so!",
                "Sorry about that. You were saying something about my account?",
                "— IS THAT THE DOG? WHO LEFT THE GATE OPEN?",
                "Oh my god, hold on, something's boiling over on the stove—",
                "... Okay, I'm back. Sorry, it's been one of those days. What do you need?"
            ]
        }
    }

    // MARK: - Confused Grandma Dialogues

    private static func grandmaLines(for state: ConversationState) -> [String] {
        switch state {
        case .greeting:
            return [
                "Hello? ... Oh hello dear, who is this?",
                "Hello? Is someone there? ... Oh hi, I almost didn't hear the phone ring.",
                "Hello? ... Hold on, let me turn down the television... okay, who's calling?"
            ]
        case .confused:
            return [
                "I'm sorry dear, I didn't quite catch that. What did you say?",
                "The what now? I'm not sure I understand what you mean.",
                "Oh my, that's a lot of big words. Can you explain that in simpler terms for me?",
                "I'm sorry, my hearing isn't what it used to be. Could you say that one more time?"
            ]
        case .interested:
            return [
                "Oh really? Well that does sound important. Tell me more about that.",
                "Oh my goodness! I had no idea. What happens next?",
                "Well isn't that something. My neighbor Doris was telling me about something just like this."
            ]
        case .stalling:
            return [
                "Hold on dear, let me find my reading glasses. I just had them a minute ago...",
                "Oh, I need to write this down. Now where did I put my pen... hold on...",
                "Just a moment, I need to sit down. My hip has been acting up something terrible.",
                "Let me get my purse, I think my card is in there somewhere... hold on..."
            ]
        case .searching:
            return [
                "I'm looking, I'm looking... I have so many papers here...",
                "Now is it in this drawer or the other one... oh dear, I really need to organize...",
                "I think it might be upstairs. Hold on, it takes me a while with the stairs..."
            ]
        case .tangent:
            return [
                "You know, that reminds me of when my late husband Harold used to handle all the bills. He was so good with numbers. Did I ever tell you about the time he...",
                "Oh, speaking of that, my granddaughter was just telling me about something on the computer. She's so smart with those things. She's studying to be a...",
                "That's funny, my friend Edna called me yesterday about the same thing. Or was it Tuesday? The days all blend together when you're my age..."
            ]
        case .almostThere:
            return [
                "Okay, I think I found it... wait, no, that's my grocery list.",
                "Oh here it is! ... No, wait, this is from 2019. Let me keep looking.",
                "I think this is the right one... hold on, I can't read the numbers without my other glasses."
            ]
        case .repeatRequest:
            return [
                "I'm sorry dear, could you repeat that number? I want to make sure I write it down correctly.",
                "Was that a five or a nine? My hearing aid is buzzing again.",
                "One more time please? I got the first part but then the cat jumped on my lap and I lost track."
            ]
        case .technicalTrouble:
            return [
                "Oh no, I think my phone is acting up again. Can you hear me? Hello?",
                "The screen just went dark... oh wait, I think I pressed something. Hold on...",
                "My grandson set this phone up for me and I still don't know how half of it works."
            ]
        case .goodbye:
            return [
                "Well, it was lovely chatting with you dear. You remind me of my grandson. Take care now!",
                "Oh my, look at the time! I need to feed the cat. Thank you for calling, bye bye!",
                "Well I hope I was helpful. You have a blessed day now, okay? Goodbye dear."
            ]
        }
    }

    // MARK: - Hard-of-Hearing Grandpa Dialogues

    private static func grandpaLines(for state: ConversationState) -> [String] {
        switch state {
        case .greeting:
            return [
                "HELLO? Yeah, who's this?",
                "Hello! Speak up, I can barely hear you!",
                "Yeah? What? Hold on, let me turn down the ballgame."
            ]
        case .confused:
            return [
                "WHAT? You're gonna have to say that again, louder!",
                "The WHAT department? Never heard of it.",
                "I don't understand what you're saying. Are you selling something?",
                "Huh? My hearing aid's on the fritz again. Say that one more time."
            ]
        case .interested:
            return [
                "Oh yeah? Well that doesn't sound right. Tell me more.",
                "No kidding! How long has this been going on?",
                "Well I'll be darned. And what are they doing about it?"
            ]
        case .stalling:
            return [
                "Hold your horses, let me get up. These old knees take a minute...",
                "Alright, alright, give me a second. I gotta find my wallet. MARGE! Where'd you put my wallet?",
                "Just a minute, the dog needs to go out. BUSTER! Come here boy!"
            ]
        case .searching:
            return [
                "I'm looking for it, keep your shirt on... got a lot of stuff in this desk...",
                "Now where the heck did I put that... MARGE! Have you seen my—never mind, keep talking.",
                "It's gotta be here somewhere. I just paid the electric bill with it last week."
            ]
        case .tangent:
            return [
                "You know, back in my day we didn't have to deal with this kind of thing. I remember when...",
                "That reminds me of when I was in the service. We had a guy in our unit who...",
                "Ha! That's what my buddy Frank always says. Frank and I go way back, we used to..."
            ]
        case .almostThere:
            return [
                "Okay, I think I got it right here... hold on, where are my reading glasses...",
                "Alright, I found something. Is this the... no, that's my fishing license.",
                "Here we go... wait, I can't read this. The print is too damn small."
            ]
        case .repeatRequest:
            return [
                "WHAT? Say that again, I missed it!",
                "You're breaking up. Was that a seven or an eleven?",
                "One more time! And LOUDER this time, I'm not a young man!"
            ]
        case .technicalTrouble:
            return [
                "Hello? HELLO? I think this dang phone is cutting out again.",
                "Can you hear me? I keep pressing buttons and things keep happening on the screen.",
                "Hold on, I think I accidentally put you on the speaker phone. How do I fix this..."
            ]
        case .goodbye:
            return [
                "Alright, well, the game's back on. Thanks for calling, whoever you are!",
                "Okay, I gotta go. Marge is calling me for dinner. Take it easy!",
                "Well that was... something. Don't call during the game next time! Bye now."
            ]
        }
    }

    // MARK: - Curious Child Dialogues

    private static func childLines(for state: ConversationState) -> [String] {
        switch state {
        case .greeting:
            return [
                "Hello! Who is this?",
                "Hi! Mommy can't come to the phone right now. She told me to answer it.",
                "Hello? Is this Santa? ... Oh. Who are you then?"
            ]
        case .confused:
            return [
                "What does that mean? I don't know what that word means.",
                "Huh? My mom usually handles that stuff. What's a... what did you call it?",
                "I don't understand. Can you explain it like I'm five? Because I am five.",
                "What's a social security? Is that like a security guard? My school has one of those."
            ]
        case .interested:
            return [
                "Whoa, really?! That sounds crazy! What else?",
                "No way! That's like in the movies! Tell me more!",
                "Ooh ooh ooh! And then what happened?"
            ]
        case .stalling:
            return [
                "Hold on, I have to go potty. Don't hang up! I'll be right back!",
                "Wait, my show is on! Can you hold on for like one minute?",
                "I need to go ask my mom something. Stay right there, okay? Promise you won't hang up!"
            ]
        case .searching:
            return [
                "Mommy keeps that stuff in the big drawer. Let me go look... I'm not supposed to open it though...",
                "I think I saw something like that on the fridge. Hold on, I have to get a chair to reach...",
                "Is it the thing with the numbers on it? We have lots of papers with numbers."
            ]
        case .tangent:
            return [
                "Hey, do you want to hear about my dog? His name is Biscuit and he can do tricks!",
                "Oh! That reminds me! Guess what happened at school today? So there was this kid named Marcus and he...",
                "Do you like dinosaurs? I know ALL the dinosaurs. My favorite is the T-Rex because it's the biggest. Well actually the Argentinosaurus is bigger but..."
            ]
        case .almostThere:
            return [
                "I found a card! It has numbers on it! It says... V-I-S... I can't read the rest yet, I'm still learning.",
                "Oh wait, I think this is it! No... this is a Pokemon card. But it's a really rare one! Do you want to know which one?",
                "I found mommy's purse! There's SO much stuff in here... there's lipstick and keys and... ooh, gum!"
            ]
        case .repeatRequest:
            return [
                "Can you say that again? I wasn't listening, sorry. I got distracted by the cat.",
                "What? Say it slower! You're talking too fast!",
                "I forgot what you said. My teacher says I need to work on my listening skills."
            ]
        case .technicalTrouble:
            return [
                "Uh oh, I think I pressed something. The screen looks weird now.",
                "Hello? Are you still there? I accidentally dropped the phone in the couch cushions.",
                "Wait, how do I make it louder? I keep pressing the buttons but nothing's happening."
            ]
        case .goodbye:
            return [
                "Okay, I hear mommy's car! I gotta go! Bye bye! It was nice talking to you!",
                "My show is starting! I have to go! Bye! Call back later and talk to my mom!",
                "Okay bye! You're funny. I'm gonna tell my mom you called. What was your name again? ... Hello?"
            ]
        }
    }

    // MARK: - Distracted Parent Dialogues

    private static func parentLines(for state: ConversationState) -> [String] {
        switch state {
        case .greeting:
            return [
                "Hello? Yes, speaking— TYLER, I SAID PUT THAT DOWN! Sorry, go ahead.",
                "Hi, yes? Hold on one second— No, you may NOT have a cookie before dinner! Sorry, what were you saying?",
                "Hello? Yeah, this is— STOP HITTING YOUR SISTER! Sorry. Who is this?"
            ]
        case .confused:
            return [
                "Wait, what? Sorry, I missed that. The kids are— WHAT DID I JUST SAY? Sorry, one more time?",
                "I'm sorry, can you repeat that? I'm trying to— no, the OTHER shoe— sorry, what?",
                "The what department? I don't think I— CLOSE THE FRIDGE! Sorry, go on."
            ]
        case .interested:
            return [
                "Oh really? That's— STOP RUNNING IN THE HOUSE! Sorry, that does sound concerning.",
                "Hmm, okay, that's— is that the DOG? Who let the dog in? Sorry, continue.",
                "Oh wow, I had no idea. When did— BECAUSE I SAID SO, THAT'S WHY! Sorry, when did this happen?"
            ]
        case .stalling:
            return [
                "Can you hold on? Something just— OH NO, IS THAT MARKER ON THE WALL? I'll be right back.",
                "Just a second, I need to— NOBODY TOUCH ANYTHING! Hold on, I'll be right back.",
                "Let me just— the timer's going off, hold on, I have to get something out of the oven—"
            ]
        case .searching:
            return [
                "Okay, let me find that. It's somewhere in this pile of— WHO PUT LEGOS IN THE DISHWASHER?",
                "I'm looking, I'm looking. It's hard to find anything in this house with three kids and a—BISCUIT, NO! Bad dog!",
                "It should be right... here... no, that's a permission slip for the field trip. Hold on."
            ]
        case .tangent:
            return [
                "You know, I've been meaning to deal with this but between soccer practice and the science fair project and the dog's vet appointment...",
                "That reminds me, I need to call the school about— sorry, what were we talking about?",
                "Oh don't even get me started. Last week the washing machine broke and then the car wouldn't start and THEN the school called because—"
            ]
        case .almostThere:
            return [
                "Okay I think I found— NO! We do NOT put things in the toilet! I'm so sorry, one second.",
                "Here it is! Wait, no, this is expired. Let me— WHAT IS THAT SMELL?",
                "I've got it right— actually hold on, is that my other phone ringing? No, it's the microwave. Okay, go ahead."
            ]
        case .repeatRequest:
            return [
                "I'm so sorry, can you say that again? It's like a zoo in here.",
                "One more time? I had to break up a fight over the remote.",
                "Sorry, what was the number? The baby just started crying and I couldn't hear."
            ]
        case .technicalTrouble:
            return [
                "Hello? Can you hear me? I think one of the kids changed something on my phone again.",
                "Hold on, the screen is— did someone put stickers on my phone? I can barely see the—",
                "Sorry, my phone is at 2% and I can't find the charger because SOMEONE was using it to charge their tablet."
            ]
        case .goodbye:
            return [
                "Look, I really have to go. Someone just spilled juice on the— I gotta call you back. Bye!",
                "Okay I have to deal with... whatever is happening in the bathroom right now. Thanks for calling!",
                "Sorry, I really need to go. The kids are suspiciously quiet and that's never a good sign. Bye!"
            ]
        }
    }
}
