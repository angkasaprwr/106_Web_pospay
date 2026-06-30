import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.data);
    } catch {
      setToken(null);
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
    setToken(data.data.accessToken);
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
    setToken(data.data.accessToken);
    setUser(data.data.user);
    return data.data.user;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout', {});
    } catch {
      /* ignore */
    }
    setToken(null);
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
