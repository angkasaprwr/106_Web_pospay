import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import { formatIDR } from '../lib/format';
import { Icon } from '../components/Icons';
import { StatCard } from '../components/tagihan/shared';
import DaftarTagihanTab from '../components/tagihan/DaftarTagihanTab';
import StatusPembayaranTab from '../components/tagihan/StatusPembayaranTab';
import VerifikasiPembayaranTab, { fetchVerifikasiStats } from '../components/tagihan/VerifikasiPembayaranTab';
import TunggakanDispensasiTab from '../components/tagihan/TunggakanDispensasiTab';
import { fetchTunggakanStats } from '../lib/tunggakanStats';

const TABS = [
  { id: 'daftar', label: 'A. Daftar Tagihan' },
  { id: 'status', label: 'B. Status Pembayaran' },
  { id: 'verifikasi', label: 'C. Verifikasi Pembayaran' },
  { id: 'tunggakan', label: 'D. Tunggakan & Dispensasi' },
];

async function countBills(status) {
  const params = new URLSearchParams({ limit: 1, page: 1 });
  if (status) params.set('status', status);
  const { data } = await api.get(`/bills?${params}`);
  return data.meta?.total || 0;
}

async function countPayments(status) {
  const params = new URLSearchParams({ limit: 1, page: 1 });
  if (status) params.set('status', status);
  const { data } = await api.get(`/payments?${params}`);
  return data.meta?.total || 0;
}

async function countDispensations(status) {
  const params = new URLSearchParams({ limit: 1, page: 1 });
  if (status) params.set('status', status);
  const { data } = await api.get(`/dispensations?${params}`);
  return data.meta?.total || 0;
}

export default function Bills() {
  const location = useLocation();
  const initialTab = TABS.some((t) => t.id === location.state?.tab) ? location.state.tab : 'daftar';
  const [tab, setTab] = useState(initialTab);
  const [stats, setStats] = useState({ total: 0, paid: 0, pendingPay: 0, unpaid: 0, pendingDisp: 0 });
  const [verifStats, setVerifStats] = useState({ pending: 0, verified: 0, rejected: 0, totalNominal: 0, todayPending: 0 });
  const [tunggakanStats, setTunggakanStats] = useState({ totalStudents: 0, totalNominal: 0, pendingDisp: 0, approvedStudents: 0 });

  const selectTab = (id) => {
    setTab(id);
  };

  const loadVerifikasiStats = useCallback(async () => {
    try {
      setVerifStats(await fetchVerifikasiStats());
    } catch {
      /* ignore */
    }
  }, []);

  const loadTunggakanStats = useCallback(async () => {
    try {
      setTunggakanStats(await fetchTunggakanStats());
    } catch {
      /* ignore */
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const [total, paid, pendingPay, unpaid, overdue, partial, pendingDisp] = await Promise.all([
        countBills(''),
        countBills('PAID'),
        countPayments('PENDING'),
        countBills('UNPAID'),
        countBills('OVERDUE'),
        countBills('PARTIAL'),
        countDispensations('PENDING'),
      ]);
      setStats({
        total,
        paid,
        pendingPay,
        unpaid: unpaid + overdue + partial,
        pendingDisp,
      });
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadStats();
    loadVerifikasiStats();
    loadTunggakanStats();
  }, [loadStats, loadVerifikasiStats, loadTunggakanStats]);

  const refreshAllStats = useCallback(() => {
    loadStats();
    loadVerifikasiStats();
    loadTunggakanStats();
  }, [loadStats, loadVerifikasiStats, loadTunggakanStats]);

  useEffect(() => {
    if (TABS.some((t) => t.id === location.state?.tab)) {
      setTab(location.state.tab);
    }
  }, [location.state?.tab]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Tagihan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola tagihan, pembayaran, tunggakan, dan dispensasi siswa dalam satu tempat.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        {tab === 'verifikasi' ? (
          <>
            <StatCard label="Menunggu Verifikasi" value={String(verifStats.pending)} icon={Icon.Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Lunas" value={String(verifStats.verified)} icon={Icon.Check} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard label="Ditolak" value={String(verifStats.rejected)} icon={Icon.X} iconBg="bg-red-50" iconColor="text-red-500" />
            <StatCard label="Total Nominal" value={formatIDR(verifStats.totalNominal)} icon={Icon.Money} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Hari Ini" value={`${verifStats.todayPending} Menunggu`} icon={Icon.Clock} iconBg="bg-indigo-50" iconColor="text-indigo-600" />
          </>
        ) : tab === 'tunggakan' ? (
          <>
            <StatCard label="Total Tunggakan" value={String(tunggakanStats.totalStudents)} icon={Icon.Students} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Total Nominal Tunggakan" value={formatIDR(tunggakanStats.totalNominal)} icon={Icon.Money} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Pengajuan Dispensasi" value={String(tunggakanStats.pendingDisp)} icon={Icon.Dispensation} iconBg="bg-purple-50" iconColor="text-purple-600" />
            <StatCard label="Dispensasi Disetujui" value={String(tunggakanStats.approvedStudents)} icon={Icon.Check} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          </>
        ) : (
          <>
            <StatCard label="Total Tagihan" value={`${stats.total} Tagihan`} icon={Icon.Bills} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Lunas" value={`${stats.paid} Tagihan`} icon={Icon.Check} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard label="Menunggu Verifikasi" value={`${stats.pendingPay} Tagihan`} icon={Icon.Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Belum Bayar" value={`${stats.unpaid} Tagihan`} icon={Icon.Warning} iconBg="bg-red-50" iconColor="text-red-500" />
            <StatCard label="Pengajuan Dispensasi" value={`${stats.pendingDisp} Menunggu`} icon={Icon.User} iconBg="bg-purple-50" iconColor="text-purple-600" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => selectTab(t.id)}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${
              tab === t.id
                ? 'bg-pospay text-white shadow-sm'
                : 'border border-slate-200 bg-white text-slate-700 hover:border-pospay/30 hover:text-pospay'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'daftar' && <DaftarTagihanTab onStatsChange={refreshAllStats} />}
      {tab === 'status' && <StatusPembayaranTab />}
      {tab === 'verifikasi' && <VerifikasiPembayaranTab onStatsChange={refreshAllStats} />}
      {tab === 'tunggakan' && <TunggakanDispensasiTab onStatsChange={refreshAllStats} />}

      <Link
        to="/chatbot"
        className="fixed bottom-6 right-6 z-20 flex items-center gap-2 rounded-full bg-pospay px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-pospay-700"
      >
        <Icon.Chat width={20} height={20} />
        <span className="hidden sm:inline">Butuh bantuan? Tanya lewat Chatbot</span>
      </Link>
    </div>
  );
}
