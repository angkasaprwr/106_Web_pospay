import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import RegisterIllustration from '../components/login/RegisterIllustration';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';
import ThemeToggleButton from '../components/ThemeToggleButton';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export default function Register() {
  const { requestRegistration } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    api
      .get('/auth/registration-status')
      .then(({ data }) => setOpen(data.data.open))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi password tidak cocok');
    setLoading(true);
    try {
      const result = await requestRegistration({
        fullName: form.fullName,
        username: form.username,
        email: form.email,
        password: form.password,
      });
      if (!result.emailSent && result.devCode) {
        toast.info(`Mode developer: kode verifikasi ${result.devCode}`);
      } else {
        toast.success('Kode verifikasi dikirim ke Gmail sekolah Anda');
      }
      navigate('/register/verify', { state: { verificationId: result.verificationId, email: result.email, devCode: result.devCode } });
    } catch (err) {
      toast.error(apiError(err, 'Registrasi gagal'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Spinner size={32} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 lg:flex-row">
      <ThemeToggleButton />
      {/* Panel kiri — branding (konsisten dengan login) */}
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
          <RegisterIllustration />
        </div>

        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Studi Kasus</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Daftarkan akun bendahara resmi sekolah. Verifikasi dilakukan melalui notifikasi Gmail sekolah, bukan SMS atau handphone.
            </p>
          </div>
        </div>
      </div>

      {/* Panel kanan — form daftar */}
      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-8 dark:bg-slate-950 sm:px-8 lg:w-1/2 lg:px-12 lg:py-10">
        <div className="w-full max-w-[440px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
            {!open ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-500">
                  <Icon.Warning width={28} height={28} />
                </div>
                <h2 className="text-xl font-extrabold text-pospay dark:text-blue-400">Registrasi Ditutup</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Akun bendahara sudah terdaftar. Silakan login menggunakan akun yang ada.
                </p>
                <Link
                  to="/login"
                  className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-pospay px-6 text-sm font-semibold text-white hover:bg-pospay-700"
                >
                  Ke Halaman Login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h1 className="text-2xl font-extrabold text-pospay dark:text-blue-400 sm:text-[28px]">Daftar Akun</h1>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Buat akun bendahara untuk mengelola keuangan sekolah</p>
                </div>

                <form onSubmit={submit} className="space-y-4">
                  <div>
                    <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Nama Lengkap
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon.User width={18} height={18} />
                      </span>
                      <input
                        id="fullName"
                        className={inputClass}
                        value={form.fullName}
                        onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                        placeholder="Masukkan nama lengkap"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                      Username
                    </label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon.User width={18} height={18} />
                      </span>
                      <input
                        id="username"
                        className={inputClass}
                        value={form.username}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        placeholder="Masukkan username"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Username unik untuk login ke sistem POSPAY</p>
                  </div>

                  <div>
                    <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
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
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="nama@smppusponegoro.sch.id"
                        required
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">Kode verifikasi dikirim ke notifikasi Gmail sekolah</p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Password
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon.Lock width={18} height={18} />
                        </span>
                        <input
                          id="password"
                          className={`${inputClass} pr-10`}
                          type={showPassword ? 'text' : 'password'}
                          value={form.password}
                          onChange={(e) => setForm({ ...form, password: e.target.value })}
                          placeholder="Password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Toggle password"
                        >
                          {showPassword ? <Icon.EyeOff width={16} height={16} /> : <Icon.Eye width={16} height={16} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Konfirmasi
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                          <Icon.Lock width={18} height={18} />
                        </span>
                        <input
                          id="confirm"
                          className={`${inputClass} pr-10`}
                          type={showConfirm ? 'text' : 'password'}
                          value={form.confirm}
                          onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                          placeholder="Ulangi password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          aria-label="Toggle confirm password"
                        >
                          {showConfirm ? <Icon.EyeOff width={16} height={16} /> : <Icon.Eye width={16} height={16} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
                  >
                    {loading ? <Spinner size={18} className="text-white" /> : 'Daftar Akun'}
                  </button>
                </form>

                <div className="my-6 flex items-center gap-3">
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                  <span className="text-xs text-slate-400">atau</span>
                  <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                </div>

                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                  Sudah memiliki akun ?{' '}
                  <Link to="/login" className="font-semibold text-pospay hover:underline">
                    masuk
                  </Link>
                </p>
              </>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Verifikasi akun hanya melalui email Gmail resmi sekolah</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
