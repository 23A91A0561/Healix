import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api.js';
import { socket } from '../services/socket.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('accessToken')));

  useEffect(() => {
    if (!localStorage.getItem('accessToken')) return;
    api.get('/auth/me')
      .then(({ data }) => setUser(data.user))
      .catch((err) => {
        console.warn('Authentication check failed:', err.message);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    socket.connect();
    socket.emit('user:join', user._id);
    return () => socket.disconnect();
  }, [user]);

  const value = useMemo(() => ({
    user,
    loading,
    async login(credentials) {
      const { data } = await api.post('/auth/login', credentials);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      return data.user;
    },
    async register(payload) {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      setUser(data.user);
      return data.user;
    },
    logout() {
      localStorage.clear();
      setUser(null);
      socket.disconnect();
    }
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
