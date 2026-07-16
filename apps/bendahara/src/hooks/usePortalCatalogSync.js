import { useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

const DEBOUNCE_MS = 80;

/** Realtime refresh sekali (debounced + trailing) untuk portal bendahara. */
export function usePortalCatalogSync(onDataChange) {
  const syncingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef(null);
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  const runRefresh = useCallback(async () => {
    if (syncingRef.current) {
      pendingRef.current = true;
      return;
    }
    syncingRef.current = true;
    try {
      await onDataChangeRef.current({ silent: true });
    } finally {
      syncingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        timerRef.current = setTimeout(() => {
          runRefresh();
        }, DEBOUNCE_MS);
      }
    }
  }, []);

  const refreshOnce = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      runRefresh();
    }, DEBOUNCE_MS);
  }, [runRefresh]);

  useSocket({
    'catalog:changed': refreshOnce,
    'bill:created': refreshOnce,
    'bill:updated': refreshOnce,
    'payment:updated': refreshOnce,
    'payment:verified': refreshOnce,
    'student:changed': refreshOnce,
  });

  return { checkForUpdates: refreshOnce };
}
