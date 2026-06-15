import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR, formatDateTime } from '../lib/format';
import { StatCard, PageLoader } from '../components/ui';
import { Icon } from '../components/Icons';

function NotifItem({ icon: IconC, iconBg, title, body, time }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        <IconC width={16} height={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100 leading-snug">{title}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{body}</p>
      </div>
      <p className="shrink-0 text-[10px] text-slate-400 whitespace-nowrap">{time}</p>
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
    .filter((b) => b.status === 'UNPAID' || b.status === 'OVERDUE')
    .reduce((s, b) => s + b.count, 0);

  const classArrears = data.classArrears || [];
  const totalArrearsStudents = classArrears.reduce((s, c) => s + c.studentCount, 0);
  const totalArrearsAmount = classArrears.reduce((s, c) => s + c.totalArrears, 0);

  return (
    <div className="space-y-4">
      {/* Welcome + Notifications */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Welcome card */}
        <div className="lg:col-span-3 card overflow-hidden">
          <div className="flex items-center justify-between bg-gradient-to-r from-brand-600 to-brand-700 p-5 sm:p-6 text-white">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">
                Selamat datang, {user?.fullName} 👋
              </h1>
              <p className="mt-1 text-sm text-brand-100">
                Berikut ringkasan kondisi keuangan sekolah hari ini.
              </p>
            </div>
            <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
              <Icon.Money width={36} height={36} />
            </div>
          </div>
        </div>

        {/* Notifications card */}
        <div className="lg:col-span-2 card p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Icon.Bell width={16} height={16} className="text-brand-600" />
              Notifikasi
            </h3>
            <Link to="/pengaturan" className="text-xs font-medium text-brand-600 hover:underline">
              Lihat semua
            </Link>
          </div>
          {notifs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Tidak ada notifikasi baru</p>
          ) : (
            <div>
              {notifs.slice(0, 3).map((n, i) => (
                <NotifItem
                  key={n.id || i}
                  icon={n.type === 'WARNING' ? Icon.Warning : Icon.Bell}
                  iconBg={
                    n.type === 'WARNING'
                      ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/40'
                      : 'bg-brand-100 text-brand-600 dark:bg-brand-900/40'
                  }
                  title={n.title}
                  body={n.body}
                  time={formatDateTime(n.createdAt)?.split(' ').slice(1).join(' ') || ''}
                />
              ))}
            </div>
          )}
          {data.pending.payments > 0 && (
            <NotifItem
              icon={Icon.Warning}
              iconBg="bg-amber-100 text-amber-600 dark:bg-amber-900/40"
              title={`${data.pending.payments} pembayaran menunggu verifikasi.`}
              body="Segera lakukan konfirmasi atau tindak lanjut."
              time="Baru"
            />
          )}
          {data.pending.dispensations > 0 && (
            <NotifItem
              icon={Icon.Clock}
              iconBg="bg-orange-100 text-orange-600 dark:bg-orange-900/40"
              title={`${data.pending.dispensations} pengajuan dispensasi menunggu persetujuan.`}
              body="Silakan periksa dan berikan persetujuan."
              time="Baru"
            />
          )}
        </div>
      </div>

      {/* Stat Cards — 5 columns */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Total Siswa"
          value={data.students.total.toLocaleString('id-ID')}
          hint={`${data.students.active} aktif`}
          icon={Icon.Students}
          tone="brand"
        />
        <StatCard
          label="Total Tagihan"
          value={totalBills.toLocaleString('id-ID')}
          hint="Tagihan"
          icon={Icon.Bills}
          tone="amber"
        />
        <StatCard
          label="Sudah Dibayar"
          value={paidBills.toLocaleString('id-ID')}
          hint="Tagihan lunas"
          icon={Icon.Money}
          tone="emerald"
        />
        <StatCard
          label="Belum Dibayar"
          value={overdueBills.toLocaleString('id-ID')}
          hint="Tunggakan"
          icon={Icon.Warning}
          tone="red"
        />
        <StatCard
          label="Pengajuan Dispensasi"
          value={data.pending.dispensations.toLocaleString('id-ID')}
          hint="Menunggu Persetujuan"
          icon={Icon.Clock}
          tone="amber"
        />
      </div>

      {/* Chart + Class Arrears Table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Line chart */}
        <div className="lg:col-span-3 card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-100">
              <Icon.Report width={16} height={16} className="text-brand-600" />
              Grafik Pemasukan Pembayaran
            </h3>
            <span className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              6 Bulan Terakhir
            </span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthly} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPayment" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" tickLine={false} />
              <YAxis
                fontSize={11}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}`}
              />
              <Tooltip
                formatter={(v) => [`Rp ${(v * 1_000_000).toLocaleString('id-ID')}`, 'Pemasukan']}
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
              />
              <Area
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#colorPayment)"
                dot={{ fill: '#2563eb', r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-slate-400">
            — Total Pemasukan (dalam jutaan)
          </p>
        </div>

        {/* Class Arrears Table */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ringkasan Tunggakan</h3>
            <Link to="/tagihan?status=OVERDUE" className="text-xs font-medium text-brand-600 hover:underline">
              Lihat detail
            </Link>
          </div>
          {classArrears.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-400">Tidak ada data tunggakan</p>
          ) : (
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Kelas</th>
                    <th className="px-5 py-2.5 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">Jml Siswa Menunggak</th>
                    <th className="px-5 py-2.5 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">Total Tunggakan</th>
                  </tr>
                </thead>
                <tbody>
                  {classArrears.map((c) => (
                    <tr
                      key={c.className}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">{c.className}</td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">{c.studentCount} Siswa</td>
                      <td className="px-5 py-3 text-right text-slate-700 dark:text-slate-200">
                        {formatIDR(c.totalArrears)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {classArrears.length > 0 && (
                  <tfoot>
                    <tr className="bg-brand-50 dark:bg-brand-900/20">
                      <td className="px-5 py-3 font-bold text-brand-700 dark:text-brand-300">Total</td>
                      <td className="px-5 py-3 font-bold text-brand-700 dark:text-brand-300">
                        {totalArrearsStudents} Siswa
                      </td>
                      <td className="px-5 py-3 text-right font-bold text-brand-700 dark:text-brand-300">
                        {formatIDR(totalArrearsAmount)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
