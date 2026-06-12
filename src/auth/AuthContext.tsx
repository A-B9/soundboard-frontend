import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import * as authApi from '../api/auth';
import {
  TOKEN_STORAGE_KEY,
  USERNAME_STORAGE_KEY,
  clearStoredAuth,
  getStoredToken,
} from '../api/client';

interface AuthContextValue {
  username: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialise from localStorage so a page refresh keeps the session
  // (the token itself stays valid until the backend's 2h expiry).
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [username, setUsername] = useState<string | null>(() =>
    localStorage.getItem(USERNAME_STORAGE_KEY),
  );

  const login = useCallback(async (user: string, password: string) => {
    const response = await authApi.login(user, password);
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    localStorage.setItem(USERNAME_STORAGE_KEY, response.username);
    setToken(response.token);
    setUsername(response.username);
  }, []);

  const logout = useCallback(() => {
    clearStoredAuth();
    setToken(null);
    setUsername(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ username, isAuthenticated: token !== null, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return context;
}
