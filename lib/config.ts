// Server-side configuration. Every value comes from the environment and is empty by default.
// See .env.example for the full list.

export type AgentMode = 'voice-meeting-booker' | 'sdr' | 'reminder';

export interface VoiceOption {
  /** ElevenLabs voice id passed to VAPI as an assistant override. Empty = use the assistant's own voice. */
  voice_id: string;
  voicename: string;
  /** Optional URL of a short preview clip. Empty = no preview button. */
  preview_audio: string;
  tags: string[];
  default?: boolean;
}

export interface CallerLine {
  /** VAPI phone-number id used as the caller ID. */
  phone_id: string;
  /** Display only. */
  number: string;
  label: string;
}

const env = (k: string) => (process.env[k] ?? '').trim();

function parseJson<T>(key: string, fallback: T): T {
  const raw = env(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn(`[config] ${key} is not valid JSON, using the built-in default`);
    return fallback;
  }
}

/** Demo voice personas. Voice ids are blank on purpose: set VAPI_VOICES to use your own. */
const DEMO_VOICES: VoiceOption[] = [
  { voice_id: '', voicename: 'Billy', preview_audio: '', tags: ['Male', 'Casual', 'Relaxed'], default: true },
  { voice_id: '', voicename: 'Annie', preview_audio: '', tags: ['Female', 'Calm', 'Warm'] },
  { voice_id: '', voicename: 'Hope', preview_audio: '', tags: ['Female', 'Young', 'Conversational'] },
  { voice_id: '', voicename: 'Mike', preview_audio: '', tags: ['Male', 'Confident', 'Upbeat'] },
  { voice_id: '', voicename: 'James', preview_audio: '', tags: ['Male', 'Professional', 'Precise'] },
  { voice_id: '', voicename: 'Ash', preview_audio: '', tags: ['Female', 'Professional', 'Bold'] },
];

/** Fictional caller lines (555-01xx is reserved for fiction). Set VAPI_PHONE_NUMBERS to use real ones. */
const DEMO_LINES: CallerLine[] = [
  { phone_id: '', number: '+1 (555) 010-0100', label: 'Main Office' },
  { phone_id: '', number: '+1 (555) 010-0142', label: 'Sales Team' },
  { phone_id: '', number: '+1 (555) 010-0187', label: 'Billing' },
];

export function getVoices(): VoiceOption[] {
  const voices = parseJson<VoiceOption[]>('VAPI_VOICES', DEMO_VOICES);
  return voices.length ? voices : DEMO_VOICES;
}

export function getCallerLines(): CallerLine[] {
  const lines = parseJson<CallerLine[]>('VAPI_PHONE_NUMBERS', DEMO_LINES);
  return lines.length ? lines : DEMO_LINES;
}

export function getAssistantId(mode: AgentMode): string {
  const byMode: Record<AgentMode, string> = {
    'voice-meeting-booker': env('VAPI_ASSISTANT_ID_MEETING_BOOKER'),
    sdr: env('VAPI_ASSISTANT_ID_SDR'),
    reminder: env('VAPI_ASSISTANT_ID_REMINDER'),
  };
  return byMode[mode] || env('VAPI_ASSISTANT_ID');
}

export const vapi = {
  apiKey: () => env('VAPI_API_KEY'),
  baseUrl: () => env('VAPI_BASE_URL') || 'https://api.vapi.ai',
  defaultPhoneNumberId: () => env('VAPI_PHONE_NUMBER_ID'),
  webhookSecret: () => env('VAPI_WEBHOOK_SECRET'),
};

export const openaiConfig = {
  apiKey: () => env('OPENAI_API_KEY'),
  model: () => env('OPENAI_MODEL') || 'gpt-4o-mini',
  timezone: () => env('BOOKING_TIMEZONE') || 'America/New_York',
};
