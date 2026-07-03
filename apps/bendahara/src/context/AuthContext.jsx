import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setAuthSession, clearAuthSession, getToken, getRefreshToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    if (!getRefreshToken()) {
      clearAuthSession();
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      if (data.data.role !== 'BENDAHARA') {
        clearAuthSession();
        setUser(null);
        return;
      }
      setUser(data.data);
    } catch {
      clearAuthSession();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.data.user.role !== 'BENDAHARA') {
      throw new Error('Akun ini bukan akun bendahara. Gunakan aplikasi siswa.');
    }
    setAuthSession({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    setUser(data.data.user);
    return data.data.user;
  };

  const register = async (payload) => {
    const { data } = await api.post('/auth/register', payload);
    return data.data;
  };

  const requestRegistration = register;

  const verifyRegistration = async (payload) => {
    const { data } = await api.post('/auth/register/verify', payload);
    if (data.data.user.role !== 'BENDAHARA') {
      throw new Error('Akun ini bukan akun bendahara.');
    }
    setAuthSession({ accessToken: data.data.accessToken, refreshToken: data.data.refreshToken });
    setUser(data.data.user);
    return data.data.user;
  };

  const logout = async () => {
    const refreshToken = getRefreshToken();
    try {
      await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
    } catch {
      /* ignore */
    }
    clearAuthSession();
    setUser(null);
  };

  const updateUser = (patch) => setUser((u) => ({ ...u, ...patch }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, requestRegistration, verifyRegistration, logout, updateUser, reload: loadProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
