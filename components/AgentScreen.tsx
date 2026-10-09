'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import SettingsModal, { type AgentSettings, type CallerLine, type VoiceOption } from './SettingsModal';
import LiveCallPanel, { type CallState } from './LiveCallPanel';

export type AgentMode = 'voice-meeting-booker' | 'sdr' | 'reminder';

const COPY: Record<AgentMode, { title: string; pitch: string; accent: string; button: string }> = {
  'voice-meeting-booker': {
    title: 'Voice Meeting Booker',
    pitch: "The easiest way to book outbound client meetings. Our AI assistant calls your prospects and fills your team's calendar automatically.",
    accent: 'from-indigo-900 to-purple-900 border-purple-900/40 text-indigo-100',
    button: 'Try It Now',
  },
  sdr: {
    title: 'AI Sales Development',
    pitch: 'Our AI SDR makes outbound calls to qualify leads and book meetings. It handles objections, answers questions, and schedules demos automatically.',
    accent: 'from-slate-800 to-cyan-900 border-cyan-900/40 text-cyan-100',
    button: 'Try It Now',
  },
  reminder: {
    title: 'Invoice Payment Reminder',
    pitch: 'Our AI assistant calls customers to remind them about overdue invoices. It handles payment arrangements and provides payment options professionally.',
    accent: 'from-violet-900 to-fuchsia-800 border-fuchsia-900/40 text-fuchsia-100',
    button: 'Try It Now',
  },
};

const POLL_MS = 1200;

function formatUSPhoneNumber(value: string) {
  const d = value.replace(/\D/g, '');
  if (!d) return '';
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
}

export default function AgentScreen({ mode }: { mode: AgentMode }) {
  const copy = COPY[mode];
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [callerLines, setCallerLines] = useState<CallerLine[]>([]);
  const [settings, setSettings] = useState<AgentSettings>({
    prospectName: '',
    prospectInfo: '',
    name: 'Billy',
    selectedVoiceName: 'Billy',
    selectedLineIndex: 0,
  });
  const [call, setCall] = useState<CallState | null>(null);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((cfg) => {
        setVoices(cfg.voices ?? []);
        setCallerLines(cfg.callerLines ?? []);
        const def = (cfg.voices ?? []).find((v: VoiceOption) => v.default) ?? cfg.voices?.[0];
        if (def) setSettings((s) => ({ ...s, name: def.voicename, selectedVoiceName: def.voicename }));
      })
      .catch(() => undefined);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, []);

  const busy = !!call && call.status !== 'ended' && call.status !== 'failed';

  const validate = (n: string) => {
    const d = n.replace(/\D/g, '');
    if (!d) return setPhoneError('Phone number is required'), false;
    if (d.length !== 10) return setPhoneError('Please enter a valid 10-digit US phone number'), false;
    setPhoneError(null);
    return true;
  };

  const poll = (id: string) => {
    pollRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/call-status/${id}`, { cache: 'no-store' });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const s = await r.json();
        setCall((c) => (c && c.id === id ? { ...c, status: s.status, transcript: s.transcript ?? [], booking: s.booking ?? null, endedReason: s.endedReason } : c));
        if (s.status !== 'ended') poll(id);
      } catch {
        setCall((c) => (c ? { ...c, status: 'failed', error: 'Lost contact with the call. Check the server logs.' } : c));
      }
    }, POLL_MS);
  };

  const handleCall = async () => {
    if (busy || !validate(phoneNumber)) return;
    if (pollRef.current) clearTimeout(pollRef.current);
    const voice = voices.find((v) => v.voicename === settings.selectedVoiceName);
    const line = callerLines[settings.selectedLineIndex];
    const dialled = '+1' + phoneNumber.replace(/\D/g, '');
    setCall({ id: '', status: 'dialing', transcript: [], booking: null, number: formatUSPhoneNumber(phoneNumber), agentName: settings.name || 'Billy', prospectName: settings.prospectName });
    try {
      const res = await fetch('/api/create-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageType: mode,
          phoneNumberToCall: dialled,
          phoneNumberId: line?.phone_id || undefined,
          voiceAvatar: voice?.voice_id || undefined,
          prospectName: settings.prospectName,
          agentName: settings.name,
          prospectInfo: settings.prospectInfo,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || `HTTP ${res.status}`);
      const id = json.data?.id as string;
      setCall((c) => (c ? { ...c, id, status: json.data?.status || 'queued' } : c));
      poll(id);
    } catch (err) {
      setCall((c) => (c ? { ...c, status: 'failed', error: (err as Error).message } : c));
    }
  };

  const lineLabel = useMemo(() => callerLines[settings.selectedLineIndex]?.number, [callerLines, settings.selectedLineIndex]);

  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden antialiased">
      <div className="pointer-events-none absolute top-0 right-0 w-2/3 h-2/3 z-0" style={{ background: 'radial-gradient(ellipse at top right, rgba(255,255,255,0.10) 0%, rgba(0,0,0,0) 70%)', filter: 'blur(32px)' }} />
      <div className="absolute inset-0 pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

      <div className="relative z-10 grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-8 w-full min-h-screen max-w-screen-2xl mx-auto px-6 sm:px-12 lg:px-24 pt-24 pb-12">
        <div className="flex flex-col items-start w-full max-w-xl">
          <span className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-gray-400 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> AI voice agent
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-5 leading-[1.05] tracking-tight">{copy.title}</h1>
          <p className="text-lg text-gray-300 mb-10 max-w-lg">{copy.pitch}</p>

          <label htmlFor="phoneInput" className="text-gray-200 text-base font-semibold mb-3">Your Phone Number</label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full">
            <div className={`flex items-center flex-1 bg-black/70 rounded-full border ${phoneError ? 'border-red-500/70' : 'border-gray-700'} focus-within:border-white transition-colors`}>
              <span className="pl-6 pr-2 text-lg text-gray-400 select-none">+1</span>
              <input
                id="phoneInput"
                type="tel"
                inputMode="numeric"
                value={formatUSPhoneNumber(phoneNumber)}
                maxLength={14}
                disabled={busy}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(v);
                  if (phoneError) validate(v);
                }}
                onBlur={() => phoneNumber && validate(phoneNumber)}
                onKeyDown={(e) => e.key === 'Enter' && handleCall()}
                placeholder="(555) 010-0123"
                className="flex-1 min-w-0 bg-transparent py-4 pr-4 text-lg text-white rounded-r-full focus:outline-none placeholder-gray-600"
              />
            </div>
            <button
              type="button"
              onClick={handleCall}
              disabled={busy}
              aria-label="Call me"
              className={`flex items-center justify-center gap-2 px-8 py-4 rounded-full text-lg font-semibold shadow-lg transition-all ${busy ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-100 active:scale-[0.98]'}`}
            >
              {busy ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  On a call
                </>
              ) : (
                <>
                  {call?.status === 'ended' ? 'Call again' : copy.button}
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </>
              )}
            </button>
          </div>
          {phoneError && <p role="alert" className="text-red-400 text-sm mt-3">{phoneError}</p>}
          <p className="text-gray-400 text-sm mt-3">
            US numbers only.{lineLabel ? ` We call you from ${lineLabel}.` : ''}{' '}
            <button type="button" onClick={() => setShowSettings(true)} className="text-indigo-300 underline decoration-indigo-400/50 underline-offset-2 hover:text-white">Personalize the call</button>
          </p>
        </div>

        <div className="relative flex items-center justify-center w-full min-h-[420px]">
          {call ? (
            <LiveCallPanel call={call} mode={mode} />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/cube.png" alt="" className="hidden lg:block w-full max-w-[640px] h-auto object-contain drop-shadow-2xl" style={{ filter: 'brightness(1.1)' }} />
          )}
        </div>
      </div>

      <button
        className={`hidden sm:block absolute top-6 right-6 z-[60] bg-black/80 hover:bg-gradient-to-br ${copy.accent} p-3 rounded-full shadow-lg transition-all border`}
        aria-label="Settings"
        onClick={() => setShowSettings(true)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={settings}
        onSettingsChange={setSettings}
        voices={voices}
        callerLines={callerLines}
        mode={mode}
      />
    </div>
  );
}
