import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';

const FINANCE_STATS = [
  { label: 'Total Tagihan', value: '—', valueColor: 'text-blue-600', icon: Icon.Bills, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { label: 'Sudah Dibayar', value: '—', valueColor: 'text-emerald-600', icon: Icon.CheckCircle, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Belum Dibayar', value: '—', valueColor: 'text-amber-500', icon: Icon.Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
  { label: 'Tunggakan', value: '—', valueColor: 'text-red-500', icon: Icon.Warning, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
];

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function MegaphoneIllustration() {
  return (
    <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-100 to-violet-50 shadow-inner">
      <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden>
        <path d="M10 28 L42 16 L42 48 L10 36 Z" fill="#1a48a0" fillOpacity="0.9" />
        <path d="M42 24 C50 24 56 28 56 32 C56 36 50 40 42 40" stroke="#1a48a0" strokeWidth="4" fill="none" />
        <rect x="6" y="26" width="6" height="12" rx="2" fill="#60a5fa" />
        <path d="M16 40 L12 54 L24 48 Z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

function FinanceStatCard({ label, value, valueColor, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={`mt-1 text-lg font-bold ${valueColor}`}>{value}</p>
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
  const jsFirstDay = new Date(year, month, 1).getDay();
  const firstDay = jsFirstDay === 0 ? 6 : jsFirstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-4 text-sm font-medium text-slate-700">
        <button type="button" className="text-slate-400 hover:text-pospay" aria-label="Bulan sebelumnya">‹</button>
        <span className="min-w-[120px] text-center capitalize">{monthLabel}</span>
        <button type="button" className="text-slate-400 hover:text-pospay" aria-label="Bulan berikutnya">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px]">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-1 font-semibold ${i >= 5 ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col >= 5;
          return (
            <div
              key={idx}
              className={`flex h-9 flex-col items-center justify-center rounded-lg text-slate-700 ${
                isWeekend ? 'text-red-500' : ''
              } ${day === now.getDate() ? 'bg-pospay/10 font-semibold text-pospay ring-1 ring-pospay/25' : ''}`}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4 text-center text-xs text-slate-400">
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
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="space-y-5 lg:col-span-2">
          <section>
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pospay text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 7 2-9 2 4h5" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-pospay">Pengumuman</h2>
                <p className="text-xs text-slate-500">Informasi terbaru dari bendahara sekolah.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/50 p-5 shadow-sm">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <MegaphoneIllustration />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <span className="inline-block rounded-md bg-violet-200/60 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-violet-800">
                    Pengumuman
                  </span>
                  <p className="mt-3 text-base font-semibold leading-snug text-slate-800">
                    Belum ada pengumuman
                  </p>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500 sm:justify-start">
                    <Icon.Clock width={14} height={14} />
                    Informasi dari bendahara akan tampil di sini.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white p-4 shadow-sm">
            <div className="flex gap-3">
              <Icon.Info width={20} height={20} className="mt-0.5 shrink-0 text-sky-600" />
              <div>
                <p className="font-semibold text-sky-900">Catatan</p>
                <p className="mt-1 text-sm leading-relaxed text-sky-800">
                  Pastikan semua pembayaran dilakukan sebelum batas waktu agar tidak terkena denda keterlambatan.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5 lg:col-span-3">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-800">Informasi Profil Singkat</h2>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center self-center rounded-full bg-gradient-to-br from-pospay-100 to-sky-100 text-3xl font-bold text-pospay ring-4 ring-slate-50 shadow-md sm:self-auto">
                {initial}
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <p className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900 sm:justify-start">
                  <Icon.User width={18} height={18} className="text-pospay" />
                  {displayName}
                </p>
                <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-500 sm:justify-start">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  Kelas: —
                </p>
                <Link
                  to="/profil"
                  className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-pospay/40 px-4 py-2 text-sm font-semibold text-pospay hover:bg-pospay-50"
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
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pospay-50 text-pospay">
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

      <footer className="border-t border-slate-200 pt-6 pb-4">
        <div className="flex flex-col items-center justify-between gap-4 text-sm sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20">
              <Icon.School width={20} height={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-700">SMP Pusponegoro Brebes</p>
              <p className="text-xs text-slate-500">Jl. Pusponegoro No. 1, Brebes</p>
            </div>
          </div>
          <p className="text-xs text-slate-400">© 2026 POSPAY. Semua hak dilindungi.</p>
        </div>
      </footer>

      <Link
        to="/bantuan"
        className="fixed bottom-6 right-4 z-30 flex max-w-sm items-center gap-3 rounded-full bg-gradient-to-r from-pospay to-pospay-700 py-3 pl-3 pr-5 text-white shadow-xl hover:shadow-2xl sm:right-6"
      >
        <span className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Icon.Chat width={22} height={22} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-pospay" />
        </span>
        <span className="text-left text-sm leading-tight">
          <span className="block font-bold">Butuh Bantuan?</span>
          <span className="text-xs text-white/90">Chat dengan chatbot POSPAY</span>
        </span>
      </Link>
    </div>
  );
}
