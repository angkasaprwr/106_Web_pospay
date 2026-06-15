import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { PageHeader, Spinner, Modal, Pagination, EmptyState, Badge, Field } from '../components/ui';
import { Icon } from '../components/Icons';
import { formatIDR, formatDate, DISP_STATUS } from '../lib/format';

const TYPE_LABEL = { WAIVER: 'Pembebasan', DISCOUNT: 'Potongan', POSTPONE: 'Penundaan' };

export default function Dispensations() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', type: '', search: '', page: 1 });
  const [detail, setDetail] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', reviewNote: '', amount: '', newDueDate: '' });
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/dispensations?${params}`);
      setItems(data.data);
      setMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const openDetail = (d) => {
    setDetail(d);
    setReviewForm({ status: 'APPROVED', reviewNote: '', amount: Number(d.amount) || '', newDueDate: '' });
  };

  const review = async () => {
    setActing(true);
    try {
      await api.post(`/dispensations/${detail.id}/review`, reviewForm);
      toast.success('Pengajuan diproses');
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
      <PageHeader title="Dispensasi" subtitle="Tunggakan & pengajuan dispensasi siswa" />

      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <div className="relative flex-1 min-w-[200px]">
          <Icon.Search width={18} height={18} className="absolute left-3 top-2.5 text-slate-400" />
          <input className="input pl-10" placeholder="Cari siswa / alasan..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        </div>
        <select className="input w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="">Semua Status</option>
          {Object.entries(DISP_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="input w-auto" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value, page: 1 })}>
          <option value="">Semua Tipe</option>
          {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex h-48 items-center justify-center"><Spinner size={32} /></div>
        ) : items.length === 0 ? (
          <EmptyState title="Tidak ada pengajuan" icon={Icon.Dispensation} />
        ) : (
          <div className="overflow-x-auto scrollbar-thin">
            <table className="table-base">
              <thead><tr><th>Tanggal</th><th>Siswa</th><th>Tipe</th><th>Tagihan</th><th>Status</th><th className="text-right">Aksi</th></tr></thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="text-xs">{formatDate(d.createdAt)}</td>
                    <td><div className="font-medium">{d.student?.fullName}</div><div className="text-xs text-slate-400">{d.student?.nis}</div></td>
                    <td><span className="badge bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200">{TYPE_LABEL[d.type]}</span></td>
                    <td className="text-xs">{d.bill?.feeType?.name || '-'}</td>
                    <td><Badge status={d.status} map={DISP_STATUS} /></td>
                    <td className="text-right"><button className="btn-secondary px-3 py-1 text-xs" onClick={() => openDetail(d)}>Detail</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination meta={meta} onPage={(p) => setFilters({ ...filters, page: p })} />
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Detail Dispensasi" size="lg"
        footer={detail?.status === 'PENDING' && (<><button className="btn-secondary" onClick={() => setDetail(null)}>Tutup</button><button className="btn-primary" onClick={review} disabled={acting}>{acting ? <Spinner size={16} className="text-white" /> : 'Proses'}</button></>)}>
        {detail && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
              <Info label="Siswa" value={`${detail.student?.fullName} (${detail.student?.nis})`} />
              <Info label="Tipe" value={TYPE_LABEL[detail.type]} />
              <Info label="Tagihan" value={detail.bill?.feeType?.name || '-'} />
              <Info label="Nominal Tagihan" value={detail.bill ? formatIDR(detail.bill.amount) : '-'} />
            </div>
            <Info label="Alasan" value={detail.reason} />
            {detail.attachmentUrl && (
              <a href={detail.attachmentUrl} target="_blank" rel="noreferrer" className="btn-secondary inline-flex"><Icon.Download width={16} height={16} /> Lihat lampiran</a>
            )}

            {detail.status === 'PENDING' ? (
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                <Field label="Keputusan">
                  <select className="input" value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}>
                    <option value="APPROVED">Setujui</option>
                    <option value="REJECTED">Tolak</option>
                  </select>
                </Field>
                {reviewForm.status === 'APPROVED' && detail.type === 'DISCOUNT' && (
                  <Field label="Nominal Potongan"><input type="number" className="input" value={reviewForm.amount} onChange={(e) => setReviewForm({ ...reviewForm, amount: e.target.value })} /></Field>
                )}
                {reviewForm.status === 'APPROVED' && detail.type === 'POSTPONE' && (
                  <Field label="Jatuh Tempo Baru"><input type="date" className="input" value={reviewForm.newDueDate} onChange={(e) => setReviewForm({ ...reviewForm, newDueDate: e.target.value })} /></Field>
                )}
                <Field label="Catatan"><textarea className="input" rows={2} value={reviewForm.reviewNote} onChange={(e) => setReviewForm({ ...reviewForm, reviewNote: e.target.value })} /></Field>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Info label="Status" value={<Badge status={detail.status} map={DISP_STATUS} />} />
                <Info label="Direview oleh" value={detail.reviewedBy?.fullName || '-'} />
                {detail.reviewNote && <Info label="Catatan" value={detail.reviewNote} />}
              </div>
            )}
          </div>
        )}
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
