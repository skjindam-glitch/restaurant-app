import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame, Eye, EyeOff, LayoutDashboard, UtensilsCrossed,
  ClipboardList, CreditCard, ChefHat, BookOpen, BarChart3, Check, AlertCircle
} from 'lucide-react';
import { useAuth, rolePermissions, roleHomeRoute } from '../context/AuthContext';
import { UserRole } from '../types';

const roles: { id: UserRole; label: string; desc: string; color: string; border: string }[] = [
  { id: 'admin',   label: 'Owner/Admin',   desc: 'All screens + staff & finance', color: 'text-red-400',    border: 'border-red-500/40'    },
  { id: 'manager', label: 'Manager',       desc: 'Tables, orders, billing, menu', color: 'text-orange-500', border: 'border-orange-500/40' },
  { id: 'server',  label: 'Server',        desc: 'Tables & order taking',         color: 'text-blue-400',   border: 'border-blue-500/40'   },
  { id: 'cashier', label: 'Cashier',       desc: 'Billing & payments',            color: 'text-green-400',  border: 'border-green-500/40'  },
  { id: 'kitchen', label: 'Kitchen Staff', desc: 'Kitchen display only',          color: 'text-purple-400', border: 'border-purple-500/40' },
];

const screenMeta: { key: string; label: string; Icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { key: 'tables',    label: 'Tables',    Icon: UtensilsCrossed  },
  { key: 'orders',    label: 'Orders',    Icon: ClipboardList    },
  { key: 'billing',   label: 'Billing',   Icon: CreditCard       },
  { key: 'kitchen',   label: 'Kitchen',   Icon: ChefHat          },
  { key: 'menu',      label: 'Menu',      Icon: BookOpen         },
  { key: 'reports',   label: 'Reports',   Icon: BarChart3        },
];

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('manager');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      // Role comes from the API; navigate based on actual role after login.
      // useAuth().user is updated by login(); read it after state flush via navigate.
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const perms = rolePermissions[selectedRole];
  const activeRole = roles.find(r => r.id === selectedRole)!;

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Left — Branding + Role Access Preview */}
      <div className="hidden lg:flex lg:w-[46%] bg-gradient-to-br from-orange-600 via-orange-500 to-amber-400 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Flame size={22} className="text-white" />
          </div>
          <span className="text-white font-bold text-xl">RestaurantOS</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-3">
            One platform.<br />Every role.
          </h2>
          <p className="text-orange-100 text-base mb-8">
            Each team member sees exactly what they need — select a role to preview access.
          </p>

          <div className="space-y-2.5">
            {roles.map(role => (
              <div
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all ${selectedRole === role.id ? 'bg-white/25 ring-1 ring-white/40' : 'bg-white/10 hover:bg-white/15'}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <p className="font-semibold text-sm text-white">{role.label}</p>
                  <div className="flex gap-1">
                    {screenMeta.map(({ key, Icon }) => {
                      const allowed = rolePermissions[role.id].includes(key);
                      return (
                        <div key={key} title={key} className={`w-6 h-6 rounded-md flex items-center justify-center ${allowed ? 'bg-white/30 text-white' : 'bg-black/20 text-white/25'}`}>
                          <Icon size={11} />
                        </div>
                      );
                    })}
                  </div>
                </div>
                <p className="text-xs text-orange-100">{role.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-orange-200 text-xs">© 2025 RestaurantOS. All rights reserved.</p>
      </div>

      {/* Right — Login Form */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-orange-500 rounded-xl flex items-center justify-center">
              <Flame size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-lg">RestaurantOS</span>
          </div>

          <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-gray-400 mb-6">Choose a role to preview access, then sign in</p>

          {/* Role Selector (preview only) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-5">
            {roles.map(role => (
              <button
                key={role.id}
                type="button"
                onClick={() => setSelectedRole(role.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  selectedRole === role.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                }`}
              >
                <p className={`text-sm font-semibold mb-0.5 ${selectedRole === role.id ? 'text-white' : 'text-gray-300'}`}>{role.label}</p>
                <p className="text-xs text-gray-500 leading-tight">{role.desc}</p>
              </button>
            ))}
          </div>

          {/* Screen Access Preview Panel */}
          <div className={`mb-6 p-4 rounded-xl border ${activeRole.border} bg-white/5`}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Screens visible as {activeRole.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {screenMeta.map(({ key, label, Icon }) => {
                const allowed = perms.includes(key);
                return (
                  <div key={key} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${allowed ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
                    {allowed
                      ? <Check size={11} className="text-green-400 shrink-0" />
                      : <span className="w-3 h-0.5 bg-gray-600 rounded shrink-0" />
                    }
                    <Icon size={12} className={allowed ? activeRole.color : 'text-gray-500'} />
                    <span className={allowed ? '' : 'line-through'}>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={`${selectedRole}@resto.com`}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="password123"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition pr-11"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-gray-600 text-xs mt-5">
            Use <span className="text-gray-500">{selectedRole === 'admin' ? 'admin' : selectedRole}@resto.com</span> / <span className="text-gray-500">password123</span>
          </p>
        </div>
      </div>
    </div>
  );
}
