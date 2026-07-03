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

function GuideAccordion({ title, icon: IconC }) {
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
        Panduan akan tampil setelah metode pembayaran dikonfigurasi bendahara.
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

  const handleDispensasi = () => {
    toast.info('Pengajuan dispensasi akan tersedia setelah data tagihan diisi melalui portal bendahara.');
  };

  const handleCopy = () => {
    toast.info('Nomor rekening akan tersedia setelah pembayaran dibuat.');
  };

  const handleComplete = () => {
    toast.info('Selesaikan pemilihan tagihan dan metode pembayaran di langkah 1 terlebih dahulu.');
  };

  const handleCancel = () => {
    toast.info('Tidak ada pembayaran aktif untuk dibatalkan.');
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

      <StepIndicator activeStep={2} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Kolom kiri — Konfirmasi */}
        <div className="xl:col-span-8">
          <section className={`${CARD} p-5`}>
            <div className="mb-5">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Konfirmasi Pembayaran</h2>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Periksa detail pembayaran dan ikuti panduan transfer sebelum mengunggah bukti.
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
                  Batas Pembayaran: <span className="font-bold">—</span>
                </p>
              </div>
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Detail Pembayaran</h3>
            <div className="mb-5 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
              <DetailRow label="Metode Pembayaran" value="—" />
              <DetailRow
                label="Nomor Rekening / Virtual Account"
                value="—"
                action={(
                  <button
                    type="button"
                    onClick={handleCopy}
                    disabled
                    className="rounded-lg border border-[#0056D2] px-3 py-1 text-xs font-semibold text-[#0056D2] opacity-50 dark:border-blue-500 dark:text-blue-400"
                  >
                    Salin
                  </button>
                )}
              />
              <DetailRow label="Atas Nama" value="—" />
              <div className="flex items-center justify-between pt-3">
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Pembayaran</span>
                <span className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">—</span>
              </div>
            </div>

            <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-slate-100">Panduan Pembayaran</h3>
            <div className="space-y-2">
              <GuideAccordion title="Cara Bayar via BRI" icon={Icon.Money} />
              <GuideAccordion title="Cara Bayar via QRIS" icon={Icon.Bills} />
              <GuideAccordion title="Cara Bayar via Tunai" icon={Icon.Money} />
            </div>
          </section>
        </div>

        {/* Kolom kanan — Upload & aksi */}
        <div className="space-y-5 xl:col-span-4">
          <section className={`${CARD} p-5`}>
            <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Upload Bukti Pembayaran</h2>
            <div className="flex min-h-[180px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center dark:border-slate-600 dark:bg-slate-800/50">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                <Icon.Upload width={24} height={24} />
              </span>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Klik untuk upload atau seret file ke sini
              </p>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                Format: JPG, JPEG, PNG • Maks. 5MB
              </p>
              <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Upload tersedia setelah pembayaran dibuat di langkah 1.
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/50 dark:bg-amber-950/30">
            <div className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400">
                <Icon.Clock width={20} height={20} />
              </span>
              <div>
                <p className="font-bold text-amber-700 dark:text-amber-300">Belum ada pembayaran aktif</p>
                <p className="mt-1 text-sm text-amber-800/90 dark:text-amber-200/80">
                  Pilih tagihan dan metode pembayaran di langkah 1 untuk melanjutkan ke konfirmasi.
                </p>
              </div>
            </div>
          </section>

          <button
            type="button"
            onClick={handleComplete}
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0056D2] py-3.5 text-sm font-bold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-600"
          >
            <Icon.CheckCircle width={20} height={20} />
            Selesai Pembayaran
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-red-500 py-3.5 text-sm font-bold text-red-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400 dark:text-red-400"
          >
            <Icon.X width={20} height={20} />
            Batalkan Pembayaran
          </button>

          <p className="text-center text-xs text-slate-400 dark:text-slate-500">
            Pembatalan hanya dapat dilakukan sebelum pembayaran dilakukan.
          </p>
        </div>
      </div>

      <BillFooter />
    </div>
  );
}
