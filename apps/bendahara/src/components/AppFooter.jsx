import SchoolEmblem from './login/SchoolEmblem';

export default function AppFooter() {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-white px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 ring-1 ring-pospay/20">
            <SchoolEmblem size={32} />
          </div>
          <span className="text-sm font-semibold text-slate-700">SMP Pusponegoro Brebes</span>
        </div>
        <p className="text-xs text-slate-500">© 2024 POSPAY. Semua hak dilindungi.</p>
        <p className="max-w-xs text-xs text-slate-400">
          Sistem Informasi Keuangan Sekolah Berbasis Web dengan Fitur Bantuan Chatbot
        </p>
      </div>
    </footer>
  );
}
