import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { apiError } from '../lib/api';
import { Spinner } from '../components/ui';
import { Icon } from '../components/Icons';

/* ══════════════════════════════════════════════════════════════
   SAME ILLUSTRATION as bendahara
══════════════════════════════════════════════════════════════ */
function LoginIllustration() {
  return (
    <svg viewBox="0 0 520 330" fill="none" xmlns="http://www.w3.org/2000/svg"
         style={{ width: '100%', maxWidth: 480 }}>
      {/* Chat bubble */}
      <rect x="2" y="24" width="112" height="64" rx="20" fill="white" fillOpacity=".93"/>
      <path d="M28 88 Q36 108 54 88" fill="white" fillOpacity=".93"/>
      <circle cx="32" cy="56" r="8.5" fill="#93c5fd"/>
      <circle cx="57" cy="56" r="8.5" fill="#93c5fd"/>
      <circle cx="82" cy="56" r="8.5" fill="#93c5fd"/>
      {/* Books */}
      <rect x="6"  y="266" width="102" height="17" rx="6" fill="#1e3a8a" fillOpacity=".65"/>
      <rect x="0"  y="249" width="116" height="17" rx="6" fill="#1e40af" fillOpacity=".52"/>
      <rect x="12" y="283" width="88"  height="12" rx="5" fill="#1e3a8a" fillOpacity=".56"/>
      {/* Keyboard */}
      <rect x="48" y="220" width="328" height="26" rx="11" fill="#334155" fillOpacity=".82"/>
      <rect x="116" y="231" width="196" height="7"  rx="3.5" fill="#1e293b" fillOpacity=".26"/>
      {/* Bezel */}
      <rect x="60" y="58" width="304" height="168" rx="15" fill="#1e293b" fillOpacity=".88"/>
      {/* Screen */}
      <rect x="74" y="70" width="276" height="144" rx="10" fill="white"   fillOpacity=".98"/>
      <rect x="74" y="70" width="276" height="144" rx="10" fill="#eef5ff" fillOpacity=".55"/>
      {/* Nav */}
      <rect x="80" y="76" width="264" height="19" rx="5" fill="#dbeafe" fillOpacity=".80"/>
      <rect x="85" y="79.5" width="54" height="12" rx="3.5" fill="#3b82f6" fillOpacity=".55"/>
      <rect x="145" y="79.5" width="38" height="12" rx="3"   fill="#94a3b8" fillOpacity=".38"/>
      <rect x="189" y="79.5" width="38" height="12" rx="3"   fill="#94a3b8" fillOpacity=".30"/>
      {/* Stat cards */}
      <rect x="80"  y="101" width="62" height="30" rx="6" fill="#dbeafe" fillOpacity=".95"/>
      <rect x="149" y="101" width="62" height="30" rx="6" fill="#dcfce7" fillOpacity=".95"/>
      <rect x="218" y="101" width="62" height="30" rx="6" fill="#fef3c7" fillOpacity=".95"/>
      <rect x="287" y="101" width="57" height="30" rx="6" fill="#fce7f3" fillOpacity=".90"/>
      {/* Line chart */}
      <rect x="80" y="138" width="166" height="70" rx="7" fill="white" fillOpacity=".68"/>
      <line x1="88" y1="200" x2="240" y2="200" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="88" y1="186" x2="240" y2="186" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="88" y1="172" x2="240" y2="172" stroke="#dde9f7" strokeWidth="1"/>
      <line x1="88" y1="158" x2="240" y2="158" stroke="#dde9f7" strokeWidth="1"/>
      <polygon
        points="92,196 108,186 124,190 140,176 156,182 172,167 188,172 204,158 220,163 234,149 242,149 242,202 92,202"
        fill="#3b82f6" fillOpacity=".10"/>
      <polyline
        points="92,196 108,186 124,190 140,176 156,182 172,167 188,172 204,158 220,163 234,149"
        stroke="#2563eb" strokeWidth="2.8" fill="none"
        strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="140" cy="176" r="4.5" fill="white" stroke="#2563eb" strokeWidth="2.2"/>
      <circle cx="188" cy="172" r="4.5" fill="white" stroke="#2563eb" strokeWidth="2.2"/>
      <circle cx="234" cy="149" r="5"   fill="#2563eb"/>
      {/* Donut */}
      <rect x="252" y="138" width="92" height="70" rx="7" fill="white" fillOpacity=".68"/>
      <circle cx="298" cy="173" r="27" fill="none" stroke="#dbeafe" strokeWidth="15"/>
      <circle cx="298" cy="173" r="27" fill="none" stroke="#2563eb" strokeWidth="15"
              strokeDasharray="72 98" strokeDashoffset="24"/>
      <circle cx="298" cy="173" r="27" fill="none" stroke="#60a5fa" strokeWidth="15"
              strokeDasharray="33 137" strokeDashoffset="-48"/>
      <circle cx="298" cy="173" r="16" fill="#eef5ff"/>
      <text x="298" y="178" textAnchor="middle" fontSize="10.5" fontWeight="bold" fill="#1e40af">76%</text>
      {/* Rp card */}
      <rect x="352" y="42" width="100" height="132" rx="18" fill="white" fillOpacity=".97"/>
      <rect x="352" y="42"  width="100" height="30" rx="18" fill="#eff6ff"/>
      <rect x="352" y="60"  width="100" height="12"        fill="#eff6ff"/>
      <circle cx="402" cy="116" r="28" fill="#dbeafe"/>
      <circle cx="402" cy="116" r="19" fill="#2563eb"/>
      <text x="402" y="123" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">Rp</text>
      <rect x="366" y="154" width="72" height="7.5" rx="3.75" fill="#93c5fd" fillOpacity=".50"/>
      <rect x="370" y="168" width="64" height="7.5" rx="3.75" fill="#bfdbfe" fillOpacity=".44"/>
      <rect x="374" y="182" width="56" height="7.5" rx="3.75" fill="#dbeafe" fillOpacity=".34"/>
      {/* Plant */}
      <ellipse cx="468" cy="208" rx="20" ry="30" fill="#4ade80" fillOpacity=".44"/>
      <ellipse cx="450" cy="188" rx="16" ry="24" fill="#22c55e" fillOpacity=".38"/>
      <ellipse cx="484" cy="184" rx="14" ry="21" fill="#86efac" fillOpacity=".40"/>
      <ellipse cx="470" cy="175" rx="12" ry="19" fill="#4ade80" fillOpacity=".34"/>
      <rect x="461" y="226" width="11" height="26" rx="5" fill="#86efac" fillOpacity=".52"/>
      <path d="M446 252 L450 276 L480 276 L484 252 Z" fill="#94a3b8" fillOpacity=".72"/>
      <rect x="442" y="248" width="46" height="11" rx="5.5" fill="#cbd5e1" fillOpacity=".80"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════
   LEFT PANEL (same as bendahara)
══════════════════════════════════════════════════════════════ */
function LeftPanel() {
  return (
    <div
      className="hidden lg:flex lg:w-[44%] xl:w-[42%] shrink-0 flex-col text-white select-none overflow-hidden relative"
      style={{ background: 'linear-gradient(155deg, #1a56db 0%, #1848c0 45%, #1e3a8a 100%)' }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.07) 1.5px, transparent 1.5px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="relative flex h-full flex-col justify-between px-8 xl:px-10 py-10">
        {/* Logo */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-[20px] bg-white shadow-lg"
            style={{ width: 70, height: 70, flexShrink: 0 }}
          >
            <svg width="42" height="42" viewBox="0 0 42 42" fill="none">
              <rect x="4"  y="19" width="34" height="19" rx="5"   fill="#1d4ed8"/>
              <rect x="8"  y="23" width="13" height="10" rx="3"   fill="white" fillOpacity=".75"/>
              <rect x="4"  y="22" width="34" height="5"  fill="#1e40af" fillOpacity=".50"/>
              <path d="M7 19 L21 8 L35 19" fill="#dbeafe" fillOpacity=".92"/>
              <circle cx="21" cy="14" r="4.5" fill="#3b82f6"/>
            </svg>
          </div>
          <span style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>
            POSPAY
          </span>
        </div>
        {/* Illustration */}
        <div className="flex flex-1 items-center justify-center py-4">
          <LoginIllustration />
        </div>
        {/* SMP */}
        <div className="border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.15)' }}>
          <p style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
            textTransform: 'uppercase', color: 'rgba(191,219,254,0.80)', marginBottom: 10,
          }}>
            Studi Kasus
          </p>
          <div className="flex items-center gap-3">
            <svg width="52" height="52" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
              <circle cx="26" cy="26" r="25" fill="#f59e0b"/>
              <circle cx="26" cy="26" r="21" fill="#1a4cc5"/>
              <circle cx="26" cy="26" r="17" fill="#1e3a8a"/>
              <path d="M16 23 Q21 20 26 23 Q31 20 36 23 L36 33 Q31 30 26 33 Q21 30 16 33 Z"
                    fill="#fbbf24" fillOpacity=".92"/>
              <line x1="26" y1="23" x2="26" y2="33" stroke="#1e3a8a" strokeWidth="1.5"/>
              <line x1="18" y1="26" x2="24" y2="26" stroke="#fde68a" strokeWidth="1" strokeOpacity=".75"/>
              <line x1="18" y1="29" x2="24" y2="29" stroke="#fde68a" strokeWidth="1" strokeOpacity=".75"/>
              <line x1="28" y1="26" x2="34" y2="26" stroke="#fde68a" strokeWidth="1" strokeOpacity=".75"/>
              <line x1="28" y1="29" x2="34" y2="29" stroke="#fde68a" strokeWidth="1" strokeOpacity=".75"/>
              <text x="26" y="46" textAnchor="middle" fontSize="5.5" fontWeight="bold" fill="#fde68a">BREBES</text>
            </svg>
            <div>
              <p style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}>SMP Pusponegoro Brebes</p>
              <div style={{ marginTop: 6, height: 1, width: 112, background: 'rgba(255,255,255,0.28)' }}/>
            </div>
          </div>
          <p style={{ marginTop: 10, fontSize: 11.5, lineHeight: 1.65, color: 'rgba(191,219,254,0.80)' }}>
            POSPAY membantu pengelolaan keuangan sekolah menjadi lebih teratur,
            transparan, dan mudah diakses.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SISWA LOGIN  — NO register link
══════════════════════════════════════════════════════════════ */
export default function Login() {
  const { login } = useAuth();
  const toast     = useToast();
  const navigate  = useNavigate();

  const [form,     setForm]     = useState({ username: '', password: '' });
  const [showPwd,  setShowPwd]  = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading,  setLoading]  = useState(false);

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <LeftPanel />

      {/* RIGHT PANEL */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#eef2ff',
          padding: '40px 16px',
        }}
      >
        {/* WHITE CARD */}
        <div
          style={{
            width: '100%',
            maxWidth: 440,
            backgroundColor: 'white',
            borderRadius: 20,
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
            padding: '48px 40px',
          }}
        >
          {/* Mobile logo */}
          <div className="mb-7 flex items-center gap-2 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={18} height={18}/>
            </div>
            <span className="font-bold text-slate-900">POSPAY</span>
          </div>

          {/* HEADING */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h1 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a', margin: 0 }}>
              Masuk
            </h1>
            <p style={{ marginTop: 6, fontSize: 14, color: '#64748b' }}>
              Masuk untuk mengakses sistem POSPAY
            </p>
          </div>

          <form onSubmit={submit}>
            {/* NIS / USERNAME */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Username
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #e2e8f0', borderRadius: 10,
                backgroundColor: 'white', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, flexShrink: 0 }}>
                  <Icon.User width={18} height={18} style={{ color: '#9ca3af' }}/>
                </span>
                <input
                  type="text"
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  autoFocus
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 14, color: '#1e293b', background: 'transparent',
                    padding: '12px 12px 12px 0',
                  }}
                />
              </div>
              <p style={{ marginTop: 6, fontSize: 12, color: '#9ca3af' }}>
                Username dapat berupa NIK Bendahara atau NIS Siswa
              </p>
            </div>

            {/* PASSWORD */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 14, fontWeight: 600, color: '#374151' }}>
                Password
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #e2e8f0', borderRadius: 10,
                backgroundColor: 'white', overflow: 'hidden',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, flexShrink: 0 }}>
                  <Icon.Lock width={17} height={17} style={{ color: '#9ca3af' }}/>
                </span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  required
                  style={{
                    flex: 1, border: 'none', outline: 'none',
                    fontSize: 14, color: '#1e293b', background: 'transparent',
                    padding: '12px 0',
                  }}
                />
                <button
                  type="button" tabIndex={-1}
                  onClick={() => setShowPwd(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                >
                  {showPwd ? <Icon.EyeOff width={16} height={16}/> : <Icon.Eye width={16} height={16}/>}
                </button>
              </div>
            </div>

            {/* REMEMBER + FORGOT */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4b5563', cursor: 'pointer' }}>
                <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}/>
                Ingat saya
              </label>
              <button type="button"
                style={{ fontSize: 14, fontWeight: 600, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>
                Lupa password?
              </button>
            </div>

            {/* MASUK */}
            <button type="submit" disabled={loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 10,
                backgroundColor: '#1d4ed8', color: 'white',
                fontSize: 15, fontWeight: 700, border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(29,78,216,0.30)',
              }}>
              {loading ? <Spinner size={18} className="text-white"/> : 'Masuk'}
            </button>
          </form>

          {/* FOOTER — no register link for siswa */}
          <div style={{ marginTop: 32, textAlign: 'center' }}>
            <p style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>
              <Icon.Shield width={11} height={11}/>
              Password default diberikan oleh bendahara sekolah
            </p>
            <p style={{ fontSize: 12, color: '#9ca3af' }}>
              © {new Date().getFullYear()} POSPAY.&nbsp; All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
