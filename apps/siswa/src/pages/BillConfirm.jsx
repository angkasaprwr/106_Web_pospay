import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, apiError } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { formatIDR, formatDate } from '../lib/format';
import {
  loadBillPaymentDraft,
  clearBillPaymentDraft,
  saveBillPaymentDraft,
  saveLastPayment,
  isCashlessMethod,
  isCashMethod,
  isMidtransQrisMethod,
  isMidtransTransferMethod,
} from '../lib/billPaymentSession';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const STEP_DEFS = [
  { num: 1, label: 'Bayar Tagihan', icon: Icon.Bills, path: '/tagihan' },
  { num: 2, label: 'Konfirmasi Pembayaran', icon: Icon.CheckCircle, path: '/tagihan/konfirmasi' },
  { num: 3, label: 'Pembayaran Berhasil', icon: Icon.Check, path: '/pembayaran-berhasil' },
];

function StepIndicator({ activeStep }) {
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

function DetailRow({ label, value, action }) {
  return (
    <div className="flex flex-col gap-2 border-b border-slate-100 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
      <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">{value}</span>
        {action}
      </div>
    </div>
  );
}

function GuideAccordion({ title, icon: IconC, children }) {
  return (
    <details className="group rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
        <span className="flex items-center gap-2">
          <IconC width={18} height={18} className="text-[#0056D2] dark:text-blue-400" />
          {title}
        </span>
        <Icon.ChevronRight width={16} height={16} className="rotate-90 text-slate-400 transition group-open:rotate-[270deg]" />
      </summary>
      <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {children}
      </div>
    </details>
  );
}

function BillFooter() {
  return (
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
  );
}

export default function BillConfirm() {
  const toast = useToast();
  const navigate = useNavigate();
  const pollRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bill, setBill] = useState(null);
  const [method, setMethod] = useState(null);
  const [draft, setDraft] = useState(null);
  const [proof, setProof] = useState(null);
  const [note, setNote] = useState('');
  const [paymentId, setPaymentId] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [transferInfo, setTransferInfo] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [awaitingCashless, setAwaitingCashless] = useState(false);

  const [expiryTime, setExpiryTime] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [schoolName, setSchoolName] = useState('SMP Pusponegoro Brebes');

  const midtrans = useMemo(() => isMidtransQrisMethod(method), [method]);
  const midtransTransfer = useMemo(() => isMidtransTransferMethod(method), [method]);
  const cash = useMemo(() => isCashMethod(method), [method]);
  const cashless = useMemo(() => (isCashlessMethod(method) || midtransTransfer) && !cash, [method, cash, midtransTransfer]);

  const finishSuccess = useCallback((payment) => {
    saveLastPayment(payment);
    clearBillPaymentDraft();
    toast.success('Pembayaran berhasil! Tagihan telah lunas.');
    navigate('/pembayaran-berhasil');
  }, [navigate, toast]);

  const pollPaymentStatus = useCallback(async (id) => {
    try {
      const { data } = await api.get(`/payment/status/${id}`);
      const payment = data.data;
      setPaymentStatus(payment.status);
      setTransferInfo({
        vaNumber: payment.qr_string || null,
        bank: payment.payment_method?.merchantName || payment.payment_method?.name || null,
      });
      if (payment.status === 'VERIFIED') {
        if (pollRef.current) clearInterval(pollRef.current);
        finishSuccess(payment);
      }
    } catch {
      /* ignore polling errors */
    }
  }, [finishSuccess]);

  const initCashPayment = useCallback(async (saved, billData, methodData, amount) => {
    let pid = saved.paymentId;
    let paymentData = null;
    if (!pid) {
      const { data } = await api.post('/payment/cash', {
        billId: billData.id,
        paymentMethodId: methodData.id,
        amount,
        note: note.trim() || undefined,
      });
      paymentData = data.data;
      pid = paymentData.id;
      const nextDraft = { ...saved, paymentId: pid };
      saveBillPaymentDraft(nextDraft);
      setDraft(nextDraft);
      toast.success('Pengajuan pembayaran tunai terkirim. Silakan bayar di loket bendahara.');
    } else {
      const statusRes = await api.get(`/payment/status/${pid}`);
      paymentData = statusRes.data.data;
    }
    setPaymentId(pid);
    setPaymentStatus(paymentData?.status || 'PENDING');
  }, [note, toast]);

  const initMidtransPayment = useCallback(async (saved, billData, methodData, amount) => {
    let pid = saved.paymentId;
    let paymentData = null;
    if (!pid) {
      const { data } = await api.post('/payment/create', {
        billId: billData.id,
        paymentMethodId: methodData.id,
        amount,
        note: note.trim() || undefined,
      });
      paymentData = data.data;
      pid = paymentData.id;
      const nextDraft = { ...saved, paymentId: pid };
      saveBillPaymentDraft(nextDraft);
      setDraft(nextDraft);
    } else {
      const statusRes = await api.get(`/payment/status/${pid}`);
      paymentData = statusRes.data.data;
    }

    setPaymentId(pid);
    setPaymentStatus(paymentData.status || 'PENDING');
    setQrDataUrl(paymentData.qr_url || paymentData.qrDataUrl || '');
    setTransferInfo({
      vaNumber: paymentData.va_number || null,
      bank: paymentData.bank || null,
    });
    setExpiryTime(paymentData.expiry_time || paymentData.expiryTime || null);
    setSchoolName(paymentData.school_name || 'SMP Pusponegoro Brebes');
    setAwaitingCashless(true);

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => pollPaymentStatus(pid), 5000);
    pollPaymentStatus(pid);
  }, [note, pollPaymentStatus]);

  const initLegacyCashlessPayment = useCallback(async (saved, billData, methodData, amount) => {
    let pid = saved.paymentId;
    if (!pid) {
      const fd = new FormData();
      fd.append('billId', billData.id);
      fd.append('amount', String(amount));
      fd.append('channel', methodData.channel || saved.channel || 'QRIS');
      fd.append('paymentMethodId', methodData.id);
      const { data } = await api.post('/portal/payments', fd);
      const payment = data.data;
      pid = payment.id;
      const nextDraft = { ...saved, paymentId: pid };
      saveBillPaymentDraft(nextDraft);
      setDraft(nextDraft);
      setPaymentId(pid);
      setPaymentStatus(payment.status || 'PENDING');
    } else {
      setPaymentId(pid);
    }

    const qrRes = await api.get(`/portal/payments/${pid}/qr`);
    setQrDataUrl(qrRes.data.data.qrDataUrl);
    setAwaitingCashless(true);
    setPaymentStatus(qrRes.data.data.status || 'PENDING');

    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => pollPaymentStatus(pid), 5000);
    pollPaymentStatus(pid);
  }, [pollPaymentStatus]);

  const load = useCallback(async () => {
    const saved = loadBillPaymentDraft();
    if (!saved?.billId || !saved?.paymentMethodId) {
      setLoading(false);
      return;
    }
    setDraft(saved);
    setLoading(true);
    try {
      const [billRes, methodsRes] = await Promise.all([
        api.get(`/portal/bills/${saved.billId}`),
        api.get('/portal/payment-methods'),
      ]);
      const billData = billRes.data.data;
      const methods = methodsRes.data.data || [];
      const methodData = methods.find((m) => m.id === saved.paymentMethodId) || null;
      setBill(billData);
      setMethod(methodData);

      if (methodData && (isMidtransQrisMethod(methodData) || isMidtransTransferMethod(methodData))) {
        const amount = Math.max(
          0,
          Number(billData.amount) - Number(billData.discount || 0) - Number(billData.paidAmount || 0),
        );
        await initMidtransPayment(saved, billData, methodData, amount);
      } else if (methodData && isCashMethod(methodData)) {
        const amount = Math.max(
          0,
          Number(billData.amount) - Number(billData.discount || 0) - Number(billData.paidAmount || 0),
        );
        await initCashPayment(saved, billData, methodData, amount);
      } else if (methodData && isCashlessMethod(methodData) && !isMidtransQrisMethod(methodData)) {
        const amount = Math.max(
          0,
          Number(billData.amount) - Number(billData.discount || 0) - Number(billData.paidAmount || 0),
        );
        await initLegacyCashlessPayment(saved, billData, methodData, amount);
      }
    } catch (e) {
      const msg = apiError(e);
      if (msg) toast.error(msg);
      navigate('/tagihan');
    } finally {
      setLoading(false);
    }
  }, [initMidtransPayment, initCashPayment, initLegacyCashlessPayment, navigate, toast]);

  useEffect(() => {
    if (!expiryTime) return undefined;
    const tick = () => {
      const diff = new Date(expiryTime).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Kedaluwarsa');
        return;
      }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${m}:${String(s).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiryTime]);

  useEffect(() => {
    load();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  const amount = useMemo(() => {
    if (!bill) return draft?.amount || 0;
    return Math.max(0, Number(bill.amount) - Number(bill.discount || 0) - Number(bill.paidAmount || 0));
  }, [bill, draft]);

  const dueLabel = bill?.dueDate ? formatDate(bill.dueDate) : '—';

  const handleCopy = async () => {
    if (!method?.accountNo) {
      toast.info('Nomor rekening tidak tersedia untuk metode ini.');
      return;
    }
    try {
      await navigator.clipboard.writeText(method.accountNo);
      toast.success('Nomor rekening disalin');
    } catch {
      toast.error('Gagal menyalin nomor rekening');
    }
  };

  const handleComplete = async () => {
    if (!bill || !method || !draft) {
      toast.info('Selesaikan pemilihan tagihan dan metode pembayaran di langkah 1 terlebih dahulu.');
      navigate('/tagihan');
      return;
    }
    if (!proof) {
      toast.error('Unggah bukti pembayaran terlebih dahulu.');
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('billId', bill.id);
      fd.append('amount', String(amount));
      fd.append('channel', method.channel || draft.channel || 'TRANSFER');
      fd.append('paymentMethodId', method.id);
      if (note.trim()) fd.append('note', note.trim());
      fd.append('proof', proof);
      const { data } = await api.post('/portal/payments', fd);
      saveLastPayment(data.data);
      clearBillPaymentDraft();
      toast.success('Bukti pembayaran terkirim, menunggu verifikasi bendahara');
      navigate('/pembayaran-berhasil');
    } catch (e) {
      const msg = apiError(e);
      if (msg) toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (pollRef.current) clearInterval(pollRef.current);
    clearBillPaymentDraft();
    toast.info('Pembayaran dibatalkan.');
    navigate('/tagihan');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size={36} />
      </div>
    );
  }

  if (!draft || !bill || !method) {
    return (
      <div className="space-y-6 pb-24">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="font-semibold text-amber-800 dark:text-amber-200">Belum ada pembayaran aktif</p>
          <p className="mt-2 text-sm text-amber-700 dark:text-amber-300/90">
            Pilih tagihan dan metode pembayaran di langkah 1 untuk melanjutkan ke konfirmasi.
          </p>
          <Link
            to="/tagihan"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[#0056D2] px-4 py-2.5 text-sm font-semibold text-white dark:bg-blue-600"
          >
            Kembali ke Bayar Tagihan
          </Link>
        </div>
      </div>
    );
  }

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

      <StepIndicator activeStep={2} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8">
          <section className={`${CARD} p-5`}>
            <div className="mb-5">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Konfirmasi Pembayaran</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {cashless
                  ? midtrans
                    ? 'Scan kode QR Midtrans di panel kanan. Pembayaran diverifikasi otomatis setelah scan berhasil.'
                    : 'Scan kode QR di panel kanan untuk membayar. Pembayaran akan terverifikasi otomatis tanpa unggah bukti.'
                  : cash
                    ? 'Serahkan pembayaran tunai ke loket bendahara sesuai nominal. Tidak perlu unggah bukti.'
                    : 'Periksa detail pembayaran dan ikuti panduan transfer sebelum mengunggah bukti.'}
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 dark:border-sky-800 dark:bg-sky-950/40">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-900/60 dark:text-sky-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                <p className="text-sm text-sky-900 dark:text-sky-200">
                  Batas Pembayaran: <span className="font-bold">{dueLabel}</span>
                </p>
              </div>
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Detail Pembayaran</h3>
            <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <DetailRow label="Jenis Tagihan" value={bill.feeType?.name || '—'} />
              <DetailRow label="Metode Pembayaran" value={method.name} />
              {!cashless && !cash && (
                <>
                  <DetailRow
                    label="Nomor Rekening / Virtual Account"
                    value={method.accountNo || '—'}
                    action={method.accountNo ? (
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="rounded-lg border border-[#0056D2] px-3 py-1 text-xs font-semibold text-[#0056D2] dark:border-blue-500 dark:text-blue-400"
                      >
                        Salin
                      </button>
                    ) : null}
                  />
                  <DetailRow label="Atas Nama" value={method.accountName || '—'} />
                </>
              )}
              {cashless && paymentId && (
                <DetailRow label="Referensi Pembayaran" value={paymentId.slice(-8).toUpperCase()} />
              )}
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Pembayaran</span>
                <span className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">{formatIDR(amount)}</span>
              </div>
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Panduan Pembayaran</h3>
            <div className="space-y-2">
              {method.instruction ? (
                <GuideAccordion title={`Cara Bayar via ${method.name}`} icon={Icon.Money}>
                  {method.instruction}
                </GuideAccordion>
              ) : (
                <GuideAccordion title={`Cara Bayar via ${method.name}`} icon={Icon.Money}>
                  {cashless
                    ? `Buka aplikasi ${method.name}, pilih Scan QR, lalu arahkan kamera ke kode QR. Dana akan masuk ke rekening resmi sekolah secara otomatis.`
                    : cash
                      ? 'Datang ke loket bendahara SMP Pusponegoro Brebes dengan uang tunai sesuai nominal tagihan. Bendahara akan memverifikasi pembayaran setelah uang diterima.'
                      : 'Ikuti petunjuk pembayaran sesuai metode yang dipilih. Setelah transfer, unggah bukti di panel kanan.'}
                </GuideAccordion>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-5 xl:col-span-4">
          {midtrans || midtransTransfer || (cashless && !cash) ? (
            <section className={`${CARD} p-5`}>
              <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">{midtransTransfer ? 'Transfer Bank Midtrans' : `Scan QR ${midtrans ? 'Midtrans' : method.name}`}</h2>
              <div className="flex flex-col items-center">
                {!midtransTransfer && qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR pembayaran ${method.name}`}
                    className="h-56 w-56 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-600"
                  />
                ) : !midtransTransfer ? (
                  <div className="flex h-56 w-56 items-center justify-center rounded-xl border border-dashed border-slate-200 dark:border-slate-600">
                    <Spinner size={32} />
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-800/60">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Virtual Account</p>
                    <p className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{transferInfo?.vaNumber || '-'}</p>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Bank: {transferInfo?.bank || method?.name || '-'}</p>
                  </div>
                )}
                <p className="mt-4 text-center text-sm font-medium text-slate-700 dark:text-slate-200">
                  {formatIDR(amount)}
                </p>
                <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                  {schoolName}
                </p>
                {bill?.invoiceNo && (
                  <p className="mt-1 text-center text-xs text-slate-500 dark:text-slate-400">
                    Invoice: {bill.invoiceNo}
                  </p>
                )}
                {countdown && (
                  <p className="mt-2 text-center text-xs font-semibold text-amber-700 dark:text-amber-300">
                    Berlaku: {countdown}
                  </p>
                )}
                {awaitingCashless && paymentStatus === 'PENDING' && (
                  <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <Spinner size={14} />
                    {midtransTransfer ? 'Menunggu pembayaran transfer Midtrans...' : (midtrans ? 'Menunggu pembayaran QRIS Midtrans...' : 'Menunggu konfirmasi pembayaran cashless...')}
                  </div>
                )}
              </div>
            </section>
          ) : cash ? (
            <section className={`${CARD} p-5`}>
              <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Pembayaran Tunai di Loket</h2>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-4 text-center dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                  <Icon.Money width={24} height={24} />
                </span>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  {formatIDR(amount)}
                </p>
                <p className="mt-3 text-sm font-medium text-emerald-900 dark:text-emerald-200">
                  Silakan melakukan pembayaran di loket bendahara.
                </p>
                <p className="mt-2 text-xs text-emerald-800 dark:text-emerald-300/90">
                  Serahkan uang tunai sesuai nominal ke bendahara. Status akan berubah menjadi Lunas setelah bendahara menyetujui pembayaran.
                </p>
                {paymentId && paymentStatus === 'PENDING' && (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    Menunggu Verifikasi Bendahara
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className={`${CARD} p-5`}>
              <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Upload Bukti Pembayaran</h2>
              <label className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center transition hover:border-[#0056D2] dark:border-slate-600 dark:bg-slate-800/50 dark:hover:border-blue-500">
                <input
                  type="file"
                  className="sr-only"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={(e) => setProof(e.target.files?.[0] || null)}
                />
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                  <Icon.Upload width={24} height={24} />
                </span>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {proof ? proof.name : 'Klik untuk upload atau seret file ke sini'}
                </p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  Format: JPG, JPEG, PNG • Maks. 5MB
                </p>
              </label>
              <textarea
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-[#0056D2] focus:outline-none focus:ring-1 focus:ring-[#0056D2] dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                rows={2}
                placeholder="Catatan (opsional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
              <button
                type="button"
                onClick={handleComplete}
                disabled={submitting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] py-3.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
              >
                {submitting ? <Spinner size={18} className="text-white" /> : <Icon.CheckCircle width={20} height={20} />}
                Selesai Pembayaran
              </button>
            </section>
          )}

          <button
            type="button"
            onClick={handleCancel}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500 py-3.5 text-sm font-bold text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400 dark:text-red-400"
          >
            <Icon.X width={20} height={20} />
            Batalkan Pembayaran
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            {cashless
              ? 'Pembayaran cashless diverifikasi otomatis setelah dana masuk rekening sekolah.'
              : cash
                ? 'Pembayaran tunai menunggu verifikasi bendahara setelah uang diterima di loket.'
                : 'Pembatalan hanya dapat dilakukan sebelum pembayaran dilakukan.'}
          </p>
        </div>
      </div>

      <BillFooter />
    </div>
  );
}
