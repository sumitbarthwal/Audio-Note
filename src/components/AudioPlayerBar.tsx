import React, { useState, useEffect } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { DocumentItem, PlaybackState } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Headphones,
  Moon,
  Sliders,
  Maximize2,
} from 'lucide-react';

interface AudioPlayerBarProps {
  document: DocumentItem | null;
  onOpenVoiceSettings: () => void;
  onOpenSleepTimer: () => void;
  onOpenOnTheGo: () => void;
}

export const AudioPlayerBar: React.FC<AudioPlayerBarProps> = ({
  document,
  onOpenVoiceSettings,
  onOpenSleepTimer,
  onOpenOnTheGo,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(audioEngine.getState());
  const [timerStatus, setTimerStatus] = useState(audioEngine.getSleepTimerStatus());
  const [voiceSettings, setVoiceSettings] = useState(audioEngine.getVoiceSettings());

  useEffect(() => {
    const unsub = audioEngine.subscribe((state) => {
      setPlaybackState(state);
      setTimerStatus(audioEngine.getSleepTimerStatus());
      setVoiceSettings(audioEngine.getVoiceSettings());
    });
    return unsub;
  }, []);

  if (!document) return null;

  const currentSection = document.sections[playbackState.currentSectionIndex];
  const totalSections = document.sections.length;
  const progressPercent = totalSections > 0 ? ((playbackState.currentSectionIndex + 1) / totalSections) * 100 : 0;

  const cycleSpeed = () => {
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentRate = voiceSettings.rate;
    const currentIndex = speeds.findIndex((s) => Math.abs(s - currentRate) < 0.1);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    audioEngine.setVoiceSettings({ rate: nextSpeed });
    setVoiceSettings(audioEngine.getVoiceSettings());
  };

  return (
    <div
      id="audio-player-bar"
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F16]/90 backdrop-blur-xl border-t border-white/5 shadow-2xl px-4 sm:px-8 py-3 transition-all"
    >
      {/* Top progress scrubber line */}
      <div
        className="absolute top-0 left-0 right-0 h-1 bg-slate-800 cursor-pointer group"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const ratio = clickX / rect.width;
          const targetSection = Math.floor(ratio * totalSections);
          audioEngine.jumpToSection(targetSection);
        }}
      >
        <div
          className="h-full bg-indigo-500 group-hover:bg-indigo-400 transition-all relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 pt-1">
        {/* Document info */}
        <div className="flex items-center gap-3 min-w-0 max-w-[30%] sm:max-w-[34%] md:max-w-[38%]">
          <button
            onClick={onOpenOnTheGo}
            className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0 shadow-md hover:scale-105 transition"
            title="Open On-The-Go Listening Mode"
          >
            <Headphones className="w-5 h-5 text-indigo-400" />
          </button>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-white truncate" title={document.title}>
              {document.title}
            </h4>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-mono text-slate-400 truncate">
                {currentSection?.title || `Section ${playbackState.currentSectionIndex + 1}`} • {playbackState.currentSectionIndex + 1}/{totalSections}
              </p>
              {playbackState.isPlaying && (
                <div className="hidden sm:flex items-end gap-0.5 h-3">
                  <span className="w-0.5 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  <span className="w-0.5 h-3 bg-indigo-400 rounded-full animate-pulse delay-75" />
                  <span className="w-0.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-150" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Center transport controls */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <button
            id="bar-skip-prev-btn"
            onClick={() => audioEngine.skipBackward()}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition active:scale-95"
            title="Previous section / restart section"
          >
            <SkipBack className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            id="bar-play-pause-btn"
            onClick={() => audioEngine.togglePlayPause()}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 hover:scale-105 transition active:scale-95"
            title={playbackState.isPlaying ? 'Pause' : 'Play'}
          >
            {playbackState.isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
            )}
          </button>

          <button
            id="bar-skip-next-btn"
            onClick={() => audioEngine.skipForward()}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition active:scale-95"
            title="Next section"
          >
            <SkipForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* Right utility buttons */}
        <div className="flex items-center gap-2">
          {/* Speed cycle button */}
          <button
            id="speed-cycle-btn"
            onClick={cycleSpeed}
            className="px-2.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium text-indigo-400 hover:text-white transition active:scale-95"
            title="Change reading speed"
          >
            {voiceSettings.rate}x
          </button>

          {/* Sleep timer button */}
          <button
            id="bar-sleep-timer-btn"
            onClick={onOpenSleepTimer}
            className={`p-2 rounded-xl border transition relative ${
              timerStatus.active
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/5 hover:bg-white/10 border-white/5 text-slate-400 hover:text-white'
            }`}
            title="Sleep Timer"
          >
            <Moon className="w-4 h-4" />
            {timerStatus.active && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            )}
          </button>

          {/* Voice settings */}
          <button
            id="bar-voice-settings-btn"
            onClick={onOpenVoiceSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition"
            title="Voice & Pitch Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          {/* On-The-Go Mode Button */}
          <button
            id="bar-onthego-btn"
            onClick={onOpenOnTheGo}
            className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-200 hover:text-indigo-300 transition active:scale-95"
            title="Expand into full-screen On-The-Go Mode"
          >
            <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>On The Go</span>
          </button>
        </div>
      </div>
    </div>
  );
};
