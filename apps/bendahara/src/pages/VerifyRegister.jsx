import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';

export default function VerifyRegister() {
  const { verifyRegistration } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const verificationId = location.state?.verificationId;
  const email = location.state?.email;
  const devCode = location.state?.devCode;

  useEffect(() => {
    if (!verificationId) navigate('/register', { replace: true });
  }, [verificationId, navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyRegistration({ verificationId, code });
      toast.success('Akun bendahara berhasil diverifikasi');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Verifikasi gagal'));
    } finally {
      setLoading(false);
    }
  };

  if (!verificationId) return null;

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
        <div className="relative my-8 flex flex-1 flex-col items-center justify-center gap-6 py-4 lg:my-0">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <Icon.Mail width={56} height={56} className="text-white" />
          </div>
          <p className="max-w-sm text-center text-sm leading-relaxed text-white/85">
            Periksa notifikasi Gmail sekolah Anda untuk mendapatkan kode verifikasi 6 digit.
          </p>
        </div>
        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Verifikasi Email</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">Gmail Sekolah</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Kode verifikasi hanya dikirim ke akun Gmail resmi sekolah, bukan melalui SMS atau handphone.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-8 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-extrabold text-pospay sm:text-[28px]">Kode Verifikasi</h1>
              <p className="mt-1 text-sm text-slate-500">Masukkan kode dari notifikasi Gmail sekolah</p>
            </div>

            <div className="mb-5 rounded-lg bg-pospay-50 px-4 py-3 text-sm text-slate-600">
              Dikirim ke: <span className="font-semibold text-pospay">{email}</span>
            </div>

            {devCode && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Mode pengujian developer — kode: <strong className="tracking-widest">{devCode}</strong>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Kode Verifikasi (6 digit)
                </label>
                <input
                  id="code"
                  className="w-full rounded-lg border border-slate-200 bg-white py-3 text-center text-2xl font-bold tracking-[0.4em] text-slate-800 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoFocus
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Verifikasi & Masuk'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Salah email?{' '}
              <Link to="/register" className="font-semibold text-pospay hover:underline">
                Daftar ulang
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Hanya bendahara terverifikasi yang dapat mengakses sistem</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
