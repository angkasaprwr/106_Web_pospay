import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ─────────────────────────────────────────────────────────────
   LEFT PANEL — Shared between Login & Register
───────────────────────────────────────────────────────────── */
export function AuthLeftPanel({ illustration }) {
  return (
    <div className="hidden lg:flex lg:w-[44%] xl:w-[40%] shrink-0 flex-col bg-gradient-to-b from-[#1a56db] via-[#1a4cc5] to-[#1e3a8a] text-white select-none">

      {/* ── Top branding ── */}
      <div className="flex flex-col items-center pt-10 px-10 xl:px-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md">
            {/* Wallet + cap icon */}
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <rect x="5" y="16" width="24" height="14" rx="3.5" fill="#1d4ed8"/>
              <rect x="9" y="20" width="8" height="6" rx="2" fill="white" opacity="0.75"/>
              <rect x="5" y="19" width="24" height="3.5" fill="#1e40af" opacity="0.55"/>
              <path d="M8 16 L17 8 L26 16" fill="#dbeafe" opacity="0.85"/>
              <circle cx="17" cy="11.5" r="3" fill="#3b82f6"/>
            </svg>
          </div>
          <span className="text-3xl font-extrabold tracking-tight">POSPAY</span>
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-center text-[15px] font-semibold leading-snug text-white/90">
          Sistem Informasi Keuangan Sekolah<br/>Berbasis Website
        </p>

        {/* Divider */}
        <div className="mt-3 h-[2px] w-10 rounded-full bg-white/35"/>

        {/* Chatbot button */}
        <button className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-5 py-2.5 text-sm font-semibold hover:bg-white/15 transition-colors shadow-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" opacity="0.9">
            <path d="M20 2H4a2 2 0 00-2 2v18l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"/>
          </svg>
          Dengan Fitur Bantuan Chatbot
        </button>
      </div>

      {/* ── Illustration ── */}
      <div className="flex flex-1 items-center justify-center px-6 py-2">
        {illustration}
      </div>

      {/* ── SMP section ── */}
      <div className="border-t border-white/15 px-8 xl:px-10 py-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-blue-200/80 mb-2">
          Studi Kasus
        </p>
        <div className="flex items-center gap-3">
          {/* School badge */}
          <svg width="42" height="42" viewBox="0 0 42 42" className="shrink-0">
            <circle cx="21" cy="21" r="20" fill="#f59e0b"/>
            <circle cx="21" cy="21" r="16" fill="#1d4ed8"/>
            <circle cx="21" cy="21" r="12.5" fill="#1e3a8a"/>
            {/* Open book icon inside */}
            <path d="M13 16 Q17 14 21 16 Q25 14 29 16 L29 26 Q25 24 21 26 Q17 24 13 26 Z" fill="#fbbf24" opacity="0.85"/>
            <line x1="21" y1="16" x2="21" y2="26" stroke="#1e3a8a" strokeWidth="0.8"/>
            <text x="21" y="36" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#fde68a">BREBES</text>
          </svg>
          <div>
            <p className="font-bold text-[14px] leading-tight">SMP Pusponegoro Brebes</p>
            <div className="mt-1 h-px w-20 bg-white/30"/>
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-blue-200/80">
          POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOGIN ILLUSTRATION
───────────────────────────────────────────────────────────── */
function LoginIllustration() {
  return (
    <svg viewBox="0 0 360 250" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[340px]">

      {/* ─── Chat bubble ─── */}
      <rect x="4" y="20" width="88" height="54" rx="14" fill="white" opacity="0.92"/>
      {/* bubble tail */}
      <path d="M24 74 Q30 86 40 74" fill="white" opacity="0.92"/>
      {/* three dots */}
      <circle cx="26" cy="47" r="5.5" fill="#93c5fd"/>
      <circle cx="48" cy="47" r="5.5" fill="#93c5fd"/>
      <circle cx="70" cy="47" r="5.5" fill="#93c5fd"/>

      {/* ─── Laptop keyboard base ─── */}
      <rect x="30" y="186" width="254" height="18" rx="7" fill="white" opacity="0.6"/>
      <rect x="88" y="197" width="138" height="5" rx="2.5" fill="#94a3b8" opacity="0.22"/>

      {/* ─── Laptop screen ─── */}
      <rect x="42" y="56" width="230" height="136" rx="12" fill="white" opacity="0.96"/>
      {/* screen content bg */}
      <rect x="52" y="65" width="210" height="118" rx="7" fill="#f0f6ff"/>

      {/* ─── Chart grid ─── */}
      <line x1="62" y1="170" x2="252" y2="170" stroke="#dde8f7" strokeWidth="1"/>
      <line x1="62" y1="153" x2="252" y2="153" stroke="#dde8f7" strokeWidth="0.8"/>
      <line x1="62" y1="136" x2="252" y2="136" stroke="#dde8f7" strokeWidth="0.8"/>
      <line x1="62" y1="119" x2="252" y2="119" stroke="#dde8f7" strokeWidth="0.8"/>
      <line x1="62" y1="102" x2="252" y2="102" stroke="#dde8f7" strokeWidth="0.8"/>

      {/* ─── Area fill ─── */}
      <polygon
        points="72,162 98,148 124,154 150,132 176,140 202,116 228,122 252,105 252,172 72,172"
        fill="#3b82f6" opacity="0.10"/>

      {/* ─── Line chart ─── */}
      <polyline
        points="72,162 98,148 124,154 150,132 176,140 202,116 228,122 252,105"
        stroke="#2563eb" strokeWidth="3" fill="none"
        strokeLinejoin="round" strokeLinecap="round"/>

      {/* chart dots */}
      <circle cx="72"  cy="162" r="4" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="124" cy="154" r="4" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="176" cy="140" r="4" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="228" cy="122" r="4" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="252" cy="105" r="5" fill="#2563eb"/>

      {/* x-axis labels placeholder */}
      <rect x="68"  y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>
      <rect x="96"  y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>
      <rect x="124" y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>
      <rect x="152" y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>
      <rect x="180" y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>
      <rect x="208" y="175" width="18" height="3.5" rx="1.75" fill="#c7d9f0" opacity="0.6"/>

      {/* ─── Rp card ─── */}
      <rect x="270" y="58" width="82" height="120" rx="14" fill="white" opacity="0.95"/>
      {/* card top accent */}
      <rect x="270" y="58" width="82" height="22" rx="14" fill="#eff6ff"/>
      <rect x="270" y="70" width="82" height="10" fill="#eff6ff"/>
      {/* Rp circle */}
      <circle cx="311" cy="106" r="22" fill="#dbeafe"/>
      <circle cx="311" cy="106" r="15" fill="#2563eb"/>
      <text x="311" y="111" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">Rp</text>
      {/* card lines */}
      <rect x="283" y="138" width="56" height="5" rx="2.5" fill="#93c5fd" opacity="0.5"/>
      <rect x="287" y="150" width="48" height="5" rx="2.5" fill="#bfdbfe" opacity="0.45"/>
      <rect x="291" y="162" width="40" height="5" rx="2.5" fill="#dbeafe" opacity="0.35"/>

      {/* ─── Plant ─── */}
      <ellipse cx="350" cy="172" rx="12" ry="18" fill="#4ade80" opacity="0.38"/>
      <ellipse cx="340" cy="158" rx="10" ry="15" fill="#22c55e" opacity="0.32"/>
      <ellipse cx="358" cy="155" rx="9"  ry="13" fill="#86efac" opacity="0.38"/>
      <rect x="345" y="182" width="7" height="20" rx="3" fill="#86efac" opacity="0.40"/>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────
   INPUT COMPONENT
───────────────────────────────────────────────────────────── */
function FieldInput({ icon: IconC, right, ...props }) {
  return (
    <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden transition-shadow focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500 dark:border-slate-600 dark:bg-slate-800">
      <span className="flex w-10 shrink-0 items-center justify-center">
        <IconC width={15} height={15} className="text-slate-400"/>
      </span>
      <input
        className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
      {right}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOGIN PAGE
───────────────────────────────────────────────────────────── */
export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [canRegister, setCanRegister] = useState(false);

  useEffect(() => {
    api.get('/auth/registration-status')
      .then(({ data }) => setCanRegister(data.data.open))
      .catch(() => {});
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
      <AuthLeftPanel illustration={<LoginIllustration />} />

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white dark:bg-slate-950 px-6 py-10 sm:px-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Lock icon */}
          <div className="mb-5 flex justify-center">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Icon.Lock width={26} height={26} className="text-slate-400"/>
            </div>
          </div>

          {/* Heading */}
          <h1 className="text-[26px] font-bold text-slate-900 dark:text-white">Login Bendahara</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Masuk untuk mengakses sistem POSPAY</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {/* Email Sekolah */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Email Sekolah</label>
              <FieldInput
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
              <FieldInput
                icon={Icon.Lock}
                type={showPwd ? 'text' : 'password'}
                placeholder="Masukkan password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                right={
                  <button type="button" tabIndex={-1}
                    onClick={() => setShowPwd(v => !v)}
                    className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600">
                    {showPwd ? <Icon.EyeOff width={15} height={15}/> : <Icon.Eye width={15} height={15}/>}
                  </button>
                }
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"/>
                Ingat saya
              </label>
              <button type="button" className="text-sm font-medium text-brand-600 hover:underline">
                Lupa password?
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors flex items-center justify-center">
              {loading ? <Spinner size={18} className="text-white"/> : 'Masuk'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
            <span className="text-xs text-slate-400">atau</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
          </div>

          {/* Back to home / register */}
          <button
            type="button"
            onClick={() => canRegister ? navigate('/register') : navigate('/')}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
            <Icon.Shield width={15} height={15} className="text-brand-600"/>
            Kembali ke Beranda
          </button>

          {/* Footer */}
          <div className="mt-7 space-y-1 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Icon.Shield width={11} height={11}/>
              Hanya bendahara yang terdaftar dapat mengakses sistem ini
            </p>
            <p className="text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
