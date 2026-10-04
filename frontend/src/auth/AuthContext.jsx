import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  // Validate stored token on load
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    api('/api/auth/me', { token })
      .then((d) => setUser(d.user))
      .catch(logout)
      .finally(() => setLoading(false));
  }, [token]);

  const authenticate = async (mode, form) => {
    const data = await api(`/api/auth/${mode}`, { method: 'POST', body: form });
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user);
  };

  return (
    <AuthCtx.Provider
      value={{
        user, token, loading,
        login: (f) => authenticate('login', f),
        register: (f) => authenticate('register', f),
        logout,
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}