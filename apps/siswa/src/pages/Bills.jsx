import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { Icon } from '../components/Icons';

const CARD = 'rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900';

const STEP_DEFS = [
  { num: 1, label: 'Bayar Tagihan', icon: Icon.Bills, path: '/tagihan' },
  { num: 2, label: 'Konfirmasi Pembayaran', icon: Icon.CheckCircle, path: '/tagihan/konfirmasi' },
  { num: 3, label: 'Pembayaran Berhasil', icon: Icon.Check, path: '/pembayaran-berhasil' },
];

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

export default function Bills() {
  const toast = useToast();

  const handleDispensasi = () => {
    toast.info('Pengajuan dispensasi akan tersedia setelah data tagihan diisi melalui portal bendahara.');
  };

  const handlePay = () => {
    toast.info('Pembayaran akan tersedia setelah data tagihan tersedia.');
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

      <StepIndicator activeStep={1} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Kolom kiri — Pilih Tagihan */}
        <div className="xl:col-span-5">
          <section className={`${CARD} flex flex-col p-5`}>
            <div className="mb-4">
              <h2 className="font-bold text-slate-800 dark:text-slate-100">Pilih Tagihan</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Pilih tagihan yang ingin Anda bayar.</p>
            </div>

            <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                <Icon.Bills width={28} height={28} />
              </span>
              <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada tagihan</p>
              <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">
                Daftar tagihan akan tampil setelah data tersedia dari bendahara sekolah.
              </p>
            </div>

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

        {/* Kolom kanan — Metode & Rincian */}
        <div className="space-y-5 xl:col-span-7">
          <section className={`${CARD} p-5`}>
            <h2 className="mb-4 font-bold text-slate-800 dark:text-slate-100">Pilih Metode Pembayaran</h2>
            <div className="flex min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
              <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-[#0056D2] dark:bg-blue-950/50 dark:text-blue-400">
                <Icon.Money width={24} height={24} />
              </span>
              <p className="font-semibold text-slate-700 dark:text-slate-200">Belum ada metode pembayaran</p>
              <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
                Metode pembayaran akan tampil setelah bendahara mengatur opsi pembayaran di portal bendahara.
              </p>
            </div>
          </section>

          <section className={`${CARD} p-5`}>
            <h2 className="mb-2 font-bold text-slate-800 dark:text-slate-100">Rincian Pembayaran</h2>
            <div className="mb-4">
              <DetailRow label="Jenis Tagihan" value="—" />
              <DetailRow label="Periode" value="—" />
              <DetailRow label="Jatuh Tempo" value="—" />
            </div>
            <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-4 dark:bg-slate-800/80">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Total Tagihan</span>
              <span className="text-2xl font-bold text-[#0056D2] dark:text-blue-400">—</span>
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
              disabled
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
