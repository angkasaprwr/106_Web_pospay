import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ═══════════════════════════════════════════════════════
   LEFT PANEL ILLUSTRATION
   Laptop dashboard + chat bubble + Rp card + books + plant
═══════════════════════════════════════════════════════ */
function LeftIllustration() {
  return (
    <svg viewBox="0 0 460 300" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[420px] mx-auto">

      {/* ── Chat bubble ── */}
      <rect x="6"  y="32" width="96" height="54" rx="16" fill="white" opacity="0.93"/>
      <path d="M28 86 C32 98 44 98 48 86" fill="white" opacity="0.93"/>
      <circle cx="30" cy="59" r="6"  fill="#93c5fd"/>
      <circle cx="54" cy="59" r="6"  fill="#93c5fd"/>
      <circle cx="78" cy="59" r="6"  fill="#93c5fd"/>

      {/* ── Books stack ── */}
      <rect x="16" y="236" width="88" height="13" rx="4" fill="#93c5fd" opacity="0.55"/>
      <rect x="8"  y="223" width="104" height="13" rx="4" fill="#bfdbfe" opacity="0.45"/>

      {/* ── Laptop keyboard ── */}
      <rect x="50" y="194" width="284" height="20" rx="8" fill="white" opacity="0.55"/>
      <rect x="110" y="205" width="164" height="5" rx="2.5" fill="#94a3b8" opacity="0.18"/>

      {/* ── Laptop screen frame ── */}
      <rect x="62"  y="56"  width="260" height="144" rx="12" fill="white"   opacity="0.97"/>
      {/* screen glass */}
      <rect x="72"  y="65"  width="240" height="126" rx="7"  fill="#f0f6ff"/>

      {/* ── Dashboard on screen ── */}
      {/* Header bar */}
      <rect x="78" y="71"  width="228" height="14" rx="3" fill="#e2ecff" opacity="0.8"/>
      <rect x="82" y="74.5" width="40" height="7" rx="2" fill="#3b82f6" opacity="0.5"/>
      <rect x="128" y="74.5" width="30" height="7" rx="2" fill="#94a3b8" opacity="0.4"/>
      <rect x="164" y="74.5" width="30" height="7" rx="2" fill="#94a3b8" opacity="0.4"/>

      {/* Stat cards row */}
      <rect x="78"  y="91" width="52" height="28" rx="5" fill="#dbeafe" opacity="0.9"/>
      <rect x="136" y="91" width="52" height="28" rx="5" fill="#dcfce7" opacity="0.9"/>
      <rect x="194" y="91" width="52" height="28" rx="5" fill="#fef3c7" opacity="0.9"/>
      <rect x="252" y="91" width="48" height="28" rx="5" fill="#fce7f3" opacity="0.9"/>

      {/* Left: Area chart */}
      {/* chart bg */}
      <rect x="78" y="125" width="148" height="60" rx="4" fill="white" opacity="0.6"/>
      {/* grid */}
      <line x1="84"  y1="175" x2="220" y2="175" stroke="#e2ecff" strokeWidth="0.8"/>
      <line x1="84"  y1="163" x2="220" y2="163" stroke="#e2ecff" strokeWidth="0.8"/>
      <line x1="84"  y1="151" x2="220" y2="151" stroke="#e2ecff" strokeWidth="0.8"/>
      {/* area fill */}
      <polygon points="88,172 100,165 112,168 124,158 136,163 148,152 160,155 172,144 184,148 196,136 208,140 220,129 220,176 88,176"
        fill="#3b82f6" opacity="0.10"/>
      {/* line */}
      <polyline points="88,172 100,165 112,168 124,158 136,163 148,152 160,155 172,144 184,148 196,136 208,140 220,129"
        stroke="#3b82f6" strokeWidth="2.2" fill="none" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="172" cy="144" r="3" fill="#2563eb"/>
      <circle cx="220" cy="129" r="3.5" fill="#2563eb"/>

      {/* Right: Donut chart */}
      <rect x="232" y="125" width="82" height="60" rx="4" fill="white" opacity="0.6"/>
      <circle cx="273" cy="155" r="22" fill="none" stroke="#dbeafe"  strokeWidth="12"/>
      <circle cx="273" cy="155" r="22" fill="none" stroke="#3b82f6"  strokeWidth="12"
        strokeDasharray="60 82" strokeDashoffset="21"/>
      <circle cx="273" cy="155" r="22" fill="none" stroke="#60a5fa"  strokeWidth="12"
        strokeDasharray="28 114" strokeDashoffset="-39"/>
      <circle cx="273" cy="155" r="14" fill="#f0f6ff"/>
      <text x="273" y="159" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1e40af">76%</text>

      {/* ── Rp card ── */}
      <rect x="310" y="44" width="80" height="108" rx="14" fill="white" opacity="0.95"/>
      <rect x="310" y="44" width="80" height="24"  rx="14" fill="#eff6ff"/>
      <rect x="310" y="58" width="80" height="10"  fill="#eff6ff"/>
      {/* Rp circle */}
      <circle cx="350" cy="100" r="22" fill="#dbeafe"/>
      <circle cx="350" cy="100" r="15" fill="#2563eb"/>
      <text x="350" y="105" textAnchor="middle" fontSize="11" fontWeight="bold" fill="white">Rp</text>
      <rect x="322" y="130" width="56" height="5" rx="2.5" fill="#93c5fd" opacity="0.5"/>
      <rect x="326" y="140" width="48" height="5" rx="2.5" fill="#bfdbfe" opacity="0.45"/>

      {/* ── Potted plant ── */}
      {/* leaves */}
      <ellipse cx="400" cy="182" rx="14" ry="22" fill="#4ade80" opacity="0.40"/>
      <ellipse cx="388" cy="168" rx="11" ry="17" fill="#22c55e" opacity="0.35"/>
      <ellipse cx="412" cy="165" rx="10" ry="15" fill="#86efac" opacity="0.38"/>
      <ellipse cx="402" cy="160" rx="8"  ry="14" fill="#4ade80" opacity="0.30"/>
      {/* stem */}
      <rect x="396" y="190" width="7"  height="18" rx="3"  fill="#86efac" opacity="0.50"/>
      {/* pot */}
      <path d="M388 208 L392 224 L410 224 L414 208 Z" fill="#e2e8f0" opacity="0.75"/>
      <rect x="386" y="204" width="30" height="7" rx="3.5" fill="#cbd5e1" opacity="0.70"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════
   LEFT PANEL — exported so Register can reuse it
═══════════════════════════════════════════════════════ */
export function AuthLeftPanel({ illustration }) {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 flex-col text-white select-none relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1a56db 0%, #1a4cc5 45%, #1e3a8a 100%)' }}
    >
      {/* dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative flex flex-1 flex-col items-center justify-between px-8 xl:px-10 py-8">
        {/* Top: POSPAY logo */}
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-[60px] w-[60px] items-center justify-center rounded-[18px] bg-white shadow-lg">
              {/* Graduation cap + wallet icon */}
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <rect x="5" y="17" width="26" height="15" rx="4" fill="#1d4ed8"/>
                <rect x="9" y="21" width="9" height="7" rx="2.5" fill="white" opacity="0.75"/>
                <rect x="5" y="20" width="26" height="4" fill="#1e40af" opacity="0.5"/>
                <path d="M7 17 L18 8 L29 17" fill="#dbeafe" opacity="0.9"/>
                <circle cx="18" cy="12" r="3.5" fill="#3b82f6"/>
              </svg>
            </div>
            <span className="text-[32px] font-extrabold tracking-tight leading-none">POSPAY</span>
          </div>
        </div>

        {/* Middle: Illustration */}
        <div className="flex-1 flex items-center justify-center w-full py-4">
          {illustration}
        </div>

        {/* Bottom: SMP section */}
        <div className="w-full border-t border-white/15 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80 mb-3">
            Studi Kasus
          </p>
          <div className="flex items-center gap-3">
            {/* School badge */}
            <svg width="46" height="46" viewBox="0 0 46 46" className="shrink-0">
              <circle cx="23" cy="23" r="22" fill="#f59e0b"/>
              <circle cx="23" cy="23" r="18" fill="#1a4cc5"/>
              <circle cx="23" cy="23" r="14" fill="#1e3a8a"/>
              {/* Open book */}
              <path d="M14 19 Q18 16 23 19 Q28 16 32 19 L32 29 Q28 26 23 29 Q18 26 14 29 Z"
                fill="#fbbf24" opacity="0.9"/>
              <line x1="23" y1="19" x2="23" y2="29" stroke="#1e3a8a" strokeWidth="1"/>
              {/* Lines on pages */}
              <line x1="16" y1="22" x2="21" y2="22" stroke="#fde68a" strokeWidth="0.8" opacity="0.7"/>
              <line x1="16" y1="24.5" x2="21" y2="24.5" stroke="#fde68a" strokeWidth="0.8" opacity="0.7"/>
              <line x1="25" y1="22" x2="30" y2="22" stroke="#fde68a" strokeWidth="0.8" opacity="0.7"/>
              <line x1="25" y1="24.5" x2="30" y2="24.5" stroke="#fde68a" strokeWidth="0.8" opacity="0.7"/>
              <text x="23" y="39" textAnchor="middle" fontSize="4.8" fontWeight="bold" fill="#fde68a">BREBES</text>
            </svg>
            <div>
              <p className="font-bold text-[15px] leading-tight">SMP Pusponegoro Brebes</p>
              <div className="mt-1 h-px w-24 bg-white/30"/>
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-blue-200/80">
            POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   FIELD INPUT
═══════════════════════════════════════════════════════ */
function FieldInput({ icon: IconC, right, ...props }) {
  return (
    <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden
      transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
      dark:border-slate-600 dark:bg-slate-800">
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

/* ═══════════════════════════════════════════════════════
   LOGIN PAGE
═══════════════════════════════════════════════════════ */
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
      <AuthLeftPanel illustration={<LeftIllustration />} />

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto bg-white dark:bg-slate-950 px-6 py-10 sm:px-12">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Heading — centered */}
          <div className="mb-6 text-center">
            <h1 className="text-[30px] font-extrabold text-slate-900 dark:text-white tracking-tight">Masuk</h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk mengakses sistem POSPAY
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Email Sekolah */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email Sekolah
              </label>
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
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
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
                    {showPwd
                      ? <Icon.EyeOff width={15} height={15}/>
                      : <Icon.Eye    width={15} height={15}/>}
                  </button>
                }
              />
            </div>

            {/* Remember me + Forgot password */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"
                />
                Ingat saya
              </label>
              <button type="button"
                className="text-sm font-semibold text-brand-600 hover:underline">
                Lupa password?
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-brand-600 py-3
                text-sm font-semibold text-white shadow-sm hover:bg-brand-700
                disabled:opacity-60 transition-colors">
              {loading ? <Spinner size={18} className="text-white"/> : 'Masuk'}
            </button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
            <span className="text-xs text-slate-400">atau</span>
            <div className="flex-1 border-t border-slate-200 dark:border-slate-700"/>
          </div>

          {/* Register link */}
          {canRegister && (
            <p className="text-center text-sm text-slate-600 dark:text-slate-400">
              Belum memiliki akun?{' '}
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-semibold text-brand-600 hover:underline"
              >
                daftar
              </button>
            </p>
          )}

          {/* Footer */}
          <div className="mt-8 space-y-1 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Icon.Shield width={11} height={11}/>
              Hanya bendahara yang terdaftar dapat mengakses sistem ini
            </p>
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} POSPAY.&nbsp; All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
