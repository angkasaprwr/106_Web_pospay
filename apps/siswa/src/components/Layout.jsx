import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

const NAV = [
  { to: '/', label: 'Beranda', icon: Icon.Home, end: true },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills },
  { to: '/riwayat', label: 'Riwayat', icon: Icon.History },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-pospay shadow-sm">
        <Icon.School width={22} height={22} />
      </div>
      <div className="hidden sm:block">
        <p className="text-base font-bold leading-tight text-white">POSPAY</p>
        <p className="text-[11px] text-white/75">Sistem Informasi Keuangan Sekolah</p>
      </div>
    </Link>
  );
}

function Notifications() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef();

  const load = async () => {
    try {
      const { data } = await api.get('/notifications?limit=10');
      setItems(data.data);
      setUnread(data.meta?.unread || 0);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    await api.post('/notifications/read-all');
    load();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border border-white/25 p-2 text-white hover:bg-white/10"
        aria-label="Notifikasi"
      >
        <Icon.Bell width={20} height={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold">Notifikasi</span>
            <button type="button" onClick={markAll} className="text-xs text-pospay hover:underline">
              Tandai dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Belum ada notifikasi</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-100 px-4 py-3 ${!n.readAt ? 'bg-pospay-50/40' : ''}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500">{n.body}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initial = (user?.fullName || 'S').charAt(0).toUpperCase();
  const photoUrl = user?.avatarUrl || user?.student?.photoUrl;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/10"
        aria-label="Menu profil"
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt={user?.fullName || 'Profil'}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white/40"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-pospay ring-2 ring-white/30">
            {initial}
          </span>
        )}
        <Icon.ChevronRight width={16} height={16} className="rotate-90 text-white/80" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-slate-800 shadow-lg">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-400">NIS: {user?.username}</p>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/profil'); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
          >
            <Icon.User width={16} height={16} /> Profil Saya
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/bantuan'); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
          >
            <Icon.Chat width={16} height={16} /> Bantuan / Chatbot
          </button>
          <button
            type="button"
            onClick={() => { setOpen(false); navigate('/pengaturan'); }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-slate-50"
          >
            <Icon.Settings width={16} height={16} /> Pengaturan
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
          >
            <Icon.Logout width={16} height={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { theme, toggle } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 dark:bg-slate-950">
      <header className="sticky top-0 z-30 w-full bg-[#0056D2] shadow-lg">
        <div className="mx-auto grid h-[68px] max-w-7xl grid-cols-[auto_1fr_auto] items-stretch gap-2 px-4 sm:px-6 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-white hover:bg-white/10 lg:hidden"
              aria-label="Menu"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <Brand />
          </div>

          <nav className="hidden items-stretch justify-center lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex h-full items-center gap-2 border-b-[3px] px-6 text-sm font-semibold transition ${
                    isActive
                      ? 'border-white text-white'
                      : 'border-transparent text-white/80 hover:border-white/50 hover:text-white'
                  }`
                }
              >
                <item.icon width={18} height={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggle}
              className="rounded-lg border border-white/25 p-2 text-white hover:bg-white/10"
              aria-label={theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap'}
            >
              {theme === 'dark' ? <Icon.Moon width={20} height={20} /> : <Icon.Sun width={20} height={20} />}
            </button>
            <Notifications />
            <ProfileMenu />
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-white/20 px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon width={20} height={20} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 bg-[#F8F9FA] dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
