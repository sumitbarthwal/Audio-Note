import React, { useState, useEffect, useMemo } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { VoiceSettings } from '../types';
import { X, Volume2, Gauge, Sliders, Check, Globe } from 'lucide-react';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<VoiceSettings>(audioEngine.getVoiceSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedLang, setSelectedLang] = useState('all');

  useEffect(() => {
    if (isOpen) {
      setSettings(audioEngine.getVoiceSettings());
      setVoices(audioEngine.getAvailableVoices());
    }
  }, [isOpen]);

  const uniqueLanguages = useMemo(() => {
    const langs = new Set<string>();
    voices.forEach((v) => {
      const prefix = v.lang.split('-')[0].toLowerCase();
      langs.add(prefix);
    });
    return Array.from(langs).sort();
  }, [voices]);

  const filteredVoices = useMemo(() => {
    return voices.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        v.lang.toLowerCase().includes(searchFilter.toLowerCase());
      const matchesLang =
        selectedLang === 'all' || v.lang.toLowerCase().startsWith(selectedLang.toLowerCase());
      return matchesSearch && matchesLang;
    });
  }, [voices, searchFilter, selectedLang]);

  if (!isOpen) return null;

  const handleRateChange = (newRate: number) => {
    const updated = { ...settings, rate: newRate };
    setSettings(updated);
    audioEngine.setVoiceSettings({ rate: newRate });
  };

  const handlePitchChange = (newPitch: number) => {
    const updated = { ...settings, pitch: newPitch };
    setSettings(updated);
    audioEngine.setVoiceSettings({ pitch: newPitch });
  };

  const handleVolumeChange = (newVol: number) => {
    const updated = { ...settings, volume: newVol };
    setSettings(updated);
    audioEngine.setVoiceSettings({ volume: newVol });
  };

  const handleSelectVoice = (voiceURI: string, lang: string) => {
    const updated = { ...settings, voiceURI, lang };
    setSettings(updated);
    audioEngine.setVoiceSettings({ voiceURI, lang });
  };

  const handleTestVoice = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const testUtterance = new SpeechSynthesisUtterance('Offline audio reader is ready for listening on the go.');
      if (settings.voiceURI) {
        const v = voices.find((voc) => voc.voiceURI === settings.voiceURI);
        if (v) testUtterance.voice = v;
      }
      testUtterance.rate = settings.rate;
      testUtterance.pitch = settings.pitch;
      testUtterance.volume = settings.volume;
      window.speechSynthesis.speak(testUtterance);
    }
  };

  return (
    <div
      id="voice-settings-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        id="voice-settings-modal"
        className="w-full max-w-lg rounded-3xl bg-[#0D0F16] border border-white/10 shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.01]">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Sliders className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Voice & Speech Settings</h2>
              <p className="text-[11px] text-slate-500">Offline speech engine parameters</p>
            </div>
          </div>
          <button
            id="close-voice-settings-btn"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Rate / Speed Control */}
          <div className="space-y-2.5 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-slate-300">
                <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                Reading Speed
              </span>
              <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                {settings.rate.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.05"
              value={settings.rate}
              onChange={(e) => handleRateChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
            />
            <div className="flex items-center justify-between gap-1 pt-1">
              {[0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleRateChange(preset)}
                  className={`px-2.5 py-1 text-xs rounded-lg font-mono font-medium transition ${
                    Math.abs(settings.rate - preset) < 0.03
                      ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border border-white/5'
                  }`}
                >
                  {preset}x
                </button>
              ))}
            </div>
          </div>

          {/* Pitch & Volume Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300">Pitch</span>
                <span className="font-mono text-slate-400">{settings.pitch.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.4"
                step="0.1"
                value={settings.pitch}
                onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>

            <div className="space-y-2 bg-white/[0.02] p-4 rounded-2xl border border-white/5">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 font-medium text-slate-300">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                  Volume
                </span>
                <span className="font-mono text-slate-400">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Voice Picker */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                Available Offline Synthesizers ({voices.length})
              </label>
              <button
                type="button"
                onClick={handleTestVoice}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1.5 hover:underline"
              >
                <Volume2 className="w-3.5 h-3.5" /> Test Voice
              </button>
            </div>

            {/* Filter inputs */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search voice name..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-[#0D0F16] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="all">All Langs</option>
                {uniqueLanguages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Voice List */}
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 rounded-2xl border border-white/5 bg-white/[0.01] p-2">
              {filteredVoices.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No matching voices found. System default voice will be used.
                </div>
              ) : (
                filteredVoices.map((v) => {
                  const isSelected = settings.voiceURI === v.voiceURI;
                  return (
                    <button
                      key={v.voiceURI}
                      type="button"
                      onClick={() => handleSelectVoice(v.voiceURI, v.lang)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-between transition ${
                        isSelected
                          ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-200'
                          : 'bg-white/[0.02] hover:bg-white/[0.05] text-slate-300 border border-white/5'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <div className="font-medium truncate">{v.name}</div>
                        <div className="text-[10px] font-mono text-slate-500">
                          {v.lang} {v.default ? '• Default' : ''} {v.localService ? '• Offline Native' : ''}
                        </div>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            Voices use your device's built-in offline speech synthesizer.
          </p>
          <button
            id="done-voice-settings-btn"
            onClick={onClose}
            className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-full shadow-lg shadow-indigo-500/20 transition active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
