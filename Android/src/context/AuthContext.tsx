import { createContext, useContext, useState, ReactNode } from 'react';
import { api, setAuthToken } from '../api/client';
import type { LoginResponse } from '../api/types';

export type UserRole = 'manager' | 'server' | 'cashier' | 'kitchen' | 'admin';

export interface User {
  id: number;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (screen: string) => boolean;
}

export const rolePermissions: Record<string, string[]> = {
  manager: ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'menu', 'history', 'investment', 'staff'],
  server:  ['tables', 'orders'],
  cashier: ['billing', 'orders', 'history'],
  kitchen: ['kitchen'],
  admin:   ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'menu', 'history', 'investment', 'staff'],
};

export const roleHomeScreen: Record<string, string> = {
  manager: 'Dashboard',
  server:  'Tables',
  cashier: 'Billing',
  kitchen: 'Kitchen',
  admin:   'Dashboard',
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
    setAuthToken(res.token);
    setToken(res.token);
    setUser({
      id:     res.user.id,
      name:   res.user.name,
      email:  res.user.email,
      role:   res.user.role as UserRole,
      avatar: res.user.avatar,
    });
  };

  const logout = () => {
    setAuthToken(null);
    setToken(null);
    setUser(null);
  };

  const can = (screen: string) => {
    if (!user) return false;
    return (rolePermissions[user.role] ?? []).includes(screen.toLowerCase());
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
