import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ════════════════════════════════════════════════════════
   ILLUSTRATION  (identical to bendahara)
════════════════════════════════════════════════════════ */
function LeftIllustration() {
  return (
    <svg viewBox="0 0 500 320" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[460px] mx-auto">
      {/* Chat bubble */}
      <rect x="4" y="28" width="108" height="62" rx="18" fill="white" opacity="0.94"/>
      <path d="M30 90 Q38 108 56 90" fill="white" opacity="0.94"/>
      <circle cx="32" cy="59" r="8" fill="#93c5fd"/>
      <circle cx="58" cy="59" r="8" fill="#93c5fd"/>
      <circle cx="84" cy="59" r="8" fill="#93c5fd"/>
      {/* Books */}
      <rect x="10" y="258" width="96"  height="16" rx="6" fill="#1e3a8a" opacity="0.65"/>
      <rect x="4"  y="242" width="110" height="16" rx="6" fill="#1e40af" opacity="0.50"/>
      <rect x="16" y="274" width="82"  height="12" rx="5" fill="#1e3a8a" opacity="0.55"/>
      {/* Keyboard */}
      <rect x="50" y="214" width="318" height="24" rx="10" fill="#334155" opacity="0.80"/>
      <rect x="114" y="224" width="190" height="7" rx="3.5" fill="#1e293b" opacity="0.28"/>
      {/* Screen bezel */}
      <rect x="62" y="60" width="294" height="160" rx="14" fill="#1e293b" opacity="0.85"/>
      {/* Screen glass */}
      <rect x="76" y="72" width="266" height="138" rx="9" fill="white"   opacity="0.97"/>
      <rect x="76" y="72" width="266" height="138" rx="9" fill="#eef5ff" opacity="0.55"/>
      {/* Nav */}
      <rect x="82" y="78" width="254" height="18" rx="4" fill="#dbeafe" opacity="0.80"/>
      <rect x="87" y="81.5" width="50" height="11" rx="3" fill="#3b82f6" opacity="0.55"/>
      <rect x="143" y="81.5" width="36" height="11" rx="3" fill="#94a3b8" opacity="0.38"/>
      <rect x="185" y="81.5" width="36" height="11" rx="3" fill="#94a3b8" opacity="0.30"/>
      {/* Stat cards */}
      <rect x="82"  y="102" width="60" height="28" rx="6" fill="#dbeafe" opacity="0.95"/>
      <rect x="149" y="102" width="60" height="28" rx="6" fill="#dcfce7" opacity="0.95"/>
      <rect x="216" y="102" width="60" height="28" rx="6" fill="#fef3c7" opacity="0.95"/>
      <rect x="283" y="102" width="54" height="28" rx="6" fill="#fce7f3" opacity="0.90"/>
      {/* Line chart */}
      <rect x="82" y="136" width="160" height="68" rx="6" fill="white" opacity="0.65"/>
      <line x1="90" y1="196" x2="236" y2="196" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="90" y1="181" x2="236" y2="181" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="90" y1="166" x2="236" y2="166" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="90" y1="151" x2="236" y2="151" stroke="#dde9f7" strokeWidth="1"/>
      <polygon
        points="94,192 110,182 126,186 142,172 158,178 174,164 190,168 206,155 222,159 234,146 242,146 242,198 94,198"
        fill="#3b82f6" opacity="0.10"/>
      <polyline
        points="94,192 110,182 126,186 142,172 158,178 174,164 190,168 206,155 222,159 234,146"
        stroke="#2563eb" strokeWidth="2.8" fill="none"
        strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="142" cy="172" r="4" fill="white" stroke="#2563eb" strokeWidth="2.2"/>
      <circle cx="190" cy="168" r="4" fill="white" stroke="#2563eb" strokeWidth="2.2"/>
      <circle cx="234" cy="146" r="4.5" fill="#2563eb"/>
      {/* Donut */}
      <rect x="248" y="136" width="90" height="68" rx="6" fill="white" opacity="0.65"/>
      <circle cx="293" cy="170" r="26" fill="none" stroke="#dbeafe" strokeWidth="15"/>
      <circle cx="293" cy="170" r="26" fill="none" stroke="#2563eb" strokeWidth="15"
        strokeDasharray="70 94" strokeDashoffset="23"/>
      <circle cx="293" cy="170" r="26" fill="none" stroke="#60a5fa" strokeWidth="15"
        strokeDasharray="32 132" strokeDashoffset="-47"/>
      <circle cx="293" cy="170" r="15" fill="#eef5ff"/>
      <text x="293" y="175" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e40af">76%</text>
      {/* Rp card */}
      <rect x="344" y="44" width="98" height="130" rx="18" fill="white" opacity="0.97"/>
      <rect x="344" y="44" width="98" height="30"  rx="18" fill="#eff6ff"/>
      <rect x="344" y="62" width="98" height="12"  fill="#eff6ff"/>
      <circle cx="393" cy="114" r="27" fill="#dbeafe"/>
      <circle cx="393" cy="114" r="18" fill="#2563eb"/>
      <text x="393" y="120" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">Rp</text>
      <rect x="357" y="150" width="72" height="7" rx="3.5" fill="#93c5fd" opacity="0.50"/>
      <rect x="361" y="164" width="64" height="7" rx="3.5" fill="#bfdbfe" opacity="0.44"/>
      <rect x="365" y="178" width="56" height="7" rx="3.5" fill="#dbeafe" opacity="0.34"/>
      {/* Plant */}
      <ellipse cx="456" cy="204" rx="18" ry="28" fill="#4ade80" opacity="0.44"/>
      <ellipse cx="440" cy="186" rx="14" ry="22" fill="#22c55e" opacity="0.38"/>
      <ellipse cx="470" cy="182" rx="13" ry="20" fill="#86efac" opacity="0.40"/>
      <ellipse cx="458" cy="174" rx="11" ry="18" fill="#4ade80" opacity="0.34"/>
      <rect x="450" y="220" width="10" height="24" rx="4"  fill="#86efac" opacity="0.52"/>
      <path d="M438 244 L442 266 L468 266 L472 244 Z" fill="#94a3b8" opacity="0.72"/>
      <rect x="434" y="240" width="42" height="10" rx="5" fill="#cbd5e1" opacity="0.78"/>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   LEFT PANEL
════════════════════════════════════════════════════════ */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 flex-col text-white select-none relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1a56db 0%,#1848c0 42%,#1e3a8a 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.07) 1.5px,transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative flex flex-1 flex-col justify-between px-8 xl:px-10 py-10">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div className="flex h-[68px] w-[68px] items-center justify-center rounded-[20px] bg-white shadow-lg shrink-0">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="18" width="32" height="18" rx="4.5" fill="#1d4ed8"/>
              <rect x="8" y="22" width="12" height="9"  rx="3" fill="white" opacity="0.75"/>
              <rect x="4" y="21" width="32" height="5"  fill="#1e40af" opacity="0.50"/>
              <path d="M7 18 L20 8 L33 18" fill="#dbeafe" opacity="0.92"/>
              <circle cx="20" cy="13" r="4" fill="#3b82f6"/>
            </svg>
          </div>
          <span className="text-[38px] font-extrabold tracking-tight leading-none">POSPAY</span>
        </div>
        {/* Illustration */}
        <div className="flex-1 flex items-center justify-center py-2">
          <LeftIllustration />
        </div>
        {/* SMP */}
        <div className="border-t border-white/15 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80 mb-2.5">Studi Kasus</p>
          <div className="flex items-center gap-3">
            <svg width="50" height="50" viewBox="0 0 50 50" className="shrink-0">
              <circle cx="25" cy="25" r="24" fill="#f59e0b"/>
              <circle cx="25" cy="25" r="20" fill="#1a4cc5"/>
              <circle cx="25" cy="25" r="16" fill="#1e3a8a"/>
              <path d="M15 22 Q20 19 25 22 Q30 19 35 22 L35 32 Q30 29 25 32 Q20 29 15 32 Z"
                fill="#fbbf24" opacity="0.92"/>
              <line x1="25" y1="22" x2="25" y2="32" stroke="#1e3a8a" strokeWidth="1.4"/>
              <line x1="17" y1="25" x2="23" y2="25" stroke="#fde68a" strokeWidth="1" opacity="0.75"/>
              <line x1="17" y1="28" x2="23" y2="28" stroke="#fde68a" strokeWidth="1" opacity="0.75"/>
              <line x1="27" y1="25" x2="33" y2="25" stroke="#fde68a" strokeWidth="1" opacity="0.75"/>
              <line x1="27" y1="28" x2="33" y2="28" stroke="#fde68a" strokeWidth="1" opacity="0.75"/>
              <text x="25" y="44" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#fde68a">BREBES</text>
            </svg>
            <div>
              <p className="font-bold text-[16px] leading-tight">SMP Pusponegoro Brebes</p>
              <div className="mt-1.5 h-px w-28 bg-white/30"/>
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

/* ════════════════════════════════════════════════════════
   FIELD INPUT
════════════════════════════════════════════════════════ */
function FieldInput({ icon: IconC, right, hint, ...props }) {
  return (
    <div>
      <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden
        shadow-sm transition focus-within:border-brand-500 focus-within:ring-1 focus-within:ring-brand-500
        dark:border-slate-600 dark:bg-slate-800">
        <span className="flex w-11 shrink-0 items-center justify-center">
          <IconC width={17} height={17} className="text-slate-400"/>
        </span>
        <input
          className="flex-1 bg-transparent py-3 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100"
          {...props}
        />
        {right}
      </div>
      {hint && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   SISWA LOGIN PAGE  — no register link
════════════════════════════════════════════════════════ */
export default function Login() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(false);
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
    <div className="flex min-h-screen">
      <LeftPanel />

      {/* Right panel — same light gray background + floating card */}
      <div className="flex flex-1 items-center justify-center bg-[#f0f4ff] dark:bg-slate-900 px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white
          px-8 py-10 shadow-md dark:border-slate-700 dark:bg-slate-900 sm:px-10 sm:py-12">

          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="text-[32px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              Masuk
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk mengakses sistem POSPAY
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* NIS */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Username
              </label>
              <FieldInput
                icon={Icon.User}
                type="text"
                placeholder="Masukkan username"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                hint="Username dapat berupa NIK Bendahara atau NIS Siswa"
                autoFocus
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
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
                    className="flex w-11 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPwd
                      ? <Icon.EyeOff width={16} height={16}/>
                      : <Icon.Eye    width={16} height={16}/>}
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
                text-[15px] font-semibold text-white shadow hover:bg-brand-700
                disabled:opacity-60 transition-colors">
              {loading ? <Spinner size={18} className="text-white"/> : 'Masuk'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 space-y-1 text-center">
            <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
              <Icon.Shield width={11} height={11}/>
              Password default diberikan oleh bendahara sekolah
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
