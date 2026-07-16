import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { usePortalCatalogSync } from '../hooks/usePortalCatalogSync';
import { Icon } from '../components/Icons';
import { Spinner } from '../components/ui';
import { formatIDR, formatDateTime, PAYMENT_STATUS } from '../lib/format';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const STATUS_OPTIONS = [
  { value: '', label: 'Semua Status' },
  { value: 'VERIFIED', label: 'Lunas' },
  { value: 'PENDING', label: 'Menunggu Verifikasi' },
  { value: 'REJECTED', label: 'Ditolak' },
];

const TABLE_HEADERS = ['Tanggal', 'Tagihan', 'Nominal', 'Status', 'Aksi'];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear, currentYear - 1, currentYear - 2].map(String);

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="min-w-[140px] flex-1 sm:flex-none">
      <label className="mb-1.5 block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-slate-800 focus:border-[#0056D2] focus:outline-none focus:ring-1 focus:ring-[#0056D2] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-blue-500 dark:focus:ring-blue-500"
        >
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <Icon.ChevronRight
          width={16}
          height={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rotate-90 text-slate-400"
        />
      </div>
    </div>
  );
}

export default function History() {
  const toast = useToast();
  const [year, setYear] = useState(String(currentYear));
  const [status, setStatus] = useState('VERIFIED');
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit), year });
      if (status) params.set('status', status);
      const { data } = await api.get(`/portal/payments?${params}`);
      setItems(data.data || []);
      setTotal(data.meta?.total ?? data.total ?? 0);
    } catch (e) {
      if (!silent) {
        const msg = apiError(e);
        if (msg) toast.error(msg);
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, status, toast, year]);

  const { setVersionSnapshot } = usePortalCatalogSync(load, { intervalMs: 30000 });

  useEffect(() => {
    let active = true;
    (async () => {
      await load({ silent: false });
      if (active) await setVersionSnapshot();
    })();
    return () => {
      active = false;
    };
  }, [load, setVersionSnapshot]);

  const downloadInvoice = async (paymentId) => {
    try {
      const res = await api.get(`/payment/invoice/${paymentId}/pdf`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank');
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const resetFilters = () => {
    setYear(String(currentYear));
    setStatus('VERIFIED');
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">Riwayat</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Lihat riwayat pembayaran tagihan sekolah Anda.
        </p>
      </div>

      <section className={`${CARD} p-5`}>
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
            </svg>
          </span>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Filter</h2>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <FilterSelect
            label="Tahun"
            value={year}
            onChange={(v) => { setYear(v); setPage(1); }}
            options={YEAR_OPTIONS.map((y) => ({ value: y, label: y }))}
          />
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={STATUS_OPTIONS}
          />
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#0056D2] px-4 py-2.5 text-sm font-semibold text-[#0056D2] transition hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40 sm:ml-auto"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
              <path d="M21 3v5h-5M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
              <path d="M3 21v-5h5" />
            </svg>
            Reset Filter
          </button>
        </div>
      </section>

      <section className={`${CARD} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/80">
                {TABLE_HEADERS.map((h) => (
                  <th
                    key={h}
                    className="px-5 py-3.5 text-xs font-bold uppercase tracking-wide text-[#0056D2] dark:text-blue-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <Spinner size={32} />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                      <Icon.History width={28} height={28} />
                    </span>
                    <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada riwayat pembayaran</p>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                      Data riwayat akan tampil setelah pembayaran tercatat di sistem.
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((p) => {
                  const st = PAYMENT_STATUS[p.status] || PAYMENT_STATUS.PENDING;
                  return (
                    <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800">
                      <td className="px-5 py-3.5 text-slate-700 dark:text-slate-300">
                        {formatDateTime(p.verifiedAt || p.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-800 dark:text-slate-200">
                        {p.bill?.feeType?.name || '—'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-200">
                        {formatIDR(p.amount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>
                          {p.status === 'VERIFIED' ? 'Lunas' : st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">{p.reference}</span>
                          {p.status === 'VERIFIED' && (
                            <button
                              type="button"
                              onClick={() => downloadInvoice(p.id)}
                              title="Cetak invoice"
                              className="inline-flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
                            >
                              <Icon.Printer width={14} height={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row dark:border-slate-700">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan {items.length} dari {total} data
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-400 dark:disabled:text-slate-600"
              aria-label="Halaman sebelumnya"
            >
              <Icon.ChevronRight width={16} height={16} className="rotate-180" />
            </button>
            <span className="flex h-9 min-w-9 items-center justify-center rounded-lg border-2 border-[#0056D2] px-2 text-sm font-semibold text-[#0056D2] dark:border-blue-500 dark:text-blue-400">
              {page}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 disabled:text-slate-300 dark:border-slate-700 dark:text-slate-400 dark:disabled:text-slate-600"
              aria-label="Halaman berikutnya"
            >
              <Icon.ChevronRight width={16} height={16} />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 dark:border-slate-700">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pospay-50 text-pospay ring-1 ring-pospay/20 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-800">
              <Icon.School width={20} height={20} />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-200">SMP Pusponegoro Brebes</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Jl. Pusponegoro No. 1, Brebes</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500">© 2026 POSPAY. Semua hak dilindungi.</p>
        </div>
      </footer>
    </div>
  );
}
