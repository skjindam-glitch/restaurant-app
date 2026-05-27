import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '../types';
import { api, setToken, getToken } from '../api/client';
import type { UserProfileDto, LoginResponse } from '../api/types';

export interface AuthUser {
  id: number;
  name: string;
  role: UserRole;
  avatar: string;
  email: string;
  permissions: string[];
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (route: string) => boolean;
}

export const rolePermissions: Record<UserRole, string[]> = {
  admin:   ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'menu', 'reports', 'staff', 'investment'],
  manager: ['tables', 'orders', 'billing', 'kitchen', 'menu', 'investment'],
  server:  ['tables', 'orders'],
  cashier: ['billing', 'orders'],
  kitchen: ['kitchen'],
};

export const roleHomeRoute: Record<UserRole, string> = {
  admin:   '/dashboard',
  manager: '/tables',
  server:  '/tables',
  cashier: '/billing',
  kitchen: '/kitchen',
};

const AuthContext = createContext<AuthContextType | null>(null);

function toUser(p: UserProfileDto): AuthUser {
  return {
    id: p.id, name: p.name, role: p.role as UserRole,
    avatar: p.avatar, email: p.email,
    permissions: p.permissions?.length ? p.permissions : rolePermissions[p.role as UserRole] ?? [],
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) { setLoading(false); return; }
    api.get<UserProfileDto>('/api/auth/me')
      .then(p => setUser(toUser(p)))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
    setToken(res.token);
    setUser(toUser(res.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const can = (route: string) => {
    if (!user) return false;
    return user.permissions.includes(route);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
