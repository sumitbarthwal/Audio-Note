import React, { useState, useEffect } from 'react';
import { audioEngine } from '../lib/audioEngine';
import { Moon, X, Clock, Check } from 'lucide-react';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({ isOpen, onClose }) => {
  const [timerStatus, setTimerStatus] = useState(audioEngine.getSleepTimerStatus());

  useEffect(() => {
    if (isOpen) {
      setTimerStatus(audioEngine.getSleepTimerStatus());
      const interval = setInterval(() => {
        setTimerStatus(audioEngine.getSleepTimerStatus());
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSetTimer = (val: number | 'end_of_section') => {
    audioEngine.setSleepTimer(val);
    setTimerStatus(audioEngine.getSleepTimerStatus());
    onClose();
  };

  const handleCancelTimer = () => {
    audioEngine.clearSleepTimer();
    setTimerStatus(audioEngine.getSleepTimerStatus());
  };

  const presets = [5, 10, 15, 30, 45, 60];

  return (
    <div
      id="sleep-timer-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
    >
      <div
        id="sleep-timer-modal"
        className="w-full max-w-sm rounded-3xl bg-[#0D0F16] border border-white/10 shadow-2xl p-6 text-slate-100"
      >
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <h3 className="font-bold text-white text-sm">Sleep Timer</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {timerStatus.active && (
          <div className="mt-4 p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-indigo-200">
              <Clock className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>
                {timerStatus.stopAtEndOfSection
                  ? 'Pausing at end of current section'
                  : `Stopping in ~${timerStatus.minutesRemaining} min`}
              </span>
            </div>
            <button
              onClick={handleCancelTimer}
              className="text-xs text-rose-400 hover:text-rose-300 font-medium px-2.5 py-1 rounded-full bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition"
            >
              Turn Off
            </button>
          </div>
        )}

        <div className="mt-5 space-y-2.5">
          <div className="grid grid-cols-3 gap-2">
            {presets.map((mins) => (
              <button
                key={mins}
                onClick={() => handleSetTimer(mins)}
                className="py-3 px-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 text-xs font-mono font-medium text-slate-200 hover:text-white transition active:scale-95"
              >
                {mins} mins
              </button>
            ))}
          </div>

          <button
            onClick={() => handleSetTimer('end_of_section')}
            className={`w-full py-3 px-4 rounded-2xl text-xs font-medium flex items-center justify-center gap-2 border transition active:scale-95 ${
              timerStatus.stopAtEndOfSection
                ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                : 'bg-white/[0.03] hover:bg-white/[0.08] text-slate-200 border-white/5 hover:border-white/15'
            }`}
          >
            {timerStatus.stopAtEndOfSection && <Check className="w-3.5 h-3.5 text-indigo-400" />}
            End of Current Section
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
