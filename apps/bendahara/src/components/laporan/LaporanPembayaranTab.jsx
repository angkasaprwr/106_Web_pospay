import { useCallback, useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { api, apiError } from '../../lib/api';
import { downloadFile } from '../../lib/download';
import { useToast } from '../../context/ToastContext';
import { Spinner, EmptyState } from '../ui';
import { Icon } from '../Icons';
import { formatIDR } from '../../lib/format';
import { StatCard } from '../tagihan/shared';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

export default function LaporanPembayaranTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [feeTypes, setFeeTypes] = useState([]);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [filters, setFilters] = useState({
    periodType: 'year',
    year: String(CURRENT_YEAR),
    feeTypeId: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: filters.year });
      if (filters.feeTypeId) params.set('feeTypeId', filters.feeTypeId);
      const { data: res } = await api.get(`/reports/payments/summary?${params}`);
      setData(res.data);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters.year, filters.feeTypeId]); // eslint-disable-line

  useEffect(() => {
    api.get('/masterdata/fee-types').then(({ data }) => setFeeTypes(data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const onClick = (e) => exportRef.current && !exportRef.current.contains(e.target) && setExportOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const exportReport = async (format) => {
    try {
      const params = new URLSearchParams({ format, year: filters.year });
      if (filters.feeTypeId) params.set('feeTypeId', filters.feeTypeId);
      await downloadFile(`/reports/payments/export?${params}`, `laporan-pembayaran.${format === 'excel' ? 'xlsx' : 'pdf'}`);
      toast.success(`Laporan ${format.toUpperCase()} diunduh`);
      setExportOpen(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const stats = data?.stats;
  const rows = data?.rows || [];
  const totalRow = data?.totalRow;
  const chart = data?.chart || [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Filter Laporan Pembayaran</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Jenis Periode</label>
                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.periodType}
                  onChange={(e) => setFilters({ ...filters, periodType: e.target.value })}
                >
                  <option value="year">Tahun</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Tahun</label>
                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Jenis Tagihan</label>
                <select
                  className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.feeTypeId}
                  onChange={(e) => setFilters({ ...filters, feeTypeId: e.target.value })}
                >
                  <option value="">Semua Tagihan</option>
                  {feeTypes.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <button type="button" onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2 text-sm font-medium text-white hover:bg-pospay-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>
                Terapkan Filter
              </button>
            </div>
          </div>
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Icon.Upload width={18} height={18} />
              Export Laporan
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-10 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button type="button" onClick={() => exportReport('pdf')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <span className="text-red-500">📄</span> Export PDF
                </button>
                <button type="button" onClick={() => exportReport('excel')} className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <span className="text-emerald-600">📊</span> Export Excel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Spinner size={36} /></div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <StatCard label="Total Pemasukan" value={stats?.totalIncomeFormatted || formatIDR(0)} subtext={`Tahun ${filters.year}`} icon={Icon.Money} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard label="Total Transaksi" value={String(stats?.totalTransactions || 0)} subtext="Transaksi" icon={Icon.Payment} iconBg="bg-blue-50" iconColor="text-blue-600" />
            <StatCard label="Siswa Lunas" value={String(stats?.studentsPaid || 0)} subtext="Siswa" icon={Icon.Students} iconBg="bg-purple-50" iconColor="text-purple-600" />
            <StatCard label="Menunggu Verifikasi" value={String(stats?.pendingCount || 0)} subtext="Transaksi" icon={Icon.Clock} iconBg="bg-amber-50" iconColor="text-amber-500" />
            <StatCard label="Ditolak" value={String(stats?.rejectedCount || 0)} subtext="Transaksi" icon={Icon.X} iconBg="bg-red-50" iconColor="text-red-500" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-100 p-5">
                  <h3 className="font-semibold text-slate-900">Rincian Pemasukan</h3>
                </div>
                {rows.length === 0 ? (
                  <EmptyState title="Belum ada data pemasukan" description="Data muncul setelah siswa melakukan pembayaran dan diverifikasi." icon={Icon.Report} />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                          <th className="px-3 py-3 font-medium">No</th>
                          <th className="px-3 py-3 font-medium">Periode</th>
                          <th className="px-3 py-3 font-medium">Tagihan</th>
                          <th className="px-3 py-3 font-medium text-center">Total Tagihan</th>
                          <th className="px-3 py-3 font-medium text-center">Total Dibayar</th>
                          <th className="px-3 py-3 font-medium text-center">Menunggu Verifikasi</th>
                          <th className="px-3 py-3 font-medium text-center">Ditolak</th>
                          <th className="px-3 py-3 font-medium text-right">Total Pemasukan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r, i) => (
                          <tr key={`${r.period}-${r.tagihan}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                            <td className="px-3 py-3 text-slate-500">{i + 1}</td>
                            <td className="px-3 py-3 font-medium text-slate-800">{r.period}</td>
                            <td className="px-3 py-3">{r.tagihan}</td>
                            <td className="px-3 py-3 text-center">{r.totalTagihan}</td>
                            <td className="px-3 py-3 text-center">{r.totalDibayar}</td>
                            <td className="px-3 py-3 text-center text-amber-600">{r.pending}</td>
                            <td className="px-3 py-3 text-center text-red-600">{r.rejected}</td>
                            <td className="px-3 py-3 text-right font-medium">{r.totalIncomeFormatted}</td>
                          </tr>
                        ))}
                        {totalRow && (
                          <tr className="border-t-2 border-slate-200 bg-slate-50 font-semibold text-slate-900">
                            <td className="px-3 py-3" colSpan={3}>TOTAL</td>
                            <td className="px-3 py-3 text-center">{totalRow.totalTagihan}</td>
                            <td className="px-3 py-3 text-center">{totalRow.totalDibayar}</td>
                            <td className="px-3 py-3 text-center">{totalRow.pending}</td>
                            <td className="px-3 py-3 text-center">{totalRow.rejected}</td>
                            <td className="px-3 py-3 text-right">{totalRow.totalIncomeFormatted}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
                {rows.length > 0 && (
                  <p className="border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
                    Menampilkan 1 - {rows.length} dari {rows.length} data
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">Grafik Pemasukan per Bulan</h3>
                  <select className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600">
                    <option>Lihat per Bulan</option>
                  </select>
                </div>
                {chart.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-400">Belum ada data grafik</p>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chart} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)} jt`} />
                      <Tooltip formatter={(v) => [formatIDR(v), 'Pemasukan']} />
                      <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40}>
                        <LabelList dataKey="valueJt" position="top" style={{ fontSize: 10, fill: '#475569' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {stats && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                      <Icon.School width={22} height={22} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-slate-500">Total Pemasukan Tahun {filters.year}</p>
                      <p className="text-lg font-bold text-slate-900">{stats.totalIncomeFormatted}</p>
                      <p className="text-xs text-slate-500">dari {stats.totalTransactions} transaksi</p>
                    </div>
                    {stats.growthPct !== 0 && (
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stats.growthPct >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                        {stats.growthPct >= 0 ? '↑' : '↓'} {Math.abs(stats.growthPct)}% Dibandingkan tahun {Number(filters.year) - 1}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
