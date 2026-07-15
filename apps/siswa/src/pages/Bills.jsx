import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR, formatDate, BILL_STATUS } from '../lib/format';
import { saveBillPaymentDraft } from '../lib/billPaymentSession';
import { usePortalCatalogSync } from '../hooks/usePortalCatalogSync';
import { Spinner, Badge } from '../components/ui';
import { Icon } from '../components/Icons';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';
const PAYABLE_STATUSES = ['UNPAID', 'PARTIAL', 'OVERDUE'];

const STEP_DEFS = [
  { num: 1, label: 'Bayar Tagihan', icon: Icon.Bills, path: '/tagihan' },
  { num: 2, label: 'Konfirmasi Pembayaran', icon: Icon.CheckCircle, path: '/tagihan/konfirmasi' },
  { num: 3, label: 'Pembayaran Berhasil', icon: Icon.Check, path: '/pembayaran-berhasil' },
];

const CHANNEL_LABELS = {
  CASH: 'Tunai',
  TRANSFER: 'Transfer Bank',
  QRIS: 'QRIS',
  VIRTUAL_ACCOUNT: 'Virtual Account',
  OTHER: 'Lainnya',
};

function StepIndicator({ activeStep = 1 }) {
  return (
    <nav className="mb-6 overflow-x-auto rounded-xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex min-w-[560px]">
        {STEP_DEFS.map((step, idx) => {
          const active = step.num === activeStep;
          const content = (
            <>
              <step.icon width={18} height={18} />
              <span>{step.num}. {step.label}</span>
            </>
          );
          const cls = `flex flex-1 items-center justify-center gap-2 border-b-[3px] px-3 py-4 text-sm font-semibold sm:px-4 ${
            active
              ? 'border-[#0056D2] text-[#0056D2] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-400 dark:text-slate-500'
          } ${idx > 0 ? 'border-l border-slate-100 dark:border-slate-800' : ''}`;

          return active ? (
            <div key={step.num} className={cls}>{content}</div>
          ) : (
            <Link key={step.num} to={step.path} className={`${cls} transition hover:text-[#0056D2] dark:hover:text-blue-400`}>
              {content}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</span>
    </div>
  );
}

function billRemaining(bill) {
  return Math.max(0, Number(bill.amount) - Number(bill.discount || 0) - Number(bill.paidAmount || 0));
}

export default function Bills() {
  const toast = useToast();
  const navigate = useNavigate();
  const [bills, setBills] = useState([]);
  const [methods, setMethods] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [accountError, setAccountError] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [selectedMethodId, setSelectedMethodId] = useState('');

  const loadData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setInitialLoading(true);
      setAccountError('');
    }
    try {
      const [billsRes, methodsRes] = await Promise.all([
        api.get('/portal/bills?limit=100'),
        api.get('/portal/payment-methods'),
      ]);
      const allBills = billsRes.data?.data || [];
      const payable = allBills.filter((b) => PAYABLE_STATUSES.includes(b.status));
      const activeMethods = methodsRes.data?.data || [];
      setBills(payable);
      setMethods(activeMethods);

      setSelectedBillId((prev) => {
        if (prev && payable.some((b) => b.id === prev)) return prev;
        return payable[0]?.id || '';
      });
      setSelectedMethodId((prev) => {
        if (prev && activeMethods.some((m) => m.id === prev)) return prev;
        return activeMethods[0]?.id || '';
      });
    } catch (e) {
      if (!silent) {
        const status = e.response?.status;
        const message = e.response?.data?.message || '';
        if (status === 403 && message.toLowerCase().includes('siswa')) {
          setAccountError(message);
          setBills([]);
          setMethods([]);
        } else {
          const msg = apiError(e);
          if (msg) toast.error(msg);
        }
      }
    } finally {
      if (!silent) setInitialLoading(false);
    }
  }, [toast]);

  usePortalCatalogSync(loadData);

  useEffect(() => {
    loadData({ silent: false });
  }, [loadData]);

  const selectedBill = useMemo(
    () => bills.find((b) => b.id === selectedBillId) || null,
    [bills, selectedBillId],
  );

  const selectedMethod = useMemo(
    () => methods.find((m) => m.id === selectedMethodId) || null,
    [methods, selectedMethodId],
  );

  const totalDue = selectedBill ? billRemaining(selectedBill) : 0;
  const hasPendingPayment = selectedBill?.payments?.some((p) => p.status === 'PENDING');

  const handlePay = () => {
    if (!selectedBill) {
      toast.error('Pilih tagihan terlebih dahulu.');
      return;
    }
    if (!selectedMethod) {
      toast.error('Pilih metode pembayaran terlebih dahulu.');
      return;
    }
    if (hasPendingPayment) {
      toast.info('Tagihan ini masih menunggu verifikasi pembayaran sebelumnya.');
      return;
    }
    if (totalDue <= 0) {
      toast.error('Tagihan ini tidak memiliki sisa pembayaran.');
      return;
    }

    saveBillPaymentDraft({
      billId: selectedBill.id,
      paymentMethodId: selectedMethod.id,
      amount: totalDue,
      channel: selectedMethod.channel || 'TRANSFER',
    });
    navigate('/tagihan/konfirmasi');
  };

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Tagihan</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Kelola dan lakukan pembayaran tagihan sekolah Anda dengan mudah.
          </p>
        </div>
        <Link
          to="/tagihan/dispensasi"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#0056D2] px-4 py-2.5 text-sm font-semibold text-[#0056D2] hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          <Icon.Dispensation width={18} height={18} />
          Ajukan Dispensasi
        </Link>
      </div>

      <StepIndicator activeStep={1} />

      {accountError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
          {accountError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-5">
          <section className={`${CARD} flex flex-col p-5`}>
            <div className="mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Pilih Tagihan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pilih tagihan yang ingin Anda bayar.</p>
            </div>

            {initialLoading ? (
              <div className="flex min-h-[280px] items-center justify-center">
                <Spinner size={32} />
              </div>
            ) : bills.length === 0 ? (
              <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon.Bills width={28} height={28} />
                </span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada tagihan</p>
                <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                  Daftar tagihan akan tampil setelah bendahara membuat tagihan untuk akun siswa Anda.
                </p>
              </div>
            ) : (
              <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                {bills.map((bill) => {
                  const selected = bill.id === selectedBillId;
                  const pending = bill.payments?.some((p) => p.status === 'PENDING');
                  const remaining = billRemaining(bill);
                  return (
                    <button
                      key={bill.id}
                      type="button"
                      onClick={() => setSelectedBillId(bill.id)}
                      className={`w-full rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-[#0056D2] bg-blue-50/60 ring-2 ring-[#0056D2]/20 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {bill.feeType?.name || 'Tagihan'}
                            {bill.period ? ` · ${bill.period}` : ''}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                            Jatuh tempo {formatDate(bill.dueDate)}
                          </p>
                          {pending && (
                            <span className="mt-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                              Menunggu verifikasi
                            </span>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-slate-900 dark:text-slate-100">{formatIDR(remaining)}</p>
                          <div className="mt-1 flex justify-end">
                            <Badge status={bill.status} map={BILL_STATUS} />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-4 dark:border-sky-800 dark:bg-sky-950/40">
              <div className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-400">
                  <Icon.Info width={18} height={18} />
                </span>
                <p className="text-sm leading-relaxed text-sky-800 dark:text-sky-300/90">
                  Pilih salah satu tagihan untuk melihat detail dan melakukan pembayaran.
                </p>
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-7">
          <section className={`${CARD} p-5`}>
            <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Pilih Metode Pembayaran</h2>
            {initialLoading ? (
              <div className="flex min-h-[160px] items-center justify-center">
                <Spinner size={28} />
              </div>
            ) : methods.length === 0 ? (
              <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon.Money width={24} height={24} />
                </span>
                <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada metode pembayaran</p>
                <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                  Metode pembayaran akan tampil setelah bendahara menambahkannya di Pengaturan → Metode Pembayaran.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {methods.map((method) => {
                  const selected = method.id === selectedMethodId;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setSelectedMethodId(method.id)}
                      className={`rounded-xl border p-4 text-left transition ${
                        selected
                          ? 'border-[#0056D2] bg-blue-50/60 ring-2 ring-[#0056D2]/20 dark:border-blue-500 dark:bg-blue-950/30 dark:ring-blue-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-slate-600'
                      }`}
                    >
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{method.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {CHANNEL_LABELS[method.channel] || method.channel}
                      </p>
                      {method.accountNo && (
                        <p className="mt-1 font-mono text-xs text-slate-600 dark:text-slate-300">{method.accountNo}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className="mb-2 font-bold text-slate-800 dark:text-slate-100">Rincian Pembayaran</h2>
            <div className="mb-4">
              <DetailRow label="Jenis Tagihan" value={selectedBill?.feeType?.name || '—'} />
              <DetailRow label="Periode" value={selectedBill?.period || '—'} />
              <DetailRow label="Jatuh Tempo" value={selectedBill ? formatDate(selectedBill.dueDate) : '—'} />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-4 dark:bg-slate-800/80">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Tagihan</span>
              <span className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">
                {selectedBill ? formatIDR(totalDue) : '—'}
              </span>
            </div>

            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
              <div className="flex gap-3">
                <Icon.Warning width={20} height={20} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
                <p className="text-sm text-amber-800 dark:text-amber-200/90">
                  Pastikan data pembayaran sudah sesuai sebelum melakukan pembayaran.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePay}
              disabled={initialLoading || !selectedBill || !selectedMethod || hasPendingPayment || totalDue <= 0}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-[#004BB8] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-500"
            >
              <Icon.Money width={20} height={20} />
              Bayar Tagihan
            </button>
          </section>
        </div>
      </div>

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
