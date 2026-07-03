import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';

const FINANCE_STATS = [
  { label: 'Total Tagihan', value: '—', icon: Icon.Bills, cardBg: 'bg-gradient-to-br from-blue-500 to-blue-600', iconBg: 'bg-white/20', iconColor: 'text-white' },
  { label: 'Sudah Dibayar', value: '—', icon: Icon.CheckCircle, cardBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', iconBg: 'bg-white/20', iconColor: 'text-white' },
  { label: 'Belum Dibayar', value: '—', icon: Icon.Clock, cardBg: 'bg-gradient-to-br from-amber-400 to-orange-500', iconBg: 'bg-white/20', iconColor: 'text-white' },
  { label: 'Tunggakan', value: '—', icon: Icon.Warning, cardBg: 'bg-gradient-to-br from-red-500 to-red-600', iconBg: 'bg-white/20', iconColor: 'text-white' },
];

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

function formatClassLabel(name) {
  if (!name) return '—';
  const roman = { 7: 'VII', 8: 'VIII', 9: 'IX' };
  const m = String(name).match(/^(\d)\s*(.*)$/);
  if (!m) return name;
  const grade = roman[Number(m[1])] || m[1];
  const section = m[2] || '';
  return section ? `${grade} ${section}`.trim() : grade;
}

function MegaphoneIllustration() {
  return (
    <div className="flex h-32 w-32 shrink-0 items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden>
        <ellipse cx="40" cy="68" rx="28" ry="6" fill="#c7d2fe" fillOpacity="0.5" />
        <path d="M14 36 L50 22 L50 58 L14 44 Z" fill="#0047AB" />
        <path d="M50 30 C60 30 68 36 68 44 C68 52 60 58 50 58" stroke="#3b82f6" strokeWidth="5" fill="none" />
        <rect x="8" y="34" width="8" height="14" rx="2" fill="#60a5fa" />
        <path d="M20 48 L14 64 L28 56 Z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

function FinanceStatCard({ label, value, cardBg, icon: IconC, iconBg, iconColor }) {
  return (
    <div className={`flex min-w-0 flex-1 flex-col rounded-xl p-4 text-white shadow-md ${cardBg}`}>
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <IconC width={20} height={20} className={iconColor} />
      </div>
      <p className="text-xs font-medium text-white/85">{label}</p>
      <p className="mt-1 text-lg font-bold leading-tight">{value}</p>
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
      <div className="mb-4 flex items-center justify-center gap-6 text-sm font-semibold text-slate-700">
        <button type="button" className="text-slate-400 hover:text-pospay" aria-label="Bulan sebelumnya">‹</button>
        <span className="min-w-[130px] text-center capitalize">{monthLabel}</span>
        <button type="button" className="text-slate-400 hover:text-pospay" aria-label="Bulan berikutnya">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-2 font-semibold ${i >= 5 ? 'text-red-400' : 'text-slate-500'}`}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col >= 5;
          return (
            <div
              key={idx}
              className={`flex h-10 items-center justify-center rounded-lg ${
                isWeekend ? 'font-medium text-red-500' : 'text-slate-700'
              } ${day === now.getDate() ? 'bg-pospay text-white font-bold shadow-sm' : ''}`}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400">
        Jadwal pembayaran akan ditampilkan setelah data tersedia.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    api.get('/auth/me')
      .then(({ data }) => setProfile(data.data))
      .catch(() => {})
      .finally(() => setProfileLoading(false));
  }, []);

  const displayName = profile?.fullName || user?.fullName || '—';
  const classLabel = formatClassLabel(profile?.student?.schoolClass?.name);
  const initial = (displayName !== '—' ? displayName : 'S').charAt(0).toUpperCase();
  const photoUrl = profile?.avatarUrl || profile?.student?.photoUrl;

  return (
    <div className="space-y-6 pb-8">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Kolom kiri — Pengumuman & Catatan */}
        <div className="space-y-5 xl:col-span-5">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
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
            <div className="overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 p-6">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                <MegaphoneIllustration />
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                    Pengumuman
                  </span>
                  <p className="mt-3 text-lg font-bold leading-snug text-slate-800">
                    Belum ada pengumuman
                  </p>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-500 sm:justify-start">
                    <Icon.Clock width={15} height={15} />
                    Informasi dari bendahara akan tampil setelah data tersedia.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-sky-100 bg-white p-4 shadow-sm">
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

        {/* Kolom kanan */}
        <div className="space-y-5 xl:col-span-7">
          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-800">Informasi Profil Singkat</h2>
            {profileLoading ? (
              <div className="flex h-28 items-center justify-center">
                <Spinner size={28} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                {photoUrl ? (
                  <img
                    src={photoUrl}
                    alt={displayName}
                    className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-slate-100 shadow-md"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pospay-100 to-sky-100 text-3xl font-bold text-pospay ring-4 ring-slate-50 shadow-md">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900 sm:justify-start">
                    <Icon.User width={18} height={18} className="text-pospay" />
                    {displayName}
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-600 sm:justify-start">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Kelas: {classLabel}
                  </p>
                  <Link
                    to="/profil"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-pospay px-4 py-2 text-sm font-semibold text-pospay hover:bg-pospay-50"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="5" width="20" height="14" rx="2" />
                      <path d="M2 10h20" />
                    </svg>
                    Lihat Profil
                  </Link>
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="font-bold text-slate-800">Ringkasan Keuangan</h2>
              <p className="text-xs text-slate-500">Ringkasan kondisi pembayaran Anda saat ini.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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

      <footer className="border-t border-slate-200 pt-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
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
        className="fixed bottom-6 right-4 z-30 flex max-w-sm items-center gap-3 rounded-full bg-[#0047AB] py-3 pl-3 pr-6 text-white shadow-xl hover:bg-[#003D96] hover:shadow-2xl sm:right-8"
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon.Chat width={24} height={24} />
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
