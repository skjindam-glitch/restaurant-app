import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, rolePermissions } from '../context/AuthContext';
import { colors } from '../theme/colors';

type DemoRole = 'manager' | 'server' | 'cashier' | 'kitchen';

const roles: { id: DemoRole; label: string; desc: string; accent: string; bg: string; email: string }[] = [
  { id: 'manager', label: 'Manager',       desc: 'Full access',         accent: colors.primary, bg: '#fff7ed', email: 'manager@resto.com' },
  { id: 'server',  label: 'Server',        desc: 'Tables & orders',     accent: colors.blue,    bg: '#eff6ff', email: 'server@resto.com'  },
  { id: 'cashier', label: 'Cashier',       desc: 'Billing & payments',  accent: colors.green,   bg: '#f0fdf4', email: 'cashier@resto.com' },
  { id: 'kitchen', label: 'Kitchen Staff', desc: 'KDS only',            accent: colors.purple,  bg: '#f5f3ff', email: 'kitchen@resto.com' },
];

const allScreens = ['dashboard', 'tables', 'orders', 'billing', 'kitchen', 'history'];
const screenLabels: Record<string, string> = {
  dashboard: 'Dashboard', tables: 'Tables', orders: 'Orders',
  billing: 'Billing', kitchen: 'Kitchen', history: 'History',
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<DemoRole>('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const perms = rolePermissions[selectedRole] ?? [];
  const activeRole = roles.find(r => r.id === selectedRole)!;

  const handleRoleSelect = (role: DemoRole) => {
    setSelectedRole(role);
    setEmail(roles.find(r => r.id === role)!.email);
    setPassword('password123');
    setError('');
  };

  const handleLogin = async () => {
    const resolvedEmail = email.trim() || activeRole.email;
    const resolvedPw = password || 'password123';
    setLoading(true);
    setError('');
    try {
      await login(resolvedEmail, resolvedPw);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" backgroundColor={colors.gray900} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24 }]} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Text style={styles.logoIcon}>🔥</Text>
          </View>
          <Text style={styles.brand}>RestaurantOS</Text>
          <Text style={styles.tagline}>Billing & POS</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Choose your role to sign in</Text>

        {/* Role Selector */}
        <View style={styles.roleGrid}>
          {roles.map(role => (
            <TouchableOpacity
              key={role.id}
              onPress={() => handleRoleSelect(role.id)}
              style={[styles.roleCard, selectedRole === role.id && { borderColor: role.accent, backgroundColor: role.bg }]}
              activeOpacity={0.8}
            >
              <Text style={[styles.roleLabel, selectedRole === role.id && { color: role.accent }]}>{role.label}</Text>
              <Text style={styles.roleDesc}>{role.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Access Preview */}
        <View style={[styles.accessBox, { borderColor: activeRole.accent + '60' }]}>
          <Text style={styles.accessTitle}>Screens visible as {activeRole.label}</Text>
          <View style={styles.accessGrid}>
            {allScreens.map(screen => {
              const allowed = perms.includes(screen);
              return (
                <View key={screen} style={[styles.accessItem, allowed ? styles.accessAllowed : styles.accessDenied]}>
                  <Text style={[styles.accessCheck, { color: allowed ? colors.green : colors.gray400 }]}>
                    {allowed ? '✓' : '×'}
                  </Text>
                  <Text style={[styles.accessLabel, !allowed && styles.accessLabelDenied]}>
                    {screenLabels[screen]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={activeRole.email}
            placeholderTextColor={colors.gray600}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password</Text>
          <View style={styles.pwRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="password123"
              placeholderTextColor={colors.gray600}
              secureTextEntry={!showPw}
            />
            <TouchableOpacity onPress={() => setShowPw(!showPw)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPw ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️  {error}</Text>
          </View>
        ) : null}

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: activeRole.accent }, loading && { opacity: 0.7 }]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color={colors.white} />
            : <Text style={styles.loginBtnText}>Sign In as {activeRole.label}</Text>
          }
        </TouchableOpacity>

        <Text style={styles.demoNote}>Tap a role to auto-fill demo credentials</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray900 },
  scroll: { padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  logoIcon: { fontSize: 28 },
  brand: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  tagline: { fontSize: 13, color: colors.gray500, marginTop: 2 },
  title: { fontSize: 24, fontWeight: '700', color: colors.white, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.gray400, marginBottom: 20 },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  roleCard: { width: '47.5%', padding: 14, borderRadius: 14, borderWidth: 2, borderColor: colors.gray700, backgroundColor: colors.gray800 },
  roleLabel: { fontSize: 14, fontWeight: '700', color: colors.gray200, marginBottom: 3 },
  roleDesc: { fontSize: 12, color: colors.gray500 },
  accessBox: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.04)' },
  accessTitle: { fontSize: 11, fontWeight: '600', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  accessGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accessItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: '44%' },
  accessAllowed: { backgroundColor: 'rgba(255,255,255,0.08)' },
  accessDenied: { opacity: 0.35 },
  accessCheck: { fontSize: 13, fontWeight: '700', width: 14 },
  accessLabel: { fontSize: 12, fontWeight: '500', color: colors.white },
  accessLabelDenied: { color: colors.gray600, textDecorationLine: 'line-through' },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.gray300, marginBottom: 8 },
  input: { backgroundColor: colors.gray800, borderWidth: 1.5, borderColor: colors.gray700, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 13, fontSize: 14, color: colors.white },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  eyeBtn: { padding: 13, backgroundColor: colors.gray800, borderWidth: 1.5, borderColor: colors.gray700, borderRadius: 12 },
  eyeText: { fontSize: 16 },
  errorBox: { backgroundColor: '#450a0a', borderWidth: 1, borderColor: '#7f1d1d', borderRadius: 12, padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: '#fca5a5', fontWeight: '500' },
  loginBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8, marginBottom: 16 },
  loginBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  demoNote: { fontSize: 12, color: colors.gray700, textAlign: 'center', marginBottom: 32 },
});
