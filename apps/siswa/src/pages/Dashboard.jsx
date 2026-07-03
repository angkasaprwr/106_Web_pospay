import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';
import { formatDateTime } from '../lib/format';
import { useLiveRefresh } from '../hooks/useLiveRefresh';

const BILL_NOTIFICATION_TYPES = new Set(['BILL_UNPAID_REMINDER', 'REMINDER']);

const FINANCE_STATS = [
  {
    label: 'Total Tagihan',
    value: '—',
    valueColor: 'text-[#0056D2] dark:text-blue-400',
    icon: Icon.Bills,
    iconBg: 'bg-blue-50 dark:bg-blue-950/60',
    iconColor: 'text-[#0056D2] dark:text-blue-400',
  },
  {
    label: 'Sudah Dibayar',
    value: '—',
    valueColor: 'text-[#28A745] dark:text-emerald-400',
    icon: Icon.CheckCircle,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60',
    iconColor: 'text-[#28A745] dark:text-emerald-400',
  },
  {
    label: 'Belum Dibayar',
    value: '—',
    valueColor: 'text-[#FD7E14] dark:text-orange-400',
    icon: Icon.Clock,
    iconBg: 'bg-orange-50 dark:bg-orange-950/50',
    iconColor: 'text-[#FD7E14] dark:text-orange-400',
  },
  {
    label: 'Tunggakan',
    value: '—',
    valueColor: 'text-[#DC3545] dark:text-red-400',
    icon: Icon.Warning,
    iconBg: 'bg-red-50 dark:bg-red-950/50',
    iconColor: 'text-[#DC3545] dark:text-red-400',
  },
];

const WEEKDAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

const CARD = 'rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900';

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
        <ellipse cx="40" cy="68" rx="28" ry="6" fill="#c7d2fe" fillOpacity="0.5" className="dark:opacity-30" />
        <path d="M14 36 L50 22 L50 58 L14 44 Z" fill="#0056D2" className="dark:fill-blue-400" />
        <path d="M50 30 C60 30 68 36 68 44 C68 52 60 58 50 58" stroke="#3b82f6" strokeWidth="5" fill="none" className="dark:stroke-blue-300" />
        <rect x="8" y="34" width="8" height="14" rx="2" fill="#60a5fa" className="dark:fill-blue-300" />
        <path d="M20 48 L14 64 L28 56 Z" fill="#f59e0b" />
      </svg>
    </div>
  );
}

function FinanceStatCard({ label, value, valueColor, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800/80">
      <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}>
        <IconC width={20} height={20} className={iconColor} />
      </div>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-bold leading-tight ${valueColor}`}>{value}</p>
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
      <div className="mb-4 flex items-center justify-center gap-6 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <button type="button" className="text-slate-400 hover:text-pospay dark:text-slate-500 dark:hover:text-blue-400" aria-label="Bulan sebelumnya">‹</button>
        <span className="min-w-[130px] text-center capitalize">{monthLabel}</span>
        <button type="button" className="text-slate-400 hover:text-pospay dark:text-slate-500 dark:hover:text-blue-400" aria-label="Bulan berikutnya">›</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-2 font-semibold ${i >= 5 ? 'text-red-400 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{d}</div>
        ))}
        {cells.map((day, idx) => {
          const col = idx % 7;
          const isWeekend = col >= 5;
          return (
            <div
              key={idx}
              className={`flex h-10 items-center justify-center rounded-lg ${
                isWeekend ? 'font-medium text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
              } ${day === now.getDate() ? 'bg-pospay text-white font-bold shadow-sm dark:bg-blue-600' : ''}`}
            >
              {day || ''}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
        Jadwal pembayaran akan ditampilkan setelah data tersedia.
      </p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  const loadAnnouncements = useCallback(async () => {
    try {
      const { data } = await api.get('/notifications?limit=10');
      const items = (data.data || []).filter(
        (n) => !n.type || BILL_NOTIFICATION_TYPES.has(n.type) || /tagihan/i.test(n.title || ''),
      );
      setAnnouncements(items.slice(0, 3));
    } catch {
      setAnnouncements([]);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnnouncements();
  }, [loadAnnouncements]);

  useLiveRefresh(loadAnnouncements, 15000);

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
        <div className="space-y-5 xl:col-span-5">
          <section className={CARD}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pospay text-white dark:bg-blue-600">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 11v2a1 1 0 0 0 1 1h2l3.5 7 2-9 2 4h5" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-pospay dark:text-blue-400">Pengumuman</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Informasi terbaru dari bendahara sekolah.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50/80 to-indigo-50 p-6 dark:border-violet-900/50 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-indigo-950/40">
              {announcementsLoading ? (
                <div className="flex h-32 items-center justify-center">
                  <Spinner size={28} />
                </div>
              ) : announcements.length === 0 ? (
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
                  <MegaphoneIllustration />
                  <div className="min-w-0 flex-1 text-center sm:text-left">
                    <span className="inline-block rounded-full bg-violet-100 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:bg-violet-900/60 dark:text-violet-300">
                      Pengumuman
                    </span>
                    <p className="mt-3 text-lg font-bold leading-snug text-pospay dark:text-blue-300">
                      Belum ada pengumuman
                    </p>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 sm:justify-start">
                      <Icon.Clock width={15} height={15} />
                      Informasi dari bendahara akan tampil setelah data tersedia.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {announcements.map((n) => (
                    <Link
                      key={n.id}
                      to="/tagihan"
                      className="block rounded-xl border border-violet-200/80 bg-white/70 p-4 transition hover:border-violet-300 hover:shadow-sm dark:border-violet-800/50 dark:bg-slate-900/50 dark:hover:border-violet-700"
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                          <Icon.Bell width={18} height={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{n.title}</p>
                          <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{n.body}</p>
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                            <Icon.Clock width={14} height={14} />
                            {formatDateTime(n.createdAt)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 shadow-sm dark:border-sky-800 dark:bg-sky-950/40">
            <div className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-400">
                <Icon.Info width={18} height={18} />
              </span>
              <div>
                <p className="font-semibold text-sky-900 dark:text-sky-200">Catatan</p>
                <p className="mt-1 text-sm leading-relaxed text-sky-800 dark:text-sky-300/90">
                  Pastikan semua pembayaran dilakukan sebelum batas waktu agar tidak terkena denda keterlambatan.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-7">
          <section className={CARD}>
            <h2 className="mb-4 text-base font-bold text-slate-800 dark:text-slate-100">Informasi Profil Singkat</h2>
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
                    className="h-24 w-24 shrink-0 rounded-full object-cover ring-4 ring-slate-100 shadow-md dark:ring-slate-700"
                  />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pospay-100 to-sky-100 text-3xl font-bold text-pospay ring-4 ring-slate-50 shadow-md dark:from-blue-950 dark:to-slate-800 dark:text-blue-300 dark:ring-slate-700">
                    {initial}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-center sm:text-left">
                  <p className="flex items-center justify-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100 sm:justify-start">
                    <Icon.User width={18} height={18} className="text-pospay dark:text-blue-400" />
                    {displayName}
                  </p>
                  <p className="mt-1 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300 sm:justify-start">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Kelas: {classLabel}
                  </p>
                  <Link
                    to="/profil"
                    className="mt-3 inline-flex items-center gap-2 rounded-lg border-2 border-pospay px-4 py-2 text-sm font-semibold text-pospay hover:bg-pospay-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/50"
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

          <section className={CARD}>
            <div className="mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Ringkasan Keuangan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Ringkasan kondisi pembayaran Anda saat ini.</p>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {FINANCE_STATS.map((s) => (
                <FinanceStatCard key={s.label} {...s} />
              ))}
            </div>
          </section>

          <section className={CARD}>
            <div className="mb-4 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-pospay-50 text-pospay dark:bg-blue-950/50 dark:text-blue-400">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </span>
              <div>
                <h2 className="font-bold text-slate-800 dark:text-slate-100">Kalender</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Jadwal penting pembayaran dan kegiatan sekolah.</p>
              </div>
            </div>
            <MiniCalendar />
          </section>
        </div>
      </div>

      <footer className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">
              <Icon.School width={20} height={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">SMP Pusponegoro Brebes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Jl. Pusponegoro No. 1, Brebes</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 POSPAY. Semua hak dilindungi.</p>
        </div>
      </footer>

      <Link
        to="/bantuan"
        className="fixed bottom-6 right-4 z-30 flex max-w-sm items-center gap-3 rounded-full bg-[#0056D2] py-3 pl-3 pr-6 text-white shadow-xl hover:bg-[#004BB8] hover:shadow-2xl dark:bg-blue-700 dark:hover:bg-blue-600 sm:right-8"
      >
        <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15">
          <Icon.Chat width={24} height={24} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-pospay dark:ring-blue-700" />
        </span>
        <span className="text-left text-sm leading-tight">
          <span className="block font-bold">Butuh Bantuan?</span>
          <span className="text-xs text-white/90">Chat dengan chatbot POSPAY</span>
        </span>
      </Link>
    </div>
  );
}
