import React, { createContext, useState, useEffect, ReactNode } from "react";
import { ApiClient } from '../utils/api';
import { normalizeUserAccess } from '../utils/permissions';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[];
  features?: string[];
  // add more fields as needed
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  login: async () => {},
  logout: () => {},
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const login = async (email: string, password: string) => {
    // Use ApiClient.login so requests go to configured backend URL
    const normalizedEmail = email?.trim().toLowerCase();
    const result = await ApiClient.login(normalizedEmail, password);
    if (!result || !result.success) throw new Error(result?.message || 'Invalid credentials');

    const jwtToken = result.token;
    const respUser = result.user;
    const normalizedUser = normalizeUserAccess(respUser);
    sessionStorage.setItem('hospital_access_token', jwtToken);
    if (normalizedUser) sessionStorage.setItem('hospital_user', JSON.stringify(normalizedUser));
    setToken(jwtToken || null);
    setUser(normalizedUser);
  };

  const logout = () => {
    sessionStorage.removeItem("hospital_access_token");
    sessionStorage.removeItem("hospital_user");
    localStorage.removeItem("hospital_access_token");
    localStorage.removeItem("hospital_user");
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem('hospital_access_token') ||
      sessionStorage.getItem('token') ||
      localStorage.getItem('hospital_access_token') ||
      localStorage.getItem('token');

    if (!stored) {
      setLoading(false);
      return;
    }

    const sessionCheckKey = 'hospital_session_check_active';
    const lastSessionCheck = Number(sessionStorage.getItem('hospital_session_check_time') || '0');
    const now = Date.now();

    if (sessionStorage.getItem(sessionCheckKey) === '1' || (lastSessionCheck > 0 && now - lastSessionCheck < 15000)) {
      const cachedUser = sessionStorage.getItem('hospital_user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          setUser(normalizeUserAccess(parsed));
        } catch (e) {
          // Ignore invalid cache payloads and fall back to unauthenticated state.
        }
      }
      setToken(stored);
      setLoading(false);
      return;
    }

    setToken(stored);
    ApiClient.getSession()
      .then((data: any) => {
        const u = data?.user || data;
        const normalized = normalizeUserAccess(u);
        if (normalized) {
          sessionStorage.setItem('hospital_user', JSON.stringify(normalized));
        }
        setUser(normalized);
      })
      .catch(() => {
        ApiClient.logout();
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Listen for global auth invalidation events (e.g., token expired)
  useEffect(() => {
    const handleAuthInvalid = () => {
      setToken(null);
      setUser(null);
      sessionStorage.removeItem('hospital_access_token');
      sessionStorage.removeItem('hospital_user');
      localStorage.removeItem('hospital_access_token');
      localStorage.removeItem('hospital_user');
    };
    window.addEventListener('auth:invalid', handleAuthInvalid as EventListener);
    return () => window.removeEventListener('auth:invalid', handleAuthInvalid as EventListener);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};