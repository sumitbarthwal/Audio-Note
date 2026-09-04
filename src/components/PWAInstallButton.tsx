import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        id="pwa-install-btn"
        onClick={install}
        className="flex items-center gap-1.5 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white px-3.5 py-1.5 text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
        title="Install app to your device for offline audio reading"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition active:scale-95"
          title="Install on iPhone / iPad"
        >
          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
          <span>Install</span>
        </button>

        {showIOSGuide && (
          <div
            id="ios-install-modal"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in"
          >
            <div className="w-full max-w-sm rounded-3xl bg-[#0D0F16] border border-white/10 p-6 shadow-2xl text-slate-100">
              <div className="flex items-center justify-between pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                  </div>
                  <h3 className="font-bold text-white text-sm">Install on iPhone / iPad</h3>
                </div>
                <button
                  id="close-ios-guide-btn"
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-4 text-xs text-slate-400 leading-relaxed">
                To use the audio reader offline on the go without an internet connection:
              </p>
              <ol className="mt-4 space-y-2.5 text-xs text-slate-300 bg-white/[0.02] p-4 rounded-2xl border border-white/5 font-mono">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">1.</span>
                  <span>
                    Tap the <strong className="text-white font-sans">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-1 text-indigo-400" /> in Safari's bottom toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">2.</span>
                  <span>
                    Scroll down and tap <strong className="text-white font-sans">Add to Home Screen</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-indigo-400">3.</span>
                  <span>
                    Launch the app anytime from your home screen with zero internet!
                  </span>
                </li>
              </ol>
              <button
                id="dismiss-ios-guide-btn"
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-full bg-indigo-500 py-2.5 text-xs font-semibold text-white hover:bg-indigo-400 shadow-lg shadow-indigo-500/20 transition active:scale-95"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
