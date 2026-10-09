'use client';

import React, { useRef, useState } from 'react';
import type { AgentMode } from './AgentScreen';

export interface VoiceOption {
  voice_id: string;
  voicename: string;
  preview_audio: string;
  tags: string[];
  default?: boolean;
}

export interface CallerLine {
  phone_id: string;
  number: string;
  label: string;
}

export interface AgentSettings {
  prospectName: string;
  prospectInfo: string;
  name: string;
  selectedVoiceName: string;
  selectedLineIndex: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: AgentSettings;
  onSettingsChange: (s: AgentSettings) => void;
  voices: VoiceOption[];
  callerLines: CallerLine[];
  mode: AgentMode;
}

const LABELS: Record<AgentMode, { title: string; sub: string; who: string; info: string; infoPh: string; agent: string }> = {
  'voice-meeting-booker': {
    title: 'Personalize Your Preferences',
    sub: 'Adjust your agent and prospect details, and select your preferred voice.',
    who: 'Prospect Name',
    info: 'Prospect Information',
    infoPh: 'Enter any relevant information about the prospect here...',
    agent: 'Agent Name',
  },
  sdr: {
    title: 'SDR Call Settings',
    sub: 'Configure your SDR agent and lead information for outbound calls.',
    who: 'Lead Name',
    info: 'Lead Information',
    infoPh: 'Enter lead details, company information, and any relevant notes for the SDR call...',
    agent: 'SDR Agent Name',
  },
  reminder: {
    title: 'Billing Follow-up Settings',
    sub: 'Set up your billing agent and customer details for payment reminder calls.',
    who: 'Customer Name',
    info: 'Customer Information',
    infoPh: 'Enter customer details, payment history, and any relevant notes for the billing follow-up call...',
    agent: 'Billing Agent Name',
  },
};

const AVATAR = ['from-cyan-300 to-blue-500', 'from-purple-300 to-indigo-400', 'from-pink-300 to-pink-500', 'from-yellow-200 to-amber-400', 'from-emerald-300 to-teal-500', 'from-orange-300 to-rose-500'];

const field = 'w-full p-3 rounded-lg bg-[#161620] border border-purple-900/30 text-white focus:border-indigo-400 focus:outline-none transition placeholder-gray-500 text-sm';

export default function SettingsModal({ isOpen, onClose, settings, onSettingsChange, voices, callerLines, mode }: Props) {
  const [tab, setTab] = useState<'voice' | 'phone'>('voice');
  const [playing, setPlaying] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const L = LABELS[mode];

  if (!isOpen) return null;

  const play = (v: VoiceOption) => {
    audioRef.current?.pause();
    if (playing === v.voicename) return setPlaying(null);
    const a = new Audio(v.preview_audio);
    audioRef.current = a;
    a.play().then(() => setPlaying(v.voicename)).catch(() => setPlaying(null));
    a.onended = () => setPlaying(null);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="vmb-pop w-full max-w-3xl max-h-[92vh] bg-[#0c0c0e]/95 border border-purple-900/40 rounded-2xl shadow-2xl flex flex-col" style={{ backdropFilter: 'blur(16px)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between px-8 pt-7 pb-4 border-b border-purple-900/30">
          <div>
            <h2 className="text-xl font-semibold text-white">{L.title}</h2>
            <p className="text-xs text-gray-400 mt-1">{L.sub}</p>
          </div>
          <button className="text-indigo-300 hover:text-white text-2xl leading-none" aria-label="Close settings" onClick={onClose}>&times;</button>
        </div>

        <div className="flex flex-col md:flex-row gap-8 px-8 py-7 flex-1 overflow-y-auto">
          <div className="flex flex-col justify-between flex-1 min-w-[240px]">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">{L.who}</label>
                <input className={field} value={settings.prospectName} placeholder={L.who} onChange={(e) => onSettingsChange({ ...settings, prospectName: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 font-medium mb-1">{L.info}</label>
                <textarea className={`${field} min-h-[150px] resize-y`} value={settings.prospectInfo} placeholder={L.infoPh} onChange={(e) => onSettingsChange({ ...settings, prospectInfo: e.target.value })} />
              </div>
            </div>
            <button className="mt-6 w-full py-3 rounded-lg text-white font-semibold bg-gradient-to-br from-indigo-900 to-purple-900 border border-purple-900/40 hover:from-indigo-800 hover:to-purple-800 transition" onClick={onClose}>
              Save
            </button>
          </div>

          <div className="flex flex-col flex-1 min-w-[240px]">
            <div className="mb-4">
              <label className="block text-xs text-gray-400 font-medium mb-1">{L.agent}</label>
              <input className={field} value={settings.name} placeholder={L.agent} onChange={(e) => onSettingsChange({ ...settings, name: e.target.value })} />
            </div>

            <div className="flex mb-4 border-b border-purple-900/30">
              {(['voice', 'phone'] as const).map((t) => (
                <button key={t} className={`pb-2 px-4 font-medium text-sm ${tab === t ? 'text-indigo-300 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-indigo-200'}`} onClick={() => setTab(t)}>
                  {t === 'voice' ? 'Voice Avatar' : 'Phone Number'}
                </button>
              ))}
            </div>

            <div className="vmb-scroll flex flex-col gap-2.5 overflow-y-auto pr-2 max-h-[300px]" style={{ maskImage: 'linear-gradient(to bottom, #000 85%, transparent)' }}>
              {tab === 'voice' &&
                voices.map((v, i) => {
                  const on = settings.selectedVoiceName === v.voicename;
                  return (
                    <button
                      key={v.voicename}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, selectedVoiceName: v.voicename, name: v.voicename })}
                      className={`flex items-center w-full p-2.5 rounded-xl border text-left transition-all ${on ? 'border-indigo-500/60 bg-indigo-900/25' : 'border-purple-900/30 bg-[#161620] hover:bg-[#1c1c28]'}`}
                    >
                      <span className={`relative flex items-center justify-center w-10 h-10 mr-3 rounded-full bg-gradient-to-br ${AVATAR[i % AVATAR.length]} text-white font-bold`}>
                        {v.voicename.charAt(0)}
                        {v.preview_audio && (
                          <span
                            role="button"
                            aria-label={playing === v.voicename ? 'Stop preview' : 'Play preview'}
                            onClick={(e) => { e.stopPropagation(); play(v); }}
                            className="absolute -bottom-1.5 -right-1.5 p-1 rounded-full border-2 border-white bg-black/80 text-white text-[8px]"
                          >
                            {playing === v.voicename ? '■' : '▶'}
                          </span>
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-white">{v.voicename}</span>
                        <span className="flex flex-wrap gap-1.5 mt-0.5">
                          {v.tags.map((t) => (
                            <span key={t} className="px-1.5 py-0.5 rounded-full bg-gray-100/10 text-[11px] text-gray-200 border border-gray-600 font-medium">{t}</span>
                          ))}
                        </span>
                      </span>
                      <span className={`ml-3 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${on ? 'bg-white' : ''}`}>{on && <span className="w-2 h-2 rounded-full bg-black" />}</span>
                    </button>
                  );
                })}
              {tab === 'phone' &&
                callerLines.map((p, i) => {
                  const on = settings.selectedLineIndex === i;
                  return (
                    <button
                      key={`${p.number}-${i}`}
                      type="button"
                      onClick={() => onSettingsChange({ ...settings, selectedLineIndex: i })}
                      className={`flex items-center w-full p-3 rounded-xl border text-left transition-all ${on ? 'border-indigo-500/60 bg-indigo-900/25' : 'border-purple-900/30 bg-[#161620] hover:bg-[#1c1c28]'}`}
                    >
                      <span className="flex items-center justify-center w-10 h-10 mr-3 rounded-full bg-gradient-to-br from-blue-300 to-indigo-500">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-white">{p.number}</span>
                        <span className="block text-xs text-gray-400">{p.label}</span>
                      </span>
                      <span className={`ml-3 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center ${on ? 'bg-white' : ''}`}>{on && <span className="w-2 h-2 rounded-full bg-black" />}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
