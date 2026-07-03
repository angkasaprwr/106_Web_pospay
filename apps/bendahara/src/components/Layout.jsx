import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import AppFooter from './AppFooter';
import PospayLogo from './login/PospayLogo';

const NAV = [
  { to: '/', label: 'Beranda', icon: Icon.Dashboard, end: true },
  { to: '/siswa', label: 'Data Siswa', icon: Icon.Students },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills },
  { to: '/laporan', label: 'Laporan', icon: Icon.Report },
  { to: '/chatbot', label: 'Chatbot', icon: Icon.Chat },
];

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3">
      <PospayLogo size={40} className="rounded-lg" />
      <div className="hidden sm:block">
        <p className="text-base font-bold leading-tight tracking-wide text-white">POSPAY</p>
        <p className="text-[11px] text-white/80">Sistem Informasi Keuangan Sekolah</p>
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
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[90vw] overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-800 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <span className="font-semibold">Notifikasi</span>
            <button type="button" onClick={markAll} className="text-xs text-pospay hover:underline dark:text-blue-400">
              Tandai dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada notifikasi</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-50 px-4 py-3 dark:border-slate-800 ${!n.readAt ? 'bg-blue-50/40 dark:bg-blue-950/30' : ''}`}
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{n.body}</p>
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
  const [open, setOpen] = useState(false);
  const ref = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2 hover:bg-white/10"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-bold text-pospay ring-2 ring-white/30">
          {(user?.fullName || 'B')[0].toUpperCase()}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="rotate-90 text-white/80"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 text-slate-800 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-700">
            <p className="text-sm font-semibold">{user?.fullName}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">{user?.role === 'BENDAHARA' ? 'Bendahara' : user?.role}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/profil')}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Icon.User width={18} height={18} className="shrink-0" />
            Profil Saya
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/pengaturan')}
            className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
          >
            <Icon.Settings width={18} height={18} className="shrink-0" />
            Pengaturan
          </button>
          <div className="my-1 border-t border-slate-200 dark:border-slate-700" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Icon.Logout width={18} height={18} className="shrink-0" />
            Logout
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
              <Icon.Menu width={22} height={22} />
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
                  `flex h-full items-center gap-2 border-b-[3px] px-4 text-sm font-semibold transition xl:px-5 ${
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

      <AppFooter />
    </div>
  );
}
