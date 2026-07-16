import { useCallback, useRef } from 'react';
import { useSocket } from './useSocket';

/**
 * Realtime catalog sync via Socket.IO (tanpa polling).
 * Memanggil onDataChange sekali saat server emit catalog:changed / bill:created / payment:updated.
 */
export function usePortalCatalogSync(onDataChange) {
  const syncingRef = useRef(false);

  const refreshOnce = useCallback(async () => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    try {
      await onDataChange({ silent: true });
    } finally {
      syncingRef.current = false;
    }
  }, [onDataChange]);

  useSocket({
    'catalog:changed': () => { refreshOnce(); },
    'bill:created': () => { refreshOnce(); },
    'payment:updated': () => { refreshOnce(); },
    'payment:verified': () => { refreshOnce(); },
  });

  return {
    setVersionSnapshot: async () => {},
    checkForUpdates: refreshOnce,
  };
}
