import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import ResetPasswordIllustration from '../components/login/ResetPasswordIllustration';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';
import ThemeToggleButton from '../components/ThemeToggleButton';

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [email, setEmail] = useState('');

  const passwordsMatch = form.password.length > 0 && form.password === form.confirm;

  useEffect(() => {
    if (!token) {
      navigate('/lupa-kata-sandi', { replace: true });
      return;
    }
    api
      .get('/auth/reset-password/validate', { params: { token } })
      .then(({ data }) => {
        if (data.data.valid) {
          setTokenValid(true);
          setEmail(data.data.email || '');
        } else {
          toast.error(data.data.expired ? 'Tautan reset sudah kedaluwarsa' : 'Tautan reset tidak valid');
          navigate('/lupa-kata-sandi', { replace: true });
        }
      })
      .catch(() => navigate('/lupa-kata-sandi', { replace: true }))
      .finally(() => setValidating(false));
  }, [token, navigate, toast]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Konfirmasi kata sandi tidak cocok');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        password: form.password,
        confirmPassword: form.confirm,
      });
      toast.success('Kata sandi berhasil diperbarui');
      navigate('/login');
    } catch (err) {
      toast.error(apiError(err, 'Gagal memperbarui kata sandi'));
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-slate-950">
        <Spinner size={32} />
      </div>
    );
  }

  if (!tokenValid) return null;

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-950 lg:flex-row">
      <ThemeToggleButton />
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
          <ResetPasswordIllustration />
        </div>

        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Studi Kasus</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              Atur kata sandi baru akun bendahara Anda. Perubahan akan tersimpan langsung ke database sekolah.
            </p>
          </div>
        </div>
      </div>

      {/* Panel kanan — form kata sandi baru */}
      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-10 dark:bg-slate-950 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/20 sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-pospay dark:text-blue-400 sm:text-[28px]">Lupa Kata Sandi</h1>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Atur kata sandi baru untuk akun bendahara Anda</p>
            </div>

            {email && (
              <div className="mb-6 flex items-center gap-3 rounded-lg border border-pospay-100 bg-pospay-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pospay/10 text-pospay">
                  <Icon.Mail width={18} height={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500">Email terverifikasi</p>
                  <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">{email}</p>
                </div>
                <Icon.Check width={18} height={18} className="shrink-0 text-emerald-500" />
              </div>
            )}

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="password"
                    className={inputClass}
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Masukkan kata sandi baru"
                    autoFocus
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showPassword ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Minimal 6 karakter</p>
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="confirm"
                    className={`${inputClass} ${form.confirm && !passwordsMatch ? 'border-red-300 focus:border-red-400 focus:ring-red-200' : ''} ${passwordsMatch ? 'border-emerald-300 focus:border-emerald-400 focus:ring-emerald-200' : ''}`}
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm}
                    onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                    placeholder="Ulangi kata sandi baru"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirm ? 'Sembunyikan password' : 'Tampilkan password'}
                  >
                    {showConfirm ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                  </button>
                </div>
                {form.confirm && (
                  <p className={`mt-1.5 text-xs ${passwordsMatch ? 'text-emerald-600' : 'text-red-500'}`}>
                    {passwordsMatch ? 'Kata sandi cocok' : 'Kata sandi tidak cocok'}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading || !passwordsMatch}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Simpan Kata Sandi Baru'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400">atau</span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <p className="text-center text-sm text-slate-500 dark:text-slate-400">
              Sudah ingat kata sandi?{' '}
              <Link to="/login" className="font-semibold text-pospay hover:underline">
                masuk
              </Link>
            </p>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Tautan reset diverifikasi melalui Gmail sekolah</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
