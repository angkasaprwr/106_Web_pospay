import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
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

export default function PaymentSuccess() {
  const toast = useToast();

  const handleDispensasi = () => {
    toast.info('Pengajuan dispensasi akan tersedia setelah data tagihan diisi melalui portal bendahara.');
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
        <section className={`${CARD} px-6 py-10 sm:px-10`}>
          <div className="flex flex-col items-center text-center">
            <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
              <Icon.Check width={32} height={32} />
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pembayaran Berhasil</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
              Detail pembayaran akan ditampilkan di sini setelah Anda menyelesaikan pembayaran dan
              bendahara menyetujui verifikasi.
            </p>
          </div>

          <div className="mt-8 flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 dark:border-slate-600 dark:bg-slate-800/50">
            <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500">
              <Icon.Bills width={24} height={24} />
            </span>
            <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada pembayaran terverifikasi</p>
            <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Selesaikan langkah 1 dan 2, lalu tunggu verifikasi bendahara. Data transaksi akan muncul otomatis setelah proses CRUD selesai.
            </p>
          </div>

          <div className="mt-6">
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
