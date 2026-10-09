import OpenAI from 'openai';
import { openaiConfig } from './config';

export interface TranscriptLine {
  speaker: 'assistant' | 'customer';
  text: string;
}

export interface MeetingSlot {
  start: string;
  end: string;
}

/**
 * Ask the LLM to turn what the customer said into a start/end slot.
 * Returns null when no OpenAI key is configured or the model's reply is not usable.
 */
export async function extractMeetingSlot(lines: TranscriptLine[], now = new Date()): Promise<MeetingSlot | null> {
  const apiKey = openaiConfig.apiKey();
  if (!apiKey) return null;

  const customerText = lines
    .filter((l) => l.speaker === 'customer')
    .map((l) => l.text.trim())
    .join(' ');
  if (!customerText) return null;

  const openai = new OpenAI({ apiKey });
  const resp = await openai.chat.completions.create({
    model: openaiConfig.model(),
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You are a JSON extractor. Today is ${now.toISOString()} and the business time zone is ${openaiConfig.timezone()}.
Given what a customer said on a call, output only JSON with exactly this shape:
{ "start": "YYYY-MM-DDTHH:MM:SS±HH:MM", "end": "YYYY-MM-DDTHH:MM:SS±HH:MM" }
If the customer gave a start but no duration or end, assume 30 minutes.
If the customer did not agree to a time, output { "start": "", "end": "" }.`,
      },
      { role: 'user', content: customerText },
    ],
  });

  try {
    const obj = JSON.parse(resp.choices?.[0]?.message?.content ?? '{}');
    if (obj.start && obj.end) return { start: obj.start, end: obj.end };
  } catch {
    console.error('[extract-slot] model output was not valid JSON');
  }
  return null;
}

/** Normalise VAPI call messages into transcript lines. */
export function toTranscript(messages: unknown): TranscriptLine[] {
  if (!Array.isArray(messages)) return [];
  const out: TranscriptLine[] = [];
  for (const m of messages as Array<Record<string, unknown>>) {
    const role = m.role;
    const text = (m.message ?? m.content ?? '') as string;
    if (!text || typeof text !== 'string') continue;
    if (role === 'bot' || role === 'assistant') out.push({ speaker: 'assistant', text });
    else if (role === 'user' || role === 'customer') out.push({ speaker: 'customer', text });
  }
  return out;
}
