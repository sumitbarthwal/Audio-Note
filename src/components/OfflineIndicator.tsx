import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff, ShieldCheck } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) {
    return (
      <div 
        id="offline-ready-badge"
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400"
        title="All files and voice reading are stored locally and work 100% offline"
      >
        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
        <span className="text-[10px] uppercase tracking-wider font-semibold">Offline Ready</span>
      </div>
    );
  }

  return (
    <div
      id="offline-active-banner"
      className="fixed bottom-24 left-4 z-40 flex items-center gap-2.5 rounded-xl bg-[#0D0F16]/95 backdrop-blur-md px-4 py-2.5 text-xs font-medium text-emerald-400 shadow-2xl border border-emerald-500/30"
    >
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
      <span className="uppercase tracking-wider text-[11px] font-semibold">Offline Mode Active</span>
    </div>
  );
};
