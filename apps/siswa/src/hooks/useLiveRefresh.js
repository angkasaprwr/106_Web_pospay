import { useEffect } from 'react';

/** Refetch when tab gains focus or on a fixed interval (sinkron setelah CRUD bendahara). */
export function useLiveRefresh(callback, intervalMs = 10000) {
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') callback();
    };
    window.addEventListener('focus', callback);
    document.addEventListener('visibilitychange', onVisible);
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') callback();
    }, intervalMs);
    return () => {
      window.removeEventListener('focus', callback);
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(timer);
    };
  }, [callback, intervalMs]);
}
