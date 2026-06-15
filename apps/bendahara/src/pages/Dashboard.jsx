import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR } from '../lib/format';
import { PageHeader, StatCard, PageLoader } from '../components/ui';
import { Icon } from '../components/Icons';
import { BILL_STATUS } from '../lib/format';

const STATUS_COLORS = { UNPAID: '#94a3b8', PARTIAL: '#f59e0b', PAID: '#10b981', OVERDUE: '#ef4444', WAIVED: '#6366f1' };

export default function Dashboard() {
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/dashboard')
      .then(({ data }) => setData(data.data))
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;
  if (!data) return null;

  const monthly = data.monthlyPayments.map((m) => ({ name: m.month.slice(5), total: m.total }));
  const pie = data.billStatus.map((b) => ({ name: BILL_STATUS[b.status]?.label || b.status, value: b.count, status: b.status }));

  return (
    <div>
      <PageHeader title="Beranda" subtitle="Ringkasan keuangan sekolah" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Siswa" value={data.students.total} hint={`${data.students.active} aktif`} icon={Icon.Students} tone="brand" />
        <StatCard label="Total Tertagih" value={formatIDR(data.finance.totalBilled)} icon={Icon.Bills} tone="amber" />
        <StatCard label="Total Terbayar" value={formatIDR(data.finance.totalPaid)} icon={Icon.Money} tone="emerald" />
        <StatCard label="Total Tunggakan" value={formatIDR(data.finance.totalOutstanding)} icon={Icon.Warning} tone="red" />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Pembayaran 6 Bulan Terakhir</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" />
              <XAxis dataKey="name" fontSize={12} stroke="#94a3b8" />
              <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `${v / 1000}k`} />
              <Tooltip formatter={(v) => formatIDR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="total" fill="#2563eb" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="mb-4 font-semibold text-slate-800 dark:text-slate-100">Status Tagihan</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                {pie.map((entry) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1">
            {pie.map((p) => (
              <div key={p.status} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: STATUS_COLORS[p.status] }} />
                  {p.name}
                </span>
                <span className="font-medium">{p.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Pembayaran menunggu verifikasi</p>
            <p className="text-2xl font-bold text-amber-600">{data.pending.payments}</p>
          </div>
          <Icon.Payment width={32} height={32} className="text-amber-500" />
        </div>
        <div className="card flex items-center justify-between p-5">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">Dispensasi menunggu review</p>
            <p className="text-2xl font-bold text-brand-600">{data.pending.dispensations}</p>
          </div>
          <Icon.Dispensation width={32} height={32} className="text-brand-500" />
        </div>
      </div>
    </div>
  );
}
