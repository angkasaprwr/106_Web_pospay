import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ════════════════════════════════════════════════════════════
   ILLUSTRATION  — laptop + chat bubble + Rp card + books + plant
════════════════════════════════════════════════════════════ */
function LeftIllustration() {
  return (
    <svg viewBox="0 0 480 310" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[440px] mx-auto">

      {/* ── Chat bubble (upper-left, overlapping laptop) ── */}
      <rect x="4" y="28" width="100" height="58" rx="16" fill="white" opacity="0.94"/>
      {/* tail */}
      <path d="M26 86 Q32 100 46 86" fill="white" opacity="0.94"/>
      {/* dots */}
      <circle cx="29" cy="57" r="6.5" fill="#93c5fd"/>
      <circle cx="54" cy="57" r="6.5" fill="#93c5fd"/>
      <circle cx="79" cy="57" r="6.5" fill="#93c5fd"/>

      {/* ── Books stack (bottom-left) ── */}
      <rect x="14"  y="248" width="92" height="14" rx="5" fill="#334155" opacity="0.55"/>
      <rect x="6"   y="234" width="108" height="14" rx="5" fill="#475569" opacity="0.45"/>
      <rect x="18"  y="262" width="80" height="10" rx="4" fill="#1e293b" opacity="0.40"/>

      {/* ── Laptop base / keyboard ── */}
      <rect x="50" y="202" width="296" height="22" rx="9" fill="#334155" opacity="0.80"/>
      {/* keyboard detail */}
      <rect x="108" y="210" width="180" height="6" rx="3" fill="#1e293b" opacity="0.30"/>

      {/* ── Laptop screen bezel ── */}
      <rect x="62" y="60" width="272" height="148" rx="13" fill="#1e293b" opacity="0.85"/>

      {/* ── Screen glass ── */}
      <rect x="74" y="70" width="248" height="128" rx="8" fill="white" opacity="0.97"/>
      {/* screen tint */}
      <rect x="74" y="70" width="248" height="128" rx="8" fill="#f0f6ff" opacity="0.60"/>

      {/* ── Dashboard inside screen ── */}
      {/* top nav bar */}
      <rect x="80" y="76" width="236" height="16" rx="3" fill="#e8f0ff" opacity="0.9"/>
      <rect x="84" y="79.5" width="44" height="9" rx="2" fill="#3b82f6" opacity="0.55"/>
      <rect x="134" y="79.5" width="30" height="9" rx="2" fill="#94a3b8" opacity="0.40"/>
      <rect x="170" y="79.5" width="30" height="9" rx="2" fill="#94a3b8" opacity="0.35"/>
      <rect x="290" y="79.5" width="20" height="9" rx="2" fill="#94a3b8" opacity="0.25"/>

      {/* stat card row */}
      <rect x="80"  y="98"  width="56" height="26" rx="5" fill="#dbeafe" opacity="0.95"/>
      <rect x="142" y="98"  width="56" height="26" rx="5" fill="#dcfce7" opacity="0.95"/>
      <rect x="204" y="98"  width="56" height="26" rx="5" fill="#fef3c7" opacity="0.95"/>
      <rect x="266" y="98"  width="46" height="26" rx="5" fill="#fce7f3" opacity="0.95"/>

      {/* ─ Line chart (left half of dashboard) ─ */}
      <rect x="80" y="130" width="148" height="62" rx="5" fill="white" opacity="0.65"/>
      {/* grid */}
      <line x1="88" y1="184" x2="222" y2="184" stroke="#e2ecf8" strokeWidth="0.9"/>
      <line x1="88" y1="172" x2="222" y2="172" stroke="#e2ecf8" strokeWidth="0.9"/>
      <line x1="88" y1="160" x2="222" y2="160" stroke="#e2ecf8" strokeWidth="0.9"/>
      <line x1="88" y1="148" x2="222" y2="148" stroke="#e2ecf8" strokeWidth="0.9"/>
      {/* area fill */}
      <polygon
        points="92,180 106,172 120,175 134,164 148,168 162,156 176,160 190,148 204,152 218,140 222,140 222,186 92,186"
        fill="#3b82f6" opacity="0.10"/>
      {/* line */}
      <polyline
        points="92,180 106,172 120,175 134,164 148,168 162,156 176,160 190,148 204,152 218,140"
        stroke="#2563eb" strokeWidth="2.4" fill="none"
        strokeLinejoin="round" strokeLinecap="round"/>
      {/* dots */}
      <circle cx="134" cy="164" r="3.2" fill="white" stroke="#2563eb" strokeWidth="1.8"/>
      <circle cx="176" cy="160" r="3.2" fill="white" stroke="#2563eb" strokeWidth="1.8"/>
      <circle cx="218" cy="140" r="3.5" fill="#2563eb"/>

      {/* ─ Donut chart (right half) ─ */}
      <rect x="234" y="130" width="82" height="62" rx="5" fill="white" opacity="0.65"/>
      <circle cx="275" cy="161" r="23" fill="none" stroke="#dbeafe"  strokeWidth="13"/>
      <circle cx="275" cy="161" r="23" fill="none" stroke="#2563eb"  strokeWidth="13"
        strokeDasharray="62 84" strokeDashoffset="21"/>
      <circle cx="275" cy="161" r="23" fill="none" stroke="#60a5fa"  strokeWidth="13"
        strokeDasharray="30 116" strokeDashoffset="-41"/>
      <circle cx="275" cy="161" r="14" fill="#f0f6ff"/>
      <text x="275" y="165" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#1e40af">76%</text>

      {/* ── Rp card (upper-right, overlapping laptop) ── */}
      <rect x="322" y="44" width="88" height="118" rx="16" fill="white" opacity="0.96"/>
      {/* card header band */}
      <rect x="322" y="44" width="88" height="26" rx="16" fill="#eff6ff"/>
      <rect x="322" y="58" width="88" height="12" fill="#eff6ff"/>
      {/* Rp circle */}
      <circle cx="366" cy="106" r="24" fill="#dbeafe"/>
      <circle cx="366" cy="106" r="16" fill="#2563eb"/>
      <text x="366" y="111" textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">Rp</text>
      {/* card lines */}
      <rect x="334" y="138" width="64" height="5.5" rx="2.75" fill="#93c5fd" opacity="0.55"/>
      <rect x="338" y="150" width="56" height="5.5" rx="2.75" fill="#bfdbfe" opacity="0.48"/>
      <rect x="342" y="162" width="48" height="5.5" rx="2.75" fill="#dbeafe" opacity="0.38"/>

      {/* ── Potted plant (right) ── */}
      {/* leaves */}
      <ellipse cx="426" cy="196" rx="16" ry="24" fill="#4ade80" opacity="0.42"/>
      <ellipse cx="412" cy="180" rx="13" ry="20" fill="#22c55e" opacity="0.37"/>
      <ellipse cx="438" cy="176" rx="12" ry="18" fill="#86efac" opacity="0.40"/>
      <ellipse cx="428" cy="170" rx="9"  ry="16" fill="#4ade80" opacity="0.33"/>
      {/* stem */}
      <rect x="421" y="208" width="8" height="20" rx="3.5" fill="#86efac" opacity="0.52"/>
      {/* pot body */}
      <path d="M411 228 L415 248 L435 248 L439 228 Z" fill="#94a3b8" opacity="0.70"/>
      {/* pot rim */}
      <rect x="408" y="224" width="34" height="8" rx="4" fill="#cbd5e1" opacity="0.75"/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════════
   SHARED LEFT PANEL  (exported → Register can reuse)
════════════════════════════════════════════════════════════ */
export function AuthLeftPanel({ illustration }) {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 flex-col text-white select-none relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #1a56db 0%, #1a4cc5 42%, #1e3a8a 100%)' }}
    >
      {/* dot-grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative flex flex-1 flex-col items-center justify-between px-8 xl:px-10 py-8">

        {/* ── POSPAY logo ── */}
        <div className="flex items-center gap-3 self-start">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-white shadow-lg">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              {/* wallet body */}
              <rect x="4" y="16" width="28" height="16" rx="4" fill="#1d4ed8"/>
              {/* card slot */}
              <rect x="8" y="20" width="10" height="8" rx="2.5" fill="white" opacity="0.75"/>
              {/* wallet band */}
              <rect x="4" y="19" width="28" height="4" fill="#1e40af" opacity="0.50"/>
              {/* graduation cap roof */}
              <path d="M6 16 L18 7 L30 16" fill="#dbeafe" opacity="0.90"/>
              {/* cap circle */}
              <circle cx="18" cy="11.5" r="3.5" fill="#3b82f6"/>
            </svg>
          </div>
          <span className="text-[34px] font-extrabold tracking-tight leading-none">POSPAY</span>
        </div>

        {/* ── Illustration ── */}
        <div className="flex-1 flex items-center justify-center w-full py-3">
          {illustration}
        </div>

        {/* ── SMP section ── */}
        <div className="w-full border-t border-white/15 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80 mb-2.5">
            Studi Kasus
          </p>
          <div className="flex items-center gap-3">
            {/* school badge */}
            <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
              <circle cx="24" cy="24" r="23" fill="#f59e0b"/>
              <circle cx="24" cy="24" r="19" fill="#1a4cc5"/>
              <circle cx="24" cy="24" r="15" fill="#1e3a8a"/>
              {/* open book */}
              <path d="M14 21 Q19 18 24 21 Q29 18 34 21 L34 31 Q29 28 24 31 Q19 28 14 31 Z"
                fill="#fbbf24" opacity="0.92"/>
              <line x1="24" y1="21" x2="24" y2="31" stroke="#1e3a8a" strokeWidth="1.2"/>
              <line x1="16" y1="24" x2="22" y2="24" stroke="#fde68a" strokeWidth="0.9" opacity="0.75"/>
              <line x1="16" y1="27" x2="22" y2="27" stroke="#fde68a" strokeWidth="0.9" opacity="0.75"/>
              <line x1="26" y1="24" x2="32" y2="24" stroke="#fde68a" strokeWidth="0.9" opacity="0.75"/>
              <line x1="26" y1="27" x2="32" y2="27" stroke="#fde68a" strokeWidth="0.9" opacity="0.75"/>
              <text x="24" y="42" textAnchor="middle" fontSize="5" fontWeight="bold" fill="#fde68a">BREBES</text>
            </svg>
            <div>
              <p className="font-bold text-[15px] leading-tight">SMP Pusponegoro Brebes</p>
              <div className="mt-1 h-px w-24 bg-white/30"/>
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-relaxed text-blue-200/80">
            POSPAY membantu pengelolaan keuangan sekolah menjadi lebih
            teratur, transparan, dan mudah diakses.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   FIELD INPUT
════════════════════════════════════════════════════════════ */
function FieldInput({ icon: IconC, right, ...props }) {
  return (
    <div className="flex items-center rounded-lg border border-slate-300 bg-white overflow-hidden
      transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
      dark:border-slate-600 dark:bg-slate-800">
      <span className="flex w-10 shrink-0 items-center justify-center">
        <IconC width={16} height={16} className="text-slate-400"/>
      </span>
      <input
        className="flex-1 bg-transparent py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
        {...props}
      />
      {right}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   LOGIN PAGE
════════════════════════════════════════════════════════════ */
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
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900 lg:bg-white lg:dark:bg-slate-950">
      <AuthLeftPanel illustration={<LeftIllustration />} />

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        {/* Card wrapper */}
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white px-8 py-10
          shadow-sm dark:border-slate-700 dark:bg-slate-900
          lg:max-w-[400px] lg:rounded-none lg:border-0 lg:shadow-none lg:px-10 lg:py-12">

          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Heading — centered */}
          <div className="mb-7 text-center">
            <h1 className="text-[30px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              Masuk
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk mengakses sistem POSPAY
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Username
              </label>
              <FieldInput
                icon={Icon.User}
                type="text"
                placeholder="Masukkan username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoFocus
                required
              />
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Username dapat berupa NIK Bendahara atau NIS Siswa
              </p>
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
                    className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPwd
                      ? <Icon.EyeOff width={15} height={15}/>
                      : <Icon.Eye    width={15} height={15}/>}
                  </button>
                }
              />
            </div>

            {/* Remember + Forgot */}
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
                disabled:opacity-60 transition-colors mt-1">
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
          <p className="text-center text-sm text-slate-600 dark:text-slate-400">
            Belum memiliki akun?{' '}
            {canRegister ? (
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="font-semibold text-brand-600 hover:underline">
                daftar
              </button>
            ) : (
              <span className="font-semibold text-slate-400">daftar</span>
            )}
          </p>

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
