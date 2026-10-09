'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { AgentMode } from './AgentScreen';

export interface TranscriptLine {
  speaker: 'assistant' | 'customer';
  text: string;
}

export interface CallState {
  id: string;
  status: string; // dialing | queued | ringing | in-progress | forwarding | ended | failed
  transcript: TranscriptLine[];
  booking: { start: string; end: string } | null;
  number: string;
  agentName: string;
  prospectName?: string;
  endedReason?: string | null;
  error?: string;
}

const STATUS_LABEL: Record<string, string> = {
  dialing: 'Starting call',
  queued: 'Queued',
  ringing: 'Ringing',
  'in-progress': 'Live',
  forwarding: 'Forwarding',
  ended: 'Call ended',
  failed: 'Call failed',
};

const DONE_LABEL: Record<AgentMode, string> = {
  'voice-meeting-booker': 'Meeting booked',
  sdr: 'Demo booked',
  reminder: 'Payment call booked',
};

// Show the slot in the wall-clock time the customer agreed to (the offset in the ISO string),
// not in the browser's time zone.
function wallClock(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : null;
}

function fmtSlot(start: string, end: string) {
  const s = wallClock(start);
  const e = wallClock(end);
  if (!s || !e) return { day: start, time: '', month: '', date: '' };
  const o = { timeZone: 'UTC' } as const;
  const day = s.toLocaleDateString('en-US', { ...o, weekday: 'long', month: 'long', day: 'numeric' });
  const t = (d: Date) => d.toLocaleTimeString('en-US', { ...o, hour: 'numeric', minute: '2-digit' });
  const mins = Math.round((e.getTime() - s.getTime()) / 60000);
  const off = /([+-])(\d{2}):?(\d{2})$/.exec(start);
  const tz = off ? `UTC${off[1]}${+off[2]}${off[3] !== '00' ? ':' + off[3] : ''}` : '';
  return { day: `${day}, ${s.getUTCFullYear()}`, time: `${t(s)} – ${t(e)}${tz ? ` ${tz}` : ''}`, mins, month: s.toLocaleDateString('en-US', { ...o, month: 'short' }), date: String(s.getUTCDate()) };
}

export default function LiveCallPanel({ call, mode }: { call: CallState; mode: AgentMode }) {
  const [seconds, setSeconds] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const live = call.status === 'in-progress';
  const ended = call.status === 'ended';
  const failed = call.status === 'failed';

  useEffect(() => {
    if (!live) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [live]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [call.transcript.length]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const slot = call.booking ? fmtSlot(call.booking.start, call.booking.end) : null;

  return (
    <div className="vmb-pop w-full max-w-[560px] rounded-3xl border border-white/10 bg-[#0b0b12]/90 shadow-[0_30px_120px_-20px_rgba(99,102,241,0.35)] backdrop-blur-xl overflow-hidden" data-testid="live-call">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10">
        <div className="relative w-12 h-12 shrink-0">
          {(live || call.status === 'ringing') && <span className="vmb-ring absolute inset-0 rounded-full bg-indigo-500/40" />}
          <span className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-600 text-white font-bold text-lg">
            {call.agentName.charAt(0)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white font-semibold truncate">
            {call.agentName} <span className="text-gray-500 font-normal">calling</span> {call.prospectName || call.number}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 font-mono">+1 {call.number}</div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
              live ? 'bg-emerald-500/15 text-emerald-300' : ended ? 'bg-white/10 text-gray-300' : failed ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'
            }`}
            data-testid="call-status"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${live ? 'bg-emerald-400' : ended ? 'bg-gray-400' : failed ? 'bg-red-400' : 'bg-amber-400'}`} />
            {STATUS_LABEL[call.status] ?? call.status}
          </span>
          {(live || ended) && <span className="text-xs text-gray-500 font-mono tabular-nums">{mm}:{ss}</span>}
        </div>
      </div>

      {/* Waveform */}
      <div className="flex items-center justify-center gap-[3px] h-14 px-6 border-b border-white/5" aria-hidden>
        {Array.from({ length: 44 }).map((_, i) => (
          <span
            key={i}
            className={`w-[3px] rounded-full ${live ? 'vmb-bar bg-gradient-to-t from-indigo-500 to-cyan-300' : 'bg-white/15'}`}
            style={{ height: live ? `${18 + ((i * 37) % 26)}px` : '4px', animationDelay: `${(i % 11) * 0.07}s` }}
          />
        ))}
      </div>

      {/* Transcript */}
      <div className="px-6 pt-4 pb-2">
        <div className="text-[11px] uppercase tracking-[0.18em] text-gray-500 mb-3">Live transcript</div>
        <ul ref={listRef} className="vmb-scroll space-y-3 max-h-[300px] overflow-y-auto pr-1" data-testid="transcript">
          {call.transcript.length === 0 && !failed && (
            <li className="text-sm text-gray-500 italic">{call.status === 'dialing' || call.status === 'queued' ? 'Connecting…' : 'Waiting for the first words…'}</li>
          )}
          {call.transcript.map((l, i) => (
            <li key={i} className={`vmb-in flex ${l.speaker === 'assistant' ? 'justify-start' : 'justify-end'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
                  l.speaker === 'assistant' ? 'bg-indigo-500/15 text-indigo-50 rounded-tl-md' : 'bg-white/10 text-gray-100 rounded-tr-md'
                }`}
              >
                <div className={`text-[10px] uppercase tracking-wider mb-0.5 ${l.speaker === 'assistant' ? 'text-indigo-300' : 'text-gray-400'}`}>
                  {l.speaker === 'assistant' ? `${call.agentName} · AI` : call.prospectName || 'Customer'}
                </div>
                {l.text}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Outcome */}
      <div className="px-6 pb-6 pt-3">
        {failed && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm px-4 py-3">{call.error || 'The call could not be started.'}</div>}
        {ended && slot && (
          <div className="vmb-pop rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 to-cyan-500/10 px-5 py-4 flex items-center gap-4" data-testid="booking">
            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white text-gray-900 shrink-0 shadow">
              <span className="text-[10px] font-bold uppercase text-red-500 leading-none">{slot.month}</span>
              <span className="text-2xl font-extrabold leading-none mt-0.5">{slot.date}</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-emerald-300 text-sm font-semibold">
                <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.7 5.3a1 1 0 010 1.4l-8 8a1 1 0 01-1.4 0l-4-4a1 1 0 011.4-1.4L8 12.6l7.3-7.3a1 1 0 011.4 0z" clipRule="evenodd" /></svg>
                {DONE_LABEL[mode]}
              </div>
              <div className="text-white font-semibold mt-0.5">{slot.day}</div>
              <div className="text-gray-300 text-sm">{slot.time}{slot.mins ? ` · ${slot.mins} min` : ''}</div>
            </div>
          </div>
        )}
        {ended && !slot && (
          <div className="rounded-2xl border border-white/10 bg-white/5 text-gray-300 text-sm px-4 py-3">The call ended without an agreed time.</div>
        )}
      </div>
    </div>
  );
}
