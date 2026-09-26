import React from 'react';
import { RefreshCw, Sparkles, X, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

interface AppRefreshBannerProps {
  hasUpdate: boolean;
  updateCountdown: number | null;
  statusMessage: string | null;
  autoUpdateEnabled: boolean;
  onApplyUpdate: () => void;
  onDismissUpdate: () => void;
  onToggleAutoUpdate: (enabled: boolean) => void;
}

export const AppRefreshBanner: React.FC<AppRefreshBannerProps> = ({
  hasUpdate,
  updateCountdown,
  statusMessage,
  autoUpdateEnabled,
  onApplyUpdate,
  onDismissUpdate,
  onToggleAutoUpdate,
}) => {
  return (
    <>
      {/* Floating Status Notification Toast */}
      {statusMessage && !hasUpdate && (
        <div 
          id="app-refresh-status-toast"
          role="status"
          aria-live="polite"
          className="fixed top-16 right-4 sm:right-8 z-50 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-none"
        >
          <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#141724]/95 border border-indigo-500/30 text-white shadow-2xl backdrop-blur-xl text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        </div>
      )}

      {/* High-Priority Update Available Banner */}
      {hasUpdate && (
        <div
          id="app-update-available-banner"
          role="alert"
          aria-live="assertive"
          className="fixed bottom-20 sm:bottom-24 right-4 sm:right-8 max-w-md w-[calc(100vw-2rem)] z-50 animate-in fade-in slide-in-from-bottom-6 duration-300"
        >
          <div className="bg-[#121524]/95 border border-indigo-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-2xl text-white relative overflow-hidden">
            {/* Animated accent gradient top bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400" />

            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Latest Version Ready
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                      Update
                    </span>
                  </h4>
                  <button
                    onClick={onDismissUpdate}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition"
                    title="Dismiss notification"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  {autoUpdateEnabled && updateCountdown !== null ? (
                    <span>
                      Applying latest changes automatically in{' '}
                      <strong className="text-white font-bold text-indigo-300 underline decoration-indigo-400">
                        {updateCountdown}s
                      </strong>
                      ...
                    </span>
                  ) : (
                    <span>
                      New features and updates are available. Refresh to apply them seamlessly.
                    </span>
                  )}
                </p>

                {/* Countdown Progress Bar (if auto-update countdown active) */}
                {autoUpdateEnabled && updateCountdown !== null && (
                  <div className="w-full bg-white/10 rounded-full h-1 mt-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-400 h-full transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${((4 - updateCountdown) / 4) * 100}%` }}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3 pt-1">
                  <button
                    id="btn-update-now"
                    onClick={onApplyUpdate}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 active:scale-95 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 transition cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Update Now</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-0.5 opacity-80" />
                  </button>

                  {autoUpdateEnabled && updateCountdown !== null ? (
                    <button
                      onClick={onDismissUpdate}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition cursor-pointer"
                    >
                      Wait / Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => onToggleAutoUpdate(!autoUpdateEnabled)}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-slate-400 hover:text-slate-200 transition"
                      title={autoUpdateEnabled ? 'Auto-update is currently ON' : 'Auto-update is currently OFF'}
                    >
                      <Clock className="w-3.5 h-3.5 inline mr-1 text-slate-400" />
                      Auto: {autoUpdateEnabled ? 'ON' : 'OFF'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
