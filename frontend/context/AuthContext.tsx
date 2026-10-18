'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../lib/types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  loginAsDemoAdmin: () => Promise<void>;
  loginAsDemoUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial token on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('eventbook_token');
    const savedUser = localStorage.getItem('eventbook_user');

    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with /auth/me in background
        api.auth.me()
          .then((res) => {
            setUser(res.user);
            localStorage.setItem('eventbook_user', JSON.stringify(res.user));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          })
          .finally(() => setIsLoading(false));
        return;
      } catch (e) {
        logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.auth.login({ email, password });
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('eventbook_token', res.token);
    localStorage.setItem('eventbook_user', JSON.stringify(res.user));
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await api.auth.register({ name, email, password });
    setUser(res.user);
    setToken(res.token);
    localStorage.setItem('eventbook_token', res.token);
    localStorage.setItem('eventbook_user', JSON.stringify(res.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('eventbook_token');
    localStorage.removeItem('eventbook_user');
  };

  const loginAsDemoAdmin = async () => {
    await login('admin@eventbook.com', 'AdminPass123!');
  };

  const loginAsDemoUser = async () => {
    await login('user@eventbook.com', 'UserPass123!');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        loginAsDemoAdmin,
        loginAsDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
