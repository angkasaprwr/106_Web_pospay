import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import VerifyIllustration from '../components/login/VerifyIllustration';
import OtpInput from '../components/login/OtpInput';
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

  useEffect(() => {
    if (devCode && !code) setCode(String(devCode));
  }, [devCode]); // eslint-disable-line

  const submit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error('Masukkan kode verifikasi 6 digit');
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
      {/* Panel kiri — branding */}
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
          <VerifyIllustration />
        </div>

        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Studi Kasus</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Kode verifikasi dikirim ke notifikasi Gmail sekolah yang Anda gunakan saat daftar. Bukan melalui SMS atau handphone.
            </p>
          </div>
        </div>
      </div>

      {/* Panel kanan — input kode */}
      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-10 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[440px]">
          {/* Step indicator */}
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-400">1. Daftar Akun</span>
            <span className="text-slate-300">→</span>
            <span className="rounded-full bg-pospay px-3 py-1 text-white">2. Kode Verifikasi</span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-pospay-50 text-pospay">
                <Icon.Mail width={28} height={28} />
              </div>
              <h1 className="text-2xl font-extrabold text-pospay sm:text-[28px]">Kode Verifikasi</h1>
              <p className="mt-2 text-sm text-slate-500">
                Masukkan kode 6 digit dari notifikasi Gmail sekolah Anda
              </p>
            </div>

            <div className="mb-6 flex items-center gap-3 rounded-xl border border-pospay-100 bg-pospay-50 px-4 py-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-pospay shadow-sm">
                <Icon.Mail width={18} height={18} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-500">Dikirim ke Gmail sekolah</p>
                <p className="truncate text-sm font-semibold text-slate-800">{email}</p>
              </div>
            </div>

            {devCode && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                <p className="font-medium">Mode pengujian developer</p>
                <p className="mt-1">
                  Kode: <strong className="text-lg tracking-[0.3em]">{devCode}</strong>
                </p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="mb-3 block text-center text-sm font-medium text-slate-700">
                  Masukkan Kode Verifikasi
                </label>
                <OtpInput value={code} onChange={setCode} length={6} />
                <p className="mt-3 text-center text-xs text-slate-400">
                  Kode berlaku 15 menit · Hanya dari Gmail sekolah
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Verifikasi Akun'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-xs text-slate-400">atau</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <p className="text-center text-sm text-slate-500">
              Tidak menerima kode?{' '}
              <Link to="/register" className="font-semibold text-pospay hover:underline">
                Daftar ulang
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Verifikasi hanya melalui Gmail resmi sekolah</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
