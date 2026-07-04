import { useEffect, useState } from 'react';
import { checkApiConnection } from '../lib/api';

export default function ApiConnectionBanner() {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const ok = await checkApiConnection();
      if (!cancelled) {
        setOnline(ok);
        setChecking(false);
      }
    };

    run();
    const timer = setInterval(run, 15000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  if (checking || online) return null;

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-900"
    >
      Kesalahan jaringan: backend API tidak terjangkau. Jalankan{' '}
      <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">npm run dev:all</code>{' '}
      di folder project, lalu muat ulang halaman ini.
    </div>
  );
}
