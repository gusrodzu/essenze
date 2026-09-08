import {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {apiRequest, clearSession, getStoredSession, saveSession} from '../api';

const AuthContext = createContext(null);

export function AuthProvider({children}) {
  const [session, setSession] = useState(() => getStoredSession());
  const [loading, setLoading] = useState(Boolean(getStoredSession()?.token));

  useEffect(() => {
    if (!session?.token) {
      setLoading(false);
      return;
    }

    apiRequest('/auth/me')
      .then(({user}) => {
        const nextSession = {...session, user};
        saveSession(nextSession);
        setSession(nextSession);
      })
      .catch(() => {
        clearSession();
        setSession(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(credentials) {
    const result = await apiRequest('/auth/login', {method: 'POST', body: credentials});
    const nextSession = {token: result.token, user: result.user};
    saveSession(nextSession);
    setSession(nextSession);
    return result.user;
  }

  async function logout() {
    try {
      await apiRequest('/auth/logout', {method: 'POST'});
    } catch {
      // La sesión local se elimina incluso si la API no responde.
    }
    clearSession();
    setSession(null);
  }

  const value = useMemo(
    () => ({user: session?.user ?? null, token: session?.token ?? null, authenticated: Boolean(session?.token), loading, login, logout}),
    [session, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
