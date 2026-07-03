import { useEffect, useState, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api, apiError } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import { Spinner, Modal, EmptyState } from '../ui';
import { Icon } from '../Icons';
import { formatIDR, formatDateTime } from '../../lib/format';
import {
  TagihanPagination,
  billDisplayName,
  formatBillDate,
  formatClassLabel,
  paymentStatusDisplay,
  tagihanGroupKey,
  exportStatusCsv,
} from './shared';

const CHART_COLORS = { lunas: '#10b981', pending: '#f59e0b', unpaid: '#ef4444' };

function buildTagihanGroups(bills) {
  const map = new Map();
  bills.forEach((b) => {
    const key = tagihanGroupKey(b);
    if (!map.has(key)) {
      map.set(key, { key, label: billDisplayName(b), feeTypeId: b.feeTypeId, period: b.period || '', description: b.description || '', sample: b });
    }
  });
  return Array.from(map.values());
}

function computeSummary(items, pendingBillIds) {
  let lunas = 0;
  let pending = 0;
  let unpaid = 0;
  items.forEach((b) => {
    const st = paymentStatusDisplay(b, pendingBillIds);
    if (st.key === 'lunas') lunas += 1;
    else if (st.key === 'pending') pending += 1;
    else unpaid += 1;
  });
  const total = items.length || 1;
  return {
    lunas,
    pending,
    unpaid,
    total: items.length,
    chart: [
      { name: 'Lunas', value: lunas, pct: ((lunas / total) * 100).toFixed(1), color: CHART_COLORS.lunas },
      { name: 'Menunggu Verifikasi', value: pending, pct: ((pending / total) * 100).toFixed(1), color: CHART_COLORS.pending },
      { name: 'Belum Bayar', value: unpaid, pct: ((unpaid / total) * 100).toFixed(1), color: CHART_COLORS.unpaid },
    ].filter((c) => c.value > 0),
  };
}

function filterByStatus(rows, statusFilter, pendingBillIds) {
  if (!statusFilter) return rows;
  if (statusFilter === 'lunas') return rows.filter((b) => b.status === 'PAID');
  if (statusFilter === 'pending') return rows.filter((b) => pendingBillIds.has(b.id));
  if (statusFilter === 'unpaid') return rows.filter((b) => b.status !== 'PAID' && !pendingBillIds.has(b.id));
  return rows;
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

export default function StatusPembayaranTab() {
  const toast = useToast();
  const [allItems, setAllItems] = useState([]);
  const [pageItems, setPageItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [summaryItems, setSummaryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [tagihanGroups, setTagihanGroups] = useState([]);
  const [pendingBillIds, setPendingBillIds] = useState(new Set());
  const [paymentDates, setPaymentDates] = useState({});
  const [filters, setFilters] = useState({
    tagihanKey: '',
    classId: '',
    statusFilter: '',
    search: '',
    page: 1,
    limit: 10,
  });
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sendingNotifyId, setSendingNotifyId] = useState(null);

  const selectedGroup = tagihanGroups.find((g) => g.key === filters.tagihanKey);

  const loadAux = useCallback(async () => {
    try {
      const [pendingRes, verifiedRes, groupsRes, classRes] = await Promise.all([
        api.get('/payments?status=PENDING&limit=100'),
        api.get('/payments?status=VERIFIED&limit=100'),
        api.get('/bills?limit=100'),
        api.get('/masterdata/classes'),
      ]);
      setPendingBillIds(new Set(pendingRes.data.data.map((p) => p.billId)));
      const dates = {};
      verifiedRes.data.data.forEach((p) => {
        const t = p.verifiedAt || p.paidAt;
        if (t && (!dates[p.billId] || new Date(t) > new Date(dates[p.billId]))) dates[p.billId] = t;
      });
      setPaymentDates(dates);
      setTagihanGroups(buildTagihanGroups(groupsRes.data.data));
      setClasses(classRes.data.data);
    } catch {
      /* ignore */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('limit', '100');
      if (filters.classId) params.set('classId', filters.classId);
      const searchQ = filters.search || selectedGroup?.period || '';
      if (searchQ) params.set('search', searchQ);
      if (selectedGroup) params.set('feeTypeId', selectedGroup.feeTypeId);

      const { data } = await api.get(`/bills?${params}`);
      let rows = data.data;
      if (selectedGroup) {
        rows = rows.filter((b) => tagihanGroupKey(b) === selectedGroup.key);
      }
      setAllItems(rows);

      if (selectedGroup) {
        setSummaryItems(rows);
      } else {
        const sumParams = new URLSearchParams({ limit: '100' });
        if (filters.classId) sumParams.set('classId', filters.classId);
        const { data: sumData } = await api.get(`/bills?${sumParams}`);
        setSummaryItems(sumData.data);
      }
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters.classId, filters.search, selectedGroup]); // eslint-disable-line

  useEffect(() => {
    loadAux();
  }, [loadAux]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (tagihanGroups.length > 0 && !filters.tagihanKey) {
      setFilters((f) => ({ ...f, tagihanKey: tagihanGroups[0].key, page: 1 }));
    }
  }, [tagihanGroups]); // eslint-disable-line

  const filteredItems = useMemo(
    () => filterByStatus(allItems, filters.statusFilter, pendingBillIds),
    [allItems, filters.statusFilter, pendingBillIds],
  );

  useEffect(() => {
    const { items, meta: m } = paginateRows(filteredItems, filters.page, filters.limit);
    setPageItems(items);
    setMeta(m);
  }, [filteredItems, filters.page, filters.limit]);

  const summary = useMemo(() => {
    const source = selectedGroup
      ? summaryItems.filter((b) => tagihanGroupKey(b) === selectedGroup.key)
      : summaryItems;
    return computeSummary(source, pendingBillIds);
  }, [summaryItems, selectedGroup, pendingBillIds]);

  const openDetail = async (bill) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const { data } = await api.get(`/bills/${bill.id}`);
      setDetail(data.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setDetailLoading(false);
    }
  };

  const sendReminder = async (bill) => {
    setSendingNotifyId(bill.id);
    try {
      await api.post(`/bills/${bill.id}/send-reminder`);
      toast.success(`Notifikasi pengingat tagihan terkirim ke ${bill.student?.fullName || 'siswa'}`);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setSendingNotifyId(null);
    }
  };

  const infoBill = selectedGroup?.sample || pageItems[0] || summaryItems[0];

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">B. Status Pembayaran</h2>
              <p className="text-sm text-slate-500">Ringkasan status pembayaran siswa per tagihan.</p>
            </div>
            <button
              type="button"
              onClick={() => exportStatusCsv(filteredItems, pendingBillIds, paymentDates)}
              disabled={!filteredItems.length}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Icon.Download width={18} height={18} />
              Export
            </button>
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
              value={filters.classId}
              onChange={(e) => setFilters({ ...filters, classId: e.target.value, page: 1 })}
            >
              <option value="">Semua Kelas</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{formatClassLabel(c.name)}</option>
              ))}
            </select>
            <select
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
              value={filters.statusFilter}
              onChange={(e) => setFilters({ ...filters, statusFilter: e.target.value, page: 1 })}
            >
              <option value="">Semua Status</option>
              <option value="lunas">Lunas</option>
              <option value="pending">Menunggu Verifikasi</option>
              <option value="unpaid">Belum Bayar</option>
            </select>
            <div className="relative min-w-[180px] flex-1 sm:max-w-[220px]">
              <Icon.Search width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-pospay"
                placeholder="Cari nama siswa..."
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
            <EmptyState title="Belum ada data pembayaran" description="Data muncul setelah tagihan dibuat dan siswa melakukan pembayaran." icon={Icon.Payment} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                    <th className="px-4 py-3 font-medium">No</th>
                    <th className="px-4 py-3 font-medium">Nama Siswa</th>
                    <th className="px-4 py-3 font-medium">Kelas</th>
                    <th className="px-4 py-3 font-medium">Tagihan</th>
                    <th className="px-4 py-3 font-medium text-right">Nominal</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tanggal Pembayaran</th>
                    <th className="px-4 py-3 text-center font-medium">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((b, idx) => {
                    const st = paymentStatusDisplay(b, pendingBillIds);
                    const rowNo = (filters.page - 1) * filters.limit + idx + 1;
                    const paidAt = paymentDates[b.id];
                    return (
                      <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500">{rowNo}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{b.student?.fullName}</td>
                        <td className="px-4 py-3">{formatClassLabel(b.student?.schoolClass?.name)}</td>
                        <td className="px-4 py-3">{billDisplayName(b)}</td>
                        <td className="px-4 py-3 text-right font-medium">{formatIDR(b.amount)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{paidAt ? formatDateTime(paidAt) : '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetail(b)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-pospay hover:bg-pospay-50"
                            >
                              <Icon.Eye width={14} height={14} />
                              Lihat Detail
                            </button>
                            {st.key === 'unpaid' && (
                              <button
                                type="button"
                                onClick={() => sendReminder(b)}
                                disabled={sendingNotifyId === b.id}
                                title="Kirim notifikasi pengingat tagihan belum bayar"
                                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              >
                                {sendingNotifyId === b.id ? (
                                  <Spinner size={14} />
                                ) : (
                                  <Icon.Bell width={14} height={14} />
                                )}
                                Notifikasi
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
          <h3 className="mb-1 font-semibold text-slate-900">Ringkasan Status</h3>
          {selectedGroup && (
            <p className="mb-4 text-sm text-slate-500">{selectedGroup.label}</p>
          )}
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
                    <Tooltip formatter={(v, name) => [`${v} siswa`, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{summary.total}</span>
                  <span className="text-xs text-slate-500">Siswa</span>
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
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
                  <span>Total</span>
                  <span>{summary.total} (100%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {infoBill && (
          <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 font-semibold text-slate-900">Informasi Tagihan</h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Nama Tagihan</dt><dd className="text-right font-medium text-slate-800">{billDisplayName(infoBill)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Periode</dt><dd className="text-slate-800">{infoBill.period || '-'}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Nominal</dt><dd className="font-medium text-slate-800">{formatIDR(infoBill.amount)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Jatuh Tempo</dt><dd className="text-slate-800">{formatBillDate(infoBill.dueDate)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Dibuat Oleh</dt><dd className="text-slate-800">Bendahara</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Tanggal Dibuat</dt><dd className="text-slate-800">{infoBill.createdAt ? formatDateTime(infoBill.createdAt) : '-'}</dd></div>
            </dl>
          </div>
        )}

        <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-800">
          <Icon.Info width={20} height={20} className="shrink-0 text-blue-600" />
          <p>
            Klik ikon <strong>Notifikasi</strong> pada baris status <strong>Belum Bayar</strong> untuk mengirim pengingat ke portal siswa (in-app + FCM).
          </p>
        </div>
      </div>

      <Modal open={!!detail || detailLoading} onClose={() => { setDetail(null); setDetailLoading(false); }} title="Detail Status Pembayaran" size="lg">
        {detailLoading ? (
          <div className="flex h-32 items-center justify-center"><Spinner size={28} /></div>
        ) : detail ? (
          <div className="space-y-3 text-sm">
            <p><strong>Siswa:</strong> {detail.student?.fullName} ({formatClassLabel(detail.student?.schoolClass?.name)})</p>
            <p><strong>Tagihan:</strong> {billDisplayName(detail)}</p>
            <p><strong>Nominal:</strong> {formatIDR(detail.amount)}</p>
            <p><strong>Terbayar:</strong> {formatIDR(detail.paidAmount)}</p>
            <p><strong>Status:</strong> {paymentStatusDisplay(detail, pendingBillIds).label}</p>
            {detail.payments?.length > 0 && (
              <div>
                <p className="mb-2 font-medium">Riwayat Pembayaran</p>
                <ul className="space-y-1 rounded-lg border border-slate-100 p-3">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="flex justify-between text-xs">
                      <span>{p.reference} — {p.status}</span>
                      <span>{formatIDR(p.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
