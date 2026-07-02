import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Icon } from '../components/Icons';
import WalletIllustration from '../components/dashboard/WalletIllustration';

const EMPTY_STATS = [
  { label: 'Total Siswa', value: '—', icon: Icon.Students, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { label: 'Total Tagihan', value: '—', icon: Icon.Bills, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  { label: 'Sudah Dibayar', value: '—', icon: Icon.Payment, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { label: 'Belum Dibayar (Tunggakan)', value: '—', icon: Icon.Warning, iconBg: 'bg-red-50', iconColor: 'text-red-500' },
  { label: 'Pengajuan Dispensasi', value: '—', icon: Icon.Clock, iconBg: 'bg-amber-50', iconColor: 'text-amber-500' },
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

function EmptyPanel({ title, description, icon: IconC }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
        <IconC width={24} height={24} />
      </div>
      <p className="font-medium text-slate-600">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">{description}</p>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const displayName = user?.fullName?.split(' ')[0] || 'Bendahara';

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Selamat datang, {displayName}
              <span className="ml-1">👋</span>
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Ringkasan keuangan sekolah akan ditampilkan setelah data tersedia dari pengujian CRUD.
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
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
              <Icon.Bell width={18} height={18} />
            </div>
            <p className="text-sm text-slate-500">Belum ada notifikasi</p>
            <p className="mt-1 text-xs text-slate-400">Notifikasi akan muncul setelah ada aktivitas data.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {EMPTY_STATS.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={s.value}
            sub="Menunggu data"
            icon={s.icon}
            iconBg={s.iconBg}
            iconColor={s.iconColor}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Grafik Pemasukan Pembayaran</h3>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 outline-none focus:border-pospay"
              defaultValue="6"
              aria-label="Periode grafik"
              disabled
            >
              <option value="6">6 Bulan Terakhir</option>
            </select>
          </div>
          <EmptyPanel
            icon={Icon.Report}
            title="Belum ada data grafik"
            description="Grafik pemasukan akan ditampilkan setelah transaksi pembayaran tercatat di database."
          />
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Ringkasan Tunggakan</h3>
            <Link to="/laporan?tab=tunggakan" className="text-xs font-medium text-pospay hover:underline">
              Lihat detail
            </Link>
          </div>
          <EmptyPanel
            icon={Icon.Warning}
            title="Belum ada data tunggakan"
            description="Ringkasan tunggakan per kelas akan muncul setelah data tagihan siswa tersimpan."
          />
        </div>
      </div>
    </div>
  );
}
