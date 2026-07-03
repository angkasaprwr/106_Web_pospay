import { useCallback, useEffect, useRef } from 'react';
import { api } from '../lib/api';

function versionKey(v) {
  return `${v?.billsVersion || ''}|${v?.methodsVersion || ''}`;
}

/**
 * Pantau perubahan tagihan / metode pembayaran dari bendahara.
 * Hanya memanggil onDataChange saat versi server berubah (tanpa loading berulang).
 */
export function usePortalCatalogSync(onDataChange, { intervalMs = 60000 } = {}) {
  const versionRef = useRef(null);
  const syncingRef = useRef(false);

  const fetchVersion = useCallback(async () => {
    const { data } = await api.get('/portal/catalog-sync-version');
    return data.data;
  }, []);

  const setVersionSnapshot = useCallback(async () => {
    try {
      const v = await fetchVersion();
      versionRef.current = versionKey(v);
    } catch {
      /* ignore */
    }
  }, [fetchVersion]);

  const checkForUpdates = useCallback(async () => {
    if (syncingRef.current) return;
    try {
      const v = await fetchVersion();
      const key = versionKey(v);
      if (versionRef.current === null) {
        versionRef.current = key;
        return;
      }
      if (versionRef.current !== key) {
        syncingRef.current = true;
        versionRef.current = key;
        await onDataChange({ silent: true });
      }
    } catch {
      /* ignore background check errors */
    } finally {
      syncingRef.current = false;
    }
  }, [fetchVersion, onDataChange]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') checkForUpdates();
    }, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === 'visible') checkForUpdates();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [checkForUpdates, intervalMs]);

  return { setVersionSnapshot, checkForUpdates };
}
