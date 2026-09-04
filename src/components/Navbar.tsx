import React from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import { Headphones, BookOpen, Sliders, Moon, Maximize2 } from 'lucide-react';

interface NavbarProps {
  currentView: 'library' | 'reader';
  hasActiveDocument: boolean;
  onSelectView: (view: 'library' | 'reader') => void;
  onOpenVoiceSettings: () => void;
  onOpenSleepTimer: () => void;
  onOpenOnTheGo: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  hasActiveDocument,
  onSelectView,
  onOpenVoiceSettings,
  onOpenSleepTimer,
  onOpenOnTheGo,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#0D0F16]/80 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-3.5 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => onSelectView('library')}
          className="flex items-center gap-3 cursor-pointer group select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center text-white font-black shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition">
            <Headphones className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
              AudioReader
              <span className="hidden sm:inline text-[9px] uppercase font-bold tracking-widest text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Offline
              </span>
            </span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest hidden sm:block">
              PDF & Document Speech
            </p>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-white/[0.03] border border-white/5 p-1 rounded-xl backdrop-blur-sm">
          <button
            id="nav-library-tab"
            onClick={() => onSelectView('library')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === 'library'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Library
          </button>
          <button
            id="nav-reader-tab"
            onClick={() => hasActiveDocument && onSelectView('reader')}
            disabled={!hasActiveDocument}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === 'reader'
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : hasActiveDocument
                ? 'text-slate-400 hover:text-white hover:bg-white/5'
                : 'text-slate-600 cursor-not-allowed'
            }`}
            title={hasActiveDocument ? 'Open current reading document' : 'Select a document first'}
          >
            Reader
          </button>
        </div>

        {/* Right Action Icons & PWA Install */}
        <div className="flex items-center gap-2">
          <OfflineIndicator />

          {hasActiveDocument && (
            <button
              id="nav-onthego-btn"
              onClick={onOpenOnTheGo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-indigo-300 hover:text-white transition active:scale-95 shadow-sm"
              title="Open full-screen On-The-Go Mode"
            >
              <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden md:inline">On The Go</span>
            </button>
          )}

          <button
            id="nav-voice-btn"
            onClick={onOpenVoiceSettings}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition"
            title="Voice & Speech Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>

          <button
            id="nav-sleep-btn"
            onClick={onOpenSleepTimer}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 text-slate-400 hover:text-white transition"
            title="Sleep Timer"
          >
            <Moon className="w-4 h-4" />
          </button>

          <PWAInstallButton />
        </div>
      </div>
    </header>
  );
};
