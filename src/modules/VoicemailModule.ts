/**
 * VoicemailModule.ts
 *
 * TypeScript wrapper around the VetoVoicemailModule native bridge.
 * Provides typed access to on-device voicemail transcription and
 * AI classification, plus the screened-calls store.
 *
 * All processing is performed entirely on-device.
 * No audio, transcripts, or analysis results ever leave the phone.
 */

import { NativeModules, Platform } from 'react-native';

const { VetoVoicemailModule } = NativeModules;

// ─── Types ────────────────────────────────────────────────────────────────────

export type VoicemailClassification =
  | 'spam'
  | 'likely_spam'
  | 'legitimate'
  | 'unknown';

export type VoicemailIntent =
  | 'appointment'
  | 'delivery'
  | 'school'
  | 'contractor'
  | 'sales_or_scam'
  | 'robocall'
  | 'unknown';

export type ScreenedCallAction =
  | 'pending'
  | 'called_back'
  | 'blocked'
  | 'marked_safe'
  | 'dismissed';

export interface VoicemailAnalysis {
  transcript     : string;
  summary        : string;
  classification : VoicemailClassification;
  confidence     : number;  // 0.0 – 1.0
  detectedIntent : VoicemailIntent;
  keywords       : string[];
}

export interface ScreenedCall {
  id             : string;
  phoneNumber    : string;
  callerName?    : string;
  screenedAt     : string;   // ISO 8601
  action         : ScreenedCallAction;
  handledAt?     : string;
  analysis?      : VoicemailAnalysis;
}

// ─── Permission ───────────────────────────────────────────────────────────────

export type SpeechPermissionStatus =
  | 'authorized'
  | 'denied'
  | 'restricted'
  | 'notDetermined'
  | 'unknown';

/**
 * Requests on-device speech recognition permission.
 * Must be called before transcribeAndClassify().
 */
export async function requestSpeechPermission(): Promise<SpeechPermissionStatus> {
  if (Platform.OS !== 'ios') return 'authorized'; // Android handles this differently
  if (!VetoVoicemailModule) return 'unknown';
  return VetoVoicemailModule.requestSpeechPermission();
}

// ─── Transcription & Classification ──────────────────────────────────────────

/**
 * Transcribes an audio file and classifies the transcript using on-device NLP.
 *
 * @param audioFileURL  Local file:// URL of the voicemail audio file.
 * @returns             VoicemailAnalysis with transcript, summary, and classification.
 */
export async function transcribeAndClassify(
  audioFileURL: string
): Promise<VoicemailAnalysis> {
  if (Platform.OS !== 'ios' || !VetoVoicemailModule) {
    return {
      transcript     : '',
      summary        : 'Transcription not available on this platform.',
      classification : 'unknown',
      confidence     : 0,
      detectedIntent : 'unknown',
      keywords       : [],
    };
  }
  return VetoVoicemailModule.transcribeAndClassify(audioFileURL);
}

// ─── Screened Calls Store ─────────────────────────────────────────────────────

/**
 * Saves a screened call record to the App Group store.
 * Returns the assigned call ID.
 */
export async function saveScreenedCall(
  call: Omit<ScreenedCall, 'id' | 'screenedAt' | 'action'>
): Promise<string> {
  if (Platform.OS !== 'ios' || !VetoVoicemailModule) return '';
  return VetoVoicemailModule.saveScreenedCall(call);
}

/**
 * Returns all screened calls, newest first.
 */
export async function getScreenedCalls(): Promise<ScreenedCall[]> {
  if (Platform.OS !== 'ios' || !VetoVoicemailModule) return [];
  return VetoVoicemailModule.getScreenedCalls();
}

/**
 * Updates the action on a screened call (e.g. after the user taps "Call Back").
 */
export async function markCallHandled(
  callId : string,
  action : ScreenedCallAction
): Promise<boolean> {
  if (Platform.OS !== 'ios' || !VetoVoicemailModule) return false;
  return VetoVoicemailModule.markCallHandled(callId, action);
}

/**
 * Permanently deletes a screened call record.
 */
export async function deleteScreenedCall(callId: string): Promise<boolean> {
  if (Platform.OS !== 'ios' || !VetoVoicemailModule) return false;
  return VetoVoicemailModule.deleteScreenedCall(callId);
}

// ─── Classification Helpers ───────────────────────────────────────────────────

/**
 * Returns a human-readable label and colour for a classification value.
 */
export function classificationMeta(
  classification: VoicemailClassification
): { label: string; color: string; icon: string } {
  switch (classification) {
    case 'spam':
      return { label: 'Spam',          color: '#FF3B30', icon: '🚫' };
    case 'likely_spam':
      return { label: 'Likely Spam',   color: '#FF9F0A', icon: '⚠️' };
    case 'legitimate':
      return { label: 'Likely Legit',  color: '#34C759', icon: '✓'  };
    default:
      return { label: 'Unknown',       color: '#8E8E93', icon: '?'  };
  }
}

/**
 * Returns a human-readable label for a detected intent.
 */
export function intentLabel(intent: VoicemailIntent): string {
  switch (intent) {
    case 'appointment'  : return 'Appointment Reminder';
    case 'delivery'     : return 'Package / Delivery';
    case 'school'       : return 'School / Education';
    case 'contractor'   : return 'Contractor / Service';
    case 'sales_or_scam': return 'Sales or Scam';
    case 'robocall'     : return 'Robocall (no message)';
    default             : return 'Unknown';
  }
}
