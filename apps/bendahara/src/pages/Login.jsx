import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ── Left panel illustration: laptop with line chart + chat bubble ── */
function LoginIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-xs mx-auto drop-shadow-xl">
      {/* Chat bubble (top-left) */}
      <rect x="12" y="30" width="64" height="38" rx="10" fill="white" opacity="0.9" />
      <polygon points="22,68 36,68 28,80" fill="white" opacity="0.9" />
      <circle cx="30" cy="49" r="3.5" fill="#93c5fd" />
      <circle cx="44" cy="49" r="3.5" fill="#93c5fd" />
      <circle cx="58" cy="49" r="3.5" fill="#93c5fd" />

      {/* Laptop body (base) */}
      <rect x="60" y="40" width="200" height="130" rx="8" fill="white" opacity="0.95" />
      <rect x="60" y="40" width="200" height="18" rx="8" fill="#e2e8f0" opacity="0.7" />
      {/* Laptop base/keyboard */}
      <rect x="40" y="170" width="240" height="12" rx="4" fill="white" opacity="0.5" />
      <rect x="100" y="178" width="120" height="4" rx="2" fill="#94a3b8" opacity="0.3" />

      {/* Screen chrome dots */}
      <circle cx="74" cy="49" r="3" fill="#f87171" opacity="0.7" />
      <circle cx="84" cy="49" r="3" fill="#fbbf24" opacity="0.7" />
      <circle cx="94" cy="49" r="3" fill="#4ade80" opacity="0.7" />

      {/* Line chart on screen */}
      <polyline
        points="72,148 90,130 108,138 126,110 144,118 162,95 180,102 198,82 216,88 234,68 252,75"
        stroke="#3b82f6" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      {/* Area fill under line chart */}
      <polygon
        points="72,148 90,130 108,138 126,110 144,118 162,95 180,102 198,82 216,88 234,68 252,75 252,155 72,155"
        fill="#3b82f6" opacity="0.08" />
      {/* Dots on line */}
      <circle cx="126" cy="110" r="3" fill="#2563eb" />
      <circle cx="162" cy="95" r="3" fill="#2563eb" />
      <circle cx="198" cy="82" r="3" fill="#2563eb" />
      <circle cx="234" cy="68" r="3.5" fill="#1d4ed8" />
      {/* X axis */}
      <line x1="68" y1="155" x2="256" y2="155" stroke="#e2e8f0" strokeWidth="1" />
      {/* Y axis labels placeholder */}
      <rect x="68" y="68" width="16" height="4" rx="2" fill="#cbd5e1" opacity="0.5" />
      <rect x="68" y="90" width="16" height="4" rx="2" fill="#cbd5e1" opacity="0.4" />
      <rect x="68" y="112" width="16" height="4" rx="2" fill="#cbd5e1" opacity="0.3" />
      <rect x="68" y="134" width="16" height="4" rx="2" fill="#cbd5e1" opacity="0.2" />

      {/* Currency card (right, floating) */}
      <rect x="256" y="52" width="52" height="64" rx="10" fill="white" opacity="0.9" />
      <circle cx="282" cy="74" r="14" fill="#dbeafe" opacity="0.8" />
      <text x="282" y="79" textAnchor="middle" fontSize="11" fill="#1d4ed8" fontWeight="bold">Rp</text>
      <rect x="264" y="96" width="36" height="4" rx="2" fill="#93c5fd" opacity="0.6" />
      <rect x="268" y="104" width="28" height="4" rx="2" fill="#bfdbfe" opacity="0.5" />

      {/* Plant right */}
      <ellipse cx="302" cy="162" rx="14" ry="18" fill="#4ade80" opacity="0.3" />
      <ellipse cx="290" cy="152" rx="10" ry="14" fill="#22c55e" opacity="0.25" />
      <rect x="298" y="168" width="7" height="16" rx="2" fill="#86efac" opacity="0.35" />
    </svg>
  );
}

/* ── Shared left panel ── */
function LeftPanel() {
  return (
    <div className="hidden lg:flex lg:w-[45%] xl:w-2/5 shrink-0 flex-col bg-gradient-to-br from-[#1a56db] to-[#1e3a8a] text-white">
      <div className="flex flex-1 flex-col px-10 xl:px-12 py-8">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-md">
            <Icon.School width={24} height={24} className="text-brand-700" />
          </div>
          <span className="text-2xl font-extrabold tracking-tight">POSPAY</span>
        </div>

        {/* Title + rule + chatbot button */}
        <div className="mt-6">
          <h1 className="text-2xl xl:text-3xl font-extrabold leading-snug">
            Sistem Informasi Keuangan Sekolah Berbasis Website
          </h1>
          <div className="mt-4 h-px w-12 bg-white/40" />
          <button className="mt-5 flex items-center gap-2 rounded-lg border border-white/40 px-4 py-2 text-sm font-medium text-white hover:bg-white/10 transition">
            <Icon.Chat width={16} height={16} />
            Dengan Fitur Bantuan Chatbot
          </button>
        </div>

        {/* Illustration */}
        <div className="mt-6 flex-1 flex items-center">
          <LoginIllustration />
        </div>
      </div>

      {/* SMP info footer */}
      <div className="border-t border-white/20 px-10 xl:px-12 py-6">
        <p className="text-xs font-medium text-blue-200 uppercase tracking-widest mb-2">Studi Kasus</p>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
            <Icon.Shield width={18} height={18} />
          </div>
          <div>
            <p className="font-bold text-base leading-tight">SMP Pusponegoro Brebes</p>
            <div className="mt-0.5 h-px w-24 bg-white/30" />
          </div>
        </div>
        <p className="mt-3 text-xs text-blue-200 leading-relaxed">
          POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
        </p>
      </div>
    </div>
  );
}

/* ── Input with left icon ── */
function IconInput({ icon: IconC, className = '', ...props }) {
  return (
    <div className={`flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 ${className}`}>
      <div className="flex w-10 shrink-0 items-center justify-center">
        <IconC width={15} height={15} className="text-slate-400" />
      </div>
      <input
        className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    api.get('/auth/registration-status').then(({ data }) => setRegistrationOpen(data.data.open)).catch(() => {});
  }, []);

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
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white px-6 py-10 dark:bg-slate-950 sm:px-10">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-6 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18} />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Lock icon */}
          <div className="mb-5 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Icon.Lock width={28} height={28} className="text-slate-400 dark:text-slate-500" />
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Login Bendahara</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Masuk untuk mengakses sistem POSPAY
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* Email Sekolah */}
            <div>
              <label className="label">Email Sekolah</label>
              <IconInput
                icon={Icon.Mail}
                type="text"
                placeholder="contoh@smppusponegoro.sch.id"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="flex items-center overflow-hidden rounded-lg border border-slate-300 bg-white transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600 dark:bg-slate-800">
                <div className="flex w-10 shrink-0 items-center justify-center">
                  <Icon.Lock width={15} height={15} className="text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <Icon.EyeOff width={15} height={15} /> : <Icon.Eye width={15} height={15} />}
                </button>
              </div>
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                Ingat saya
              </label>
              <button type="button" className="text-sm font-medium text-brand-600 hover:underline">
                Lupa password?
              </button>
            </div>

            <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
              {loading ? <Spinner size={18} className="text-white" /> : 'Masuk'}
            </button>
          </form>

          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span className="text-xs text-slate-400">atau</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Back to Beranda / Register link */}
          {registrationOpen ? (
            <Link
              to="/register"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              <Icon.Shield width={16} height={16} className="text-brand-600" />
              Daftar Akun Baru
            </Link>
          ) : (
            <button
              type="button"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
              onClick={() => navigate('/')}
            >
              <Icon.Shield width={16} height={16} className="text-brand-600" />
              Kembali ke Beranda
            </button>
          )}

          {/* Footer note */}
          <div className="mt-6 space-y-1 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Icon.Shield width={12} height={12} />
              Hanya bendahara yang terdaftar dapat mengakses sistem ini
            </p>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
