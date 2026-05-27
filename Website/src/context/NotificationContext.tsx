import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { NotificationDto } from '../api/types';
import { useAuth } from './AuthContext';

interface NotificationContextValue {
  notifications: NotificationDto[];
  unreadCount: number;
  loading: boolean;
  refresh: () => Promise<void>;
  markRead: (id: number) => Promise<void>;
  markAllRead: () => Promise<void>;
  sendAlert: (title: string, message: string, targetRole?: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<NotificationDto[]>('/api/notifications?limit=50');
      setNotifications(data);
    } catch {
      // silently ignore notification fetch failures
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    refresh();
    intervalRef.current = setInterval(refresh, 15_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [user, refresh]);

  const markRead = async (id: number) => {
    try {
      await api.patch(`/api/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch {
      // ignore
    }
  };

  const markAllRead = async () => {
    setLoading(true);
    try {
      await api.post('/api/notifications/mark-all-read', {});
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const sendAlert = async (title: string, message: string, targetRole?: string) => {
    await api.post('/api/notifications/alert', { title, message, targetRole });
    await refresh();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, loading, refresh, markRead, markAllRead, sendAlert }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
