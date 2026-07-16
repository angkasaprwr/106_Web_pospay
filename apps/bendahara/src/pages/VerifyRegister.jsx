import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import VerifyIllustration from '../components/login/VerifyIllustration';
import OtpInput from '../components/login/OtpInput';
import GoogleGmailBadge from '../components/login/GoogleGmailBadge';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';
import ThemeToggleButton from '../components/ThemeToggleButton';

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
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 lg:flex-row">
      <ThemeToggleButton />
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
            <p className="text-sm font-medium text-white/75">Connect Google Gmail Sekolah</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Kode verifikasi dikirim ke akun Google Gmail sekolah yang terhubung. Bukan melalui SMS, WhatsApp, atau handphone.
            </p>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-10 dark:bg-slate-950 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-2 text-xs font-medium">
            <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-300 text-[10px] text-white">✓</span>
              Daftar Akun
            </span>
            <span className="text-slate-300">→</span>
            <span className="flex items-center gap-1.5 rounded-full bg-pospay px-3 py-1.5 text-white shadow-sm">
              <GoogleGmailBadge size={16} />
              Kode Verifikasi
            </span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700">
                <GoogleGmailBadge size={44} />
              </div>
              <h1 className="text-2xl font-extrabold text-pospay dark:text-blue-400 sm:text-[28px]">Kode Verifikasi</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Buka Google Gmail sekolah Anda dan masukkan kode 6 digit dari notifikasi
              </p>
            </div>

            <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3">
              <div className="flex items-center gap-3">
                <GoogleGmailBadge size={32} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-emerald-700">Terhubung ke Google Gmail Sekolah</p>
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{email}</p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                  Aktif
                </span>
              </div>
            </div>

            <div className="mb-6 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <p className="font-medium text-slate-600 dark:text-slate-300">Cara mendapatkan kode:</p>
              <ol className="mt-2 list-inside list-decimal space-y-1">
                <li>Buka aplikasi atau web <strong>Google Gmail</strong> sekolah</li>
                <li>Cari notifikasi email dari POSPAY</li>
                <li>Salin kode 6 digit ke form di bawah</li>
              </ol>
            </div>

            {devCode && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">
                <p className="font-medium">Mode pengujian developer (SMTP belum aktif)</p>
                <p className="mt-1">
                  Kode Gmail simulasi: <strong className="text-lg tracking-[0.3em]">{devCode}</strong>
                </p>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6">
              <div>
                <label className="mb-3 block text-center text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Masukkan Kode Verifikasi
                </label>
                <OtpInput value={code} onChange={setCode} length={6} />
                <p className="mt-3 text-center text-xs text-slate-400">
                  Kode berlaku 15 menit · Hanya dari Google Gmail sekolah
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-pospay text-sm font-semibold text-white shadow-lg shadow-pospay/20 transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : (
                  <>
                    <Icon.Check width={18} height={18} />
                    Verifikasi Akun
                  </>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">atau</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Tidak menerima kode di Gmail?{' '}
              <Link to="/register" className="font-semibold text-pospay hover:underline">
                Daftar ulang
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Verifikasi via Google Gmail sekolah · Data tersimpan PostgreSQL</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
