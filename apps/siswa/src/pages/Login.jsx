import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useTheme } from '../context/ThemeContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.username, form.password);
      toast.success('Login berhasil');
      navigate('/');
    } catch (err) {
      toast.error(apiError(err, 'Login gagal'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-600 to-brand-800 p-4 sm:p-6">
      <button
        onClick={toggle}
        className="absolute right-4 top-4 rounded-lg bg-white/15 p-2 text-white hover:bg-white/25 transition"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Icon.Sun width={18} height={18} /> : <Icon.Moon width={18} height={18} />}
      </button>

      <div className="mb-6 flex flex-col items-center text-white">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15">
          <Icon.School width={32} height={32} />
        </div>
        <h1 className="text-2xl font-extrabold">POSPAY</h1>
        <p className="text-sm text-brand-100">Portal Keuangan Siswa</p>
      </div>

      <div className="w-full max-w-sm card p-6 sm:p-8">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Masuk</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Gunakan NIS sebagai username Anda.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="label">NIS</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="Masukkan NIS"
              autoFocus
              required
            />
          </div>
          <div>
            <label className="label">Kata Sandi</label>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                tabIndex={-1}
              >
                {showPassword ? <Icon.EyeOff width={16} height={16} /> : <Icon.Eye width={16} height={16} />}
              </button>
            </div>
          </div>
          <button className="btn-primary w-full py-2.5" disabled={loading}>
            {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-slate-400">Password default diberikan oleh bendahara sekolah.</p>
      </div>
      <p className="mt-6 text-xs text-brand-100">© {new Date().getFullYear()} SMP Pusponegoro Brebes</p>
    </div>
  );
}
