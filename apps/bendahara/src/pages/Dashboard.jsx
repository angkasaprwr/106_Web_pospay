import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { formatIDR } from '../lib/format';
import { Icon } from '../components/Icons';
import WalletIllustration from '../components/dashboard/WalletIllustration';

/** Data tampilan beranda — placeholder desain, bukan dari database */
const DEMO_STATS = {
  totalStudents: 320,
  totalBills: 125,
  paidBills: 87,
  unpaidBills: 38,
  pendingDispensations: 5,
};

const DEMO_NOTIFICATIONS = [
  {
    id: 1,
    type: 'warning',
    text: '5 siswa belum membayar tagihan. Segera lakukan konfirmasi atau tindak lanjut.',
    time: '10 menit yang lalu',
  },
  {
    id: 2,
    type: 'pending',
    text: '2 pengajuan dispensasi menunggu persetujuan. Silakan periksa dan berikan persetujuan.',
    time: '25 menit yang lalu',
  },
];

const DEMO_CHART = [
  { bulan: 'Jan', pemasukan: 45 },
  { bulan: 'Feb', pemasukan: 52 },
  { bulan: 'Mar', pemasukan: 68 },
  { bulan: 'Apr', pemasukan: 74 },
  { bulan: 'Mei', pemasukan: 88 },
  { bulan: 'Jun', pemasukan: 95 },
];

const DEMO_ARREARS = [
  { kelas: 'VII A', siswa: 9, total: 950000 },
  { kelas: 'VII B', siswa: 7, total: 750000 },
  { kelas: 'VIII A', siswa: 8, total: 800000 },
  { kelas: 'VIII B', siswa: 6, total: 600000 },
  { kelas: 'IX A', siswa: 8, total: 750000 },
];

function StatCard({ label, value, sub, icon: IconC, iconBg, iconColor }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
        </div>
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <IconC width={22} height={22} className={iconColor} />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.fullName?.split(' ')[0] || 'Bendahara';
  const totalArrearsStudents = DEMO_ARREARS.reduce((s, r) => s + r.siswa, 0);
  const totalArrearsAmount = DEMO_ARREARS.reduce((s, r) => s + r.total, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Baris atas: sambutan + notifikasi */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Selamat datang, {displayName}
              <span className="ml-1">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Berikut ringkasan kondisi keuangan sekolah hari ini.
            </p>
          </div>
          <WalletIllustration />
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Notifikasi</h2>
            <Link to="/pembayaran" className="text-xs font-medium text-pospay hover:underline">
              Lihat semua
            </Link>
          </div>
          <div className="space-y-4">
            {DEMO_NOTIFICATIONS.map((n) => (
              <div key={n.id} className="flex gap-3">
                <div
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    n.type === 'warning' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'
                  }`}
                >
                  {n.type === 'warning' ? (
                    <Icon.Warning width={16} height={16} />
                  ) : (
                    <Icon.Clock width={16} height={16} />
                  )}
                </div>
                <div>
                  <p className="text-sm leading-snug text-slate-600">{n.text}</p>
                  <p className="mt-1 text-xs text-slate-400">{n.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5 kartu statistik */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Total Siswa"
          value={`${DEMO_STATS.totalStudents} Siswa`}
          icon={Icon.Students}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <StatCard
          label="Total Tagihan"
          value={`${DEMO_STATS.totalBills} Tagihan`}
          icon={Icon.Bills}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
        />
        <StatCard
          label="Sudah Dibayar"
          value={`${DEMO_STATS.paidBills} Tagihan`}
          icon={Icon.Payment}
          iconBg="bg-green-50"
          iconColor="text-green-600"
        />
        <StatCard
          label="Belum Dibayar (Tunggakan)"
          value={`${DEMO_STATS.unpaidBills} Tagihan`}
          icon={Icon.Warning}
          iconBg="bg-red-50"
          iconColor="text-red-500"
        />
        <StatCard
          label="Pengajuan Dispensasi"
          value={`${DEMO_STATS.pendingDispensations} Menunggu Persetujuan`}
          icon={Icon.Clock}
          iconBg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </div>

      {/* Grafik + tabel tunggakan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Grafik Pemasukan Pembayaran</h3>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-pospay"
              defaultValue="6"
              aria-label="Periode grafik"
            >
              <option value="6">6 Bulan Terakhir</option>
              <option value="12">12 Bulan Terakhir</option>
            </select>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={DEMO_CHART}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="bulan" fontSize={12} stroke="#94a3b8" tickLine={false} axisLine={false} />
              <YAxis
                fontSize={11}
                stroke="#94a3b8"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} jt`}
                domain={[0, 125]}
                ticks={[0, 25, 50, 75, 100, 125]}
              />
              <Tooltip
                formatter={(v) => [`Rp ${v} juta`, 'Pemasukan']}
                contentStyle={{ borderRadius: 8, fontSize: 12, border: '1px solid #e2e8f0' }}
              />
              <Line
                type="monotone"
                dataKey="pemasukan"
                stroke="#2563EB"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#2563EB', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Ringkasan Tunggakan</h3>
            <Link to="/laporan" className="text-xs font-medium text-pospay hover:underline">
              Lihat detail
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="pb-3 pr-4 font-medium">Kelas</th>
                  <th className="pb-3 pr-4 font-medium">Jumlah Siswa Menunggak</th>
                  <th className="pb-3 font-medium text-right">Total Tunggakan</th>
                </tr>
              </thead>
              <tbody>
                {DEMO_ARREARS.map((row) => (
                  <tr key={row.kelas} className="border-b border-slate-50 text-slate-700">
                    <td className="py-3 pr-4 font-medium">{row.kelas}</td>
                    <td className="py-3 pr-4">{row.siswa} Siswa</td>
                    <td className="py-3 text-right font-medium">{formatIDR(row.total)}</td>
                  </tr>
                ))}
                <tr className="bg-blue-50/60 font-semibold text-pospay">
                  <td className="rounded-bl-lg py-3 pr-4">Total</td>
                  <td className="py-3 pr-4">{totalArrearsStudents} Siswa</td>
                  <td className="rounded-br-lg py-3 text-right">{formatIDR(totalArrearsAmount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
