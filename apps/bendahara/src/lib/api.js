import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || '/api';

export const api = axios.create({ baseURL, withCredentials: true });

const TOKEN_KEY = 'pospay_bendahara_token';
const REFRESH_KEY = 'pospay_bendahara_refresh';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

export function setAuthSession({ accessToken, refreshToken }) {
  setToken(accessToken);
  if (refreshToken) setRefreshToken(refreshToken);
}

export function clearAuthSession() {
  setToken(null);
  setRefreshToken(null);
}

export function isSessionError(err) {
  return Boolean(err?.isSessionError);
}

function markSessionError(error) {
  error.isSessionError = true;
  return error;
}

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

function isForbiddenRoleError(error) {
  const status = error.response?.status;
  const message = error.response?.data?.message || '';
  return status === 403 && message.toLowerCase().includes('izin');
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (isForbiddenRoleError(error)) {
      clearAuthSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(markSessionError(error));
    }

    if (error.response?.status === 401 && !original._retry && !original.url.includes('/auth/')) {
      original._retry = true;
      const storedRefresh = getRefreshToken();
      if (!storedRefresh) {
        clearAuthSession();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
        return Promise.reject(markSessionError(error));
      }
      try {
        refreshing = refreshing || api.post('/auth/refresh', { refreshToken: storedRefresh });
        const { data } = await refreshing;
        refreshing = null;
        const newToken = data?.data?.accessToken;
        const newRefresh = data?.data?.refreshToken;
        if (newToken) {
          setAuthSession({ accessToken: newToken, refreshToken: newRefresh });
          if (data?.data?.user?.role && data.data.user.role !== 'BENDAHARA') {
            clearAuthSession();
            window.location.href = '/login';
            return Promise.reject(error);
          }
          original.headers.Authorization = `Bearer ${newToken}`;
          return api(original);
        }
      } catch (e) {
        refreshing = null;
        clearAuthSession();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export function isNetworkError(err) {
  if (!err) return false;
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') return true;
  return !err.response && Boolean(err.request);
}

export function apiError(err, fallback = 'Terjadi kesalahan') {
  if (isSessionError(err)) return null;
  if (isNetworkError(err)) {
    return 'Kesalahan jaringan: backend API tidak terjangkau. Jalankan npm run dev:all lalu muat ulang halaman.';
  }
  return err?.response?.data?.message || err?.message || fallback;
}

/** Cek koneksi API (via proxy Vite /api/health) */
export async function checkApiConnection() {
  try {
    await api.get('/health', { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
