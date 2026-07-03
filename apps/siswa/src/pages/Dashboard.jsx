import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';

const FINANCE_STATS = [
  { label: 'Total Tagihan', value: '—', icon: Icon.Bills, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { label: 'Sudah Dibayar', value: '—', icon: Icon.CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Belum Dibayar', value: '—', icon: Icon.Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  { label: 'Tunggakan', value: '—', icon: Icon.Warning, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
];

const WEEKDAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function MegaphoneIllustration() {
  return (
    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 shadow-inner">
      <svg width="56" height="56" viewBox="0 0 64 64" fill="none" aria-hidden>
        <path d="M12 28 L44 16 L44 48 L12 36 Z" fill="#1a48a0" fillOpacity="0.85" />
        <path d="M44 24 C52 24 58 28 58 32 C58 36 52 40 44 40" stroke="#1a48a0" strokeWidth="4" fill="none" />
        <rect x="8" y="26" width="6" height="12" rx="2" fill="#3b82f6" />
        <path d="M18 40 L14 52 L22 48 Z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

function FinanceStatCard({ label, value, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">Menunggu data</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
          <IconC width={20} height={20} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm font-medium text-slate-700">
        <span className="text-slate-400">‹</span>
        <span className="capitalize">{monthLabel}</span>
        <span className="text-slate-400">›</span>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((d) => (
          <div key={d} className="py-1 font-medium text-slate-400">{d}</div>
        ))}
        {cells.map((day, idx) => (
          <div
            key={idx}
            className={`flex h-8 items-center justify-center rounded-lg text-slate-600 ${
              day === now.getDate() ? 'bg-pospay/10 font-semibold text-pospay ring-1 ring-pospay/20' : ''
            }`}
          >
            {day || ''}
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center text-xs text-slate-400">
        Jadwal pembayaran akan ditampilkan setelah data tersedia dari bendahara.
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.fullName || '—';
  const initial = (user?.fullName || 'S').charAt(0).toUpperCase();

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-2 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Kolom kiri */}
          <div className="space-y-5 lg:col-span-2">
            <section>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pospay-50 text-pospay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 7 2-9 2 4h5" />
                    <path d="M18 8a3 3 0 1 0 0-6" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-bold text-pospay">Pengumuman</h2>
                  <p className="text-xs text-slate-500">Informasi terbaru dari bendahara sekolah.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/60 p-5 shadow-sm backdrop-blur-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <MegaphoneIllustration />
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      Pengumuman
                    </span>
                    <p className="mt-2 text-base font-semibold text-slate-800">Belum ada pengumuman</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon.Clock width={14} height={14} />
                      Pengumuman dari bendahara akan tampil di sini.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/90 to-white p-4 shadow-sm backdrop-blur-sm">
              <div className="flex gap-3">
                <Icon.Info width={20} height={20} className="mt-0.5 shrink-0 text-sky-600" />
                <div>
                  <p className="font-semibold text-sky-900">Catatan</p>
                  <p className="mt-1 text-sm text-sky-800">
                    Pastikan semua pembayaran dilakukan sebelum batas waktu agar tidak terkena denda keterlambatan.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* Kolom kanan */}
          <div className="space-y-5 lg:col-span-3">
            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pospay-100 to-sky-100 text-2xl font-bold text-pospay ring-4 ring-white shadow-md">
                  {initial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-lg font-bold text-slate-900">
                    <Icon.User width={18} height={18} className="text-pospay" />
                    {displayName}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Kelas: —
                  </p>
                  <Link
                    to="/profil"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border border-pospay/30 px-4 py-2 text-sm font-medium text-pospay hover:bg-pospay-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    Lihat Profil
                  </Link>
                </div>
              </div>
            </section>

            <section>
              <div className="mb-3">
                <h2 className="font-bold text-slate-800">Ringkasan Keuangan</h2>
                <p className="text-xs text-slate-500">Ringkasan kondisi pembayaran Anda saat ini.</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {FINANCE_STATS.map((s) => (
                  <FinanceStatCard key={s.label} {...s} />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pospay-50 text-pospay">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                <div>
                  <h2 className="font-bold text-slate-800">Kalender</h2>
                  <p className="text-xs text-slate-500">Jadwal penting pembayaran dan kegiatan sekolah.</p>
                </div>
              </div>
              <MiniCalendar />
            </section>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-4 border-t border-slate-200 pt-6 pb-20 sm:pb-6">
          <div className="flex flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20">
                <Icon.School width={20} height={20} />
              </div>
              <div>
                <p className="font-semibold text-slate-700">SMP Pusponegoro Brebes</p>
                <p className="text-xs">Jl. Pusponegoro No. 1, Brebes</p>
              </div>
            </div>
            <p className="text-xs">© 2026 POSPAY. Semua hak dilindungi.</p>
          </div>
        </footer>

        <Link
          to="/bantuan"
          className="fixed bottom-20 right-4 z-30 flex max-w-xs items-center gap-3 rounded-2xl bg-gradient-to-r from-pospay to-pospay-700 px-5 py-3.5 text-white shadow-lg hover:shadow-xl sm:bottom-6"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icon.Chat width={22} height={22} />
            <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-pospay" />
          </span>
          <span className="text-left text-sm leading-tight">
            <span className="block font-bold">Butuh Bantuan?</span>
            <span className="text-xs text-white/90">Chat dengan chatbot POSPAY</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
