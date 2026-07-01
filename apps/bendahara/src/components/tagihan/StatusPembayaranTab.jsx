import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, EmptyState } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, BILL_STATUS } from '../../lib/format';
import { FeeTypeBadge, TagihanPagination, billDisplayName, formatBillDate } from './shared';

export default function StatusPembayaranTab() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', page: 1, limit: 10 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/bills?${params}`);
      setItems(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900">B. Status Pembayaran</h2>
        <p className="text-sm text-slate-500">Pantau status pembayaran setiap tagihan siswa.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-50 p-4">
        <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          {Object.entries(BILL_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Belum ada data tagihan" icon={Icon.Bills} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Siswa</th>
                <th className="px-4 py-3 font-medium">Nama Tagihan</th>
                <th className="px-4 py-3 font-medium">Jenis</th>
                <th className="px-4 py-3 font-medium text-right">Nominal</th>
                <th className="px-4 py-3 font-medium text-right">Terbayar</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-b border-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{b.student?.fullName}</p>
                    <p className="text-xs text-slate-400">{b.student?.schoolClass?.name}</p>
                  </td>
                  <td className="px-4 py-3">{billDisplayName(b)}</td>
                  <td className="px-4 py-3"><FeeTypeBadge feeType={b.feeType} /></td>
                  <td className="px-4 py-3 text-right">{formatIDR(b.amount)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{formatIDR(b.paidAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${BILL_STATUS[b.status]?.cls || 'bg-slate-100'}`}>
                      {BILL_STATUS[b.status]?.label || b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{formatBillDate(b.dueDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && items.length > 0 && (
        <TagihanPagination meta={meta} limit={filters.limit} onPage={(p) => setFilters({ ...filters, page: p })} onLimit={(limit) => setFilters({ ...filters, limit, page: 1 })} />
      )}
    </div>
  );
}
