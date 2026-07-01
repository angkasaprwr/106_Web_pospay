import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, EmptyState, Field } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, formatDateTime, PAYMENT_STATUS } from '../../lib/format';
import { TagihanPagination } from './shared';

export default function VerifikasiPembayaranTab() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'PENDING', search: '', page: 1, limit: 10 });
  const [detail, setDetail] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/payments?${params}`);
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

  const verify = async (id) => {
    setActing(true);
    try {
      await api.post(`/payments/${id}/verify`, {});
      toast.success('Pembayaran diverifikasi');
      setDetail(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setActing(false);
    }
  };

  const doReject = async () => {
    setActing(true);
    try {
      await api.post(`/payments/${reject.id}/reject`, { rejectionReason: reason });
      toast.success('Pembayaran ditolak');
      setReject(null);
      setReason('');
      setDetail(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5">
        <h2 className="text-lg font-semibold text-slate-900">C. Verifikasi Pembayaran</h2>
        <p className="text-sm text-slate-500">Verifikasi bukti pembayaran yang diajukan siswa.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-50 p-4">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm" placeholder="Cari referensi / siswa..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        </div>
        <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
      ) : items.length === 0 ? (
        <EmptyState title="Tidak ada pembayaran" description="Pembayaran dari siswa akan muncul di sini untuk diverifikasi." icon={Icon.Payment} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                <th className="px-4 py-3 font-medium">Referensi</th>
                <th className="px-4 py-3 font-medium">Siswa</th>
                <th className="px-4 py-3 font-medium">Tagihan</th>
                <th className="px-4 py-3 font-medium text-right">Nominal</th>
                <th className="px-4 py-3 font-medium">Tanggal</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 text-center font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.reference}</td>
                  <td className="px-4 py-3 font-medium">{p.bill?.student?.fullName}</td>
                  <td className="px-4 py-3">{p.bill?.feeType?.name}</td>
                  <td className="px-4 py-3 text-right">{formatIDR(p.amount)}</td>
                  <td className="px-4 py-3 text-xs">{formatDateTime(p.paidAt || p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS[p.status]?.cls}`}>{PAYMENT_STATUS[p.status]?.label}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button type="button" onClick={() => setDetail(p)} className="rounded-lg border border-pospay/30 px-3 py-1.5 text-xs font-medium text-pospay hover:bg-pospay-50">Detail</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && items.length > 0 && (
        <TagihanPagination meta={meta} limit={filters.limit} onPage={(p) => setFilters({ ...filters, page: p })} onLimit={(limit) => setFilters({ ...filters, limit, page: 1 })} />
      )}

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Pembayaran" size="lg"
        footer={detail?.status === 'PENDING' && (
          <>
            <button type="button" className="btn-danger" onClick={() => setReject(detail)} disabled={acting}>Tolak</button>
            <button type="button" className="btn-primary" onClick={() => verify(detail.id)} disabled={acting}>{acting ? <Spinner size={16} className="text-white" /> : 'Verifikasi'}</button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-2 text-sm">
            <p><strong>Referensi:</strong> {detail.reference}</p>
            <p><strong>Siswa:</strong> {detail.bill?.student?.fullName}</p>
            <p><strong>Nominal:</strong> {formatIDR(detail.amount)}</p>
            {detail.proofUrl && <img src={detail.proofUrl} alt="Bukti" className="mt-2 max-h-48 rounded-lg border" />}
          </div>
        )}
      </Modal>
      <Modal open={!!reject} onClose={() => setReject(null)} title="Tolak Pembayaran" footer={<><button type="button" className="btn-secondary" onClick={() => setReject(null)}>Batal</button><button type="button" className="btn-danger" onClick={doReject} disabled={acting}>Tolak</button></>}>
        <Field label="Alasan penolakan"><textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      </Modal>
    </div>
  );
}
