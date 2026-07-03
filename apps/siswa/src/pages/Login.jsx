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
const NAVY = '#1a48a0';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setForm((f) => ({ ...f, username: saved }));
      setRemember(true);
    }
    return () => {
      const stored = localStorage.getItem('pospay_theme_siswa');
      if (stored === 'dark') document.documentElement.classList.add('dark');
    };
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
    <div className="flex min-h-screen w-full flex-col bg-white md:flex-row">
      {/* Panel kiri — branding biru */}
      <div
        className="relative flex min-h-[320px] w-full flex-col justify-between px-6 py-8 text-white sm:min-h-[380px] sm:px-10 md:min-h-screen md:w-1/2 md:px-12 md:py-12"
        style={{ backgroundColor: NAVY }}
      >
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

        <div className="relative my-6 flex flex-1 items-center justify-center py-2 md:my-0">
          <LoginIllustration />
        </div>

        <div className="relative flex items-start gap-4">
          <SchoolEmblem size={52} />
          <div>
            <p className="text-sm font-medium text-white/80">Studi Kasus</p>
            <p className="text-lg font-bold leading-snug sm:text-xl">SMP Pusponegoro Brebes</p>
            <div className="my-3 h-px w-full max-w-xs bg-white/35" />
            <p className="max-w-md text-sm leading-relaxed text-white/85">
              POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
            </p>
          </div>
        </div>
      </div>

      {/* Panel kanan — form login */}
      <div className="flex w-full flex-1 items-center justify-center bg-white px-4 py-10 sm:px-8 md:min-h-screen md:w-1/2 md:px-12">
        <div className="w-full max-w-[420px]">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_8px_40px_rgba(26,72,160,0.12)] sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold sm:text-[28px]" style={{ color: NAVY }}>
                Masuk
              </h1>
              <p className="mt-1 text-sm text-slate-500">Masuk untuk mengakses sistem POSPAY</p>
            </div>

            <form onSubmit={submit} className="space-y-5">
              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-bold" style={{ color: NAVY }}>
                  Username
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.User width={18} height={18} />
                  </span>
                  <input
                    id="username"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1a48a0] focus:ring-2 focus:ring-[#1a48a0]/20"
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
                <label htmlFor="password" className="mb-1.5 block text-sm font-bold" style={{ color: NAVY }}>
                  Password
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Icon.Lock width={18} height={18} />
                  </span>
                  <input
                    id="password"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#1a48a0] focus:ring-2 focus:ring-[#1a48a0]/20"
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
                    className="h-4 w-4 rounded border-slate-300 text-[#1a48a0] focus:ring-[#1a48a0]/30"
                  />
                  Ingat saya
                </label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="font-semibold hover:underline"
                  style={{ color: NAVY }}
                >
                  Lupa password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex h-11 w-full items-center justify-center rounded-lg text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60"
                style={{ backgroundColor: NAVY }}
              >
                {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 border-t border-slate-200 pt-5 text-center">
              <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                <Icon.Shield width={14} height={14} style={{ color: NAVY }} />
                <span>Halaman ini hanya untuk akses siswa.</span>
              </div>
              <p className="mt-3 text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
