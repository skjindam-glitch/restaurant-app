import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, X, AlertCircle, CheckCircle, Shield } from 'lucide-react';
import { api } from '../api/client';
import type { StaffDto, CreateStaffRequest, UpdateStaffRequest } from '../api/types';

const ROLES = ['admin', 'manager', 'server', 'cashier', 'kitchen'];

const ALL_SCREENS = ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'menu', 'reports', 'staff', 'investment'];

const roleColors: Record<string, string> = {
  admin:   'bg-red-100 text-red-700',
  manager: 'bg-orange-100 text-orange-700',
  server:  'bg-blue-100 text-blue-700',
  cashier: 'bg-green-100 text-green-700',
  kitchen: 'bg-purple-100 text-purple-700',
};

interface StaffForm {
  name: string;
  email: string;
  password: string;
  role: string;
  avatar: string;
  isActive: boolean;
  customPermissions: string;
  useCustomPerms: boolean;
}

const defaultForm: StaffForm = {
  name: '', email: '', password: '', role: 'server',
  avatar: '', isActive: true, customPermissions: '', useCustomPerms: false,
};

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; staff?: StaffDto } | null>(null);
  const [form, setForm] = useState<StaffForm>(defaultForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const fetchStaff = async () => {
    try {
      const data = await api.get<StaffDto[]>('/api/staff');
      setStaff(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreate = () => {
    setForm(defaultForm);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (s: StaffDto) => {
    const perms = s.customPermissions?.split(',').filter(Boolean) ?? [];
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      role: s.role,
      avatar: s.avatar,
      isActive: s.isActive,
      customPermissions: s.customPermissions ?? '',
      useCustomPerms: !!s.customPermissions,
    });
    setFormError('');
    setModal({ mode: 'edit', staff: s });
  };

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { setFormError('Name and email are required.'); return; }
    if (modal?.mode === 'create' && !form.password.trim()) { setFormError('Password is required for new staff.'); return; }

    setSaving(true);
    setFormError('');
    try {
      const customPerms = form.useCustomPerms ? form.customPermissions : undefined;

      if (modal?.mode === 'create') {
        const req: CreateStaffRequest = { name: form.name, email: form.email, password: form.password, role: form.role, avatar: form.avatar };
        await api.post<StaffDto>('/api/staff', req);
      } else if (modal?.staff) {
        const req: UpdateStaffRequest = {
          name: form.name, email: form.email,
          password: form.password || undefined,
          role: form.role, avatar: form.avatar,
          isActive: form.isActive,
          customPermissions: customPerms,
        };
        await api.put<StaffDto>(`/api/staff/${modal.staff.id}`, req);
      }

      await fetchStaff();
      setModal(null);
      setSuccess(modal?.mode === 'create' ? 'Staff member added.' : 'Staff updated.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (s: StaffDto) => {
    if (!window.confirm(`Delete ${s.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/staff/${s.id}`);
      await fetchStaff();
      setSuccess(`${s.name} removed.`);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const togglePerm = (screen: string) => {
    const perms = form.customPermissions.split(',').filter(Boolean);
    const next = perms.includes(screen)
      ? perms.filter(p => p !== screen)
      : [...perms, screen];
    setForm(f => ({ ...f, customPermissions: next.join(',') }));
  };

  const currentPerms = form.customPermissions.split(',').filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{staff.length} staff accounts</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
        >
          <Plus size={16} />
          Add Staff
        </button>
      </div>

      {/* Alerts */}
      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"><AlertCircle size={15} />{error}</div>}
      {success && <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm"><CheckCircle size={15} />{success}</div>}

      {/* Staff Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="text-left px-5 py-3 font-medium">Staff Member</th>
              <th className="text-left px-5 py-3 font-medium">Email</th>
              <th className="text-left px-5 py-3 font-medium">Role</th>
              <th className="text-left px-5 py-3 font-medium">Password</th>
              <th className="text-left px-5 py-3 font-medium">Custom Screens</th>
              <th className="text-center px-5 py-3 font-medium">Status</th>
              <th className="text-right px-5 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {staff.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${roleColors[s.role] || 'bg-gray-100 text-gray-600'}`}>
                      {s.avatar}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-white">{s.name}</p>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{s.email}</td>
                <td className="px-5 py-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${roleColors[s.role] || 'bg-gray-100 text-gray-600'}`}>
                    {s.role}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                      {showPasswords[s.id] ? (s.plainPassword || '(not stored)') : '••••••••'}
                    </span>
                    <button
                      onClick={() => setShowPasswords(p => ({ ...p, [s.id]: !p[s.id] }))}
                      className="text-gray-400 hover:text-gray-600 transition"
                    >
                      {showPasswords[s.id] ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {s.customPermissions ? (
                    <div className="flex items-center gap-1">
                      <Shield size={12} className="text-orange-500" />
                      <span className="text-xs text-orange-600 font-medium">Custom ({s.customPermissions.split(',').length})</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">Role defaults</span>
                  )}
                </td>
                <td className="px-5 py-3 text-center">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {s.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button onClick={() => openEdit(s)} className="p-1.5 text-gray-400 hover:text-orange-500 transition">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteStaff(s)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {modal.mode === 'create' ? 'Add Staff Member' : `Edit — ${modal.staff?.name}`}
              </h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle size={13} />{formError}
              </div>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initials (Avatar)</label>
                  <input value={form.avatar} onChange={e => setForm(f => ({ ...f, avatar: e.target.value.slice(0,2).toUpperCase() }))}
                    placeholder="Auto from name"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password {modal.mode === 'edit' ? '(leave blank to keep existing)' : '*'}
                </label>
                <input type="text" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white">
                    {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
                  </select>
                </div>
                {modal.mode === 'edit' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    <select value={form.isActive ? 'active' : 'inactive'} onChange={e => setForm(f => ({ ...f, isActive: e.target.value === 'active' }))}
                      className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </div>

              {modal.mode === 'edit' && (
                <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input type="checkbox" id="customPerms" checked={form.useCustomPerms}
                      onChange={e => setForm(f => ({ ...f, useCustomPerms: e.target.checked }))}
                      className="rounded" />
                    <label htmlFor="customPerms" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Override screen access for this account
                    </label>
                  </div>
                  {form.useCustomPerms && (
                    <div className="flex flex-wrap gap-2">
                      {ALL_SCREENS.map(screen => (
                        <button
                          key={screen}
                          type="button"
                          onClick={() => togglePerm(screen)}
                          className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition ${currentPerms.includes(screen) ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}`}
                        >
                          {screen}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setModal(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-300 transition">
                Cancel
              </button>
              <button onClick={save} disabled={saving}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {modal.mode === 'create' ? 'Add Staff' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
