import { useState, useRef, useEffect } from 'react';
import { Bell, Sun, Moon, Check, CheckCheck, X, Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard':  { title: 'Dashboard',           subtitle: "Good morning — here's your restaurant overview" },
  '/tables':     { title: 'Table Management',    subtitle: 'Monitor and manage all tables on the floor'    },
  '/orders':     { title: 'Order Taking',        subtitle: 'Browse the menu and place new orders'          },
  '/billing':    { title: 'Billing & Payment',  subtitle: 'Process payments and generate bills'           },
  '/kitchen':    { title: 'Kitchen Display',    subtitle: 'Live order queue for kitchen staff'            },
  '/menu':       { title: 'Menu Management',    subtitle: 'Manage items, categories, and pricing'         },
  '/reports':    { title: 'Reports & Analytics', subtitle: 'Sales insights and performance metrics'       },
  '/history':    { title: 'Billing History',    subtitle: 'View all past payments and transactions'       },
  '/staff':      { title: 'Staff Management',   subtitle: 'Manage accounts, roles, and permissions'      },
  '/investment': { title: 'Investment Tracker', subtitle: 'Track daily expenses and view profit'          },
};

const roleBadgeColors: Record<string, string> = {
  admin:   'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400',
  manager: 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400',
  server:  'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
  cashier: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400',
  kitchen: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400',
};

const typeColors: Record<string, string> = {
  manager_alert: 'bg-red-500',
  order_ready:   'bg-green-500',
  call_staff:    'bg-orange-500',
  system:        'bg-blue-500',
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const page = pageTitles[location.pathname] || { title: 'RestaurantOS', subtitle: '' };

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 sticky top-0 z-30">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Toggle menu"
          >
            <Menu size={18} className="text-gray-600 dark:text-gray-400" />
          </button>
        )}
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{page.title}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">{page.subtitle}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun size={18} className="text-yellow-400" />
            : <Moon size={18} className="text-gray-600" />
          }
        </button>

        {/* Bell */}
        <div className="relative" ref={bellRef}>
          <button
            onClick={() => setBellOpen(v => !v)}
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Bell size={18} className="text-gray-600 dark:text-gray-400" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                <span className="font-semibold text-sm text-gray-900 dark:text-white">
                  Notifications {unreadCount > 0 && <span className="text-orange-500">({unreadCount})</span>}
                </span>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-orange-500 hover:text-orange-600 flex items-center gap-1">
                      <CheckCheck size={13} /> Mark all read
                    </button>
                  )}
                  <button onClick={() => setBellOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    <X size={15} />
                  </button>
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center text-gray-400">
                    <Bell size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No notifications yet</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && markRead(n.id)}
                      className={`flex gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.isRead ? 'bg-orange-50/50 dark:bg-orange-950/20' : ''}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${typeColors[n.type] || 'bg-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${n.isRead ? 'text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                        <p className="text-[10px] text-gray-400 mt-1">{n.createdByName} · {timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <Check size={13} className="text-orange-400 shrink-0 mt-1" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${roleBadgeColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
              {user.avatar}
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
