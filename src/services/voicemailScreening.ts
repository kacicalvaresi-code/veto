/**
 * voicemailScreening.ts
 *
 * Orchestrates the Smart Voicemail Screening flow:
 *
 *  1. The user enables "Silence Unknown Callers" in iOS Settings → Phone.
 *     (Veto guides the user to this setting during onboarding.)
 *  2. Unknown callers are sent to voicemail by iOS automatically.
 *  3. When a new voicemail arrives, iOS sends a local notification.
 *     This service registers a handler for that notification and:
 *       a. Locates the new voicemail audio file in the shared container.
 *       b. Calls VetoVoicemailModule.transcribeAndClassify() on-device.
 *       c. Saves the result to the screened-calls store.
 *       d. Fires a rich push notification with the AI summary.
 *
 * Privacy guarantee: all processing is on-device.  No audio, transcripts,
 * or analysis results are ever transmitted to any server.
 *
 * NOTE: Full voicemail interception requires the CallKit / VoIP entitlement
 * and a carrier-level integration that is beyond the scope of the current
 * build.  This service implements the *manual* path: the user can share a
 * voicemail from the native Phone app to Veto via the iOS Share Sheet, which
 * triggers the same transcription and classification pipeline.
 * The automatic path will be enabled in a future release pending Apple's
 * CallKit voicemail API availability.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import {
    transcribeAndClassify,
    saveScreenedCall,
    requestSpeechPermission,
    type VoicemailAnalysis,
} from '../modules/VoicemailModule';

// ─── Notification Setup ───────────────────────────────────────────────────────

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert  : true,
        shouldPlaySound  : false,
        shouldSetBadge   : true,
    }),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScreeningRequest {
    phoneNumber : string;
    callerName? : string;
    audioFileURL: string;
}

export interface ScreeningResult {
    callId   : string;
    analysis : VoicemailAnalysis;
}

// ─── Permission ───────────────────────────────────────────────────────────────

/**
 * Requests all permissions required for Smart Voicemail Screening:
 *  - On-device speech recognition
 *  - Local push notifications
 */
export async function requestScreeningPermissions(): Promise<{
    speech       : string;
    notifications: string;
}> {
    const speech = await requestSpeechPermission();

    let notifications = 'unknown';
    if (Platform.OS === 'ios') {
        const { status } = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert : true,
                allowBadge : true,
                allowSound : false,
            },
        });
        notifications = status;
    }

    return { speech, notifications };
}

// ─── Core Screening Pipeline ──────────────────────────────────────────────────

/**
 * Processes a voicemail through the full screening pipeline:
 *  1. Transcribes the audio on-device.
 *  2. Classifies the transcript using on-device NLP.
 *  3. Saves the result to the screened-calls store.
 *  4. Fires a local push notification with the AI summary.
 *
 * @param request  Caller info and path to the audio file.
 * @returns        The call ID and full analysis result.
 */
export async function screenVoicemail(
    request: ScreeningRequest
): Promise<ScreeningResult> {
    const { phoneNumber, callerName, audioFileURL } = request;

    // ── 1. Transcribe & classify ──────────────────────────────────────────────
    const analysis = await transcribeAndClassify(audioFileURL);

    // ── 2. Save to store ──────────────────────────────────────────────────────
    const callId = await saveScreenedCall({
        phoneNumber,
        callerName,
        analysis,
    });

    // ── 3. Fire local notification ────────────────────────────────────────────
    await fireScreeningNotification(phoneNumber, callerName, analysis, callId);

    return { callId, analysis };
}

// ─── Notification ─────────────────────────────────────────────────────────────

async function fireScreeningNotification(
    phoneNumber  : string,
    callerName   : string | undefined,
    analysis     : VoicemailAnalysis,
    callId       : string
): Promise<void> {
    const displayName = callerName || formatPhoneForDisplay(phoneNumber);

    // Choose notification style based on classification
    let title: string;
    let body : string;

    switch (analysis.classification) {
        case 'spam':
            title = `🚫 Veto blocked a spam call`;
            body  = `From ${displayName}: "${analysis.summary.slice(0, 100)}"`;
            break;
        case 'likely_spam':
            title = `⚠️ Possible spam call screened`;
            body  = `From ${displayName}: "${analysis.summary.slice(0, 100)}"`;
            break;
        case 'legitimate':
            title = `📬 Screened call — looks legit`;
            body  = `From ${displayName}: "${analysis.summary.slice(0, 100)}"`;
            break;
        default:
            title = `📬 Veto screened a call`;
            body  = `From ${displayName}. Tap to review.`;
    }

    await Notifications.scheduleNotificationAsync({
        content: {
            title,
            body,
            data : { callId, phoneNumber, screen: 'screened' },
            badge: 1,
        },
        trigger: null, // fire immediately
    });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPhoneForDisplay(raw: string): string {
    const digits = raw.replace(/\D/g, '');
    if (digits.length === 10) {
        return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return raw;
}
