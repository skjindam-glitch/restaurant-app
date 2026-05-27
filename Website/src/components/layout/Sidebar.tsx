import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, CreditCard,
  ChefHat, BookOpen, BarChart3, LogOut, Flame, Users, TrendingUp, History, Sun, Moon, Megaphone, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useNotifications } from '../../context/NotificationContext';

const allNavItems = [
  { to: '/dashboard',  key: 'dashboard',  icon: LayoutDashboard, label: 'Dashboard',    color: 'text-blue-400'   },
  { to: '/tables',     key: 'tables',     icon: UtensilsCrossed,  label: 'Tables',       color: 'text-green-400'  },
  { to: '/orders',     key: 'orders',     icon: ClipboardList,    label: 'Orders',       color: 'text-yellow-400' },
  { to: '/billing',    key: 'billing',    icon: CreditCard,       label: 'Billing',      color: 'text-purple-400' },
  { to: '/kitchen',    key: 'kitchen',    icon: ChefHat,          label: 'Kitchen',      color: 'text-orange-400' },
  { to: '/menu',       key: 'menu',       icon: BookOpen,         label: 'Menu',         color: 'text-pink-400'   },
  { to: '/reports',    key: 'reports',    icon: BarChart3,        label: 'Reports',      color: 'text-cyan-400'   },
  { to: '/history',    key: 'billing',    icon: History,          label: 'Bill History', color: 'text-indigo-400' },
  { to: '/investment', key: 'investment', icon: TrendingUp,       label: 'Investment',   color: 'text-emerald-400'},
  { to: '/staff',      key: 'staff',      icon: Users,            label: 'Staff',        color: 'text-rose-400'   },
];

const roleBadgeColors: Record<string, string> = {
  admin:   'bg-red-500/20 text-red-400',
  manager: 'bg-orange-500/20 text-orange-400',
  server:  'bg-blue-500/20 text-blue-400',
  cashier: 'bg-green-500/20 text-green-400',
  kitchen: 'bg-purple-500/20 text-purple-400',
};

interface SidebarProps {
  collapsed: boolean;
}

export default function Sidebar({ collapsed }: SidebarProps) {
  const { user, logout, can } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { sendAlert } = useNotifications();
  const navigate = useNavigate();
  const navItems = allNavItems.filter(item => can(item.key));

  const [alertModal, setAlertModal] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertRole, setAlertRole] = useState('');
  const [alertLoading, setAlertLoading] = useState(false);
  const [alertSent, setAlertSent] = useState(false);

  const canAlert = user?.role === 'manager' || user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSendAlert = async () => {
    if (!alertTitle.trim() || !alertMessage.trim()) return;
    setAlertLoading(true);
    try {
      await sendAlert(alertTitle.trim(), alertMessage.trim(), alertRole || undefined);
      setAlertSent(true);
      setTimeout(() => {
        setAlertModal(false);
        setAlertTitle('');
        setAlertMessage('');
        setAlertRole('');
        setAlertSent(false);
      }, 1500);
    } catch {
      // ignore
    } finally {
      setAlertLoading(false);
    }
  };

  return (
    <>
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} min-h-screen bg-gray-900 flex flex-col transition-all duration-200 overflow-hidden shrink-0`}
      >
        {/* Brand */}
        <div className={`border-b border-gray-800 flex items-center ${collapsed ? 'justify-center px-0 py-5' : 'px-6 py-5'}`}>
          {collapsed ? (
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <Flame size={20} className="text-white" />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                <Flame size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white font-bold text-base leading-tight">RestaurantOS</p>
                <p className="text-gray-400 text-xs">Billing & POS</p>
              </div>
            </div>
          )}
        </div>

        {/* User Info */}
        {user && (
          <div className={`border-b border-gray-800 ${collapsed ? 'px-2 py-3' : 'px-4 py-3'}`}>
            <div className={`flex items-center rounded-xl bg-gray-800/60 ${collapsed ? 'justify-center p-2' : 'gap-3 px-2 py-2'}`}>
              <div
                className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold shrink-0"
                title={collapsed ? `${user.name} (${user.role})` : undefined}
              >
                {user.avatar}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-white text-sm font-medium truncate leading-tight">{user.name}</p>
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded capitalize ${roleBadgeColors[user.role] || 'bg-gray-700 text-gray-400'}`}>
                    {user.role}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className={`flex-1 py-4 space-y-0.5 overflow-y-auto ${collapsed ? 'px-2' : 'px-3'}`}>
          {navItems.map(({ to, icon: Icon, label, color }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm font-medium transition-all duration-150 ${
                  collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
                } ${
                  isActive ? 'bg-orange-500 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? 'text-white' : color} />
                  {!collapsed && label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className={`border-t border-gray-800 py-4 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {canAlert && (
            <button
              onClick={() => setAlertModal(true)}
              title={collapsed ? 'Send Staff Alert' : undefined}
              className={`w-full flex items-center rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150 ${
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
              }`}
            >
              <Megaphone size={18} />
              {!collapsed && 'Send Staff Alert'}
            </button>
          )}
          <button
            onClick={toggleTheme}
            title={collapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-all duration-150 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
          >
            {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} />}
            {!collapsed && (isDark ? 'Light Mode' : 'Dark Mode')}
          </button>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : undefined}
            className={`w-full flex items-center rounded-lg text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-150 ${
              collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5'
            }`}
          >
            <LogOut size={18} />
            {!collapsed && 'Sign Out'}
          </button>
        </div>
      </aside>

      {/* Send Alert Modal */}
      {alertModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center">
                  <Megaphone size={16} className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Send Staff Alert</h3>
              </div>
              <button onClick={() => setAlertModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {alertSent ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Megaphone size={22} className="text-green-500" />
                </div>
                <p className="text-green-600 dark:text-green-400 font-medium">Alert sent successfully!</p>
              </div>
            ) : (
              <>
                <div className="space-y-4 mb-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Alert Title</label>
                    <input
                      type="text"
                      value={alertTitle}
                      onChange={e => setAlertTitle(e.target.value)}
                      placeholder="e.g. Urgent: Kitchen crew needed"
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message / Reason</label>
                    <textarea
                      value={alertMessage}
                      onChange={e => setAlertMessage(e.target.value)}
                      placeholder="Describe what you need from staff..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Target (optional)</label>
                    <select
                      value={alertRole}
                      onChange={e => setAlertRole(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">All Staff</option>
                      <option value="server">Servers only</option>
                      <option value="cashier">Cashiers only</option>
                      <option value="kitchen">Kitchen only</option>
                      <option value="manager">Managers only</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setAlertModal(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 transition">
                    Cancel
                  </button>
                  <button
                    onClick={handleSendAlert}
                    disabled={alertLoading || !alertTitle.trim() || !alertMessage.trim()}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {alertLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    <Megaphone size={15} />
                    Send Alert
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
