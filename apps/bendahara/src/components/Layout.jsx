import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';

const NAV = [
  { to: '/', label: 'Beranda', icon: Icon.Dashboard, end: true },
  { to: '/siswa', label: 'Data Siswa', icon: Icon.Students },
  { to: '/tagihan', label: 'Tagihan', icon: Icon.Bills },
  { to: '/pembayaran', label: 'Pembayaran', icon: Icon.Payment },
  { to: '/dispensasi', label: 'Dispensasi', icon: Icon.Dispensation },
  { to: '/laporan', label: 'Laporan', icon: Icon.Report },
  { to: '/chatbot', label: 'Chatbot', icon: Icon.Chat },
];

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
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative rounded-lg p-2">
        <Icon.Bell width={20} height={20} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 card z-50 overflow-hidden shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="font-semibold">Notifikasi</span>
            <button onClick={markAll} className="text-xs text-brand-600 hover:underline">
              Tandai dibaca
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-400">Tidak ada notifikasi</p>
            ) : (
              items.map((n) => (
                <div
                  key={n.id}
                  className={`border-b border-slate-100 px-4 py-3 dark:border-slate-800 ${!n.readAt ? 'bg-brand-50/40 dark:bg-brand-900/10' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</p>
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
          {(user?.fullName || 'U')[0].toUpperCase()}
        </div>
        <span className="hidden text-sm font-medium sm:inline max-w-[120px] truncate">{user?.fullName}</span>
        <Icon.X
          width={14}
          height={14}
          className={`hidden sm:block text-slate-400 transition-transform ${open ? 'rotate-0' : 'rotate-45'}`}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 card z-50 overflow-hidden py-1 shadow-lg">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <p className="text-sm font-semibold truncate">{user?.fullName}</p>
            <p className="text-xs text-slate-400">@{user?.username}</p>
          </div>
          <button
            onClick={() => go('/profil')}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon.User width={16} height={16} /> Profil Saya
          </button>
          <button
            onClick={() => go('/pengaturan')}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon.Settings width={16} height={16} /> Pengaturan
          </button>
          <button
            onClick={() => go('/pengaturan/tentang')}
            className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Icon.Info width={16} height={16} /> Bantuan
          </button>
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 border-t border-slate-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-slate-800 dark:hover:bg-red-900/20"
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
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/95">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center gap-4 px-4 sm:px-6">
          {/* Brand */}
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.School width={20} height={20} />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold leading-tight text-slate-900 dark:text-white">POSPAY</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Keuangan Sekolah</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex flex-1 items-center justify-center gap-0.5">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`
                }
              >
                <item.icon width={17} height={17} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="ml-auto flex items-center gap-1">
            <button onClick={toggle} className="btn-ghost rounded-lg p-2" aria-label="Ganti tema">
              {theme === 'dark' ? <Icon.Sun width={20} height={20} /> : <Icon.Moon width={20} height={20} />}
            </button>
            <Notifications />
            <ProfileMenu />

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="btn-ghost rounded-lg p-2 lg:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <Icon.X width={20} height={20} /> : <Icon.Menu width={20} height={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileOpen && (
          <div className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 lg:hidden">
            <nav className="flex flex-col gap-1 p-3">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`
                  }
                >
                  <item.icon width={20} height={20} />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-screen-xl px-4 py-5 sm:px-6 sm:py-6">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-white">
              <Icon.School width={14} height={14} />
            </div>
            <span className="font-medium">SMP Pusponegoro Brebes</span>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} POSPAY. Semua hak dilindungi.</p>
          <p className="hidden text-xs text-slate-400 sm:block">
            Sistem Informasi Keuangan Sekolah Berbasis Web dengan Fitur Bantuan Chatbot
          </p>
        </div>
      </footer>
    </div>
  );
}
