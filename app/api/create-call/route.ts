// POST /api/create-call
// Starts an outbound VAPI call to the number the visitor typed in.
import { NextResponse } from 'next/server';
import { getAssistantId, vapi, type AgentMode } from '@/lib/config';

const MODES: AgentMode[] = ['voice-meeting-booker', 'sdr', 'reminder'];

export async function POST(request: Request) {
  const apiKey = vapi.apiKey();
  if (!apiKey) {
    return NextResponse.json(
      { message: 'VAPI_API_KEY is not set. Copy .env.example to .env.local and fill it in.' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();
    const mode: AgentMode = MODES.includes(body.pageType) ? body.pageType : 'voice-meeting-booker';
    const phoneNumberToCall = String(body.phoneNumberToCall ?? '');
    if (!/^\+1\d{10}$/.test(phoneNumberToCall)) {
      return NextResponse.json({ message: 'Enter a 10-digit US number.' }, { status: 400 });
    }

    const assistantId = getAssistantId(mode);
    const phoneNumberId = body.phoneNumberId || vapi.defaultPhoneNumberId();
    if (!assistantId || !phoneNumberId) {
      return NextResponse.json(
        { message: 'Set a VAPI assistant id and a VAPI phone number id in .env.local.' },
        { status: 500 },
      );
    }

    const agentName = body.agentName || 'Billy';
    const settings = {
      assistantId,
      phoneNumberId,
      customer: { number: phoneNumberToCall, name: body.prospectName || undefined },
      assistantOverrides: {
        name: agentName,
        ...(body.voiceAvatar ? { voice: { provider: '11labs', voiceId: body.voiceAvatar } } : {}),
        variableValues: {
          prospectName: body.prospectName ?? '',
          agentName,
          prospectInfo: body.prospectInfo ?? '',
        },
      },
    };

    const callRes = await fetch(`${vapi.baseUrl()}/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(settings),
    });

    if (!callRes.ok) {
      const details = await callRes.text();
      console.error('[create-call] VAPI error', callRes.status);
      return NextResponse.json({ message: 'VAPI call failed', details }, { status: callRes.status });
    }

    const data = await callRes.json();
    return NextResponse.json({ message: 'Call created', data: { id: data.id, status: data.status } });
  } catch (err) {
    console.error('[create-call] server error', err);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
