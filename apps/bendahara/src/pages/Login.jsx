import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ────────────────────────────────────────────────
   LOGIN ILLUSTRATION  (laptop + chat + Rp + plant)
───────────────────────────────────────────────── */
function LoginIllustration() {
  return (
    <svg viewBox="0 0 400 270" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm mx-auto">

      {/* ── Chat bubble – upper left ── */}
      <rect x="6" y="28" width="90" height="52" rx="14" fill="white" opacity="0.93" />
      <path d="M28 80 Q34 92 42 80" fill="white" opacity="0.93" />
      <circle cx="27" cy="54" r="6" fill="#93c5fd" opacity="0.85" />
      <circle cx="51" cy="54" r="6" fill="#93c5fd" opacity="0.85" />
      <circle cx="75" cy="54" r="6" fill="#93c5fd" opacity="0.85" />

      {/* ── Books stack – bottom left ── */}
      <rect x="18" y="224" width="100" height="13" rx="4" fill="#93c5fd" opacity="0.55" />
      <rect x="10" y="211" width="116" height="13" rx="4" fill="#bfdbfe" opacity="0.45" />

      {/* ── Laptop keyboard base ── */}
      <rect x="36" y="192" width="256" height="18" rx="7" fill="white" opacity="0.65" />
      <rect x="96" y="202" width="136" height="5" rx="2.5" fill="#94a3b8" opacity="0.25" />

      {/* ── Laptop screen frame ── */}
      <rect x="48" y="64" width="232" height="134" rx="12" fill="white" opacity="0.97" />

      {/* Screen background */}
      <rect x="58" y="73" width="212" height="116" rx="7" fill="#f0f7ff" />

      {/* Grid lines */}
      <line x1="68" y1="174" x2="260" y2="174" stroke="#dde8f5" strokeWidth="1" />
      <line x1="68" y1="156" x2="260" y2="156" stroke="#dde8f5" strokeWidth="0.7" />
      <line x1="68" y1="138" x2="260" y2="138" stroke="#dde8f5" strokeWidth="0.7" />
      <line x1="68" y1="120" x2="260" y2="120" stroke="#dde8f5" strokeWidth="0.7" />
      <line x1="68" y1="102" x2="260" y2="102" stroke="#dde8f5" strokeWidth="0.7" />

      {/* Y-axis labels */}
      <rect x="59" y="99" width="5" height="3" rx="1.5" fill="#c7d9f0" opacity="0.7" />
      <rect x="59" y="117" width="5" height="3" rx="1.5" fill="#c7d9f0" opacity="0.6" />
      <rect x="59" y="135" width="5" height="3" rx="1.5" fill="#c7d9f0" opacity="0.5" />
      <rect x="59" y="153" width="5" height="3" rx="1.5" fill="#c7d9f0" opacity="0.4" />

      {/* Area fill */}
      <polygon
        points="78,165 106,148 134,155 162,130 190,138 218,115 246,120 264,103 264,176 78,176"
        fill="#3b82f6" opacity="0.09" />

      {/* Line chart */}
      <polyline
        points="78,165 106,148 134,155 162,130 190,138 218,115 246,120 264,103"
        stroke="#2563eb" strokeWidth="2.8" fill="none"
        strokeLinejoin="round" strokeLinecap="round" />

      {/* Dots on line */}
      <circle cx="78"  cy="165" r="4" fill="#2563eb" />
      <circle cx="134" cy="155" r="4" fill="#2563eb" />
      <circle cx="190" cy="138" r="4" fill="#2563eb" />
      <circle cx="246" cy="120" r="4" fill="#2563eb" />
      <circle cx="264" cy="103" r="5" fill="#1d4ed8" />

      {/* ── Rp card – right side, overlapping laptop ── */}
      <rect x="268" y="60" width="88" height="120" rx="14" fill="white" opacity="0.94" />
      {/* Card top bar */}
      <rect x="268" y="60" width="88" height="20" rx="14" fill="#dbeafe" opacity="0.6" />
      <rect x="268" y="70" width="88" height="10" fill="#dbeafe" opacity="0.6" />
      {/* Rp circle */}
      <circle cx="312" cy="104" r="22" fill="#eff6ff" />
      <circle cx="312" cy="104" r="16" fill="#3b82f6" opacity="0.9" />
      <text x="312" y="109" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">Rp</text>
      {/* Card lines */}
      <rect x="280" y="136" width="64" height="5" rx="2.5" fill="#93c5fd" opacity="0.55" />
      <rect x="284" y="148" width="56" height="5" rx="2.5" fill="#bfdbfe" opacity="0.45" />
      <rect x="288" y="160" width="48" height="5" rx="2.5" fill="#dbeafe" opacity="0.35" />

      {/* ── Plant – far right ── */}
      <ellipse cx="376" cy="172" rx="16" ry="22" fill="#4ade80" opacity="0.38" />
      <ellipse cx="362" cy="158" rx="13" ry="19" fill="#22c55e" opacity="0.32" />
      <ellipse cx="386" cy="155" rx="11" ry="16" fill="#86efac" opacity="0.38" />
      <rect x="370" y="186" width="8" height="22" rx="3" fill="#86efac" opacity="0.42" />
      <rect x="358" y="198" width="32" height="9" rx="4" fill="#4ade80" opacity="0.28" />
    </svg>
  );
}

/* ────────────────────────────────────────────
   SHARED LEFT PANEL
──────────────────────────────────────────── */
function LeftPanel({ illustration }) {
  return (
    <div className="hidden lg:flex lg:w-[46%] xl:w-[42%] shrink-0 flex-col bg-gradient-to-br from-[#1a56db] to-[#1e3a8a] text-white">
      <div className="flex flex-1 flex-col items-center px-10 xl:px-12 py-10 text-center">

        {/* POSPAY logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-lg">
            {/* Custom wallet+cap icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="4" y="14" width="24" height="14" rx="3" fill="#1d4ed8" />
              <rect x="8" y="18" width="7" height="6" rx="1.5" fill="white" opacity="0.7" />
              <rect x="4" y="17" width="24" height="3" fill="#1e40af" opacity="0.6" />
              <path d="M8 14 L16 7 L24 14" stroke="#1d4ed8" strokeWidth="2" fill="none" strokeLinejoin="round" />
              <circle cx="16" cy="11" r="2.5" fill="#2563eb" />
            </svg>
          </div>
          <span className="text-3xl font-extrabold tracking-tight">POSPAY</span>
        </div>

        {/* Title */}
        <p className="mt-4 text-base font-semibold leading-snug text-white/90 xl:text-lg">
          Sistem Informasi Keuangan Sekolah<br />Berbasis Website
        </p>

        {/* Divider */}
        <div className="mt-4 h-px w-10 bg-white/40" />

        {/* Chatbot button */}
        <button className="mt-5 flex items-center gap-2.5 rounded-xl bg-[#1535a8]/70 px-5 py-2.5 text-sm font-semibold text-white shadow-inner hover:bg-[#1535a8] transition">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Dengan Fitur Bantuan Chatbot
        </button>

        {/* Illustration */}
        <div className="mt-6 w-full flex items-center justify-center">
          {illustration}
        </div>
      </div>

      {/* SMP footer */}
      <div className="border-t border-white/15 px-8 xl:px-10 py-5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">Studi Kasus</p>
        <div className="mt-2 flex items-center gap-3">
          {/* School badge SVG */}
          <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
            <circle cx="20" cy="20" r="19" fill="#f59e0b" />
            <circle cx="20" cy="20" r="15" fill="#1d4ed8" />
            <circle cx="20" cy="20" r="12" fill="#1e40af" />
            <path d="M14 22 L20 14 L26 22 Z" fill="#fbbf24" opacity="0.9" />
            <rect x="16" y="22" width="8" height="6" rx="1" fill="#fbbf24" opacity="0.8" />
            <path d="M12 18 Q20 12 28 18" stroke="#fbbf24" strokeWidth="1.5" fill="none" />
            <text x="20" y="34" textAnchor="middle" fontSize="5" fill="#fbbf24" fontWeight="bold">BREBES</text>
          </svg>
          <div>
            <p className="font-bold text-sm leading-tight">SMP Pusponegoro Brebes</p>
            <div className="mt-1 h-px w-20 bg-white/30" />
          </div>
        </div>
        <p className="mt-2 text-[11px] text-blue-200 leading-relaxed">
          POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
        </p>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────
   INPUT HELPERS
──────────────────────────────────────────── */
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

/* ────────────────────────────────────────────
   LOGIN PAGE
──────────────────────────────────────────── */
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
      <LeftPanel illustration={<LoginIllustration />} />

      {/* ── Right panel ── */}
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

          {/* Divider */}
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
            <span className="text-xs text-slate-400">atau</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
          </div>

          {/* Secondary action */}
          {registrationOpen ? (
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              <Icon.Shield width={16} height={16} className="text-brand-600" />
              Kembali ke Beranda
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            >
              <Icon.Shield width={16} height={16} className="text-brand-600" />
              Kembali ke Beranda
            </button>
          )}

          {/* Footer */}
          <div className="mt-6 space-y-1 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Icon.Shield width={11} height={11} />
              Hanya bendahara yang terdaftar dapat mengakses sistem ini
            </p>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
