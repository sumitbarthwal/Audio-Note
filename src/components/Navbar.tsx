import React, { useState, useRef, useEffect } from 'react';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import {
  Headphones,
  Sliders,
  Moon,
  Maximize2,
  RotateCw,
  ChevronDown,
  Sparkles,
  Zap,
  Trash2,
  Clock,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  currentView: 'library' | 'reader';
  hasActiveDocument: boolean;
  isRefreshing?: boolean;
  hasUpdate?: boolean;
  autoUpdateEnabled?: boolean;
  lastChecked?: Date | null;
  onSelectView: (view: 'library' | 'reader') => void;
  onOpenVoiceSettings: () => void;
  onOpenSleepTimer: () => void;
  onOpenOnTheGo: () => void;
  onRefreshApp?: (forceHardReload?: boolean) => void;
  onToggleAutoUpdate?: (enabled: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  hasActiveDocument,
  isRefreshing = false,
  hasUpdate = false,
  autoUpdateEnabled = true,
  lastChecked,
  onSelectView,
  onOpenVoiceSettings,
  onOpenSleepTimer,
  onOpenOnTheGo,
  onRefreshApp,
  onToggleAutoUpdate,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const formatLastChecked = (date?: Date | null) => {
    if (!date) return 'Just now';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  return (
    <header className="shrink-0 z-40 bg-[#0D0F16]/95 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 py-2.5 sm:py-3 transition-colors relative">
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

          {/* Refresh App Feature */}
          {onRefreshApp && (
            <div className="relative" ref={menuRef}>
              <div className="flex items-center rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition group">
                <button
                  id="nav-refresh-app-btn"
                  onClick={() => onRefreshApp(false)}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer relative"
                  title="Refresh app and check for latest changes"
                >
                  <RotateCw
                    className={`w-3.5 h-3.5 ${
                      isRefreshing
                        ? 'animate-spin text-indigo-400'
                        : hasUpdate
                        ? 'text-emerald-400'
                        : 'text-slate-400 group-hover:text-indigo-300'
                    }`}
                  />
                  <span className="hidden lg:inline">
                    {isRefreshing ? 'Refreshing...' : hasUpdate ? 'Update Ready' : 'Refresh'}
                  </span>
                  {hasUpdate && (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                  )}
                </button>

                <button
                  id="nav-refresh-dropdown-trigger"
                  onClick={() => setIsMenuOpen((prev) => !prev)}
                  className="px-1.5 py-1.5 text-slate-400 hover:text-white border-l border-white/10 transition cursor-pointer"
                  title="App update and auto-refresh options"
                >
                  <ChevronDown className={`w-3 h-3 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Refresh Options Dropdown Menu */}
              {isMenuOpen && (
                <div
                  id="nav-refresh-menu"
                  className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#121524] border border-white/10 shadow-2xl p-2 z-50 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 text-xs"
                >
                  <div className="px-3 py-2 border-b border-white/5 mb-1">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="font-semibold text-white">App Updates</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatLastChecked(lastChecked)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {hasUpdate
                        ? '✨ Latest changes detected and ready!'
                        : 'Application is running the latest updates.'}
                    </p>
                  </div>

                  {/* Immediate Refresh Action */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRefreshApp(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                  >
                    <RotateCw className={`w-4 h-4 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <div>
                      <div className="font-medium text-white">Check & Refresh Now</div>
                      <div className="text-[10px] text-slate-400">Syncs documents & checks for new code</div>
                    </div>
                  </button>

                  {/* Auto-Update Toggle */}
                  {onToggleAutoUpdate && (
                    <button
                      onClick={() => onToggleAutoUpdate(!autoUpdateEnabled)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/5 transition text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <div>
                          <div className="font-medium text-white">Auto-Update</div>
                          <div className="text-[10px] text-slate-400">
                            {autoUpdateEnabled ? 'Updates automatically when ready' : 'Notify only'}
                          </div>
                        </div>
                      </div>
                      <div
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors ${
                          autoUpdateEnabled ? 'bg-indigo-500' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            autoUpdateEnabled ? 'translate-x-3.5' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </button>
                  )}

                  {/* Force Hard Reload & Clear Cache */}
                  <button
                    onClick={() => {
                      setIsMenuOpen(false);
                      onRefreshApp(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition text-left cursor-pointer"
                    title="Clears cached assets and forces a complete reload"
                  >
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="font-medium">Force Cache Clear & Reload</div>
                      <div className="text-[10px] text-rose-300/70">Wipes stale caches & reloads fresh</div>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

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
