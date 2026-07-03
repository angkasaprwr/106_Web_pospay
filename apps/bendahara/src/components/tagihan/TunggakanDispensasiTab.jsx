import { useEffect, useState, useCallback, useRef } from 'react';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, EmptyState, Field } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, formatDate, formatDateTime } from '../../lib/format';
import {
  TagihanPagination,
  dispensationStatusBadge,
  dispensationTypeLabel,
  exportDispensationsCsv,
  billDisplayName,
} from './shared';

const ARREAR_STATUSES = ['UNPAID', 'OVERDUE', 'PARTIAL'];

function buildArrearsMap(bills) {
  const map = {};
  bills.forEach((b) => {
    if (!ARREAR_STATUSES.includes(b.status)) return;
    const sid = b.studentId || b.student?.id;
    if (!sid) return;
    if (!map[sid]) map[sid] = { amount: 0, count: 0 };
    map[sid].amount += Math.max(0, Number(b.amount) - Number(b.paidAmount || 0) - Number(b.discount || 0));
    map[sid].count += 1;
  });
  return map;
}

function paginateRows(rows, page, limit) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * limit;
  return {
    items: rows.slice(start, start + limit),
    meta: { page: safePage, limit, total, totalPages },
  };
}

export default function TunggakanDispensasiTab({ onStatsChange }) {
  const toast = useToast();
  const [allItems, setAllItems] = useState([]);
  const [pageItems, setPageItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [arrearsMap, setArrearsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [filters, setFilters] = useState({
    academicYearId: '',
    period: '',
    status: '',
    search: '',
    page: 1,
    limit: 5,
  });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({ status: 'APPROVED', reviewNote: '', amount: '', newDueDate: '' });
  const [acting, setActing] = useState(false);

  const loadArrears = useCallback(async () => {
    try {
      const { data } = await api.get('/bills?limit=100');
      setArrearsMap(buildArrearsMap(data.data));
      const periodSet = new Set(data.data.map((b) => b.period).filter(Boolean));
      setPeriods(Array.from(periodSet));
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filters.status) params.set('status', filters.status);
      if (filters.search) params.set('search', filters.search);
      const { data } = await api.get(`/dispensations?${params}`);
      let rows = data.data;
      if (filters.academicYearId) {
        rows = rows.filter((d) => d.bill?.academicYearId === filters.academicYearId);
      }
      if (filters.period) {
        rows = rows.filter((d) => d.bill?.period === filters.period);
      }
      setAllItems(rows);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, filters.academicYearId, filters.period]); // eslint-disable-line

  useEffect(() => {
    loadArrears();
    api.get('/masterdata/academic-years').then(({ data }) => setYears(data.data)).catch(() => {});
  }, [loadArrears]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const { items, meta: m } = paginateRows(allItems, filters.page, filters.limit);
    setPageItems(items);
    setMeta(m);
  }, [allItems, filters.page, filters.limit]);

  useEffect(() => {
    onStatsChange?.();
  }, [allItems, arrearsMap, onStatsChange]);

  useEffect(() => {
    const onClick = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const openDetail = async (d) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(`/dispensations/${d.id}`);
      setDetail(data.data);
      setReviewForm({
        status: 'APPROVED',
        reviewNote: '',
        amount: Number(data.data.amount) || '',
        newDueDate: data.data.newDueDate ? data.data.newDueDate.slice(0, 10) : '',
      });
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const submitReview = async (status) => {
    if (status === 'REJECTED' && (reviewForm.reviewNote || '').trim().length < 3) {
      toast.error('Alasan penolakan minimal 3 karakter');
      return;
    }
    setActing(true);
    try {
      const payload = { status, reviewNote: reviewForm.reviewNote || undefined };
      if (reviewForm.amount !== '') payload.amount = Number(reviewForm.amount);
      if (reviewForm.newDueDate) payload.newDueDate = reviewForm.newDueDate;
      await api.post(`/dispensations/${detail.id}/review`, payload);
      toast.success(status === 'APPROVED' ? 'Dispensasi disetujui' : 'Dispensasi ditolak');
      setDetail(null);
      load();
      loadArrears();
      onStatsChange?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setActing(false);
    }
  };

  const downloadAttachment = (item) => {
    if (!item?.attachmentUrl) return;
    const a = document.createElement('a');
    a.href = item.attachmentUrl;
    a.download = item.attachmentUrl.split('/').pop() || 'lampiran-dispensasi';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  const exportExcel = () => {
    exportDispensationsCsv(allItems, arrearsMap);
    setExportOpen(false);
  };

  const exportPdf = () => {
    exportDispensationsCsv(allItems, arrearsMap);
    setExportOpen(false);
    toast.success('Data diekspor (format CSV, dapat dibuka di Excel/PDF viewer)');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">D. Tunggakan & Dispensasi</h2>
            <p className="mt-1 text-sm text-slate-500">
              Kelola pengajuan dispensasi siswa yang belum membayar tagihan. Notifikasi otomatis dikirim H-7 sebelum ujian.
            </p>
          </div>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              disabled={!allItems.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Icon.Download width={18} height={18} />
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button type="button" onClick={exportPdf} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <span className="text-red-500">📄</span> Export PDF
                </button>
                <button type="button" onClick={exportExcel} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <span className="text-emerald-600">📊</span> Export Excel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-slate-50 p-4">
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
            value={filters.academicYearId}
            onChange={(e) => setFilters({ ...filters, academicYearId: e.target.value, page: 1 })}
          >
            <option value="">Periode</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>{y.name}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
            value={filters.period}
            onChange={(e) => setFilters({ ...filters, period: e.target.value, page: 1 })}
          >
            <option value="">Jenis Periode</option>
            {periods.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
          >
            <option value="">Semua Status</option>
            <option value="PENDING">Menunggu Verifikasi</option>
            <option value="APPROVED">Disetujui</option>
            <option value="REJECTED">Ditolak</option>
          </select>
          <div className="relative min-w-[200px] flex-1 sm:max-w-[240px]">
            <Icon.Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-pospay"
              placeholder="Cari nama siswa atau NIS..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
            />
          </div>
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
            Filter
          </button>
        </div>

        {loading ? (
          <div className="flex h-56 items-center justify-center"><Spinner size={32} /></div>
        ) : pageItems.length === 0 ? (
          <EmptyState
            title="Belum ada pengajuan dispensasi"
            description="Data muncul setelah siswa mengajukan dispensasi melalui portal siswa."
            icon={Icon.Dispensation}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                  <th className="px-3 py-3 font-medium">No</th>
                  <th className="px-3 py-3 font-medium">Nama Siswa</th>
                  <th className="px-3 py-3 font-medium">NIS</th>
                  <th className="px-3 py-3 font-medium">Jumlah Tunggakan</th>
                  <th className="px-3 py-3 font-medium">Alasan</th>
                  <th className="px-3 py-3 font-medium">Tanggal Kesanggupan Bayar</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 text-center font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((d, idx) => {
                  const arr = arrearsMap[d.studentId] || { amount: 0, count: 0 };
                  const st = dispensationStatusBadge(d.status);
                  const rowNo = (filters.page - 1) * filters.limit + idx + 1;
                  return (
                    <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-3 py-3 text-slate-500">{rowNo}</td>
                      <td className="px-3 py-3 font-medium text-slate-900">{d.student?.fullName}</td>
                      <td className="px-3 py-3 text-slate-600">{d.student?.nis || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-slate-800">{formatIDR(arr.amount)}</span>
                        <span className="text-slate-500">, {arr.count} Tagihan</span>
                      </td>
                      <td className="max-w-[200px] truncate px-3 py-3 text-slate-600" title={d.reason}>{d.reason}</td>
                      <td className="px-3 py-3 text-slate-600">{d.newDueDate ? formatDate(d.newDueDate) : '-'}</td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openDetail(d)}
                            className="inline-flex items-center gap-1 rounded-lg border border-pospay/30 px-2 py-1 text-xs font-medium text-pospay hover:bg-pospay-50"
                          >
                            <Icon.Eye width={13} height={13} />
                            Detail
                          </button>
                          {d.attachmentUrl && (
                            <button
                              type="button"
                              onClick={() => downloadAttachment(d)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              <Icon.Download width={13} height={13} />
                              Unduh
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && pageItems.length > 0 && (
          <TagihanPagination
            meta={meta}
            limit={filters.limit}
            onPage={(p) => setFilters({ ...filters, page: p })}
            onLimit={(limit) => setFilters({ ...filters, limit, page: 1 })}
          />
        )}

        <div className="mx-4 mb-4 flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
          <Icon.Info width={20} height={20} className="shrink-0 text-blue-600" />
          <p>
            Siswa dapat mengajukan dispensasi melalui akun siswa masing-masing H-7 sebelum ujian apabila belum dapat melunasi tagihan.
          </p>
        </div>
      </div>

      <Modal
        open={!!detail || detailLoading}
        onClose={() => { setDetail(null); setDetailLoading(false); }}
        title="Detail Pengajuan Dispensasi"
        size="lg"
        footer={detail?.status === 'PENDING' && !detailLoading && (
          <>
            <button type="button" className="btn-danger" onClick={() => submitReview('REJECTED')} disabled={acting}>
              Tolak
            </button>
            <button type="button" className="btn-primary" onClick={() => submitReview('APPROVED')} disabled={acting}>
              {acting ? <Spinner size={16} className="text-white" /> : 'Setujui Dispensasi'}
            </button>
          </>
        )}
      >
        {detailLoading ? (
          <div className="flex h-32 items-center justify-center"><Spinner size={28} /></div>
        ) : detail ? (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><strong>Siswa:</strong> {detail.student?.fullName}</p>
              <p><strong>NIS:</strong> {detail.student?.nis}</p>
              <p><strong>Jenis:</strong> {dispensationTypeLabel(detail.type)}</p>
              <p><strong>Status:</strong> {dispensationStatusBadge(detail.status).label}</p>
              {detail.bill && <p><strong>Tagihan:</strong> {billDisplayName(detail.bill)}</p>}
              <p><strong>Tanggal Kesanggupan Bayar:</strong> {detail.newDueDate ? formatDate(detail.newDueDate) : '-'}</p>
              <p><strong>Diajukan:</strong> {formatDateTime(detail.createdAt)}</p>
            </div>
            <p><strong>Alasan:</strong> {detail.reason}</p>
            {(() => {
              const arr = arrearsMap[detail.studentId] || { amount: 0, count: 0 };
              return (
                <p><strong>Total Tunggakan:</strong> {formatIDR(arr.amount)} ({arr.count} tagihan)</p>
              );
            })()}
            {detail.attachmentUrl && (
              <div>
                <p className="mb-2 font-medium">Lampiran</p>
                <img src={detail.attachmentUrl} alt="Lampiran" className="max-h-48 rounded-lg border border-slate-200" />
              </div>
            )}
            {detail.status === 'PENDING' && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                <Field label="Keputusan">
                  <select className="input" value={reviewForm.status} onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value })}>
                    <option value="APPROVED">Setujui</option>
                    <option value="REJECTED">Tolak</option>
                  </select>
                </Field>
                <Field label="Catatan bendahara">
                  <textarea className="input" rows={2} value={reviewForm.reviewNote} onChange={(e) => setReviewForm({ ...reviewForm, reviewNote: e.target.value })} placeholder="Catatan opsional..." />
                </Field>
              </div>
            )}
            {detail.reviewNote && detail.status !== 'PENDING' && (
              <p><strong>Catatan review:</strong> {detail.reviewNote}</p>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export { fetchTunggakanStats } from '../../lib/tunggakanStats';
