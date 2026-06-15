import { Link } from 'react-router-dom';
import { Icon } from '../components/Icons';

export default function PaymentSuccess() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40">
        <Icon.CheckCircle width={44} height={44} />
      </div>
      <h1 className="text-2xl font-bold">Pembayaran Terkirim!</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
        Konfirmasi pembayaran Anda telah dikirim dan sedang menunggu verifikasi bendahara. Anda akan menerima notifikasi setelah pembayaran diverifikasi.
      </p>
      <div className="mt-6 flex gap-3">
        <Link to="/tagihan" className="btn-secondary">Lihat Tagihan</Link>
        <Link to="/riwayat" className="btn-primary">Riwayat Pembayaran</Link>
      </div>
    </div>
  );
}
