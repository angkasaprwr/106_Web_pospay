import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api, apiError } from '../../lib/api';
import { downloadFile } from '../../lib/download';
import { useToast } from '../../context/ToastContext';
import { Spinner, EmptyState, Modal } from '../ui';
import { Icon } from '../Icons';
import { formatIDR } from '../../lib/format';
import {
  StatCard,
  TagihanPagination,
  formatClassLabel,
  dispensationStatusBadge,
  dispensationTypeLabel,
} from '../tagihan/shared';

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH = new Date().getMonth() + 1;
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  { value: 1, label: 'Januari' },
  { value: 2, label: 'Februari' },
  { value: 3, label: 'Maret' },
  { value: 4, label: 'April' },
  { value: 5, label: 'Mei' },
  { value: 6, label: 'Juni' },
  { value: 7, label: 'Juli' },
  { value: 8, label: 'Agustus' },
  { value: 9, label: 'September' },
  { value: 10, label: 'Oktober' },
  { value: 11, label: 'November' },
  { value: 12, label: 'Desember' },
];

function buildQueryParams(filters) {
  const params = new URLSearchParams();
  if (filters.period === 'month') {
    params.set('period', 'month');
    params.set('month', String(filters.month));
    params.set('year', String(filters.year));
  } else if (filters.period === 'year') {
    params.set('period', 'year');
    params.set('year', String(filters.year));
  }
  return params;
}

export default function LaporanTunggakanTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(8);
  const [detail, setDetail] = useState(null);
  const [filters, setFilters] = useState({
    reportType: 'tunggakan',
    period: 'month',
    month: CURRENT_MONTH,
    year: CURRENT_YEAR,
  });

  const isTunggakan = filters.reportType === 'tunggakan';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams(filters);
      const endpoint = isTunggakan ? '/reports/arrears/summary' : '/reports/dispensations/summary';
      const { data: res } = await api.get(`${endpoint}?${params}`);
      setData(res.data);
      setPage(1);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setLoading(false);
    }
  }, [filters, isTunggakan]); // eslint-disable-line

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
      const params = buildQueryParams(filters);
      params.set('format', format);
      const base = isTunggakan ? '/reports/arrears/export' : '/reports/dispensations/export';
      const ext = format === 'excel' ? 'xlsx' : 'pdf';
      const name = isTunggakan ? `laporan-tunggakan.${ext}` : `laporan-dispensasi.${ext}`;
      await downloadFile(`${base}?${params}`, name);
      toast.success(`Laporan ${format.toUpperCase()} diunduh`);
      setExportOpen(false);
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const allRows = data?.rows || [];
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * limit;
    return allRows.slice(start, start + limit);
  }, [allRows, page, limit]);

  const paginationMeta = useMemo(() => ({
    page,
    total: allRows.length,
    totalPages: Math.max(1, Math.ceil(allRows.length / limit)),
  }), [allRows.length, page, limit]);

  const stats = data?.stats;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1">
            <h2 className="text-base font-semibold text-slate-900">Filter</h2>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Jenis Laporan</label>
                <select
                  className="min-w-[140px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.reportType}
                  onChange={(e) => setFilters({ ...filters, reportType: e.target.value })}
                >
                  <option value="tunggakan">Tunggakan</option>
                  <option value="dispensasi">Dispensasi</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Periode</label>
                <select
                  className="min-w-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.period}
                  onChange={(e) => {
                    const period = e.target.value;
                    setFilters({
                      ...filters,
                      period,
                      month: period === 'month' ? CURRENT_MONTH : filters.month,
                    });
                  }}
                >
                  <option value="month">Bulan Ini</option>
                  <option value="year">Tahun Ini</option>
                  <option value="all">Semua</option>
                </select>
              </div>
              {filters.period === 'month' && (
                <div>
                  <label className="mb-1 block text-xs text-slate-500">Bulan</label>
                  <select
                    className="min-w-[120px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                    value={filters.month}
                    onChange={(e) => setFilters({ ...filters, month: Number(e.target.value) })}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs text-slate-500">Tahun</label>
                <select
                  className="min-w-[100px] rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-pospay"
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: Number(e.target.value) })}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-2 rounded-lg bg-pospay px-4 py-2 text-sm font-medium text-white hover:bg-pospay-700"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
                </svg>
                Terapkan Filter
              </button>
            </div>
          </div>
          <div className="relative shrink-0" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Export
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {exportOpen && (
              <div className="absolute right-0 z-10 mt-1 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => exportReport('pdf')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="text-red-500">📄</span> PDF
                </button>
                <button
                  type="button"
                  onClick={() => exportReport('excel')}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <span className="text-emerald-600">📊</span> Excel
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
          {isTunggakan ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Siswa Menunggak"
                value={String(stats?.totalStudents || 0)}
                subtext="Siswa"
                icon={Icon.Students}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />
              <StatCard
                label="Total Tagihan Belum Lunas"
                value={String(stats?.totalBills || 0)}
                subtext="Tagihan"
                icon={Icon.Bills}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
              />
              <StatCard
                label="Total Nominal Tunggakan"
                value={stats?.totalNominalFormatted || formatIDR(0)}
                subtext="Total"
                icon={Icon.Money}
                iconBg="bg-purple-50"
                iconColor="text-purple-600"
              />
              <StatCard
                label="Rata-rata Tunggakan per Siswa"
                value={stats?.avgPerStudentFormatted || formatIDR(0)}
                subtext="Rata-rata"
                icon={Icon.Clock}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total Dispensasi"
                value={String(stats?.total || 0)}
                subtext="Pengajuan"
                icon={Icon.Dispensation}
                iconBg="bg-blue-50"
                iconColor="text-blue-600"
              />
              <StatCard
                label="Disetujui"
                value={String(stats?.approved || 0)}
                subtext="Dispensasi"
                icon={Icon.Check}
                iconBg="bg-emerald-50"
                iconColor="text-emerald-600"
              />
              <StatCard
                label="Menunggu Verifikasi"
                value={String(stats?.pending || 0)}
                subtext="Dispensasi"
                icon={Icon.Clock}
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
              />
              <StatCard
                label="Ditolak"
                value={String(stats?.rejected || 0)}
                subtext="Dispensasi"
                icon={Icon.X}
                iconBg="bg-red-50"
                iconColor="text-red-500"
              />
            </div>
          )}

          <div className="rounded-xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
              <h3 className="font-semibold text-slate-900">
                {isTunggakan ? 'Daftar Siswa Menunggak' : 'Daftar Dispensasi Siswa'}
              </h3>
            </div>

            {allRows.length === 0 ? (
              <EmptyState
                title={isTunggakan ? 'Tidak ada data tunggakan' : 'Tidak ada data dispensasi'}
                description={isTunggakan
                  ? 'Data muncul setelah ada tagihan siswa yang belum lunas.'
                  : 'Data muncul setelah siswa mengajukan dispensasi.'}
                icon={Icon.Warning}
              />
            ) : isTunggakan ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">No</th>
                      <th className="px-4 py-3 font-medium">NIS</th>
                      <th className="px-4 py-3 font-medium">Nama Siswa</th>
                      <th className="px-4 py-3 font-medium">Kelas</th>
                      <th className="px-4 py-3 font-medium text-right">Total Tagihan</th>
                      <th className="px-4 py-3 font-medium text-right">Total Terbayar</th>
                      <th className="px-4 py-3 font-medium text-right">Sisa Tunggakan</th>
                      <th className="px-4 py-3 font-medium text-center">Jumlah Tagihan</th>
                      <th className="px-4 py-3 font-medium">Tunggakan Terakhir</th>
                      <th className="px-4 py-3 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((r, i) => (
                      <tr key={r.studentId} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="px-4 py-3 text-slate-500">{(page - 1) * limit + i + 1}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.nis}</td>
                        <td className="px-4 py-3">{r.fullName}</td>
                        <td className="px-4 py-3">{formatClassLabel(r.className)}</td>
                        <td className="px-4 py-3 text-right">{r.totalTagihanFormatted}</td>
                        <td className="px-4 py-3 text-right">{r.totalTerbayarFormatted}</td>
                        <td className="px-4 py-3 text-right font-medium text-red-600">{r.sisaTunggakanFormatted}</td>
                        <td className="px-4 py-3 text-center">{r.jumlahTagihan}</td>
                        <td className="px-4 py-3 text-slate-600">{r.tunggakanTerakhir}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => setDetail(r)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pospay/10 text-pospay hover:bg-pospay/20"
                            title="Detail"
                          >
                            <Icon.Eye width={14} height={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-slate-500">
                      <th className="px-4 py-3 font-medium">No</th>
                      <th className="px-4 py-3 font-medium">NIS</th>
                      <th className="px-4 py-3 font-medium">Nama Siswa</th>
                      <th className="px-4 py-3 font-medium">Kelas</th>
                      <th className="px-4 py-3 font-medium">Tipe</th>
                      <th className="px-4 py-3 font-medium">Alasan</th>
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Reviewer</th>
                      <th className="px-4 py-3 font-medium text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRows.map((r, i) => {
                      const st = dispensationStatusBadge(r.status);
                      return (
                        <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-slate-500">{(page - 1) * limit + i + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800">{r.nis}</td>
                          <td className="px-4 py-3">{r.fullName}</td>
                          <td className="px-4 py-3">{formatClassLabel(r.className)}</td>
                          <td className="px-4 py-3">{dispensationTypeLabel(r.type)}</td>
                          <td className="max-w-[200px] truncate px-4 py-3" title={r.reason}>{r.reason}</td>
                          <td className="px-4 py-3 text-slate-600">{r.tanggal}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>
                              {st.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{r.reviewer}</td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => setDetail(r)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-pospay/10 text-pospay hover:bg-pospay/20"
                              title="Detail"
                            >
                              <Icon.Eye width={14} height={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {allRows.length > 0 && (
              <TagihanPagination
                meta={paginationMeta}
                limit={limit}
                onPage={setPage}
                onLimit={(n) => { setLimit(n); setPage(1); }}
              />
            )}
          </div>
        </>
      )}

      <Modal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={isTunggakan ? 'Detail Tunggakan Siswa' : 'Detail Dispensasi'}
        size="lg"
      >
        {detail && isTunggakan && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
              <div><p className="text-slate-500">NIS</p><p className="font-medium">{detail.nis}</p></div>
              <div><p className="text-slate-500">Nama</p><p className="font-medium">{detail.fullName}</p></div>
              <div><p className="text-slate-500">Kelas</p><p className="font-medium">{formatClassLabel(detail.className)}</p></div>
              <div><p className="text-slate-500">Jumlah Tagihan</p><p className="font-medium">{detail.jumlahTagihan}</p></div>
              <div><p className="text-slate-500">Total Tagihan</p><p className="font-medium">{detail.totalTagihanFormatted}</p></div>
              <div><p className="text-slate-500">Total Terbayar</p><p className="font-medium">{detail.totalTerbayarFormatted}</p></div>
              <div><p className="text-slate-500">Sisa Tunggakan</p><p className="font-semibold text-red-600">{detail.sisaTunggakanFormatted}</p></div>
              <div><p className="text-slate-500">Tunggakan Terakhir</p><p className="font-medium">{detail.tunggakanTerakhir}</p></div>
            </div>
          </div>
        )}
        {detail && !isTunggakan && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4">
              <div><p className="text-slate-500">NIS</p><p className="font-medium">{detail.nis}</p></div>
              <div><p className="text-slate-500">Nama</p><p className="font-medium">{detail.fullName}</p></div>
              <div><p className="text-slate-500">Kelas</p><p className="font-medium">{formatClassLabel(detail.className)}</p></div>
              <div><p className="text-slate-500">Tipe</p><p className="font-medium">{dispensationTypeLabel(detail.type)}</p></div>
              <div className="col-span-2"><p className="text-slate-500">Alasan</p><p className="font-medium">{detail.reason}</p></div>
              <div><p className="text-slate-500">Tanggal Pengajuan</p><p className="font-medium">{detail.tanggal}</p></div>
              <div>
                <p className="text-slate-500">Status</p>
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${dispensationStatusBadge(detail.status).cls}`}>
                  {dispensationStatusBadge(detail.status).label}
                </span>
              </div>
              <div><p className="text-slate-500">Tanggal Review</p><p className="font-medium">{detail.reviewedAt}</p></div>
              <div><p className="text-slate-500">Reviewer</p><p className="font-medium">{detail.reviewer}</p></div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
