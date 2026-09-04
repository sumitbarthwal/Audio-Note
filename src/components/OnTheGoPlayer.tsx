import React, { useState, useEffect } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { DocumentItem, PlaybackState } from '../types';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  X,
  Gauge,
  Moon,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
} from 'lucide-react';

interface OnTheGoPlayerProps {
  document: DocumentItem | null;
  onClose: () => void;
  onOpenVoiceSettings: () => void;
  onOpenSleepTimer: () => void;
}

export const OnTheGoPlayer: React.FC<OnTheGoPlayerProps> = ({
  document,
  onClose,
  onOpenVoiceSettings,
  onOpenSleepTimer,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>(audioEngine.getState());
  const [timerStatus, setTimerStatus] = useState(audioEngine.getSleepTimerStatus());
  const [voiceSettings, setVoiceSettings] = useState(audioEngine.getVoiceSettings());
  const [isTouchLocked, setIsTouchLocked] = useState(false);
  const [isOledMode, setIsOledMode] = useState(true);

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
    if (isTouchLocked) return;
    const speeds = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currentRate = voiceSettings.rate;
    const currentIndex = speeds.findIndex((s) => Math.abs(s - currentRate) < 0.1);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length];
    audioEngine.setVoiceSettings({ rate: nextSpeed });
    setVoiceSettings(audioEngine.getVoiceSettings());
  };

  const handlePrevSection = () => {
    if (isTouchLocked) return;
    audioEngine.skipBackward();
  };

  const handleNextSection = () => {
    if (isTouchLocked) return;
    audioEngine.skipForward();
  };

  const handleTogglePlay = () => {
    if (isTouchLocked) return;
    audioEngine.togglePlayPause();
  };

  // Extract surrounding context text for display
  const currentText = currentSection?.text || '';
  const currentWordOffset = playbackState.currentWordIndex;
  const beforeWord = currentText.slice(0, currentWordOffset);
  const afterWord = currentText.slice(currentWordOffset + (playbackState.currentWord.length || 0));

  return (
    <div
      id="onthego-player-container"
      className={`fixed inset-0 z-50 flex flex-col justify-between select-none transition-colors duration-300 relative overflow-hidden ${
        isOledMode ? 'bg-black text-white' : 'bg-[#0A0B10] text-slate-100'
      }`}
    >
      {/* Immersive ambient glows (shown in dark mode) */}
      {!isOledMode && (
        <>
          <div className="absolute top-[-100px] left-[-100px] w-[450px] h-[450px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />
        </>
      )}

      {/* Top Bar with Minimal Header */}
      <header className="p-4 sm:p-6 flex items-center justify-between border-b border-white/5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <div>
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">
              ON THE GO • OFFLINE AUDIO
            </span>
            <h2 className="text-sm sm:text-base font-bold truncate max-w-[240px] sm:max-w-md text-white">
              {document.title}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* OLED Toggle */}
          <button
            onClick={() => setIsOledMode(!isOledMode)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              isOledMode
                ? 'bg-white/10 border-white/20 text-white'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle True Black OLED battery saver"
          >
            {isOledMode ? 'OLED' : 'Dark'}
          </button>

          {/* Touch Lock Toggle */}
          <button
            id="onthego-touch-lock-btn"
            onClick={() => setIsTouchLocked(!isTouchLocked)}
            className={`p-2.5 rounded-full border transition ${
              isTouchLocked
                ? 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/40'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={isTouchLocked ? 'Unlock Controls' : 'Lock controls against pocket touches'}
          >
            {isTouchLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Close / Return to Reader */}
          <button
            id="onthego-close-btn"
            onClick={onClose}
            className="p-2.5 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition"
            title="Return to standard reader"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Lock banner if locked */}
      {isTouchLocked && (
        <div className="bg-amber-500/10 border-y border-amber-500/30 py-2 px-4 text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-2 animate-in fade-in relative z-10">
          <Lock className="w-3.5 h-3.5" />
          <span>Touch Lock Active — Tap lock button at top right to unlock</span>
        </div>
      )}

      {/* Center Reading Canvas (Large Spoken Text for Glancing while on the move) */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 sm:p-12 text-center max-w-4xl mx-auto overflow-hidden relative z-10">
        {/* Section title & progress */}
        <div className="mb-5 inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.03] border border-white/5 text-xs text-slate-400 font-mono">
          <span>{currentSection?.title || `Section ${playbackState.currentSectionIndex + 1}`}</span>
          <span>•</span>
          <span>
            {playbackState.currentSectionIndex + 1} of {totalSections}
          </span>
        </div>

        {/* Large spoken paragraph with highlighting */}
        <div className="w-full max-h-[42vh] overflow-y-auto px-4 py-2 font-medium text-xl sm:text-2xl md:text-3xl leading-relaxed text-slate-300 scroll-smooth">
          {currentText ? (
            <span>
              <span className="text-slate-500">{beforeWord}</span>
              <span className="bg-indigo-500 text-white font-bold px-2 py-0.5 rounded-lg shadow-xl shadow-indigo-500/40">
                {playbackState.currentWord || '▶'}
              </span>
              <span className="text-slate-200">{afterWord}</span>
            </span>
          ) : (
            <span className="text-slate-600 italic">No text in current section</span>
          )}
        </div>

        {/* Section scrubber */}
        <div className="w-full max-w-md mt-8 space-y-2">
          <div
            className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden cursor-pointer border border-white/5"
            onClick={(e) => {
              if (isTouchLocked) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              const target = Math.floor(ratio * totalSections);
              audioEngine.jumpToSection(target);
            }}
          >
            <div
              className="h-full bg-indigo-500 transition-all rounded-full shadow-[0_0_10px_rgba(99,102,241,0.6)]"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs font-mono text-slate-500 px-1">
            <span>{Math.round(progressPercent)}% Completed</span>
            <span>{totalSections - playbackState.currentSectionIndex - 1} parts remaining</span>
          </div>
        </div>
      </main>

      {/* Massive On-The-Go Touch Controls (Specially crafted for one-hand / car / walking usage) */}
      <footer className="p-6 sm:p-10 border-t border-white/5 bg-[#0D0F16]/90 backdrop-blur-xl relative z-10">
        {/* Quick adjustments row */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 mb-6">
          <button
            onClick={cycleSpeed}
            disabled={isTouchLocked}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-medium text-indigo-300 hover:text-white hover:bg-white/10 transition active:scale-95 disabled:opacity-50"
          >
            <Gauge className="w-4 h-4 text-indigo-400" />
            <span>{voiceSettings.rate}x Speed</span>
          </button>

          <button
            onClick={onOpenSleepTimer}
            disabled={isTouchLocked}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-medium transition active:scale-95 disabled:opacity-50 ${
              timerStatus.active
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Moon className="w-4 h-4 text-indigo-400" />
            <span>
              {timerStatus.active
                ? timerStatus.stopAtEndOfSection
                  ? 'End of Part'
                  : `Timer: ${timerStatus.minutesRemaining}m`
                : 'Sleep Timer'}
            </span>
          </button>

          <button
            onClick={onOpenVoiceSettings}
            disabled={isTouchLocked}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-slate-300 hover:bg-white/10 transition active:scale-95 disabled:opacity-50"
          >
            <Volume2 className="w-4 h-4 text-indigo-400" />
            <span className="hidden sm:inline">Voice</span>
          </button>
        </div>

        {/* Massive Touch Buttons Row */}
        <div className="flex items-center justify-center gap-4 sm:gap-8">
          {/* Previous Section */}
          <button
            id="onthego-prev-btn"
            onClick={handlePrevSection}
            disabled={isTouchLocked}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40 shadow-lg"
            title="Previous Section"
          >
            <SkipBack className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>

          {/* 15s Rewind */}
          <button
            id="onthego-rewind-btn"
            onClick={() => !isTouchLocked && audioEngine.skipBackward()}
            disabled={isTouchLocked}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40 shadow-lg relative"
            title="Restart / Skip back"
          >
            <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="absolute bottom-1 font-mono text-[9px] font-bold text-indigo-400">15s</span>
          </button>

          {/* Giant Central Play/Pause Toggle */}
          <button
            id="onthego-play-pause-btn"
            onClick={handleTogglePlay}
            disabled={isTouchLocked}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center shadow-2xl bg-indigo-500 hover:bg-indigo-400 text-white shadow-indigo-500/40 hover:scale-105 transition-all active:scale-95 disabled:opacity-40"
            title={playbackState.isPlaying ? 'Pause Audio' : 'Play Audio'}
          >
            {playbackState.isPlaying ? (
              <Pause className="w-10 h-10 sm:w-12 sm:h-12 fill-current" />
            ) : (
              <Play className="w-10 h-10 sm:w-12 sm:h-12 fill-current ml-1" />
            )}
          </button>

          {/* 15s Forward */}
          <button
            id="onthego-forward-btn"
            onClick={() => !isTouchLocked && audioEngine.skipForward()}
            disabled={isTouchLocked}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40 shadow-lg relative"
            title="Skip forward"
          >
            <RotateCw className="w-6 h-6 sm:w-7 sm:h-7" />
            <span className="absolute bottom-1 font-mono text-[9px] font-bold text-indigo-400">15s</span>
          </button>

          {/* Next Section */}
          <button
            id="onthego-next-btn"
            onClick={handleNextSection}
            disabled={isTouchLocked}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 flex items-center justify-center transition active:scale-90 disabled:opacity-40 shadow-lg"
            title="Next Section"
          >
            <SkipForward className="w-6 h-6 sm:w-7 sm:h-7" />
          </button>
        </div>
      </footer>
    </div>
  );
};
