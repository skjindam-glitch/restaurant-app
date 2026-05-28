import { useState, useRef, createContext, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  ScrollView, Pressable, StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, rolePermissions } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// ─── Shell navigation context (for cross-screen navigation without stack push) ──
interface ShellNavContextType {
  navigateTo: (screen: string, params?: Record<string, any>) => void;
  params: Record<string, any>;
}
const ShellNavContext = createContext<ShellNavContextType>({
  navigateTo: () => {},
  params: {},
});
export function useShellNavigation() {
  return useContext(ShellNavContext);
}
import LoginScreen          from '../screens/LoginScreen';
import DashboardScreen      from '../screens/DashboardScreen';
import TablesScreen         from '../screens/TablesScreen';
import OrdersScreen         from '../screens/OrdersScreen';
import BillingScreen        from '../screens/BillingScreen';
import KitchenScreen        from '../screens/KitchenScreen';
import BillingHistoryScreen from '../screens/BillingHistoryScreen';
import MenuScreen           from '../screens/MenuScreen';
import InvestmentScreen     from '../screens/InvestmentScreen';
import StaffManagementScreen from '../screens/StaffManagementScreen';

const Stack = createStackNavigator();

// ─── Screen registry ─────────────────────────────────────────────────────────
const screenConfig: Record<string, {
  icon: string; label: string; color: string;
  component: React.ComponentType<any>;
}> = {
  dashboard:  { icon: '📊', label: 'Dashboard',    color: '#60a5fa', component: DashboardScreen      },
  tables:     { icon: '🍽', label: 'Tables',        color: '#4ade80', component: TablesScreen         },
  orders:     { icon: '📋', label: 'Orders',        color: '#fbbf24', component: OrdersScreen         },
  billing:    { icon: '💳', label: 'Billing',       color: '#c084fc', component: BillingScreen        },
  kitchen:    { icon: '👨‍🍳', label: 'Kitchen',      color: '#fb923c', component: KitchenScreen        },
  menu:       { icon: '🍴', label: 'Menu',          color: '#f472b6', component: MenuScreen           },
  history:    { icon: '📜', label: 'Bill History',  color: '#818cf8', component: BillingHistoryScreen },
  investment: { icon: '💹', label: 'Investment',    color: '#34d399', component: InvestmentScreen     },
  staff:      { icon: '👥', label: 'Staff',         color: '#fb7185', component: StaffManagementScreen},
};

const roleBadge: Record<string, { bg: string; text: string }> = {
  admin:   { bg: 'rgba(239,68,68,0.2)',   text: '#f87171' },
  manager: { bg: 'rgba(249,115,22,0.2)',  text: '#fb923c' },
  server:  { bg: 'rgba(59,130,246,0.2)',  text: '#60a5fa' },
  cashier: { bg: 'rgba(34,197,94,0.2)',   text: '#4ade80' },
  kitchen: { bg: 'rgba(168,85,247,0.2)',  text: '#c084fc' },
};

const DRAWER_WIDTH = 260;

// ─── Drawer sidebar ───────────────────────────────────────────────────────────
function DrawerSidebar({
  activeScreen, onNavigate, onClose,
}: {
  activeScreen: string;
  onNavigate: (key: string) => void;
  onClose: () => void;
}) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();
  const allowed = user ? (rolePermissions[user.role] ?? []) : [];
  const badge = user ? (roleBadge[user.role] ?? { bg: 'rgba(107,114,128,0.2)', text: '#9ca3af' }) : null;

  return (
    <View style={[drawer.root, { paddingTop: insets.top }]}>
      {/* Brand */}
      <View style={drawer.brand}>
        <View style={drawer.flame}>
          <Text style={{ fontSize: 18 }}>🔥</Text>
        </View>
        <View>
          <Text style={drawer.brandName}>RestaurantOS</Text>
          <Text style={drawer.brandSub}>Billing & POS</Text>
        </View>
      </View>

      {/* User chip */}
      {user && badge && (
        <View style={drawer.userChip}>
          <View style={drawer.avatar}>
            <Text style={drawer.avatarText}>{user.avatar}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={drawer.userName} numberOfLines={1}>{user.name}</Text>
            <View style={[drawer.roleBadge, { backgroundColor: badge.bg }]}>
              <Text style={[drawer.roleText, { color: badge.text }]}>{user.role}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Nav items */}
      <ScrollView style={drawer.nav} showsVerticalScrollIndicator={false}>
        {Object.entries(screenConfig)
          .filter(([key]) => allowed.includes(key))
          .map(([key, cfg]) => {
            const isActive = activeScreen === key;
            return (
              <TouchableOpacity
                key={key}
                onPress={() => { onNavigate(key); onClose(); }}
                style={[drawer.navItem, isActive && drawer.navItemActive]}
                activeOpacity={0.8}
              >
                <Text style={drawer.navIcon}>{cfg.icon}</Text>
                <Text style={[drawer.navLabel, isActive && drawer.navLabelActive, { color: isActive ? '#fff' : '#9ca3af' }]}>
                  {cfg.label}
                </Text>
                {isActive && <View style={[drawer.activeDot, { backgroundColor: cfg.color }]} />}
              </TouchableOpacity>
            );
          })}
      </ScrollView>

      {/* Footer */}
      <View style={[drawer.footer, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={drawer.footerBtn}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>{isDark ? '☀️' : '🌙'}</Text>
          <Text style={drawer.footerBtnText}>{isDark ? 'Light Mode' : 'Dark Mode'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[drawer.footerBtn, drawer.signOutBtn]}
          onPress={logout}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>🚪</Text>
          <Text style={[drawer.footerBtnText, { color: '#f87171' }]}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── App Shell (drawer + screens) ────────────────────────────────────────────
function AppShell() {
  const { user } = useAuth();
  const { isDark, c } = useTheme();
  const insets = useSafeAreaInsets();
  const allowed = user ? (rolePermissions[user.role] ?? []) : [];

  // Default to first allowed screen
  const firstScreen = Object.keys(screenConfig).find(k => allowed.includes(k)) ?? 'tables';
  const [activeScreen, setActiveScreen] = useState(firstScreen);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [screenParams, setScreenParams] = useState<Record<string, any>>({});

  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 0 }),
      Animated.timing(backdropOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.spring(translateX, { toValue: -DRAWER_WIDTH, useNativeDriver: true, bounciness: 0 }),
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const navigateTo = (key: string, params?: Record<string, any>) => {
    setActiveScreen(key);
    setScreenParams(params ?? {});
  };

  const cfg = screenConfig[activeScreen];
  const ScreenComponent = cfg?.component;

  return (
    <ShellNavContext.Provider value={{ navigateTo, params: screenParams }}>
    <View style={[shell.root, { backgroundColor: c.bg }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={c.header}
      />

      {/* Top navigation bar */}
      <View style={[shell.topBar, {
        backgroundColor: c.header,
        borderBottomColor: c.headerBorder,
        paddingTop: insets.top,
      }]}>
        <TouchableOpacity onPress={openDrawer} style={shell.menuBtn} activeOpacity={0.7}>
          <View style={[shell.menuLine, { backgroundColor: c.textPrimary }]} />
          <View style={[shell.menuLine, { backgroundColor: c.textPrimary, width: 18 }]} />
          <View style={[shell.menuLine, { backgroundColor: c.textPrimary }]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[shell.screenTitle, { color: c.textPrimary }]}>{cfg?.label ?? ''}</Text>
        </View>
      </View>

      {/* Screen content */}
      <View style={{ flex: 1 }}>
        {ScreenComponent && <ScreenComponent />}
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <>
          <Animated.View
            style={[shell.backdrop, { opacity: backdropOpacity }]}
            pointerEvents="auto"
          >
            <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer} />
          </Animated.View>
          <Animated.View style={[shell.drawer, { transform: [{ translateX }] }]}>
            <DrawerSidebar
              activeScreen={activeScreen}
              onNavigate={navigateTo}
              onClose={closeDrawer}
            />
          </Animated.View>
        </>
      )}
    </View>
    </ShellNavContext.Provider>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  const { user } = useAuth();

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <Stack.Screen name="Main" component={AppShell} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ─── Drawer styles (always dark sidebar) ─────────────────────────────────────
const drawer = StyleSheet.create({
  root: {
    flex: 1,
    width: DRAWER_WIDTH,
    backgroundColor: '#111827',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  flame: {
    width: 38,
    height: 38,
    backgroundColor: '#f97316',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: 15, fontWeight: '800', color: '#f9fafb', letterSpacing: -0.3 },
  brandSub:  { fontSize: 11, color: '#6b7280', marginTop: 1 },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    margin: 12,
    padding: 10,
    backgroundColor: '#1f2937',
    borderRadius: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText:  { fontSize: 13, fontWeight: '800', color: '#f97316' },
  userName:    { fontSize: 13, fontWeight: '600', color: '#f9fafb', marginBottom: 3 },
  roleBadge:   { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  roleText:    { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  nav:         { flex: 1, paddingHorizontal: 10, paddingTop: 6 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    marginBottom: 2,
  },
  navItemActive: { backgroundColor: '#f97316' },
  navIcon:  { fontSize: 18, width: 24, textAlign: 'center' },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '600' },
  navLabelActive: { color: '#fff' },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  footer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    gap: 2,
  },
  footerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
  },
  signOutBtn: { marginTop: 2 },
  footerBtnText: { fontSize: 14, fontWeight: '600', color: '#9ca3af' },
});

// ─── Shell styles ─────────────────────────────────────────────────────────────
const shell = StyleSheet.create({
  root:   { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 14,
  },
  menuBtn:  { padding: 6, gap: 5, justifyContent: 'center' },
  menuLine: { height: 2, width: 22, borderRadius: 1 },
  screenTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  backdrop: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
    zIndex: 10,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    zIndex: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 16,
  },
});
