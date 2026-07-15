import { useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

const DEBOUNCE_MS = 250;

/** Realtime refresh sekali (debounced) untuk portal bendahara. */
export function usePortalCatalogSync(onDataChange) {
  const syncingRef = useRef(false);
  const timerRef = useRef(null);
  const onDataChangeRef = useRef(onDataChange);
  onDataChangeRef.current = onDataChange;

  const refreshOnce = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      if (syncingRef.current) return;
      syncingRef.current = true;
      try {
        await onDataChangeRef.current({ silent: true });
      } finally {
        syncingRef.current = false;
      }
    }, DEBOUNCE_MS);
  }, []);

  useSocket({
    'catalog:changed': refreshOnce,
    'bill:created': refreshOnce,
    'payment:updated': refreshOnce,
    'payment:verified': refreshOnce,
    'student:changed': refreshOnce,
  });

  return { checkForUpdates: refreshOnce };
}
