// GET /api/config - the voice personas and caller lines the settings panel can offer.
import { NextResponse } from 'next/server';
import { getCallerLines, getVoices } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ voices: getVoices(), callerLines: getCallerLines() });
}
