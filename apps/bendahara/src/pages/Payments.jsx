import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Pagination, EmptyState, Badge, Field } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatIDR, formatDateTime, PAYMENT_STATUS } from '../lib/format';

export default function Payments() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'PENDING', search: '', page: 1 });
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

  useEffect(() => { load(); }, [load]);

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
    <div>
      <PageHeader title="Pembayaran" subtitle="Verifikasi bukti pembayaran siswa" />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-10" placeholder="Cari referensi / siswa..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        </div>
        <select className="input w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          {Object.entries(PAYMENT_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Tidak ada pembayaran" icon={Icon.Payment} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead>
                <tr><th>Referensi</th><th>Siswa</th><th>Jenis</th><th className="text-right">Nominal</th><th>Tanggal</th><th>Status</th><th className="text-right">Aksi</th></tr>
              </thead>
              <tbody>
                {items.map((p) => (
                  <tr key={p.id}>
                    <td className="font-mono text-xs">{p.reference}</td>
                    <td><div className="font-medium">{p.bill?.student?.fullName}</div><div className="text-xs text-slate-400">{p.bill?.student?.nis}</div></td>
                    <td>{p.bill?.feeType?.name}</td>
                    <td className="text-right">{formatIDR(p.amount)}</td>
                    <td className="text-xs">{formatDateTime(p.paidAt)}</td>
                    <td><Badge status={p.status} map={PAYMENT_STATUS} /></td>
                    <td className="text-right"><button className="btn-secondary px-3 py-1 text-xs" onClick={() => setDetail(p)}>Detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters({ ...filters, page: p })} />
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Pembayaran" size="lg"
        footer={detail?.status === 'PENDING' && (
          <>
            <button className="btn-danger" onClick={() => setReject(detail)} disabled={acting}>Tolak</button>
            <button className="btn-primary" onClick={() => verify(detail.id)} disabled={acting}>{acting ? <Spinner size={16} className="text-white" /> : 'Verifikasi'}</button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Referensi" value={detail.reference} />
              <Info label="Status" value={<Badge status={detail.status} map={PAYMENT_STATUS} />} />
              <Info label="Siswa" value={detail.bill?.student?.fullName} />
              <Info label="NIS" value={detail.bill?.student?.nis} />
              <Info label="Jenis" value={detail.bill?.feeType?.name} />
              <Info label="Nominal" value={formatIDR(detail.amount)} />
              <Info label="Metode" value={detail.paymentMethod?.name || detail.channel} />
              <Info label="Tanggal" value={formatDateTime(detail.paidAt)} />
            </div>
            {detail.note && <Info label="Catatan" value={detail.note} />}
            {detail.rejectionReason && <Info label="Alasan Penolakan" value={detail.rejectionReason} />}
            {detail.proofUrl && (
              <div>
                <p className="label">Bukti Pembayaran</p>
                <a href={detail.proofUrl} target="_blank" rel="noreferrer" className="block">
                  {/\.(jpg|jpeg|png|webp)$/i.test(detail.proofUrl) ? (
                    <img src={detail.proofUrl} alt="bukti" className="max-h-72 rounded-lg border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <span className="btn-secondary inline-flex"><Icon.Download width={16} height={16} /> Lihat dokumen</span>
                  )}
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={!!reject} onClose={() => setReject(null)} title="Tolak Pembayaran"
        footer={<><button className="btn-secondary" onClick={() => setReject(null)}>Batal</button><button className="btn-danger" onClick={doReject} disabled={acting || !reason}>{acting ? <Spinner size={16} className="text-white" /> : 'Tolak'}</button></>}>
        <Field label="Alasan Penolakan" required>
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Contoh: Bukti transfer tidak sesuai nominal" />
        </Field>
      </Modal>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="font-medium text-slate-800 dark:text-slate-100">{value}</p>
    </div>
  );
}
