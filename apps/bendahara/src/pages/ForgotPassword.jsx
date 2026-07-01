import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import ForgotPasswordIllustration from '../components/login/ForgotPasswordIllustration';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20';

export default function ForgotPassword() {
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devResetUrl, setDevResetUrl] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot-password', { email });
      setSent(true);
      if (data.data.devResetUrl) {
        setDevResetUrl(data.data.devResetUrl);
        toast.info('Mode developer: tautan reset ditampilkan di bawah');
      } else {
        toast.success(data.message || 'Tautan reset dikirim ke Gmail sekolah');
      }
    } catch (err) {
      toast.error(apiError(err, 'Gagal mengirim tautan reset'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      <div className="relative flex w-full flex-col justify-between overflow-hidden bg-pospay px-6 py-8 text-white sm:px-10 sm:py-10 lg:w-1/2 lg:px-12 lg:py-12">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #fff 1.5px, transparent 1.5px)',
            backgroundSize: '22px 22px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <PospayLogo size={48} />
          <span className="text-2xl font-extrabold tracking-wide sm:text-3xl">POSPAY</span>
        </div>
        <div className="relative my-6 flex flex-1 items-center justify-center py-4 lg:my-0">
          <ForgotPasswordIllustration />
        </div>
        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Reset Kata Sandi</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Gunakan email Gmail sekolah yang sama saat pendaftaran. Tautan reset akan dikirim ke notifikasi Gmail Anda.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-8 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-pospay sm:text-[28px]">Lupa Kata Sandi</h1>
              <p className="mt-1 text-sm text-slate-500">Masukkan email Gmail sekolah yang digunakan saat daftar</p>
            </div>

            {sent ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon.Check width={28} height={28} />
                </div>
                <p className="text-sm text-slate-600">
                  Periksa notifikasi Gmail sekolah Anda dan klik <strong>Tautan Reset</strong> untuk mengatur kata sandi baru.
                </p>
                {devResetUrl && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                    <p className="mb-2 font-semibold">Mode pengujian developer:</p>
                    <a href={devResetUrl} className="break-all font-medium text-pospay underline">
                      {devResetUrl}
                    </a>
                  </div>
                )}
                <Link
                  to="/login"
                  className="inline-flex h-11 items-center justify-center rounded-lg bg-pospay px-6 text-sm font-semibold text-white hover:bg-pospay-700"
                >
                  Kembali ke Login
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                    Email Gmail Sekolah
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      <Icon.Mail width={18} height={18} />
                    </span>
                    <input
                      id="email"
                      className={inputClass}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nama@smppusponegoro.sch.id"
                      autoFocus
                      required
                    />
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400">Email harus sama dengan yang digunakan saat registrasi</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
                >
                  {loading ? <Spinner size={18} className="text-white" /> : 'Kirim Tautan Reset'}
                </button>
              </form>
            )}

            {!sent && (
              <p className="mt-6 text-center text-sm text-slate-500">
                Ingat kata sandi?{' '}
                <Link to="/login" className="font-semibold text-pospay hover:underline">
                  masuk
                </Link>
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Tautan reset hanya dikirim ke Gmail resmi sekolah</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
