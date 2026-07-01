import { useEffect, useState, useCallback } from 'react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, EmptyState, Field } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, formatDate, DISP_STATUS } from '../../lib/format';
import { FeeTypeBadge, TagihanPagination, billDisplayName, formatBillDate } from './shared';
import { BILL_STATUS } from '../../lib/format';

const TYPE_LABEL = { WAIVER: 'Pembebasan', DISCOUNT: 'Potongan', POSTPONE: 'Penundaan' };

export default function TunggakanDispensasiTab() {
  const toast = useToast();
  const [bills, setBills] = useState([]);
  const [billMeta, setBillMeta] = useState(null);
  const [dispensations, setDispensations] = useState([]);
  const [dispMeta, setDispMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billFilters, setBillFilters] = useState({ status: 'OVERDUE', page: 1, limit: 5 });
  const [dispFilters, setDispFilters] = useState({ status: 'PENDING', page: 1, limit: 5 });
  const [detail, setDetail] = useState(null);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', reviewNote: '', amount: '', newDueDate: '' });
  const [acting, setActing] = useState(false);

  const loadBills = useCallback(async () => {
    try {
      const statuses = ['UNPAID', 'OVERDUE', 'PARTIAL'];
      const status = billFilters.status || statuses.join(',');
      const params = new URLSearchParams({ page: billFilters.page, limit: billFilters.limit });
      if (billFilters.status) params.set('status', billFilters.status);
      else params.set('status', 'UNPAID');
      const { data } = await api.get(`/bills?${params}`);
      setBills(data.data);
      setBillMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    }
  }, [billFilters]); // eslint-disable-line

  const loadDisp = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(dispFilters).forEach(([k, v]) => v && params.append(k, v));
      const { data } = await api.get(`/dispensations?${params}`);
      setDispensations(data.data);
      setDispMeta(data.meta);
    } catch (e) {
      toast.error(apiError(e));
    }
  }, [dispFilters]); // eslint-disable-line

  useEffect(() => {
    setLoading(true);
    Promise.all([loadBills(), loadDisp()]).finally(() => setLoading(false));
  }, [loadBills, loadDisp]);

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
      loadDisp();
      loadBills();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h2 className="text-lg font-semibold text-slate-900">D. Tunggakan & Dispensasi</h2>
          <p className="text-sm text-slate-500">Kelola tunggakan pembayaran dan pengajuan dispensasi siswa.</p>
        </div>
        <div className="flex gap-2 border-b border-slate-50 p-4">
          <select className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={billFilters.status} onChange={(e) => setBillFilters({ ...billFilters, status: e.target.value, page: 1 })}>
            <option value="UNPAID">Belum Bayar</option>
            <option value="OVERDUE">Jatuh Tempo</option>
            <option value="PARTIAL">Sebagian</option>
          </select>
        </div>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Spinner size={28} /></div>
        ) : bills.length === 0 ? (
          <EmptyState title="Tidak ada tunggakan" icon={Icon.Warning} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Siswa</th>
                  <th className="px-4 py-3 font-medium">Tagihan</th>
                  <th className="px-4 py-3 font-medium text-right">Tunggakan</th>
                  <th className="px-4 py-3 font-medium">Jatuh Tempo</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium">{b.student?.fullName}</td>
                    <td className="px-4 py-3">{billDisplayName(b)}</td>
                    <td className="px-4 py-3 text-right font-medium text-red-600">{formatIDR(Number(b.amount) - Number(b.paidAmount))}</td>
                    <td className="px-4 py-3">{formatBillDate(b.dueDate)}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${BILL_STATUS[b.status]?.cls}`}>{BILL_STATUS[b.status]?.label}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && bills.length > 0 && (
          <TagihanPagination meta={billMeta} limit={billFilters.limit} onPage={(p) => setBillFilters({ ...billFilters, page: p })} />
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <h3 className="font-semibold text-slate-900">Pengajuan Dispensasi</h3>
        </div>
        {loading ? null : dispensations.length === 0 ? (
          <EmptyState title="Tidak ada pengajuan dispensasi" icon={Icon.Dispensation} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                  <th className="px-4 py-3 font-medium">Siswa</th>
                  <th className="px-4 py-3 font-medium">Tipe</th>
                  <th className="px-4 py-3 font-medium">Alasan</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {dispensations.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50">
                    <td className="px-4 py-3 font-medium">{d.bill?.student?.fullName}</td>
                    <td className="px-4 py-3">{TYPE_LABEL[d.type] || d.type}</td>
                    <td className="px-4 py-3 max-w-xs truncate">{d.reason}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${DISP_STATUS[d.status]?.cls}`}>{DISP_STATUS[d.status]?.label}</span></td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" onClick={() => openDetail(d)} className="text-xs font-medium text-pospay hover:underline">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && dispensations.length > 0 && (
          <TagihanPagination meta={dispMeta} limit={dispFilters.limit} onPage={(p) => setDispFilters({ ...dispFilters, page: p })} />
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title="Review Dispensasi" footer={<><button type="button" className="btn-secondary" onClick={() => setDetail(null)}>Batal</button><button type="button" className="btn-primary" onClick={review} disabled={acting}>Proses</button></>}>
        {detail && (
          <div className="space-y-3 text-sm">
            <p><strong>Siswa:</strong> {detail.bill?.student?.fullName}</p>
            <p><strong>Alasan:</strong> {detail.reason}</p>
            <Field label="Keputusan">
              <select className="input" value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}>
                <option value="APPROVED">Setujui</option>
                <option value="REJECTED">Tolak</option>
              </select>
            </Field>
            <Field label="Catatan"><textarea className="input" rows={2} value={reviewForm.reviewNote} onChange={(e) => setReviewForm({ ...reviewForm, reviewNote: e.target.value })} /></Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
