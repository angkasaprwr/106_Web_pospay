import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ──────────────────────────────────────────────────────────
   SVG ILLUSTRATION (same composition as bendahara)
────────────────────────────────────────────────────────── */
function LeftIllustration() {
  return (
    <svg viewBox="0 0 480 310" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-[440px] mx-auto">

      <rect x="4" y="26" width="102" height="58" rx="16" fill="white" opacity="0.93"/>
      <path d="M28 84 Q34 100 50 84" fill="white" opacity="0.93"/>
      <circle cx="30" cy="55" r="7" fill="#93c5fd"/>
      <circle cx="55" cy="55" r="7" fill="#93c5fd"/>
      <circle cx="80" cy="55" r="7" fill="#93c5fd"/>

      <rect x="12"  y="250" width="90"  height="14" rx="5" fill="#1e40af" opacity="0.60"/>
      <rect x="4"   y="236" width="106" height="14" rx="5" fill="#1d4ed8" opacity="0.45"/>
      <rect x="18"  y="264" width="76"  height="10" rx="4" fill="#1e3a8a" opacity="0.50"/>

      <rect x="48" y="204" width="302" height="22" rx="9" fill="#334155" opacity="0.75"/>
      <rect x="106" y="212" width="186" height="6" rx="3" fill="#1e293b" opacity="0.28"/>

      <rect x="60" y="58" width="278" height="152" rx="13" fill="#1e293b" opacity="0.82"/>
      <rect x="72" y="68" width="254" height="132" rx="8" fill="white" opacity="0.97"/>
      <rect x="72" y="68" width="254" height="132" rx="8" fill="#eef4ff" opacity="0.55"/>

      <rect x="78" y="74" width="242" height="16" rx="3" fill="#dbeafe" opacity="0.80"/>
      <rect x="82" y="77.5" width="46" height="9" rx="2.5" fill="#3b82f6" opacity="0.55"/>
      <rect x="134" y="77.5" width="32" height="9" rx="2" fill="#94a3b8" opacity="0.40"/>
      <rect x="172" y="77.5" width="32" height="9" rx="2" fill="#94a3b8" opacity="0.35"/>

      <rect x="78"  y="96" width="56" height="26" rx="5" fill="#dbeafe" opacity="0.95"/>
      <rect x="140" y="96" width="56" height="26" rx="5" fill="#dcfce7" opacity="0.95"/>
      <rect x="202" y="96" width="56" height="26" rx="5" fill="#fef3c7" opacity="0.95"/>
      <rect x="264" y="96" width="50" height="26" rx="5" fill="#fce7f3" opacity="0.90"/>

      <rect x="78" y="128" width="152" height="64" rx="5" fill="white" opacity="0.62"/>
      <line x1="86" y1="184" x2="224" y2="184" stroke="#dde9f7" strokeWidth="0.9"/>
      <line x1="86" y1="171" x2="224" y2="171" stroke="#dde9f7" strokeWidth="0.9"/>
      <line x1="86" y1="158" x2="224" y2="158" stroke="#dde9f7" strokeWidth="0.9"/>
      <line x1="86" y1="145" x2="224" y2="145" stroke="#dde9f7" strokeWidth="0.9"/>
      <polygon
        points="90,180 104,172 118,176 132,164 146,169 160,157 174,161 188,149 202,153 216,140 224,140 224,186 90,186"
        fill="#3b82f6" opacity="0.10"/>
      <polyline
        points="90,180 104,172 118,176 132,164 146,169 160,157 174,161 188,149 202,153 216,140"
        stroke="#2563eb" strokeWidth="2.6" fill="none"
        strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="132" cy="164" r="3.5" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="174" cy="161" r="3.5" fill="white" stroke="#2563eb" strokeWidth="2"/>
      <circle cx="216" cy="140" r="4"   fill="#2563eb"/>

      <rect x="236" y="128" width="86" height="64" rx="5" fill="white" opacity="0.62"/>
      <circle cx="279" cy="160" r="24" fill="none" stroke="#dbeafe" strokeWidth="14"/>
      <circle cx="279" cy="160" r="24" fill="none" stroke="#2563eb" strokeWidth="14"
        strokeDasharray="65 86" strokeDashoffset="22"/>
      <circle cx="279" cy="160" r="24" fill="none" stroke="#60a5fa" strokeWidth="14"
        strokeDasharray="30 121" strokeDashoffset="-43"/>
      <circle cx="279" cy="160" r="14" fill="#eef4ff"/>
      <text x="279" y="165" textAnchor="middle" fontSize="9.5" fontWeight="bold" fill="#1e40af">76%</text>

      <rect x="326" y="42" width="92" height="122" rx="16" fill="white" opacity="0.97"/>
      <rect x="326" y="42" width="92" height="28"  rx="16" fill="#eff6ff"/>
      <rect x="326" y="58" width="92" height="12"  fill="#eff6ff"/>
      <circle cx="372" cy="106" r="25" fill="#dbeafe"/>
      <circle cx="372" cy="106" r="17" fill="#2563eb"/>
      <text x="372" y="112" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white">Rp</text>
      <rect x="338" y="140" width="68" height="6" rx="3" fill="#93c5fd" opacity="0.52"/>
      <rect x="342" y="153" width="60" height="6" rx="3" fill="#bfdbfe" opacity="0.46"/>
      <rect x="346" y="166" width="52" height="6" rx="3" fill="#dbeafe" opacity="0.36"/>

      <ellipse cx="432" cy="194" rx="17" ry="26" fill="#4ade80" opacity="0.42"/>
      <ellipse cx="416" cy="177" rx="13" ry="21" fill="#22c55e" opacity="0.38"/>
      <ellipse cx="446" cy="174" rx="12" ry="19" fill="#86efac" opacity="0.40"/>
      <ellipse cx="434" cy="167" rx="10" ry="17" fill="#4ade80" opacity="0.33"/>
      <rect x="427" y="210" width="9"  height="22" rx="4" fill="#86efac" opacity="0.52"/>
      <path d="M417 232 L421 252 L445 252 L449 232 Z" fill="#94a3b8" opacity="0.72"/>
      <rect x="414" y="228" width="38" height="9"  rx="4" fill="#cbd5e1" opacity="0.78"/>
    </svg>
  );
}

/* ──────────────────────────────────────────────────────────
   LEFT PANEL
────────────────────────────────────────────────────────── */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 flex-col text-white select-none relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg,#1a56db 0%,#1a4cc5 42%,#1e3a8a 100%)' }}
    >
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle,rgba(255,255,255,0.07) 1.5px,transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative flex flex-1 flex-col justify-between px-8 xl:px-10 py-8">
        <div className="flex items-center gap-3">
          <div className="flex h-[62px] w-[62px] items-center justify-center rounded-[18px] bg-white shadow-lg shrink-0">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="16" width="28" height="16" rx="4" fill="#1d4ed8"/>
              <rect x="8" y="20" width="10" height="8"  rx="2.5" fill="white" opacity="0.75"/>
              <rect x="4" y="19" width="28" height="4"  fill="#1e40af" opacity="0.50"/>
              <path d="M6 16 L18 7 L30 16" fill="#dbeafe" opacity="0.90"/>
              <circle cx="18" cy="11.5" r="3.5" fill="#3b82f6"/>
            </svg>
          </div>
          <span className="text-[34px] font-extrabold tracking-tight leading-none">POSPAY</span>
        </div>

        <div className="flex-1 flex items-center justify-center py-4">
          <LeftIllustration />
        </div>

        <div className="border-t border-white/15 pt-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-blue-200/80 mb-2.5">Studi Kasus</p>
          <div className="flex items-center gap-3">
            <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
              <circle cx="24" cy="24" r="23" fill="#f59e0b"/>
              <circle cx="24" cy="24" r="19" fill="#1a4cc5"/>
              <circle cx="24" cy="24" r="15" fill="#1e3a8a"/>
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
            POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur, transparan, dan mudah diakses.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   FIELD INPUT
────────────────────────────────────────────────────────── */
function FieldInput({ icon: IconC, right, hint, ...props }) {
  return (
    <div>
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
      {hint && <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────
   SISWA LOGIN PAGE — no register link
────────────────────────────────────────────────────────── */
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
    <div className="flex min-h-screen bg-[#f4f6fb] dark:bg-slate-900 lg:bg-white lg:dark:bg-slate-950">
      <LeftPanel />

      {/* ── Right panel ── */}
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-[400px] rounded-2xl border border-slate-200 bg-white px-8 py-10
          shadow-sm dark:border-slate-700 dark:bg-slate-900
          lg:rounded-none lg:border-0 lg:shadow-none lg:bg-transparent lg:dark:bg-transparent lg:px-10 lg:py-0">

          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900 dark:text-white">POSPAY</span>
          </div>

          {/* Heading */}
          <div className="mb-7 text-center">
            <h1 className="text-[30px] font-extrabold tracking-tight text-slate-900 dark:text-white">
              Masuk
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Masuk untuk mengakses sistem POSPAY
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            {/* NIS */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                NIS
              </label>
              <FieldInput
                icon={Icon.User}
                type="text"
                placeholder="Masukkan NIS"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                hint="NIS diberikan oleh bendahara saat akun siswa dibuat"
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
                    className="flex w-10 shrink-0 items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                    {showPwd ? <Icon.EyeOff width={15} height={15}/> : <Icon.Eye width={15} height={15}/>}
                  </button>
                }
              />
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input type="checkbox" checked={remember}
                  onChange={e => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 accent-brand-600"/>
                Ingat saya
              </label>
              <button type="button"
                className="text-sm font-semibold text-brand-600 hover:underline">
                Lupa password?
              </button>
            </div>

            <button type="submit" disabled={loading}
              className="flex w-full items-center justify-center rounded-lg bg-brand-600 py-3
                text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60
                transition-colors shadow-sm mt-1">
              {loading ? <Spinner size={18} className="text-white"/> : 'Masuk'}
            </button>
          </form>

          {/* Footer note */}
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
