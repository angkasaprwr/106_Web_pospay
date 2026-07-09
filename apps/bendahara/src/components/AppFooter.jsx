import SchoolEmblem from './login/SchoolEmblem';

export default function AppFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white px-4 py-6 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 ring-1 ring-pospay/20 dark:bg-blue-950/50 dark:ring-blue-800">
            <SchoolEmblem size={32} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">SMP Pusponegoro Brebes</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Jl. Pusponegoro No. 1, Brebes</p>
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">© 2026 POSPAY. Semua hak dilindungi.</p>
      </div>
    </footer>
  );
}
