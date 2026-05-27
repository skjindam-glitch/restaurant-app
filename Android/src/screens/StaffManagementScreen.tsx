import { useState, useEffect } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, ScrollView, Switch,
} from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import type { StaffDto, CreateStaffRequest, UpdateStaffRequest } from '../api/types';

const ROLES = ['admin', 'manager', 'server', 'cashier', 'kitchen'] as const;

const ALL_SCREENS = ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'menu', 'history', 'investment', 'staff'];

const ROLE_COLORS: Record<string, { bg: string; fg: string }> = {
  admin:   { bg: '#fef2f2', fg: '#b91c1c' },
  manager: { bg: '#fff7ed', fg: '#c2410c' },
  server:  { bg: '#eff6ff', fg: '#1d4ed8' },
  cashier: { bg: '#f0fdf4', fg: '#15803d' },
  kitchen: { bg: '#f5f3ff', fg: '#6d28d9' },
};

function roleStyle(role: string) {
  return ROLE_COLORS[role] ?? { bg: colors.gray100, fg: colors.gray600 };
}

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

const DEFAULT_FORM: StaffForm = {
  name: '', email: '', password: '', role: 'server',
  avatar: '', isActive: true, customPermissions: '', useCustomPerms: false,
};

export default function StaffManagementScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const canManage = user?.role === 'manager' || user?.role === 'admin';

  const [staff, setStaff] = useState<StaffDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [modal, setModal] = useState<{ mode: 'create' | 'edit'; staff?: StaffDto } | null>(null);
  const [form, setForm] = useState<StaffForm>(DEFAULT_FORM);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<number, boolean>>({});

  const fetchStaff = async () => {
    try {
      const data = await api.get<StaffDto[]>('/api/staff');
      setStaff(data);
      setError('');
    } catch {
      setError('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreate = () => {
    setForm(DEFAULT_FORM);
    setFormError('');
    setModal({ mode: 'create' });
  };

  const openEdit = (s: StaffDto) => {
    setForm({
      name: s.name,
      email: s.email,
      password: '',
      role: s.role,
      avatar: s.avatar ?? '',
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
        const req: CreateStaffRequest = {
          name: form.name.trim(), email: form.email.trim(),
          password: form.password, role: form.role,
          avatar: form.avatar.trim() || form.name.trim().slice(0, 2).toUpperCase(),
        };
        await api.post<StaffDto>('/api/staff', req);
      } else if (modal?.staff) {
        const req: UpdateStaffRequest = {
          name: form.name.trim(), email: form.email.trim(),
          password: form.password.trim() || undefined,
          role: form.role,
          avatar: form.avatar.trim() || form.name.trim().slice(0, 2).toUpperCase(),
          isActive: form.isActive,
          customPermissions: customPerms,
        };
        await api.put<StaffDto>(`/api/staff/${modal.staff.id}`, req);
      }
      await fetchStaff();
      setModal(null);
      const msg = modal?.mode === 'create' ? 'Staff member added.' : 'Staff updated.';
      setSuccess(msg);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setFormError('Failed to save. Check details and try again.');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = (s: StaffDto) => {
    Alert.alert('Delete Staff', `Remove ${s.name}? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/staff/${s.id}`);
            await fetchStaff();
            setSuccess(`${s.name} removed.`);
            setTimeout(() => setSuccess(''), 3000);
          } catch {
            setError('Failed to delete staff member.');
          }
        },
      },
    ]);
  };

  const togglePerm = (screen: string) => {
    const perms = form.customPermissions.split(',').filter(Boolean);
    const next = perms.includes(screen)
      ? perms.filter(p => p !== screen)
      : [...perms, screen];
    setForm(f => ({ ...f, customPermissions: next.join(',') }));
  };

  const currentPerms = form.customPermissions.split(',').filter(Boolean);

  const renderStaff = ({ item: s }: { item: StaffDto }) => {
    const rc = roleStyle(s.role);
    return (
      <View style={[styles.staffCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
        <View style={[styles.avatar, { backgroundColor: rc.bg }]}>
          <Text style={[styles.avatarText, { color: rc.fg }]}>{s.avatar || s.name.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.staffInfo}>
          <View style={styles.staffNameRow}>
            <Text style={[styles.staffName, { color: c.textPrimary }]}>{s.name}</Text>
            <View style={[styles.roleBadge, { backgroundColor: rc.bg }]}>
              <Text style={[styles.roleBadgeText, { color: rc.fg }]}>{s.role}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: s.isActive ? colors.greenLt : c.chipBg }]}>
              <Text style={[styles.statusText, { color: s.isActive ? colors.green : c.textMuted }]}>
                {s.isActive ? 'Active' : 'Inactive'}
              </Text>
            </View>
          </View>
          <Text style={[styles.staffEmail, { color: c.textSecondary }]}>{s.email}</Text>
          <View style={styles.staffMeta}>
            <Text style={[styles.staffPwd, { color: c.textSecondary }]}>
              {showPasswords[s.id] ? (s.plainPassword || '(not stored)') : '••••••••'}
            </Text>
            <TouchableOpacity onPress={() => setShowPasswords(p => ({ ...p, [s.id]: !p[s.id] }))} style={styles.eyeBtn}>
              <Text style={{ fontSize: 14 }}>{showPasswords[s.id] ? '🙈' : '👁'}</Text>
            </TouchableOpacity>
            {s.customPermissions ? (
              <Text style={styles.customPermBadge}>🛡 Custom ({s.customPermissions.split(',').length})</Text>
            ) : null}
          </View>
        </View>
        {canManage && (
          <View style={styles.cardActions}>
            <TouchableOpacity onPress={() => openEdit(s)} style={styles.actionBtn}>
              <Text style={{ fontSize: 16 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteStaff(s)} style={styles.actionBtn}>
              <Text style={{ fontSize: 16 }}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Staff" subtitle={`${staff.length} account${staff.length !== 1 ? 's' : ''}`} />

      {/* Top bar */}
      <View style={[styles.topBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
        <Text style={[styles.topBarInfo, { color: c.textSecondary }]}>{staff.length} staff members</Text>
        {canManage && (
          <TouchableOpacity onPress={openCreate} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add Staff</Text>
          </TouchableOpacity>
        )}
      </View>

      {error !== '' && (
        <View style={styles.alertBanner}>
          <Text style={[styles.alertText, { color: colors.red }]}>{error}</Text>
        </View>
      )}
      {success !== '' && (
        <View style={[styles.alertBanner, { backgroundColor: colors.greenLt, borderColor: '#bbf7d0' }]}>
          <Text style={[styles.alertText, { color: colors.green }]}>{success}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 48 }} />
      ) : (
        <FlatList
          data={staff}
          keyExtractor={s => String(s.id)}
          renderItem={renderStaff}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={styles.emptyIcon}>👤</Text>
              <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No staff accounts</Text>
              {canManage && <Text style={[styles.emptySub, { color: c.textMuted }]}>Tap "+ Add Staff" to create one</Text>}
            </View>
          }
        />
      )}

      {/* Create / Edit Modal */}
      <Modal visible={modal !== null} transparent animationType="slide" onRequestClose={() => setModal(null)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModal(null)} />
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>
                {modal?.mode === 'create' ? 'Add Staff Member' : `Edit — ${modal?.staff?.name}`}
              </Text>
              <TouchableOpacity onPress={() => setModal(null)}>
                <Text style={[styles.closeBtn, { color: c.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {formError !== '' && (
              <View style={styles.formError}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Name + Avatar row */}
              <View style={styles.fieldRow}>
                <View style={styles.fieldHalf}>
                  <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Full Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                    value={form.name}
                    onChangeText={t => setForm(f => ({ ...f, name: t }))}
                    placeholder="John Doe"
                    placeholderTextColor={c.textMuted}
                  />
                </View>
                <View style={styles.fieldHalf}>
                  <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Initials</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                    value={form.avatar}
                    onChangeText={t => setForm(f => ({ ...f, avatar: t.slice(0, 2).toUpperCase() }))}
                    placeholder="Auto"
                    placeholderTextColor={c.textMuted}
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Email *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={form.email}
                onChangeText={t => setForm(f => ({ ...f, email: t }))}
                placeholder="john@restaurant.com"
                placeholderTextColor={c.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>
                Password {modal?.mode === 'edit' ? '(blank = keep existing)' : '*'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={form.password}
                onChangeText={t => setForm(f => ({ ...f, password: t }))}
                placeholder={modal?.mode === 'edit' ? 'Leave blank to keep' : 'Enter password'}
                placeholderTextColor={c.textMuted}
              />

              {/* Role picker */}
              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Role</Text>
              <View style={styles.rolePills}>
                {ROLES.map(r => {
                  const rc = roleStyle(r);
                  return (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setForm(f => ({ ...f, role: r }))}
                      style={[
                        styles.rolePill,
                        form.role === r
                          ? { backgroundColor: rc.bg, borderColor: rc.fg }
                          : { backgroundColor: c.inputBg, borderColor: c.cardBorder },
                      ]}
                    >
                      <Text style={[styles.rolePillText, { color: form.role === r ? rc.fg : c.textSecondary }]}>
                        {r}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status (edit only) */}
              {modal?.mode === 'edit' && (
                <View style={styles.switchRow}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Account Active</Text>
                    <Text style={[styles.switchSub, { color: c.textMuted }]}>Inactive staff cannot log in</Text>
                  </View>
                  <Switch
                    value={form.isActive}
                    onValueChange={v => setForm(f => ({ ...f, isActive: v }))}
                    trackColor={{ false: c.cardBorder, true: colors.primary }}
                    thumbColor={c.white}
                  />
                </View>
              )}

              {/* Custom Permissions (edit only) */}
              {modal?.mode === 'edit' && (
                <View style={[styles.permsBox, { borderColor: c.cardBorder }]}>
                  <View style={styles.switchRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Override Screen Access</Text>
                      <Text style={[styles.switchSub, { color: c.textMuted }]}>Override the role's default screens for this account</Text>
                    </View>
                    <Switch
                      value={form.useCustomPerms}
                      onValueChange={v => setForm(f => ({ ...f, useCustomPerms: v }))}
                      trackColor={{ false: c.cardBorder, true: colors.primary }}
                      thumbColor={c.white}
                    />
                  </View>
                  {form.useCustomPerms && (
                    <View style={styles.screenPills}>
                      {ALL_SCREENS.map(screen => (
                        <TouchableOpacity
                          key={screen}
                          onPress={() => togglePerm(screen)}
                          style={[
                            styles.screenPill,
                            currentPerms.includes(screen)
                              ? { backgroundColor: colors.primary, borderColor: colors.primary }
                              : { backgroundColor: c.inputBg, borderColor: c.cardBorder },
                          ]}
                        >
                          <Text style={[
                            styles.screenPillText,
                            { color: currentPerms.includes(screen) ? '#fff' : c.textSecondary },
                          ]}>
                            {screen}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => setModal(null)} style={[styles.cancelBtn, { borderColor: c.cardBorder }]}>
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={save} style={styles.saveBtn} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>{modal?.mode === 'create' ? 'Add Staff' : 'Save Changes'}</Text>
                  }
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },

  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  topBarInfo: { fontSize: 13, color: colors.gray500 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  alertBanner: { backgroundColor: colors.redLt, borderWidth: 1, borderColor: '#fecaca', margin: 12, borderRadius: 10, padding: 10 },
  alertText: { fontSize: 13 },

  list: { padding: 14, paddingBottom: 32 },

  staffCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.white, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.gray100 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 15, fontWeight: '800' },
  staffInfo: { flex: 1 },
  staffNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginBottom: 3 },
  staffName: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  roleBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  roleBadgeText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  statusText: { fontSize: 11, fontWeight: '600' },
  staffEmail: { fontSize: 12, color: colors.gray500, marginBottom: 4 },
  staffMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  staffPwd: { fontSize: 13, color: colors.gray700, fontFamily: 'monospace' },
  eyeBtn: { padding: 2 },
  customPermBadge: { fontSize: 11, color: colors.primary, fontWeight: '600' },
  cardActions: { flexDirection: 'column', gap: 4, marginLeft: 8 },
  actionBtn: { padding: 6 },

  emptyBox: { backgroundColor: colors.white, borderRadius: 14, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200, marginTop: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 10 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.gray500 },
  emptySub: { fontSize: 12, color: colors.gray400, marginTop: 4 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '92%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900, flex: 1, marginRight: 8 },
  closeBtn: { fontSize: 18, color: colors.gray400, padding: 4 },

  formError: { backgroundColor: colors.redLt, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10, marginBottom: 12 },
  formErrorText: { color: colors.red, fontSize: 13 },

  fieldRow: { flexDirection: 'row', gap: 12 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.gray900, backgroundColor: colors.white, marginBottom: 14 },

  rolePills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  rolePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 2 },
  rolePillText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  switchSub: { fontSize: 11, color: colors.gray400, marginTop: 2 },

  permsBox: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, padding: 12, marginBottom: 14 },
  screenPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  screenPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  screenPillText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: colors.gray600, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
