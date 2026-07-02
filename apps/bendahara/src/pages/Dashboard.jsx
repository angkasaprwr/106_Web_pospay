import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR, formatDateTime, PAYMENT_STATUS, BILL_STATUS } from '../lib/format';
import { PageLoader } from '../components/ui';
import { Icon } from '../components/Icons';

const STATUS_COLORS = { UNPAID: '#94a3b8', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', WAIVED: '#6366f1' };
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const QUICK_LINKS = [
  { to: '/siswa', label: 'Data Siswa', icon: Icon.Students, desc: 'Kelola data siswa' },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills, desc: 'Buat & pantau tagihan' },
  { to: '/pembayaran', label: 'Pembayaran', icon: Icon.Payment, desc: 'Verifikasi pembayaran' },
  { to: '/laporan', label: 'Laporan', icon: Icon.Report, desc: 'Ekspor laporan keuangan' },
];

function DashboardStat({ label, value, hint, icon: IconC, accent }) {
  const accents = {
    blue: 'from-pospay to-pospay-700',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
      <div className={`h-1 bg-gradient-to-r ${accents[accent]}`} />
      <div className="flex items-start gap-4 p-5">
        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${accents[accent]} text-white shadow-sm`}>
          <IconC width={22} height={22} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white sm:text-2xl">{value}</p>
          {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [schoolName, setSchoolName] = useState('SMP Pusponegoro Brebes');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard'),
      api.get('/settings/school-profile').catch(() => null),
    ])
      .then(([dash, school]) => {
        setData(dash.data.data);
        if (school?.data?.data?.name) setSchoolName(school.data.data.name);
      })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;
  if (!data) return null;

  const monthly = data.monthlyPayments.map((m) => {
    const monthNum = parseInt(m.month.slice(5), 10);
    return { name: MONTH_LABELS[monthNum - 1] || m.month.slice(5), total: m.total };
  });
  const pie = data.billStatus.map((b) => ({ name: BILL_STATUS[b.status]?.label || b.status, value: b.count, status: b.status }));
  const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Banner sambutan */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-pospay via-pospay-700 to-pospay-800 p-6 text-white shadow-lg sm:p-8">
        <div
          className="pointer-events-none absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">{today}</p>
            <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">
              Selamat datang, {user?.fullName?.split(' ')[0] || 'Bendahara'}!
            </h1>
            <p className="mt-2 max-w-xl text-sm text-white/85">
              Dashboard keuangan {schoolName}. Data di bawah diperbarui otomatis dari aktivitas CRUD di semua menu utama.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3 rounded-xl bg-white/15 px-5 py-4 ring-1 ring-white/20 backdrop-blur">
            <div className="text-right">
              <p className="text-xs text-white/70">Tingkat Penagihan</p>
              <p className="text-2xl font-extrabold">{data.collectionRate ?? 0}%</p>
            </div>
            <div className="h-12 w-12 rounded-full bg-white/20 p-1">
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeDasharray={`${(data.collectionRate ?? 0) * 0.94} 100`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Statistik utama */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStat label="Total Siswa" value={data.students.total} hint={`${data.students.active} siswa aktif`} icon={Icon.Students} accent="blue" />
        <DashboardStat label="Total Tertagih" value={formatIDR(data.finance.totalBilled)} icon={Icon.Bills} accent="amber" />
        <DashboardStat label="Total Terbayar" value={formatIDR(data.finance.totalPaid)} icon={Icon.Money} accent="emerald" />
        <DashboardStat label="Total Tunggakan" value={formatIDR(data.finance.totalOutstanding)} icon={Icon.Warning} accent="red" />
      </div>

      {/* Akses cepat */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">Akses Cepat</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {QUICK_LINKS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-pospay/30 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pospay-50 text-pospay transition group-hover:bg-pospay group-hover:text-white dark:bg-pospay/20">
                <item.icon width={20} height={20} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{item.label}</p>
                <p className="truncate text-xs text-slate-400">{item.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Grafik */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pembayaran 6 Bulan Terakhir</h3>
            <span className="text-xs text-slate-400">Data dari PostgreSQL</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" tickLine={false} />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => formatIDR(v)} contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }} />
              <Bar dataKey="total" fill="#0047AB" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Status Tagihan</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={3}>
                {pie.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-2">
            {pie.map((p) => (
              <div key={p.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS_COLORS[p.status] }} />
                  {p.name}
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-100">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Menunggu tindakan + aktivitas terbaru */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <Link to="/pembayaran" className="flex items-center justify-between rounded-2xl border border-amber-100 bg-amber-50 p-5 transition hover:shadow-md dark:border-amber-900/40 dark:bg-amber-900/20">
            <div>
              <p className="text-sm text-amber-700 dark:text-amber-300">Pembayaran menunggu verifikasi</p>
              <p className="text-3xl font-extrabold text-amber-600">{data.pending.payments}</p>
            </div>
            <Icon.Payment width={36} height={36} className="text-amber-500" />
          </Link>
          <Link to="/dispensasi" className="flex items-center justify-between rounded-2xl border border-pospay-100 bg-pospay-50 p-5 transition hover:shadow-md dark:border-pospay/30 dark:bg-pospay/10">
            <div>
              <p className="text-sm text-pospay-700 dark:text-pospay-200">Dispensasi menunggu review</p>
              <p className="text-3xl font-extrabold text-pospay">{data.pending.dispensations}</p>
            </div>
            <Icon.Dispensation width={36} height={36} className="text-pospay" />
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Aktivitas Pembayaran Terbaru</h3>
            <Link to="/pembayaran" className="text-xs font-medium text-pospay hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table-base w-full">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Jenis</th>
                  <th>Nominal</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {(data.recentPayments || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-sm text-slate-400">
                      Belum ada data pembayaran. Tambahkan melalui menu Tagihan & Pembayaran.
                    </td>
                  </tr>
                ) : (
                  data.recentPayments.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <p className="font-medium text-slate-800 dark:text-slate-100">{p.studentName}</p>
                        <p className="text-xs text-slate-400">{p.nis}</p>
                      </td>
                      <td className="text-sm">{p.feeType}</td>
                      <td className="font-medium">{formatIDR(p.amount)}</td>
                      <td>
                        <span className={`badge ${PAYMENT_STATUS[p.status]?.cls || 'bg-slate-100 text-slate-700'}`}>
                          {PAYMENT_STATUS[p.status]?.label || p.status}
                        </span>
                      </td>
                      <td className="text-xs text-slate-400">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
