import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate, Outlet, Link } from 'react-router-dom';
import { Icon } from './Icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import AppFooter from './AppFooter';

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
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pospay text-white shadow-sm">
        <Icon.School width={22} height={22} />
      </div>
      <div className="hidden sm:block">
        <p className="text-base font-bold leading-tight text-slate-900">POSPAY</p>
        <p className="text-[11px] text-slate-500">Sistem Informasi Keuangan Sekolah</p>
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
      <button type="button" onClick={() => setOpen((o) => !o)} className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
        <Icon.Bell width={20} height={20} />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <span className="font-semibold text-slate-800">Notifikasi</span>
            <button type="button" onClick={markAll} className="text-xs text-pospay hover:underline">
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
                  className={`border-b border-slate-50 px-4 py-3 ${!n.readAt ? 'bg-blue-50/40' : ''}`}
                >
                  <p className="text-sm font-medium text-slate-800">{n.title}</p>
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
        className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-slate-100"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pospay text-sm font-bold text-white">
          {(user?.fullName || 'B')[0].toUpperCase()}
        </div>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-slate-500 transition ${open ? 'rotate-180' : ''}`}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/profil')}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            <Icon.User width={18} height={18} className="shrink-0 text-slate-800" />
            Profil Saya
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => go('/pengaturan')}
            className="group flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-blue-50 hover:text-blue-600"
          >
            <Icon.Settings width={18} height={18} className="shrink-0 text-slate-800 transition group-hover:text-blue-600" />
            Pengaturan
          </button>
          <div className="my-1 border-t border-slate-200" role="separator" />
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Icon.Logout width={18} height={18} className="shrink-0 text-red-600" />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Menu"
            >
              <Icon.Menu width={22} height={22} />
            </button>
            <Brand />
          </div>

          <nav className="hidden h-16 items-stretch gap-0 lg:flex">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2 border-b-2 px-4 text-sm font-medium transition ${
                    isActive
                      ? 'border-pospay text-pospay'
                      : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-pospay'
                  }`
                }
              >
                <item.icon width={18} height={18} />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1">
            <Notifications />
            <ProfileMenu />
          </div>
        </div>

        {mobileOpen && (
          <nav className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
            <div className="flex flex-col gap-1">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
                      isActive ? 'bg-pospay-50 text-pospay' : 'text-slate-600 hover:bg-slate-50'
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

      <main className="flex-1 px-4 py-6 sm:px-6">
        <Outlet />
      </main>

      <AppFooter />
    </div>
  );
}
