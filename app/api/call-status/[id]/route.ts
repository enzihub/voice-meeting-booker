// GET /api/call-status/:id
// Polled by the UI while a call is live. Returns the call status, the transcript so far and,
// once the call has ended, the meeting slot the customer agreed to.
import { NextResponse } from 'next/server';
import { vapi } from '@/lib/config';
import { extractMeetingSlot, toTranscript, type MeetingSlot } from '@/lib/extract-slot';

const slotCache = new Map<string, MeetingSlot | null>();

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const apiKey = vapi.apiKey();
  if (!apiKey) return NextResponse.json({ message: 'VAPI_API_KEY is not set' }, { status: 500 });
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return NextResponse.json({ message: 'Bad call id' }, { status: 400 });

  const res = await fetch(`${vapi.baseUrl()}/call/${id}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: 'no-store',
  });
  if (!res.ok) return NextResponse.json({ message: 'VAPI lookup failed' }, { status: res.status });
  const call = await res.json();

  const transcript = toTranscript(call.messages ?? call.artifact?.messages);
  let booking: MeetingSlot | null = null;

  if (call.status === 'ended') {
    const structured = call.analysis?.structuredData;
    if (structured?.start && structured?.end) {
      booking = { start: structured.start, end: structured.end };
    } else if (slotCache.has(id)) {
      booking = slotCache.get(id) ?? null;
    } else {
      booking = await extractMeetingSlot(transcript).catch(() => null);
      slotCache.set(id, booking);
    }
  }

  return NextResponse.json({
    id,
    status: call.status as string, // queued | ringing | in-progress | forwarding | ended
    endedReason: call.endedReason ?? null,
    transcript,
    booking,
  });
}
