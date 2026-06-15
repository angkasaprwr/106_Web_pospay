import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR, formatDate, BILL_STATUS } from '../lib/format';
import { PageHeader, PageLoader, Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Bills() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      const { data } = await api.get(`/portal/bills?${params}`);
      setItems(data.data);
    } catch (e) { toast.error(apiError(e)); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status]); // eslint-disable-line

  return (
    <div>
      <PageHeader title="Tagihan Saya" subtitle="Daftar seluruh tagihan" />
      <div className="mb-4 flex gap-2 overflow-x-auto scrollbar-thin">
        {[['', 'Semua'], ['UNPAID', 'Belum Bayar'], ['OVERDUE', 'Jatuh Tempo'], ['PAID', 'Lunas']].map(([k, label]) => (
          <button key={k} onClick={() => setStatus(k)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${status === k ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>{label}</button>
        ))}
      </div>
      {loading ? <PageLoader /> : items.length === 0 ? (
        <div className="card"><EmptyState title="Tidak ada tagihan" icon={Icon.Bills} /></div>
      ) : (
        <div className="space-y-3">
          {items.map((b) => {
            const pending = b.payments?.some((p) => p.status === 'PENDING');
            return (
              <Link key={b.id} to={`/tagihan/${b.id}`} className="card flex items-center justify-between p-4 transition hover:shadow-md">
                <div className="min-w-0">
                  <p className="font-medium">{b.feeType?.name}{b.period ? ` · ${b.period}` : ''}</p>
                  <p className="text-xs text-slate-400">Jatuh tempo {formatDate(b.dueDate)}</p>
                  {pending && <span className="badge mt-1 bg-amber-100 text-amber-700">Menunggu verifikasi</span>}
                </div>
                <div className="flex items-center gap-2 text-right">
                  <div>
                    <p className="font-bold">{formatIDR(b.amount)}</p>
                    <Badge status={b.status} map={BILL_STATUS} />
                  </div>
                  <Icon.ChevronRight width={18} height={18} className="text-slate-300" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
