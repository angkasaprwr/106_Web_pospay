import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icons';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const STEP_DEFS = [
  { num: 1, label: 'Bayar Tagihan', icon: Icon.Bills, path: '/tagihan' },
  { num: 2, label: 'Konfirmasi Pembayaran', icon: Icon.CheckCircle, path: '/tagihan/konfirmasi' },
  { num: 3, label: 'Pembayaran Berhasil', icon: Icon.Check, path: '/pembayaran-berhasil' },
];

const DETAIL_ROWS = [
  { label: 'Nomor Transaksi', icon: 'hash' },
  { label: 'Tanggal', icon: 'calendar' },
  { label: 'Tagihan', icon: 'bill' },
  { label: 'Metode Bayar', icon: 'bank' },
  { label: 'Total Bayar', icon: 'wallet', highlight: true },
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

function RowIcon({ type }) {
  const cls = 'text-[#0056D2] dark:text-blue-400';
  if (type === 'hash') {
    return (
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-xs font-bold dark:bg-blue-950/50 ${cls}`}>#</span>
    );
  }
  if (type === 'calendar') {
    return (
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 ${cls}`}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </span>
    );
  }
  if (type === 'bill') {
    return (
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 ${cls}`}>
        <Icon.Bills width={16} height={16} />
      </span>
    );
  }
  if (type === 'bank') {
    return (
      <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 ${cls}`}>
        <Icon.School width={16} height={16} />
      </span>
    );
  }
  return (
    <span className={`flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/50 ${cls}`}>
      <Icon.Money width={16} height={16} />
    </span>
  );
}

function SuccessIllustration() {
  return (
    <div className="relative mx-auto mb-6 flex h-24 w-24 items-center justify-center">
      <span className="absolute -left-1 top-2 text-emerald-400 opacity-80">+</span>
      <span className="absolute -right-2 top-0 text-emerald-300 opacity-70">✦</span>
      <span className="absolute bottom-1 right-0 text-emerald-400 opacity-60">+</span>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-inner dark:bg-emerald-950/50 dark:text-emerald-400">
        <Icon.CheckCircle width={44} height={44} strokeWidth={2} />
      </div>
    </div>
  );
}

export default function PaymentSuccess() {
  const toast = useToast();

  const handleDispensasi = () => {
    toast.info('Pengajuan dispensasi akan tersedia setelah data tagihan diisi melalui portal bendahara.');
  };

  const handleDownload = () => {
    toast.info('Bukti pembayaran akan tersedia setelah pembayaran diverifikasi bendahara.');
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
        <button
          type="button"
          onClick={handleDispensasi}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-[#0056D2] px-4 py-2.5 text-sm font-semibold text-[#0056D2] hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
        >
          <Icon.Dispensation width={18} height={18} />
          Ajukan Dispensasi
        </button>
      </div>

      <StepIndicator activeStep={3} />

      <div className="mx-auto max-w-2xl">
        <section className={`${CARD} px-6 py-8 sm:px-10`}>
          <SuccessIllustration />

          <div className="text-center">
            <h2 className="text-xl font-extrabold tracking-wide text-emerald-600 dark:text-emerald-400">
              PEMBAYARAN BERHASIL
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Terima kasih, pembayaran Anda akan ditampilkan di sini setelah diverifikasi bendahara.
            </p>
          </div>

          <div className="mt-8 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/50">
            {DETAIL_ROWS.map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0 dark:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <RowIcon type={row.icon} />
                  <span className="text-sm text-slate-600 dark:text-slate-300">{row.label}</span>
                </div>
                <span
                  className={`text-right font-semibold ${
                    row.highlight
                      ? 'text-lg text-[#0056D2] dark:text-blue-400'
                      : 'text-sm text-slate-800 dark:text-slate-200'
                  }`}
                >
                  —
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 dark:bg-emerald-950/30">
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <Icon.CheckCircle width={18} height={18} />
              Status
            </div>
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-bold text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              —
            </span>
          </div>

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleDownload}
              disabled
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] py-3.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
            >
              <Icon.Download width={20} height={20} />
              Download Bukti Pembayaran
            </button>
            <Link
              to="/"
              className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-[#0056D2] py-3.5 text-sm font-bold text-[#0056D2] transition hover:bg-blue-50 dark:border-blue-500 dark:text-blue-400 dark:hover:bg-blue-950/40"
            >
              <Icon.Home width={20} height={20} />
              Kembali ke Beranda
            </Link>
          </div>
        </section>
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
