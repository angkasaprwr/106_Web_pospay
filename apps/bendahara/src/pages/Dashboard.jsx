import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';
import { formatIDR, formatDateTime } from '../lib/format';
import { formatClassLabel } from '../components/tagihan/shared';
import { fetchTunggakanStats } from '../lib/tunggakanStats';
import WalletIllustration from '../components/dashboard/WalletIllustration';

const CURRENT_YEAR = new Date().getFullYear();

function StatCard({ label, value, sub, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <IconC width={22} height={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

function EmptyPanel({ title, description, icon: IconC }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-800/30">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm dark:bg-slate-800">
        <IconC width={24} height={24} />
      </div>
      <p className="font-medium text-slate-600 dark:text-slate-300">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400 dark:text-slate-500">{description}</p>
    </div>
  );
}

function paymentStatusLabel(status) {
  if (status === 'VERIFIED') return { label: 'Terverifikasi', cls: 'text-emerald-600' };
  if (status === 'PENDING') return { label: 'Menunggu', cls: 'text-amber-600' };
  return { label: status, cls: 'text-slate-500' };
}

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.fullName?.split(' ')[0] || 'Bendahara';
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState(null);
  const [paymentReport, setPaymentReport] = useState(null);
  const [arrearsReport, setArrearsReport] = useState(null);
  const [tunggakanStats, setTunggakanStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const [dashRes, payRes, arrRes, notifRes, tunggakanRes] = await Promise.all([
        api.get('/dashboard'),
        api.get(`/reports/payments/summary?year=${CURRENT_YEAR}`),
        api.get('/reports/arrears/summary'),
        api.get('/notifications?limit=5'),
        fetchTunggakanStats(),
      ]);
      setDashboard(dashRes.data.data);
      setPaymentReport(payRes.data.data);
      setArrearsReport(arrRes.data.data);
      setNotifications(notifRes.data.data || []);
      setUnread(notifRes.data.meta?.unread || 0);
      setTunggakanStats(tunggakanRes);
    } catch {
      /* keep previous data on transient errors */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [load]);

  const billStatusMap = useMemo(() => {
    const map = {};
    (dashboard?.billStatus || []).forEach((g) => {
      map[g.status] = g.count;
    });
    return map;
  }, [dashboard]);

  const totalBills = useMemo(
    () => (dashboard?.billStatus || []).reduce((s, g) => s + g.count, 0),
    [dashboard],
  );

  const paidCount = billStatusMap.PAID || 0;
  const totalStudents = dashboard?.students?.total || 0;
  const activeStudents = dashboard?.students?.active || 0;
  const tunggakanStudents = tunggakanStats?.totalStudents ?? arrearsReport?.stats?.totalStudents ?? 0;
  const tunggakanNominal = tunggakanStats?.totalNominal ?? arrearsReport?.stats?.totalNominal ?? 0;
  const pendingDisp = tunggakanStats?.pendingDisp ?? dashboard?.pending?.dispensations ?? 0;
  const approvedDisp = tunggakanStats?.approvedStudents ?? 0;

  const chartData = useMemo(() => {
    const chart = paymentReport?.chart || [];
    if (chart.length <= 6) return chart;
    return chart.slice(-6);
  }, [paymentReport]);

  const classArrearsSummary = useMemo(() => {
    const rows = arrearsReport?.rows || [];
    const map = {};
    rows.forEach((r) => {
      const key = r.className || '-';
      if (!map[key]) map[key] = { className: key, students: 0, nominal: 0 };
      map[key].students += 1;
      map[key].nominal += r.sisaTunggakan;
    });
    return Object.values(map).sort((a, b) => b.nominal - a.nominal).slice(0, 5);
  }, [arrearsReport]);

  const hasData = totalStudents > 0 || totalBills > 0 || paidCount > 0 || tunggakanStudents > 0 || pendingDisp > 0;

  const stats = [
    {
      label: 'Total Siswa',
      value: String(totalStudents),
      sub: totalStudents > 0 ? `${activeStudents} siswa aktif` : 'Belum ada data siswa',
      icon: Icon.Students,
      iconBg: 'bg-blue-50 dark:bg-blue-950/40',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Total Tagihan',
      value: String(totalBills),
      sub: totalBills > 0 ? `${totalBills} tagihan dibuat` : 'Belum ada tagihan',
      icon: Icon.Bills,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Sudah Dibayar',
      value: String(paidCount),
      sub: paidCount > 0 ? `${formatIDR(dashboard?.finance?.totalPaid || 0)} terkumpul` : 'Belum ada pembayaran lunas',
      icon: Icon.Payment,
      iconBg: 'bg-green-50 dark:bg-green-950/40',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: 'Belum Dibayar (Tunggakan)',
      value: String(tunggakanStudents),
      sub: tunggakanStudents > 0
        ? `${formatIDR(tunggakanNominal)}${approvedDisp > 0 ? ` · ${approvedDisp} dispensasi disetujui` : ''}`
        : 'Tidak ada tunggakan',
      icon: Icon.Warning,
      iconBg: 'bg-red-50 dark:bg-red-950/40',
      iconColor: 'text-red-500 dark:text-red-400',
    },
    {
      label: 'Pengajuan Dispensasi',
      value: String(pendingDisp),
      sub: pendingDisp > 0 ? 'Menunggu persetujuan bendahara' : 'Tidak ada pengajuan baru',
      icon: Icon.Clock,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40',
      iconColor: 'text-amber-500 dark:text-amber-400',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
              Selamat datang, {displayName}
              <span className="ml-1">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {hasData
                ? 'Ringkasan keuangan sekolah diperbarui otomatis dari data siswa, tagihan, pembayaran, dan dispensasi.'
                : 'Ringkasan keuangan akan tampil setelah data tersedia dari pengujian CRUD.'}
            </p>
          </div>
          <WalletIllustration />
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800 dark:text-slate-100">Notifikasi</h2>
            <Link to="/tagihan" state={{ tab: 'status' }} className="text-xs font-medium text-pospay hover:underline dark:text-blue-400">
              Lihat semua
            </Link>
          </div>
          {loading && notifications.length === 0 ? (
            <div className="flex justify-center py-8">
              <Spinner size={24} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400 dark:bg-slate-800">
                <Icon.Bell width={18} height={18} />
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Belum ada notifikasi</p>
              <p className="mt-1 text-xs text-slate-400">Notifikasi muncul setelah aktivitas pembayaran atau dispensasi.</p>
            </div>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`rounded-lg border px-3 py-2.5 text-sm dark:border-slate-700 ${
                    !n.readAt ? 'border-blue-100 bg-blue-50/50 dark:bg-blue-950/30' : 'border-slate-100 dark:bg-slate-800/40'
                  }`}
                >
                  <p className="font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
              ))}
              {unread > 0 && (
                <p className="text-center text-xs text-pospay dark:text-blue-400">{unread} belum dibaca</p>
              )}
            </div>
          )}
        </div>
      </div>

      {loading && !dashboard ? (
        <div className="flex h-40 items-center justify-center">
          <Spinner size={32} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {stats.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Grafik Pemasukan Pembayaran</h3>
            <Link to="/laporan?tab=pembayaran" className="text-xs font-medium text-pospay hover:underline dark:text-blue-400">
              Lihat laporan
            </Link>
          </div>
          {chartData.length === 0 ? (
            <EmptyPanel
              icon={Icon.Report}
              title="Belum ada data grafik"
              description="Grafik pemasukan diambil dari Laporan Pembayaran setelah transaksi diverifikasi."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)} jt`} />
                <Tooltip formatter={(v) => [formatIDR(v), 'Pemasukan']} />
                <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40}>
                  <LabelList dataKey="valueJt" position="top" style={{ fontSize: 10, fill: '#475569' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          {paymentReport?.stats?.totalIncome > 0 && (
            <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
              Total pemasukan {CURRENT_YEAR}: {paymentReport.stats.totalIncomeFormatted}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Ringkasan Tunggakan</h3>
            <Link to="/laporan?tab=tunggakan" className="text-xs font-medium text-pospay hover:underline dark:text-blue-400">
              Lihat detail
            </Link>
          </div>
          {classArrearsSummary.length === 0 ? (
            <EmptyPanel
              icon={Icon.Warning}
              title="Belum ada data tunggakan"
              description="Data diambil dari Tunggakan & Dispensasi serta Laporan Tunggakan setelah tagihan siswa tercatat."
            />
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Siswa Tunggakan</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{tunggakanStudents}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total Nominal</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatIDR(tunggakanNominal)}</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-100 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                      <th className="px-3 py-2 font-medium">Kelas</th>
                      <th className="px-3 py-2 font-medium text-center">Siswa</th>
                      <th className="px-3 py-2 font-medium text-right">Tunggakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classArrearsSummary.map((row) => (
                      <tr key={row.className} className="border-b border-slate-50 dark:border-slate-800">
                        <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {formatClassLabel(row.className)}
                        </td>
                        <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.students}</td>
                        <td className="px-3 py-2.5 text-right font-medium text-red-600 dark:text-red-400">
                          {formatIDR(row.nominal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Link
                to="/tagihan"
                state={{ tab: 'tunggakan' }}
                className="block text-center text-xs font-medium text-pospay hover:underline dark:text-blue-400"
              >
                Kelola di Tunggakan & Dispensasi →
              </Link>
            </div>
          )}
        </div>
      </div>

      {dashboard?.recentPayments?.length > 0 && (
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Pembayaran Terbaru</h3>
            <Link to="/tagihan" state={{ tab: 'status' }} className="text-xs font-medium text-pospay hover:underline dark:text-blue-400">
              Status pembayaran
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                  <th className="px-3 py-2 font-medium">Siswa</th>
                  <th className="px-3 py-2 font-medium">Jenis</th>
                  <th className="px-3 py-2 font-medium text-right">Nominal</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recentPayments.map((p) => {
                  const st = paymentStatusLabel(p.status);
                  return (
                    <tr key={p.id} className="border-b border-slate-50 dark:border-slate-800">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{p.studentName}</p>
                        <p className="text-xs text-slate-400">{p.nis}</p>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300">{p.feeType}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{formatIDR(p.amount)}</td>
                      <td className={`px-3 py-2.5 text-xs font-medium ${st.cls}`}>{st.label}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{formatDateTime(p.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
