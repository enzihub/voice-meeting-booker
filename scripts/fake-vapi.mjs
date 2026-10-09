// Local demo: a tiny fake of the two VAPI endpoints this app uses (POST /call, GET /call/:id),
// then `next dev` pointed at it. No keys, no real phone calls. All people, companies and numbers
// in the scripts below are invented.
//
//   npm run demo            -> http://127.0.0.1:3000
//   FAKE_ONLY=1 npm run demo  (just the fake API on :4010)
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.FAKE_VAPI_PORT || 4010);
const APP_PORT = Number(process.env.PORT || 3000);
const SPEED = Number(process.env.FAKE_VAPI_SPEED || 1); // 2 = twice as fast

// Next Tuesday at 14:30 in New York (fixed -04:00 offset is fine for a demo).
function nextTuesday() {
  const d = new Date();
  const add = ((2 - d.getDay() + 7) % 7) || 7;
  d.setDate(d.getDate() + add);
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return { start: `${ymd}T14:30:00-04:00`, end: `${ymd}T15:00:00-04:00` };
}

const SCRIPTS = {
  'voice-meeting-booker': (agent, who) => [
    ['bot', `Hi${who ? ` ${who}` : ''}, this is ${agent} calling from Brightline Studio. Have I caught you at an okay time?`],
    ['user', 'Yeah, I have a minute. What is this about?'],
    ['bot', 'You asked for a walkthrough of our booking tools last week. I can set up a 30-minute call with our team. Would early next week work?'],
    ['user', 'Tuesday afternoon is best for me. Maybe around 2:30?'],
    ['bot', 'Tuesday at 2:30 PM Eastern for 30 minutes. I have you down. You will get a calendar invite in a moment.'],
    ['user', 'Perfect, thanks.'],
    ['bot', 'Thanks for your time. Have a great day!'],
  ],
  sdr: (agent, who) => [
    ['bot', `Hi${who ? ` ${who}` : ''}, ${agent} here from Brightline Studio. Do you handle front-desk scheduling at your clinic?`],
    ['user', 'I do. We lose a lot of time on the phones, honestly.'],
    ['bot', 'That is exactly what we help with. Could I book you a short demo with our team?'],
    ['user', 'Sure. Tuesday at 2:30 works.'],
    ['bot', 'Booked for Tuesday at 2:30 PM. Talk soon!'],
  ],
  reminder: (agent, who) => [
    ['bot', `Hello${who ? ` ${who}` : ''}, this is ${agent} from Brightline Studio accounts. I am calling about invoice 1042, which is now 14 days overdue.`],
    ['user', 'Ah, sorry. Can we go through it together next week?'],
    ['bot', 'Of course. Would Tuesday at 2:30 PM suit you for a short call with billing?'],
    ['user', 'Yes, that is fine.'],
    ['bot', 'Great, I have booked it. Thank you!'],
  ],
};

const calls = new Map();
const json = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

function view(c) {
  const t = ((Date.now() - c.t0) / 1000) * SPEED;
  const LIVE = 2.6, STEP = 1.9;
  const lines = c.script;
  const endAt = LIVE + lines.length * STEP + 0.8;
  let status = 'queued';
  if (t > 0.5) status = 'ringing';
  if (t > LIVE - 0.4) status = 'in-progress';
  if (t > endAt) status = 'ended';
  const shown = status === 'ended' ? lines.length : Math.max(0, Math.min(lines.length, Math.floor((t - LIVE) / STEP) + 1));
  const messages = lines.slice(0, t < LIVE ? 0 : shown).map(([role, message], i) => ({ role, message, secondsFromStart: i * STEP }));
  return {
    id: c.id,
    type: 'outboundPhoneCall',
    status,
    customer: c.customer,
    messages,
    ...(status === 'ended' ? { endedReason: 'assistant-ended-call', analysis: { structuredData: c.slot } } : {}),
  };
}

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (d) => (body += d));
  req.on('end', () => {
    const url = new URL(req.url, 'http://x');
    if (req.method === 'POST' && url.pathname === '/call') {
      const b = JSON.parse(body || '{}');
      const id = randomUUID();
      const mode = (b.assistantId || '').replace(/^demo-/, '');
      const make = SCRIPTS[mode] || SCRIPTS['voice-meeting-booker'];
      const agent = b.assistantOverrides?.name || 'Billy';
      const who = b.assistantOverrides?.variableValues?.prospectName || '';
      calls.set(id, { id, t0: Date.now(), customer: b.customer, script: make(agent, who), slot: nextTuesday() });
      return json(res, 201, { id, status: 'queued' });
    }
    const m = /^\/call\/([\w-]+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const c = calls.get(m[1]);
      return c ? json(res, 200, view(c)) : json(res, 404, { message: 'not found' });
    }
    json(res, 404, { message: 'not found' });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[fake-vapi] listening on http://127.0.0.1:${PORT}`);
  if (process.env.FAKE_ONLY) return;
  const env = {
    ...process.env,
    VAPI_BASE_URL: `http://127.0.0.1:${PORT}`,
    VAPI_API_KEY: 'demo',
    VAPI_ASSISTANT_ID_MEETING_BOOKER: 'demo-voice-meeting-booker',
    VAPI_ASSISTANT_ID_SDR: 'demo-sdr',
    VAPI_ASSISTANT_ID_REMINDER: 'demo-reminder',
    VAPI_PHONE_NUMBER_ID: 'demo-line',
    OPENAI_API_KEY: '',
  };
  const child = spawn('npx', ['next', 'dev', '-H', '127.0.0.1', '-p', String(APP_PORT)], { env, stdio: 'inherit' });
  const stop = () => { child.kill('SIGTERM'); server.close(); process.exit(0); };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  child.on('exit', (code) => { server.close(); process.exit(code ?? 0); });
});
