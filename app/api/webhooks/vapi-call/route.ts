// POST /api/webhooks/vapi-call
// Point your VAPI assistant's Server URL here. On the end-of-call report we pull the agreed
// meeting slot out of the transcript. Calendar booking is left as an integration point.
import { NextResponse } from 'next/server';
import { vapi } from '@/lib/config';
import { extractMeetingSlot, toTranscript } from '@/lib/extract-slot';

export async function POST(req: Request) {
  const secret = vapi.webhookSecret();
  if (secret && req.headers.get('x-vapi-secret') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const payload = await req.json();
  const message = payload?.message;
  if (message?.type !== 'end-of-call-report') {
    return NextResponse.json({ ok: true });
  }

  const transcript = toTranscript(message.artifact?.messages ?? message.messages);
  const slot = await extractMeetingSlot(transcript);
  if (!slot) {
    console.log('[webhook] call ended without an agreed slot', message.call?.id);
    return NextResponse.json({ ok: true, booked: false });
  }

  console.log('[webhook] appointment slot', slot);
  // Integration point: create the calendar event here, e.g. with the Google Calendar API.
  // await bookOnCalendar(slot.start, slot.end)

  return NextResponse.json({ ok: true, booked: true, slot });
}
