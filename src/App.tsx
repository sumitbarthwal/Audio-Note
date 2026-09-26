/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DocumentItem } from './types';
import { getAllDocuments, saveDocument, syncChannel } from './lib/db';
import { SAMPLE_DOCUMENTS } from './lib/sampleDocs';
import { audioEngine } from './lib/audioEngine';
import { Navbar } from './components/Navbar';
import { DocumentLibrary } from './components/DocumentLibrary';
import { ReaderView } from './components/ReaderView';
import { AudioPlayerBar } from './components/AudioPlayerBar';
import { OnTheGoPlayer } from './components/OnTheGoPlayer';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { SleepTimerModal } from './components/SleepTimerModal';
import { AppRefreshBanner } from './components/AppRefreshBanner';
import { useAppRefresh } from './hooks/useAppRefresh';

export default function App() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [currentView, setCurrentView] = useState<'library' | 'reader'>('library');
  const [isOnTheGoOpen, setIsOnTheGoOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDocuments = useCallback(async () => {
    try {
      let docs = await getAllDocuments();
      if (docs.length === 0) {
        // First-run experience: automatically seed sample classics into IndexedDB
        for (const sample of SAMPLE_DOCUMENTS) {
          await saveDocument(sample);
        }
        docs = await getAllDocuments();
      }
      setDocuments(docs);
      // If we don't have an active doc yet, set the first one
      if (docs.length > 0 && !activeDoc) {
        setActiveDoc(docs[0]);
        audioEngine.loadDocument(docs[0]);
      }
    } catch (err) {
      console.error('Failed to load documents from IndexedDB', err);
    } finally {
      setIsLoading(false);
    }
  }, [activeDoc]);

  // Hook for automatic update detection, background refresh, and manual refresh controls
  const {
    isRefreshing,
    hasUpdate,
    updateCountdown,
    autoUpdateEnabled,
    lastChecked,
    statusMessage,
    setAutoUpdateEnabled,
    refreshApp,
    applyUpdateNow,
    dismissUpdate,
  } = useAppRefresh(refreshDocuments);

  useEffect(() => {
    refreshDocuments();
  }, [refreshDocuments]);

  // Multi-tab / cross-window synchronization: automatically refresh document lists when changed
  useEffect(() => {
    if (!syncChannel) return;
    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data?.type === 'DOCUMENTS_UPDATED') {
        refreshDocuments();
      }
    };
    syncChannel.addEventListener('message', handleSyncMessage);
    return () => {
      syncChannel.removeEventListener('message', handleSyncMessage);
    };
  }, [refreshDocuments]);

  // Handle document selection
  const handleSelectDocument = (doc: DocumentItem) => {
    setActiveDoc(doc);
    audioEngine.loadDocument(doc);
    setCurrentView('reader');
  };

  // Global keyboard shortcuts (Space for Play/Pause, Left/Right for Seek, G for On-The-Go, Alt+R for Refresh)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        audioEngine.togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        audioEngine.skipBackward();
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        audioEngine.skipForward();
      } else if (e.key.toLowerCase() === 'g' && activeDoc) {
        setIsOnTheGoOpen((prev) => !prev);
      } else if ((e.altKey && e.key.toLowerCase() === 'r') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'r')) {
        e.preventDefault();
        refreshApp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDoc, refreshApp]);

  return (
    <div className="h-full h-[100dvh] bg-[#0A0B10] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 relative overflow-hidden font-sans">
      {/* Immersive UI Ambient Blur Background Glows */}
      <div className="fixed top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-150px] right-[-100px] w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[150px] pointer-events-none -z-10" />

      {/* Persistent App Header (hidden when in On-The-Go fullscreen mode) */}
      {!isOnTheGoOpen && (
        <Navbar
          currentView={currentView}
          hasActiveDocument={!!activeDoc}
          isRefreshing={isRefreshing}
          hasUpdate={hasUpdate}
          autoUpdateEnabled={autoUpdateEnabled}
          lastChecked={lastChecked}
          onSelectView={(view) => setCurrentView(view)}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
          onOpenOnTheGo={() => setIsOnTheGoOpen(true)}
          onRefreshApp={refreshApp}
          onToggleAutoUpdate={setAutoUpdateEnabled}
        />
      )}

      {/* Automatic Update & Refresh Notification Banner */}
      <AppRefreshBanner
        hasUpdate={hasUpdate}
        updateCountdown={updateCountdown}
        statusMessage={statusMessage}
        autoUpdateEnabled={autoUpdateEnabled}
        onApplyUpdate={applyUpdateNow}
        onDismissUpdate={dismissUpdate}
        onToggleAutoUpdate={setAutoUpdateEnabled}
      />

      {/* Main Content Area - Scrollable Viewport Container */}
      <main className="flex-1 min-h-0 flex flex-col relative z-10 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center min-h-[60vh]">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          </div>
        ) : currentView === 'library' || !activeDoc ? (
          <DocumentLibrary
            documents={documents}
            currentDocumentId={activeDoc?.id || null}
            onSelectDocument={handleSelectDocument}
            onRefreshDocuments={refreshDocuments}
          />
        ) : (
          <ReaderView
            document={activeDoc}
            onOpenOnTheGo={() => setIsOnTheGoOpen(true)}
            onBackToLibrary={() => setCurrentView('library')}
          />
        )}
      </main>

      {/* Persistent Audio Player Footer Bar */}
      {!isOnTheGoOpen && activeDoc && (
        <AudioPlayerBar
          document={activeDoc}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
          onOpenOnTheGo={() => setIsOnTheGoOpen(true)}
        />
      )}

      {/* Full-Screen "On The Go" Commute Mode */}
      {isOnTheGoOpen && activeDoc && (
        <OnTheGoPlayer
          document={activeDoc}
          onClose={() => setIsOnTheGoOpen(false)}
          onOpenVoiceSettings={() => setIsVoiceSettingsOpen(true)}
          onOpenSleepTimer={() => setIsSleepTimerOpen(true)}
        />
      )}

      {/* Voice Settings Modal */}
      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
      />

      {/* Sleep Timer Modal */}
      <SleepTimerModal
        isOpen={isSleepTimerOpen}
        onClose={() => setIsSleepTimerOpen(false)}
      />
    </div>
  );
}
