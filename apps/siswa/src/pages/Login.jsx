import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';
import { AuthIllustration, SchoolCrest } from '../components/AuthArt';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      toast.success('Login berhasil');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-slate-100 p-4 dark:bg-slate-950 sm:p-6">
      <div className="grid w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900 lg:max-w-5xl lg:grid-cols-2">
        {/* Left panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 to-brand-900 p-10 text-white lg:flex">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                <Icon.School width={26} height={26} />
              </div>
              <span className="text-3xl font-extrabold tracking-tight">POSPAY</span>
            </div>
            <h1 className="mt-6 text-xl font-semibold leading-snug">Sistem Informasi Keuangan Sekolah Berbasis Website</h1>
            <div className="mt-3 h-1 w-12 rounded-full bg-white/40" />
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur">
              <Icon.Chat width={16} height={16} /> Dengan Fitur Bantuan Chatbot
            </div>
          </div>

          <AuthIllustration className="my-6 w-full max-w-md self-center" />

          <div className="flex items-center gap-3">
            <SchoolCrest size={52} />
            <div>
              <p className="text-xs uppercase tracking-wide text-white/70">Studi Kasus</p>
              <p className="text-base font-bold">SMP Pusponegoro Brebes</p>
              <p className="mt-1 max-w-xs text-xs text-white/70">POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.</p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="relative flex flex-col justify-center p-8 sm:p-12">
          <button onClick={toggle} className="absolute right-5 top-5 btn-ghost rounded-lg p-2" title="Ganti tema">
            {theme === 'dark' ? <Icon.Sun width={18} height={18} /> : <Icon.Moon width={18} height={18} />}
          </button>

          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon.School width={20} height={20} /></div>
            <span className="text-xl font-bold">POSPAY</span>
          </div>

          <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
            <Icon.Lock width={24} height={24} />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Login</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masuk untuk mengakses sistem POSPAY</p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <div>
              <label className="label">NIS</label>
              <div className="relative">
                <Icon.User width={18} height={18} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                <input className="input pl-10" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="Masukkan NIS" autoFocus required />
              </div>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Icon.Lock width={18} height={18} className="pointer-events-none absolute left-3 top-2.5 text-slate-400" />
                <input className="input px-10" type={showPwd ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Masukkan password" required />
                <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  {showPwd ? <Icon.EyeOff width={18} height={18} /> : <Icon.Eye width={18} height={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="rounded border-slate-300" /> Ingat saya
              </label>
              <button type="button" onClick={() => toast.info('Silakan hubungi bendahara sekolah untuk reset password.')} className="font-medium text-brand-600 hover:underline">
                Lupa password?
              </button>
            </div>

            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /> atau <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          </div>

          <button onClick={() => navigate('/')} className="btn-secondary w-full">
            <Icon.Shield width={18} height={18} /> Kembali ke Beranda
          </button>

          <p className="mt-6 text-center text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
