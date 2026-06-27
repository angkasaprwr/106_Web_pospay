import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR, formatDateTime } from '../lib/format';
import { PageLoader } from '../components/ui';
import { Icon } from '../components/Icons';

/* ── Wallet illustration SVG ── */
function WalletIllustration() {
  return (
    <svg viewBox="0 0 140 120" fill="none" className="h-24 w-auto sm:h-28 drop-shadow-lg">
      {/* Plant leaves */}
      <ellipse cx="118" cy="95" rx="12" ry="16" fill="#86efac" opacity="0.5" />
      <ellipse cx="128" cy="85" rx="9" ry="13" fill="#4ade80" opacity="0.4" />
      <ellipse cx="108" cy="88" rx="8" ry="12" fill="#bbf7d0" opacity="0.4" />
      <rect x="114" y="98" width="5" height="14" rx="2" fill="#86efac" opacity="0.5" />
      {/* Open wallet body */}
      <rect x="14" y="28" width="96" height="68" rx="12" fill="#1d4ed8" opacity="0.9" />
      <rect x="14" y="28" width="96" height="30" rx="12" fill="#2563eb" />
      <rect x="14" y="44" width="96" height="14" fill="#2563eb" opacity="0.6" />
      {/* Wallet flap (open lid) */}
      <path d="M14 28 Q62 8 110 28" fill="#1e40af" opacity="0.85" />
      <path d="M14 28 Q62 12 110 28" stroke="#3b82f6" strokeWidth="1.5" fill="none" />
      {/* Card slot */}
      <rect x="24" y="52" width="50" height="22" rx="5" fill="white" opacity="0.15" />
      <rect x="24" y="56" width="30" height="3" rx="1.5" fill="white" opacity="0.4" />
      <rect x="24" y="62" width="20" height="3" rx="1.5" fill="white" opacity="0.3" />
      {/* Coins */}
      <circle cx="94" cy="63" r="10" fill="#fbbf24" opacity="0.9" />
      <circle cx="94" cy="63" r="7" fill="#f59e0b" opacity="0.8" />
      <text x="94" y="67" textAnchor="middle" fontSize="7" fill="white" fontWeight="bold">Rp</text>
      <circle cx="82" cy="68" r="7" fill="#fcd34d" opacity="0.7" />
      <circle cx="104" cy="72" r="6" fill="#fbbf24" opacity="0.6" />
    </svg>
  );
}

/* ── Dashboard stat card ── */
function DashCard({ label, value, sub, iconBg, icon: IconC }) {
  return (
    <div className="card flex items-center gap-4 p-4 sm:p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <IconC width={22} height={22} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{value}</p>
        <p className="text-xs text-slate-400">{sub}</p>
      </div>
    </div>
  );
}

/* ── Notification item ── */
function NotifItem({ iconBg, icon: IconC, title, body, time }) {
  return (
    <div className="flex items-start gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <IconC width={14} height={14} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">{title}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{body}</p>
      </div>
      <p className="shrink-0 whitespace-nowrap text-[10px] text-slate-400">{time}</p>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/notifications?limit=5').catch(() => ({ data: { data: [] } })),
    ])
      .then(([dash, nf]) => {
        setData(dash.data.data);
        setNotifs(nf.data.data || []);
      })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;
  if (!data) return null;

  const monthly = data.monthlyPayments.map((m) => ({
    name: m.month.slice(5),
    total: m.total / 1_000_000,
  }));

  const totalBills = (data.billStatus || []).reduce((s, b) => s + b.count, 0);
  const paidBills = (data.billStatus || []).filter((b) => b.status === 'PAID').reduce((s, b) => s + b.count, 0);
  const overdueBills = (data.billStatus || [])
    .filter((b) => ['UNPAID', 'OVERDUE'].includes(b.status))
    .reduce((s, b) => s + b.count, 0);

  const classArrears = data.classArrears || [];
  const totalArrearsStudents = classArrears.reduce((s, c) => s + c.studentCount, 0);
  const totalArrearsAmount = classArrears.reduce((s, c) => s + c.totalArrears, 0);

  /* Build notification items */
  const notifItems = [];
  if (data.pending.payments > 0) {
    notifItems.push({
      key: 'pay',
      iconBg: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40',
      icon: Icon.Warning,
      title: `${data.pending.payments} siswa belum membayar tagihan.`,
      body: 'Segera lakukan konfirmasi atau tindak lanjut.',
      time: 'Baru',
    });
  }
  if (data.pending.dispensations > 0) {
    notifItems.push({
      key: 'disp',
      iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40',
      icon: Icon.Clock,
      title: `${data.pending.dispensations} pengajuan dispensasi menunggu persetujuan.`,
      body: 'Silakan periksa dan berikan persetujuan.',
      time: 'Baru',
    });
  }
  notifs.forEach((n, i) => {
    if (notifItems.length < 4) {
      notifItems.push({
        key: n.id || i,
        iconBg: 'bg-brand-100 text-brand-600 dark:bg-brand-900/40',
        icon: Icon.Bell,
        title: n.title,
        body: n.body,
        time: formatDateTime(n.createdAt)?.split(' ').slice(-1)[0] || '',
      });
    }
  });

  return (
    <div className="space-y-4">

      {/* ── Welcome + Notifications ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Welcome card */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-50 to-brand-100 p-5 dark:from-brand-900/30 dark:to-brand-900/10 sm:p-6">
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">
                Selamat datang, {user?.fullName} 👋
              </h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Berikut ringkasan kondisi keuangan sekolah hari ini.
              </p>
            </div>
            <div className="hidden sm:block">
              <WalletIllustration />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="lg:col-span-2 card p-4 sm:p-5">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Icon.Bell width={16} height={16} className="text-brand-600" />
              Notifikasi
            </h3>
            <Link to="/pengaturan" className="text-xs font-medium text-brand-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          {notifItems.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Tidak ada notifikasi baru</p>
          ) : (
            notifItems.map((n) => (
              <NotifItem key={n.key} iconBg={n.iconBg} icon={n.icon} title={n.title} body={n.body} time={n.time} />
            ))
          )}
        </div>
      </div>

      {/* ── 5 Stat Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <DashCard
          label="Total Siswa"
          value={data.students.total.toLocaleString('id-ID')}
          sub="Siswa"
          icon={Icon.Students}
          iconBg="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
        />
        <DashCard
          label="Total Tagihan"
          value={totalBills.toLocaleString('id-ID')}
          sub="Tagihan"
          icon={Icon.Bills}
          iconBg="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300"
        />
        <DashCard
          label="Sudah Dibayar"
          value={paidBills.toLocaleString('id-ID')}
          sub="Tagihan"
          icon={Icon.Money}
          iconBg="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-300"
        />
        <DashCard
          label={<>Belum Dibayar<br /><span className="text-[10px]">(Tunggakan)</span></>}
          value={overdueBills.toLocaleString('id-ID')}
          sub="Tagihan"
          icon={Icon.Warning}
          iconBg="bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-300"
        />
        <DashCard
          label="Pengajuan Dispensasi"
          value={data.pending.dispensations.toLocaleString('id-ID')}
          sub="Menunggu Persetujuan"
          icon={Icon.Clock}
          iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300"
        />
      </div>

      {/* ── Chart + Ringkasan Tunggakan ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">

        {/* Area chart */}
        <div className="lg:col-span-3 card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Icon.Report width={15} height={15} className="text-brand-600" />
              Grafik Pemasukan Pembayaran
            </h3>
            <div className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              6 Bulan Terakhir
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" className="dark:opacity-20" />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(v) => v} />
              <Tooltip
                formatter={(v) => [`Rp ${(v * 1_000_000).toLocaleString('id-ID')}`, 'Pemasukan']}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2.5}
                fill="url(#grad)" dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }} activeDot={{ r: 6 }} />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-1 text-center text-[11px] text-slate-400">— Total Pemasukan (dalam jutaan)</p>
        </div>

        {/* Ringkasan Tunggakan */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ringkasan Tunggakan</h3>
            <Link to="/tagihan?status=OVERDUE" className="text-xs font-medium text-brand-600 hover:underline">
              Lihat detail
            </Link>
          </div>

          {classArrears.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Icon.Check width={28} height={28} className="mb-2 text-emerald-400" />
              <p className="text-sm text-slate-400">Tidak ada tunggakan</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Kelas</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500">Jumlah Siswa Menunggak</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500">Total Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {classArrears.map((c) => (
                    <tr key={c.className} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{c.className}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.studentCount} Siswa</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">{formatIDR(c.totalArrears)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-brand-50 dark:bg-brand-900/20">
                    <td className="px-5 py-3 font-bold text-brand-700 dark:text-brand-300">Total</td>
                    <td className="px-5 py-3 font-bold text-brand-700 dark:text-brand-300">{totalArrearsStudents} Siswa</td>
                    <td className="px-5 py-3 text-right font-bold text-brand-700 dark:text-brand-300">{formatIDR(totalArrearsAmount)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
