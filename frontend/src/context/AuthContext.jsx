import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('studylink_token'));
  const [loading, setLoading] = useState(true);

  async function refreshUser(activeToken = token) {
    if (!activeToken) return null;
    const data = await api.me(activeToken);
    setUser(data.user);
    setTutorProfile(data.tutorProfile || null);
    return data;
  }

  useEffect(() => {
    async function loadUser() {
      if (!token) { setLoading(false); return; }
      try { await refreshUser(token); }
      catch { localStorage.removeItem('studylink_token'); setToken(null); setUser(null); setTutorProfile(null); }
      finally { setLoading(false); }
    }
    loadUser();
  }, [token]);

  function login(newToken, newUser) {
    localStorage.setItem('studylink_token', newToken);
    setToken(newToken); setUser(newUser);
  }

  function replaceUser(newUser) { setUser(newUser); }
  function replaceToken(newToken) { localStorage.setItem('studylink_token',newToken); setToken(newToken); }

  function logout() {
    localStorage.removeItem('studylink_token'); setToken(null); setUser(null); setTutorProfile(null);
  }

  return <AuthContext.Provider value={{ user, tutorProfile, token, loading, login, logout, refreshUser, replaceUser, replaceToken }}>
    {children}
  </AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un AuthProvider');
  return ctx;
}
