import { useState, useEffect, useCallback, useRef } from 'react';
import { registerSW } from 'virtual:pwa-register';

export interface AppRefreshState {
  isRefreshing: boolean;
  hasUpdate: boolean;
  updateCountdown: number | null;
  autoUpdateEnabled: boolean;
  lastChecked: Date | null;
  statusMessage: string | null;
  setAutoUpdateEnabled: (enabled: boolean) => void;
  refreshApp: (forceHardReload?: boolean) => Promise<void>;
  applyUpdateNow: () => void;
  dismissUpdate: () => void;
  checkForUpdates: () => Promise<boolean>;
}

const STORAGE_KEY_AUTO_UPDATE = 'audiodoc_auto_update_enabled';

export function useAppRefresh(onDocumentsRefresh?: () => void | Promise<void>): AppRefreshState {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [updateCountdown, setUpdateCountdown] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(() => new Date());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [autoUpdateEnabled, setAutoUpdateEnabledState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_AUTO_UPDATE);
      return stored !== null ? stored === 'true' : true; // Default auto-update is TRUE
    } catch {
      return true;
    }
  });

  const updateSWFnRef = useRef<((reloadPage?: boolean) => Promise<void>) | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  const setAutoUpdateEnabled = useCallback((enabled: boolean) => {
    setAutoUpdateEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY_AUTO_UPDATE, String(enabled));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Show a temporary status toast/message
  const showStatus = useCallback((msg: string, durationMs: number = 3500) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((current) => (current === msg ? null : current));
    }, durationMs);
  }, []);

  // Apply update immediately
  const applyUpdateNow = useCallback(async () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setUpdateCountdown(null);
    showStatus('Updating application to the latest version...');

    if (updateSWFnRef.current) {
      try {
        await updateSWFnRef.current(true);
        return;
      } catch (err) {
        console.warn('updateSW failed, falling back to window.location.reload', err);
      }
    }

    if (registrationRef.current?.waiting) {
      registrationRef.current.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Force reload bypassing cache
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }, [showStatus]);

  // Dismiss / snooze update countdown
  const dismissUpdate = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setUpdateCountdown(null);
    showStatus('Auto-update paused. You can update anytime from the header button.');
  }, [showStatus]);

  // When an update is detected, handle auto-refresh
  const handleUpdateDetected = useCallback(() => {
    setHasUpdate(true);
    setLastChecked(new Date());

    if (autoUpdateEnabled) {
      // Start 4-second auto-update countdown so user has visual feedback of the automatic update
      setUpdateCountdown(4);
      let count = 4;

      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }

      countdownTimerRef.current = setInterval(() => {
        count -= 1;
        if (count <= 0) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          applyUpdateNow();
        } else {
          setUpdateCountdown(count);
        }
      }, 1000);
    } else {
      showStatus('A new version is available! Click Update to load changes.');
    }
  }, [autoUpdateEnabled, applyUpdateNow, showStatus]);

  // Check for updates (both SW and network timestamp)
  const checkForUpdates = useCallback(async (): Promise<boolean> => {
    setIsRefreshing(true);
    setLastChecked(new Date());
    let foundUpdate = false;

    try {
      // 1. Check Service Worker registration update
      if ('serviceWorker' in navigator) {
        try {
          const reg = await navigator.serviceWorker.getRegistration();
          if (reg) {
            registrationRef.current = reg;
            await reg.update();
            if (reg.waiting) {
              foundUpdate = true;
            }
          }
        } catch (swErr) {
          console.warn('Service worker update check error:', swErr);
        }
      }

      // 2. Refresh documents and audio state if callback provided
      if (onDocumentsRefresh) {
        await onDocumentsRefresh();
      }

      // 3. Check server headers / etag via lightweight fetch
      try {
        const response = await fetch(window.location.href, {
          method: 'HEAD',
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
        });
        if (response.ok) {
          const etag = response.headers.get('etag');
          const lastModified = response.headers.get('last-modified');
          const previousStamp = sessionStorage.getItem('audiodoc_app_etag');
          const currentStamp = etag || lastModified || '';
          if (previousStamp && currentStamp && previousStamp !== currentStamp) {
            foundUpdate = true;
          }
          if (currentStamp) {
            sessionStorage.setItem('audiodoc_app_etag', currentStamp);
          }
        }
      } catch {
        // Network offline or failed fetch is fine
      }

      if (foundUpdate) {
        handleUpdateDetected();
        return true;
      } else {
        showStatus('App is up to date! Running latest changes.');
        return false;
      }
    } catch (err) {
      console.error('Update check failed:', err);
      showStatus('Refresh completed.');
      return false;
    } finally {
      setIsRefreshing(false);
    }
  }, [handleUpdateDetected, onDocumentsRefresh, showStatus]);

  // Manual Refresh App function
  const refreshApp = useCallback(
    async (forceHardReload = false) => {
      setIsRefreshing(true);
      showStatus('Refreshing app and checking for latest changes...');

      try {
        // Refresh document library first
        if (onDocumentsRefresh) {
          await onDocumentsRefresh();
        }

        // Check for updates
        const updateFound = await checkForUpdates();

        if (forceHardReload || updateFound) {
          // If hard reload requested, clear caches
          if (forceHardReload && 'caches' in window) {
            try {
              const keys = await caches.keys();
              await Promise.all(keys.map((k) => caches.delete(k)));
            } catch (cacheErr) {
              console.warn('Failed clearing caches', cacheErr);
            }
          }
          await applyUpdateNow();
        }
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    },
    [applyUpdateNow, checkForUpdates, onDocumentsRefresh, showStatus]
  );

  // Initialize Service Worker listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('[PWA] New content available, update detected');
          handleUpdateDetected();
        },
        onOfflineReady() {
          console.log('[PWA] App is ready for offline usage');
          showStatus('App is ready for 100% offline usage');
        },
        onRegisteredSW(_swUrl, registration) {
          if (registration) {
            registrationRef.current = registration;
            // Listen for manual updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              if (newWorker) {
                newWorker.addEventListener('statechange', () => {
                  if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    console.log('[PWA] New worker installed in waiting state');
                    handleUpdateDetected();
                  }
                });
              }
            });
          }
        },
      });

      updateSWFnRef.current = updateSW;
    } catch (e) {
      console.warn('[PWA] registerSW initialization skipped:', e);
    }

    // Controllerchange listener: when new SW activates, reload to apply changes
    if ('serviceWorker' in navigator) {
      let refreshing = false;
      const handleControllerChange = () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      };
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
      return () => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      };
    }
  }, [handleUpdateDetected, showStatus]);

  // Periodic automatic update check (every 45 seconds when tab is active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if ('serviceWorker' in navigator && registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
      }
    }, 45000);

    // Also check when tab becomes visible or reconnects
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        if ('serviceWorker' in navigator && registrationRef.current) {
          registrationRef.current.update().catch(() => {});
        }
      }
    };

    const handleOnline = () => {
      if ('serviceWorker' in navigator && registrationRef.current) {
        registrationRef.current.update().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, []);

  return {
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
    checkForUpdates,
  };
}
