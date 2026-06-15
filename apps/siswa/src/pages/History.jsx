import { useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR, formatDateTime, PAYMENT_STATUS, DISP_STATUS } from '../lib/format';
import { PageHeader, PageLoader, Badge, EmptyState } from '../components/ui';
import { Icon } from '../components/Icons';

const TYPE_LABEL = { WAIVER: 'Pembebasan', DISCOUNT: 'Potongan', POSTPONE: 'Penundaan' };

export default function History() {
  const toast = useToast();
  const [tab, setTab] = useState('payments');
  const [payments, setPayments] = useState([]);
  const [dispensations, setDispensations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/portal/payments'), api.get('/portal/dispensations')])
      .then(([p, d]) => { setPayments(p.data.data); setDispensations(d.data.data); })
      .catch((e) => toast.error(apiError(e)))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  if (loading) return <PageLoader />;

  return (
    <div>
      <PageHeader title="Riwayat" subtitle="Pembayaran & dispensasi" />
      <div className="mb-4 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
        <button onClick={() => setTab('payments')} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === 'payments' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Pembayaran</button>
        <button onClick={() => setTab('dispensations')} className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium ${tab === 'dispensations' ? 'bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>Dispensasi</button>
      </div>

      {tab === 'payments' ? (
        payments.length === 0 ? <div className="card"><EmptyState title="Belum ada pembayaran" icon={Icon.Money} /></div> : (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="card flex items-center justify-between p-4 text-sm">
                <div>
                  <p className="font-medium">{p.bill?.feeType?.name}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(p.paidAt)} · {p.reference}</p>
                  {p.rejectionReason && <p className="text-xs text-red-500">Ditolak: {p.rejectionReason}</p>}
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatIDR(p.amount)}</p>
                  <Badge status={p.status} map={PAYMENT_STATUS} />
                </div>
              </div>
            ))}
          </div>
        )
      ) : dispensations.length === 0 ? (
        <div className="card"><EmptyState title="Belum ada pengajuan dispensasi" icon={Icon.Dispensation} /></div>
      ) : (
        <div className="space-y-2">
          {dispensations.map((d) => (
            <div key={d.id} className="card p-4 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-medium">{TYPE_LABEL[d.type]}{d.bill ? ` · ${d.bill.feeType?.name}` : ''}</p>
                <Badge status={d.status} map={DISP_STATUS} />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{d.reason}</p>
              <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(d.createdAt)}</p>
              {d.reviewNote && <p className="mt-1 text-xs text-slate-500">Catatan: {d.reviewNote}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
