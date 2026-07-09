import { useEffect, useState, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, EmptyState, Field } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, formatDateTime } from '../../lib/format';
import {
  TagihanPagination,
  paymentBillName,
  paymentMethodLabel,
  proofFileMeta,
  proofIsImage,
  verificationStatusBadge,
  buildPaymentTagihanGroups,
} from './shared';

const CHART_COLORS = { pending: '#f59e0b', verified: '#10b981', rejected: '#ef4444' };

function computeVerificationSummary(items) {
  let pending = 0;
  let verified = 0;
  let rejected = 0;
  items.forEach((p) => {
    if (p.status === 'VERIFIED') verified += 1;
    else if (p.status === 'REJECTED') rejected += 1;
    else pending += 1;
  });
  const total = items.length || 1;
  return {
    pending,
    verified,
    rejected,
    total: items.length,
    chart: [
      { name: 'Menunggu Verifikasi', value: pending, pct: ((pending / total) * 100).toFixed(1), color: CHART_COLORS.pending },
      { name: 'Lunas', value: verified, pct: ((verified / total) * 100).toFixed(1), color: CHART_COLORS.verified },
      { name: 'Ditolak', value: rejected, pct: ((rejected / total) * 100).toFixed(1), color: CHART_COLORS.rejected },
    ].filter((c) => c.value > 0),
  };
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
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

export default function VerifikasiPembayaranTab({ onStatsChange }) {
  const toast = useToast();
  const [allItems, setAllItems] = useState([]);
  const [pageItems, setPageItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [summaryItems, setSummaryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tagihanGroups, setTagihanGroups] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [filters, setFilters] = useState({
    tagihanKey: '',
    status: 'PENDING',
    period: '',
    search: '',
    page: 1,
    limit: 5,
  });
  const [detail, setDetail] = useState(null);
  const [reject, setReject] = useState(null);
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      const { data } = await api.get('/payments?limit=100');
      setTagihanGroups(buildPaymentTagihanGroups(data.data));
      const periodSet = new Set(data.data.map((p) => p.bill?.period).filter(Boolean));
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
      const { data } = await api.get(`/payments?${params}`);
      let rows = data.data;
      if (filters.tagihanKey) {
        rows = rows.filter((p) => {
          const b = p.bill;
          const key = `${b?.feeType?.id || ''}|${b?.period || ''}|${b?.description || ''}`;
          return key === filters.tagihanKey;
        });
      }
      if (filters.period) {
        rows = rows.filter((p) => p.bill?.period === filters.period);
      }
      setAllItems(rows);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.search, filters.tagihanKey, filters.period]); // eslint-disable-line

  useEffect(() => {
    const { items, meta: m } = paginateRows(allItems, filters.page, filters.limit);
    setPageItems(items);
    setMeta(m);
  }, [allItems, filters.page, filters.limit]);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await api.get('/payments?limit=100');
      setSummaryItems(data.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadGroups();
    loadSummary();
  }, [loadGroups, loadSummary]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    onStatsChange?.();
  }, [allItems, onStatsChange]);

  const summary = useMemo(() => {
    let source = summaryItems;
    if (filters.tagihanKey) {
      source = source.filter((p) => {
        const b = p.bill;
        const key = `${b?.feeType?.id || ''}|${b?.period || ''}|${b?.description || ''}`;
        return key === filters.tagihanKey;
      });
    }
    if (filters.period) source = source.filter((p) => p.bill?.period === filters.period);
    return computeVerificationSummary(source);
  }, [summaryItems, filters.tagihanKey, filters.period]);

  const verify = async (id) => {
    setActing(true);
    try {
      await api.post(`/payments/${id}/verify`, {});
      toast.success('Pembayaran diverifikasi');
      setDetail(null);
      load();
      loadSummary();
      onStatsChange?.();
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
      loadSummary();
      onStatsChange?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setActing(false);
    }
  };

  const downloadProof = (payment) => {
    if (!payment.proofUrl) return;
    const a = document.createElement('a');
    a.href = payment.proofUrl;
    a.download = proofFileMeta(payment.proofUrl).name;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.click();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-lg font-semibold text-slate-900">C. Verifikasi Pembayaran</h2>
            <p className="text-sm text-slate-500">Verifikasi pembayaran yang dilakukan oleh siswa.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-slate-50 p-4">
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
              value={filters.tagihanKey}
              onChange={(e) => setFilters({ ...filters, tagihanKey: e.target.value, page: 1 })}
            >
              <option value="">Pilih Tagihan</option>
              {tagihanGroups.map((g) => (
                <option key={g.key} value={g.key}>{g.label}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
            >
              <option value="">Semua Status</option>
              <option value="PENDING">Menunggu Verifikasi</option>
              <option value="VERIFIED">Lunas</option>
              <option value="REJECTED">Ditolak</option>
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value, page: 1 })}
            >
              <option value="">Semua Periode</option>
              {periods.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
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
            <EmptyState title="Tidak ada pembayaran" description="Pembayaran dari siswa akan muncul di sini setelah siswa mengunggah bukti transfer." icon={Icon.Payment} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                    <th className="px-3 py-3 font-medium">No</th>
                    <th className="px-3 py-3 font-medium">Nama Siswa</th>
                    <th className="px-3 py-3 font-medium">NIS</th>
                    <th className="px-3 py-3 font-medium">Tagihan</th>
                    <th className="px-3 py-3 font-medium">Tanggal Bayar</th>
                    <th className="px-3 py-3 font-medium text-right">Nominal Dibayar</th>
                    <th className="px-3 py-3 font-medium">Bukti Transfer</th>
                    <th className="px-3 py-3 font-medium">Metode</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((p, idx) => {
                    const st = verificationStatusBadge(p.status);
                    const rowNo = (filters.page - 1) * filters.limit + idx + 1;
                    return (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-3 py-3 text-slate-500">{rowNo}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{p.bill?.student?.fullName}</td>
                        <td className="px-3 py-3 text-slate-600">{p.bill?.student?.nis || '-'}</td>
                        <td className="px-3 py-3">{paymentBillName(p)}</td>
                        <td className="px-3 py-3 text-slate-600">{formatDateTime(p.paidAt || p.createdAt)}</td>
                        <td className="px-3 py-3 text-right font-medium">{formatIDR(p.amount)}</td>
                        <td className="px-3 py-3">
                          {p.proofUrl ? (
                            <div className="flex items-center gap-2">
                              {proofIsImage(p.proofUrl) ? (
                                <img src={p.proofUrl} alt="Bukti transfer" className="h-10 w-10 rounded border border-slate-200 object-cover" />
                              ) : (
                                <span className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-50 text-slate-500">
                                  <Icon.Download width={16} height={16} />
                                </span>
                              )}
                              <span className="text-xs font-medium text-slate-700">Bukti transfer</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-slate-600">{paymentMethodLabel(p)}</td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetail(p)}
                              className="inline-flex items-center gap-1 rounded-lg border border-pospay/30 px-2 py-1 text-xs font-medium text-pospay hover:bg-pospay-50"
                            >
                              <Icon.Eye width={13} height={13} />
                              Detail
                            </button>
                            {p.proofUrl && (
                              <button
                                type="button"
                                onClick={() => downloadProof(p)}
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
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
          <h3 className="mb-4 font-semibold text-slate-900">Ringkasan Verifikasi</h3>
          {summary.total === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Belum ada data</p>
          ) : (
            <div className="flex flex-col items-center gap-4 sm:flex-row">
              <div className="relative mx-auto h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={summary.chart} dataKey="value" nameKey="name" innerRadius={52} outerRadius={78} paddingAngle={2} stroke="none">
                      {summary.chart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} pembayaran`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{summary.total}</span>
                  <span className="text-xs text-slate-500">Total</span>
                </div>
              </div>
              <div className="w-full flex-1 space-y-2.5 text-sm">
                {summary.chart.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} />
                      {c.name}
                    </span>
                    <span className="font-medium text-slate-800">{c.value} ({c.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
          <Icon.Info width={20} height={20} className="shrink-0 text-blue-600" />
          <p>
            Periksa bukti transfer dan pastikan nominal sesuai sebelum memverifikasi pembayaran.
          </p>
        </div>
      </div>

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail Verifikasi Pembayaran"
        size="lg"
        footer={detail?.status === 'PENDING' && (
          <>
            <button type="button" className="btn-danger" onClick={() => setReject(detail)} disabled={acting}>Tolak</button>
            <button type="button" className="btn-primary" onClick={() => verify(detail.id)} disabled={acting}>
              {acting ? <Spinner size={16} className="text-white" /> : 'Setujui Pembayaran'}
            </button>
          </>
        )}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p><strong>Siswa:</strong> {detail.bill?.student?.fullName}</p>
              <p><strong>NIS:</strong> {detail.bill?.student?.nis}</p>
              <p><strong>Tagihan:</strong> {paymentBillName(detail)}</p>
              <p><strong>Metode:</strong> {paymentMethodLabel(detail)}</p>
              <p><strong>Nominal:</strong> {formatIDR(detail.amount)}</p>
              <p><strong>Tanggal:</strong> {formatDateTime(detail.paidAt || detail.createdAt)}</p>
              <p><strong>Status:</strong> {verificationStatusBadge(detail.status).label}</p>
              <p><strong>Referensi:</strong> {detail.reference}</p>
            </div>
            {detail.note && <p><strong>Catatan siswa:</strong> {detail.note}</p>}
            {detail.proofUrl && (
              <div>
                <p className="mb-2 font-medium">Bukti Transfer</p>
                {proofIsImage(detail.proofUrl) ? (
                  <img src={detail.proofUrl} alt="Bukti pembayaran" className="max-h-64 rounded-lg border border-slate-200" />
                ) : (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    Dokumen bukti transfer tersedia. Gunakan tombol unduh di bawah.
                  </p>
                )}
                <button type="button" onClick={() => downloadProof(detail)} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-pospay hover:underline">
                  <Icon.Download width={14} height={14} />
                  Unduh bukti transfer
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={!!reject}
        onClose={() => setReject(null)}
        title="Tolak Pembayaran"
        footer={(
          <>
            <button type="button" className="btn-secondary" onClick={() => setReject(null)}>Batal</button>
            <button type="button" className="btn-danger" onClick={doReject} disabled={acting || reason.length < 3}>Tolak</button>
          </>
        )}
      >
        <Field label="Alasan penolakan">
          <textarea className="input" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Jelaskan alasan penolakan..." />
        </Field>
      </Modal>
    </div>
  );
}

// Export helper for Bills page stats
export async function fetchVerifikasiStats() {
  const [pendingRes, verifiedRes, rejectedRes, allRes] = await Promise.all([
    api.get('/payments?status=PENDING&limit=100'),
    api.get('/payments?status=VERIFIED&limit=100'),
    api.get('/payments?status=REJECTED&limit=100'),
    api.get('/payments?limit=100'),
  ]);
  const pending = pendingRes.data.meta?.total || 0;
  const verified = verifiedRes.data.meta?.total || 0;
  const rejected = rejectedRes.data.meta?.total || 0;
  const totalNominal = verifiedRes.data.data.reduce((s, p) => s + Number(p.amount || 0), 0);
  const todayPending = allRes.data.data.filter((p) => p.status === 'PENDING' && isToday(p.createdAt)).length;
  return { pending, verified, rejected, totalNominal, todayPending };
}
