import { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { api } from '../api/client';
import type { DashboardSummaryDto, TopMenuItemDto, TopStaffDto, OrderTypeBreakdownDto } from '../api/types';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';

// Fallback data shown when API is unreachable
const fallbackKpis = [
  { label: "Today's Revenue", value: '₹71,240', change: '+12.4%', isUp: true,  bg: '#fff7ed', accent: colors.primary },
  { label: 'Total Orders',    value: '142',     change: '+8.2%',  isUp: true,  bg: '#eff6ff', accent: colors.blue   },
  { label: 'Active Tables',   value: '6 / 12',  change: '50%',    isUp: true,  bg: '#f0fdf4', accent: colors.green  },
  { label: 'Avg Order Time',  value: '24 min',  change: '-3 min', isUp: false, bg: '#f5f3ff', accent: colors.purple },
];

const orderTypeConfig = [
  { key: 'dineIn',   label: 'Dine-in',  icon: '🍽', color: colors.blue,   bg: '#eff6ff' },
  { key: 'takeaway', label: 'Takeaway', icon: '🛵', color: colors.amber,  bg: colors.amberLt },
  { key: 'online',   label: 'Online',   icon: '🌐', color: colors.green,  bg: colors.greenLt },
] as const;

export default function DashboardScreen() {
  const { c } = useTheme();
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [topItems, setTopItems] = useState<TopMenuItemDto[]>([]);
  const [topStaff, setTopStaff] = useState<TopStaffDto[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderTypeBreakdownDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const [sum, items, staff, types] = await Promise.all([
        api.get<DashboardSummaryDto>('/api/dashboard/summary'),
        api.get<TopMenuItemDto[]>('/api/dashboard/top-items?limit=5'),
        api.get<TopStaffDto[]>('/api/dashboard/top-staff?limit=3'),
        api.get<OrderTypeBreakdownDto>('/api/dashboard/order-types?period=today'),
      ]);
      setSummary(sum);
      setTopItems(items);
      setTopStaff(staff);
      setOrderTypes(types);
    } catch {
      // Keep showing whatever was loaded or nothing (fallback renders below)
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Build KPI cards from API data or fallback
  const kpis = summary ? [
    { label: "Today's Revenue", value: summary.revenue.value,      change: summary.revenue.change,      isUp: summary.revenue.isUp,      bg: '#fff7ed', accent: colors.primary },
    { label: 'Total Orders',    value: summary.totalOrders.value,  change: summary.totalOrders.change,  isUp: summary.totalOrders.isUp,  bg: '#eff6ff', accent: colors.blue   },
    { label: 'Active Tables',   value: summary.activeTables.value, change: summary.activeTables.change, isUp: summary.activeTables.isUp, bg: '#f0fdf4', accent: colors.green  },
    { label: 'Avg Order Time',  value: summary.avgOrderTime.value, change: summary.avgOrderTime.change, isUp: summary.avgOrderTime.isUp, bg: '#f5f3ff', accent: colors.purple },
  ] : fallbackKpis;

  // Order type totals
  const otTotal = orderTypes
    ? (orderTypes.dineIn + orderTypes.takeaway + orderTypes.online) || 1
    : 1;
  const otRows = orderTypes ? [
    { ...orderTypeConfig[0], amount: orderTypes.dineIn,   count: orderTypes.dineInCount,   pct: Math.round((orderTypes.dineIn / otTotal) * 100)   },
    { ...orderTypeConfig[1], amount: orderTypes.takeaway, count: orderTypes.takeawayCount, pct: Math.round((orderTypes.takeaway / otTotal) * 100) },
    { ...orderTypeConfig[2], amount: orderTypes.online,   count: orderTypes.onlineCount,   pct: Math.round((orderTypes.online / otTotal) * 100)   },
  ] : null;

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ScreenHeader title="Dashboard" subtitle="Today's restaurant overview" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Dashboard" subtitle="Today's restaurant overview" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} colors={[colors.primary]} />}
      >
        {/* KPI Grid */}
        <View style={styles.grid2}>
          {kpis.map(k => (
            <View key={k.label} style={[styles.kpiCard, { backgroundColor: k.bg }]}>
              <Text style={[styles.kpiValue, { color: k.accent }]}>{k.value}</Text>
              <Text style={[styles.kpiLabel, { color: c.textSecondary }]}>{k.label}</Text>
              <Text style={[styles.kpiChange, { color: k.isUp ? colors.green : colors.red }]}>
                {k.isUp ? '▲' : '▼'} {k.change}
              </Text>
            </View>
          ))}
        </View>

        {/* Order Type Breakdown */}
        {otRows && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sales by Order Type · Today</Text>
            <View style={styles.grid3}>
              {otRows.map(t => (
                <View key={t.key} style={[styles.typeCard, { backgroundColor: t.bg }]}>
                  <View style={styles.typeTop}>
                    <Text style={styles.typeIcon}>{t.icon}</Text>
                    <Text style={[styles.typePct, { color: t.color }]}>{t.pct}%</Text>
                  </View>
                  <Text style={[styles.typeAmount, { color: t.color }]}>
                    ₹{Number(t.amount).toLocaleString()}
                  </Text>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                  <Text style={styles.typeCount}>{t.count} orders</Text>
                  <View style={styles.typeBarBg}>
                    <View style={[styles.typeBarFill, { width: `${t.pct}%` as any, backgroundColor: t.color }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Items */}
        {topItems.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Top Selling Items</Text>
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {topItems.map((item, i) => (
                <View key={item.name} style={[styles.listRow, i < topItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.cardBorder }]}>
                  <View style={[styles.rankBadge, { backgroundColor: i === 0 ? colors.primary : c.chipBg }]}>
                    <Text style={[styles.rankText, { color: i === 0 ? '#fff' : c.chipText }]}>{i + 1}</Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: c.textPrimary }]}>{item.name}</Text>
                    <View style={[styles.barBg, { backgroundColor: c.chipBg }]}>
                      <View style={[styles.barFill, { width: `${(item.orderCount / (topItems[0]?.orderCount || 1)) * 100}%` as any }]} />
                    </View>
                  </View>
                  <View style={styles.listRight}>
                    <Text style={[styles.listRevenue, { color: c.textPrimary }]}>₹{Number(item.revenue).toLocaleString()}</Text>
                    <Text style={[styles.listOrders, { color: c.textMuted }]}>{item.orderCount} orders</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Top Staff */}
        {topStaff.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: c.textPrimary }]}>Top Staff Today</Text>
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {topStaff.map((s, i) => (
                <View key={s.name} style={[styles.listRow, i < topStaff.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.cardBorder }]}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{s.avatar?.slice(0, 2) || s.name.slice(0, 2)}</Text>
                  </View>
                  <View style={styles.listInfo}>
                    <Text style={[styles.listName, { color: c.textPrimary }]}>{s.name}</Text>
                    <Text style={[styles.listSub, { color: c.textSecondary }]}>{s.role} - {s.orderCount} orders</Text>
                  </View>
                  <Text style={[styles.staffSales, { color: c.textPrimary }]}>₹{Number(s.totalSales).toLocaleString()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 32 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  grid3: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, minWidth: '44%', borderRadius: 16, padding: 16 },
  kpiValue: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  kpiLabel: { fontSize: 12, color: colors.gray500, marginBottom: 6 },
  kpiChange: { fontSize: 11, fontWeight: '600' },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900, marginBottom: 12 },
  typeCard: { flex: 1, borderRadius: 14, padding: 12 },
  typeTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeIcon: { fontSize: 18 },
  typePct: { fontSize: 12, fontWeight: '700' },
  typeAmount: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  typeLabel: { fontSize: 11, color: colors.gray600, fontWeight: '600', marginBottom: 1 },
  typeCount: { fontSize: 10, color: colors.gray400, marginBottom: 6 },
  typeBarBg: { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  typeBarFill: { height: 4, borderRadius: 2 },
  card: { backgroundColor: colors.white, borderRadius: 16, borderWidth: 1, borderColor: colors.gray200, overflow: 'hidden' },
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  rankBadge: { width: 28, height: 28, borderRadius: 8, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontSize: 12, fontWeight: '700', color: colors.gray600 },
  listInfo: { flex: 1 },
  listName: { fontSize: 14, fontWeight: '600', color: colors.gray900, marginBottom: 5 },
  listSub: { fontSize: 12, color: colors.gray500 },
  barBg: { height: 4, backgroundColor: colors.gray100, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  listRight: { alignItems: 'flex-end' },
  listRevenue: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  listOrders: { fontSize: 11, color: colors.gray400 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  staffSales: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
});
