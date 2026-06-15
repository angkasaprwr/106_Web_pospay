import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { formatIDR, formatDate, BILL_STATUS } from '../lib/format';
import { PageLoader, StatCard, Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Dashboard() {
  const toast = useToast();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portal/dashboard').then(({ data }) => setData(data.data)).catch((e) => toast.error(apiError(e))).finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;
  if (!data) return null;

  return (
    <div>
      <div className="mb-5 card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 p-5 text-white">
          <p className="text-sm text-brand-100">Selamat datang,</p>
          <h1 className="text-xl font-bold">{data.student.fullName}</h1>
          <p className="mt-1 text-sm text-brand-100">{data.student.className || '-'} · {data.student.academicYear || ''} · NIS {data.student.nis}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Total Tagihan" value={formatIDR(data.summary.totalBilled)} icon={Icon.Bills} tone="brand" />
        <StatCard label="Sudah Dibayar" value={formatIDR(data.summary.totalPaid)} icon={Icon.Money} tone="brand" />
        <StatCard label="Tunggakan" value={formatIDR(data.summary.totalOutstanding)} icon={Icon.Warning} tone="red" />
      </div>

      <div className="mt-5 flex items-center justify-between">
        <h2 className="font-semibold">Tagihan Aktif</h2>
        <Link to="/tagihan" className="text-sm font-medium text-brand-600">Lihat semua</Link>
      </div>
      <div className="mt-2 space-y-3">
        {data.upcoming.length === 0 ? (
          <div className="card"><EmptyState title="Tidak ada tagihan aktif" description="Semua tagihan Anda sudah lunas." icon={Icon.CheckCircle} /></div>
        ) : (
          data.upcoming.map((b) => (
            <Link key={b.id} to={`/tagihan/${b.id}`} className="card flex items-center justify-between p-4 transition hover:shadow-md">
              <div>
                <p className="font-medium">{b.feeType?.name}{b.period ? ` · ${b.period}` : ''}</p>
                <p className="text-xs text-slate-400">Jatuh tempo {formatDate(b.dueDate)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">{formatIDR(b.amount)}</p>
                <Badge status={b.status} map={BILL_STATUS} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
