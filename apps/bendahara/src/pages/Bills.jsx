import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { Icon } from '../components/Icons';
import { StatCard } from '../components/tagihan/shared';
import DaftarTagihanTab from '../components/tagihan/DaftarTagihanTab';
import StatusPembayaranTab from '../components/tagihan/StatusPembayaranTab';
import VerifikasiPembayaranTab from '../components/tagihan/VerifikasiPembayaranTab';
import TunggakanDispensasiTab from '../components/tagihan/TunggakanDispensasiTab';

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
  const [tab, setTab] = useState('daftar');
  const [stats, setStats] = useState({ total: 0, paid: 0, pendingPay: 0, unpaid: 0, pendingDisp: 0 });

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
  }, [loadStats]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Tagihan</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola tagihan, pembayaran, tunggakan, dan dispensasi siswa dalam satu tempat.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <StatCard label="Total Tagihan" value={`${stats.total} Tagihan`} icon={Icon.Bills} iconBg="bg-blue-50" iconColor="text-blue-600" />
        <StatCard label="Lunas" value={`${stats.paid} Tagihan`} icon={Icon.Check} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
        <StatCard label="Menunggu Verifikasi" value={`${stats.pendingPay} Tagihan`} icon={Icon.Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
        <StatCard label="Belum Bayar" value={`${stats.unpaid} Tagihan`} icon={Icon.Warning} iconBg="bg-red-50" iconColor="text-red-500" />
        <StatCard label="Pengajuan Dispensasi" value={`${stats.pendingDisp} Menunggu`} icon={Icon.User} iconBg="bg-purple-50" iconColor="text-purple-600" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
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

      {tab === 'daftar' && <DaftarTagihanTab onStatsChange={loadStats} />}
      {tab === 'status' && <StatusPembayaranTab />}
      {tab === 'verifikasi' && <VerifikasiPembayaranTab />}
      {tab === 'tunggakan' && <TunggakanDispensasiTab />}

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
