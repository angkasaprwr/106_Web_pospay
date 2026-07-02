import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import LoginIllustration from '../components/login/LoginIllustration';
import SchoolEmblem from '../components/login/SchoolEmblem';
import PospayLogo from '../components/login/PospayLogo';

const REMEMBER_KEY = 'pospay_siswa_remember';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((f) => ({ ...f, username: saved }));
      setRemember(true);
    }
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      if (remember) localStorage.setItem(REMEMBER_KEY, form.username);
      else localStorage.removeItem(REMEMBER_KEY);
      toast.success('Login berhasil');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    toast.info('Hubungi bendahara sekolah untuk reset password akun siswa.');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 lg:flex-row">
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

        <div className="relative my-8 flex flex-1 items-center justify-center py-4 lg:my-0">
          <LoginIllustration />
        </div>

        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/75">Studi Kasus</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/80">
              POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
            </p>
          </div>
        </div>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex w-full flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-8 lg:w-1/2 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(0,71,171,0.08)] sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-pospay sm:text-[28px]">Masuk</h1>
              <p className="mt-1 text-sm text-slate-500">Masuk untuk mengakses sistem POSPAY</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.User width={18} height={18} />
                  </span>
                  <input
                    id="username"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Nanti akan menggunakan NIS siswa"
                    autoFocus
                    required
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400">Login menggunakan NIS yang terdaftar</p>
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-semibold text-slate-800">
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-pospay focus:ring-2 focus:ring-pospay/20"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Default (yang sudah dibuat oleh Bendahara)"
                    required
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
                <p className="mt-1.5 text-xs text-slate-400">Gunakan password default yang diberikan oleh Bendahara</p>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-pospay focus:ring-pospay/30"
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-medium text-pospay hover:underline"
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg bg-pospay text-sm font-semibold text-white transition hover:bg-pospay-700 disabled:opacity-60"
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
              </button>
            </form>
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <Icon.Shield width={14} height={14} className="text-pospay/70" />
              <span>Halaman ini hanya untuk akses siswa.</span>
            </div>
            <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
