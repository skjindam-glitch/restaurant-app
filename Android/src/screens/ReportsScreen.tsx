import { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, StyleSheet,
  TouchableOpacity, RefreshControl, Dimensions,
} from 'react-native';
import { api } from '../api/client';
import type {
  DashboardSummaryDto, TopMenuItemDto, TopStaffDto, OrderTypeBreakdownDto,
} from '../api/types';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';

const { width: SW } = Dimensions.get('window');

// ─── Static fallback / mock data ─────────────────────────────────────────────
const PERIODS = ['Today', 'Week', 'Month', 'All'] as const;
type Period = typeof PERIODS[number];

const hourlyData = [
  { hour: '7am',  orders: 4  },
  { hour: '8am',  orders: 8  },
  { hour: '9am',  orders: 12 },
  { hour: '10am', orders: 7  },
  { hour: '11am', orders: 14 },
  { hour: '12pm', orders: 28 },
  { hour: '1pm',  orders: 32 },
  { hour: '2pm',  orders: 22 },
  { hour: '3pm',  orders: 9  },
  { hour: '4pm',  orders: 6  },
  { hour: '5pm',  orders: 10 },
  { hour: '6pm',  orders: 18 },
  { hour: '7pm',  orders: 30 },
  { hour: '8pm',  orders: 35 },
  { hour: '9pm',  orders: 26 },
  { hour: '10pm', orders: 14 },
  { hour: '11pm', orders: 6  },
];

const weeklyRevenue: Record<Period, { day: string; value: number }[]> = {
  Today: [
    { day: '9am',  value: 4200  },
    { day: '11am', value: 8900  },
    { day: '1pm',  value: 18400 },
    { day: '3pm',  value: 10200 },
    { day: '5pm',  value: 7600  },
    { day: '7pm',  value: 22100 },
    { day: '9pm',  value: 15800 },
  ],
  Week: [
    { day: 'Mon', value: 52400 },
    { day: 'Tue', value: 61200 },
    { day: 'Wed', value: 48900 },
    { day: 'Thu', value: 73100 },
    { day: 'Fri', value: 91400 },
    { day: 'Sat', value: 118600 },
    { day: 'Sun', value: 96300 },
  ],
  Month: [
    { day: 'W1', value: 312000 },
    { day: 'W2', value: 386000 },
    { day: 'W3', value: 421000 },
    { day: 'W4', value: 458000 },
  ],
  All: [
    { day: 'Jan', value: 1240000 },
    { day: 'Feb', value: 1380000 },
    { day: 'Mar', value: 1520000 },
    { day: 'Apr', value: 1190000 },
    { day: 'May', value: 1640000 },
    { day: 'Jun', value: 1780000 },
  ],
};

const fallbackKpis: Record<Period, { label: string; value: string; change: string; isUp: boolean; bg: string; accent: string }[]> = {
  Today: [
    { label: "Today's Revenue",  value: '₹71,240', change: '+12.4%', isUp: true,  bg: '#fff7ed', accent: colors.primary },
    { label: 'Total Orders',     value: '142',     change: '+8.2%',  isUp: true,  bg: '#eff6ff', accent: colors.blue   },
    { label: 'Avg Order Value',  value: '₹501',    change: '+4.1%',  isUp: true,  bg: '#f0fdf4', accent: colors.green  },
    { label: 'Customers Served', value: '186',     change: '+9.0%',  isUp: true,  bg: '#f5f3ff', accent: colors.purple },
  ],
  Week: [
    { label: 'Week Revenue',     value: '₹5,41,900', change: '+6.8%',  isUp: true,  bg: '#fff7ed', accent: colors.primary },
    { label: 'Total Orders',     value: '938',       change: '+5.2%',  isUp: true,  bg: '#eff6ff', accent: colors.blue   },
    { label: 'Avg Order Value',  value: '₹578',      change: '+1.4%',  isUp: true,  bg: '#f0fdf4', accent: colors.green  },
    { label: 'Customers Served', value: '1,240',     change: '+7.3%',  isUp: true,  bg: '#f5f3ff', accent: colors.purple },
  ],
  Month: [
    { label: 'Month Revenue',    value: '₹15,77,000', change: '+9.1%',  isUp: true,  bg: '#fff7ed', accent: colors.primary },
    { label: 'Total Orders',     value: '3,412',      change: '+4.8%',  isUp: true,  bg: '#eff6ff', accent: colors.blue   },
    { label: 'Avg Order Value',  value: '₹462',       change: '-2.1%',  isUp: false, bg: '#f0fdf4', accent: colors.green  },
    { label: 'Customers Served', value: '4,680',      change: '+6.2%',  isUp: true,  bg: '#f5f3ff', accent: colors.purple },
  ],
  All: [
    { label: 'Total Revenue',    value: '₹92,40,000', change: '+18.4%', isUp: true,  bg: '#fff7ed', accent: colors.primary },
    { label: 'Total Orders',     value: '18,640',     change: '+14.2%', isUp: true,  bg: '#eff6ff', accent: colors.blue   },
    { label: 'Avg Order Value',  value: '₹495',       change: '+3.6%',  isUp: true,  bg: '#f0fdf4', accent: colors.green  },
    { label: 'Customers Served', value: '24,800',     change: '+16.8%', isUp: true,  bg: '#f5f3ff', accent: colors.purple },
  ],
};

const fallbackOrderTypes: Record<Period, { dineIn: number; dineInCount: number; takeaway: number; takeawayCount: number; online: number; onlineCount: number }> = {
  Today:  { dineIn: 42500, dineInCount: 84, takeaway: 18400, takeawayCount: 36, online: 10340, onlineCount: 22 },
  Week:   { dineIn: 302000, dineInCount: 560, takeaway: 142000, takeawayCount: 240, online: 97900, onlineCount: 138 },
  Month:  { dineIn: 940000, dineInCount: 1920, takeaway: 498000, takeawayCount: 960, online: 139000, onlineCount: 532 },
  All:    { dineIn: 5400000, dineInCount: 10400, takeaway: 2760000, takeawayCount: 5200, online: 2080000, onlineCount: 3040 },
};

const fallbackTopItems: TopMenuItemDto[] = [
  { name: 'Butter Chicken',  orderCount: 284, revenue: 119280 },
  { name: 'Chicken Biryani', orderCount: 261, revenue: 99180  },
  { name: 'Paneer Tikka',    orderCount: 218, revenue: 69760  },
  { name: 'Mango Lassi',     orderCount: 196, revenue: 23520  },
  { name: 'Butter Naan',     orderCount: 184, revenue: 11040  },
];

const fallbackTopStaff: TopStaffDto[] = [
  { name: 'Arjun',  role: 'server',  avatar: 'AR', orderCount: 58, totalSales: 32480 },
  { name: 'Priya',  role: 'server',  avatar: 'PR', orderCount: 52, totalSales: 28640 },
  { name: 'Ravi',   role: 'server',  avatar: 'RA', orderCount: 48, totalSales: 24180 },
  { name: 'Sunita', role: 'cashier', avatar: 'SU', orderCount: 44, totalSales: 21060 },
];

const orderTypeConfig = [
  { key: 'dineIn',   label: 'Dine-in',  icon: '🍽', color: colors.blue,   bg: '#eff6ff' },
  { key: 'takeaway', label: 'Takeaway', icon: '🛵', color: colors.amber,  bg: colors.amberLt },
  { key: 'online',   label: 'Online',   icon: '🌐', color: colors.green,  bg: colors.greenLt },
] as const;

const paymentMethodData = [
  { method: 'Card',   pct: 42, color: colors.blue,   icon: '💳' },
  { method: 'Cash',   pct: 31, color: colors.green,  icon: '💵' },
  { method: 'UPI',    pct: 19, color: colors.purple, icon: '📱' },
  { method: 'Wallet', pct: 8,  color: colors.amber,  icon: '👛' },
];

// ─── Mini bar chart ───────────────────────────────────────────────────────────
function MiniBarChart({
  data, labelKey, valueKey, color, c,
}: {
  data: { [k: string]: any }[];
  labelKey: string;
  valueKey: string;
  color: string;
  c: any;
}) {
  const max = Math.max(...data.map(d => d[valueKey])) || 1;
  const BAR_W = Math.floor((SW - 64) / data.length) - 4;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90 }}>
      {data.map((d, i) => {
        const pct = d[valueKey] / max;
        const barH = Math.max(4, Math.round(pct * 70));
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <View style={{
              width: '100%', height: barH, borderRadius: 4,
              backgroundColor: color,
              opacity: 0.7 + pct * 0.3,
            }} />
            <Text style={{ fontSize: 9, color: c.textMuted, textAlign: 'center' }} numberOfLines={1}>
              {d[labelKey]}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Horizontal bar row ───────────────────────────────────────────────────────
function HBarRow({ label, value, maxValue, color, c }: { label: string; value: number; maxValue: number; color: string; c: any }) {
  const pct = (value / maxValue) * 100;
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.textPrimary }}>{label}</Text>
        <Text style={{ fontSize: 12, fontWeight: '700', color }}>{value}</Text>
      </View>
      <View style={{ height: 6, backgroundColor: c.chipBg, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${pct}%` as any, backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────
export default function ReportsScreen() {
  const { c } = useTheme();
  const [period, setPeriod]       = useState<Period>('Today');
  const [topItems, setTopItems]   = useState<TopMenuItemDto[]>(fallbackTopItems);
  const [topStaff, setTopStaff]   = useState<TopStaffDto[]>(fallbackTopStaff);
  const [orderTypes, setOrderTypes] = useState(fallbackOrderTypes[period]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (p: Period, manual = false) => {
    if (manual) setRefreshing(true);
    // Reset fallbacks for the selected period immediately
    setOrderTypes(fallbackOrderTypes[p]);
    try {
      const [items, staff, types] = await Promise.all([
        api.get<TopMenuItemDto[]>('/api/dashboard/top-items?limit=5'),
        api.get<TopStaffDto[]>('/api/dashboard/top-staff?limit=4'),
        api.get<typeof orderTypes>(`/api/dashboard/order-types?period=${p.toLowerCase()}`),
      ]);
      setTopItems(items);
      setTopStaff(staff);
      setOrderTypes(types);
    } catch {
      setTopItems(fallbackTopItems);
      setTopStaff(fallbackTopStaff);
      setOrderTypes(fallbackOrderTypes[p]);
    } finally {
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(period); }, [period, fetchData]);

  const kpis       = fallbackKpis[period];
  const revData    = weeklyRevenue[period];
  const otTotal    = (orderTypes.dineIn + orderTypes.takeaway + orderTypes.online) || 1;
  const otRows     = [
    { ...orderTypeConfig[0], amount: orderTypes.dineIn,   count: orderTypes.dineInCount,   pct: Math.round((orderTypes.dineIn / otTotal) * 100)   },
    { ...orderTypeConfig[1], amount: orderTypes.takeaway, count: orderTypes.takeawayCount, pct: Math.round((orderTypes.takeaway / otTotal) * 100) },
    { ...orderTypeConfig[2], amount: orderTypes.online,   count: orderTypes.onlineCount,   pct: Math.round((orderTypes.online / otTotal) * 100)   },
  ];
  const maxItemOrders = topItems[0]?.orderCount || 1;
  const maxStaff      = topStaff[0]?.orderCount || 1;

  return (
    <View style={[s.root, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Reports" subtitle="Analytics & performance overview" />

      {/* Period selector */}
      <View style={[s.periodBar, { backgroundColor: c.card, borderBottomColor: c.cardBorder }]}>
        {PERIODS.map(p => (
          <TouchableOpacity
            key={p}
            style={[s.periodBtn, period === p && s.periodBtnActive]}
            onPress={() => setPeriod(p)}
            activeOpacity={0.7}
          >
            <Text style={[s.periodText, period === p && s.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchData(period, true)} colors={[colors.primary]} />}
      >
        {/* ── KPI Grid ── */}
        <View style={s.grid2}>
          {kpis.map(k => (
            <View key={k.label} style={[s.kpiCard, { backgroundColor: k.bg }]}>
              <Text style={[s.kpiValue, { color: k.accent }]}>{k.value}</Text>
              <Text style={s.kpiLabel}>{k.label}</Text>
              <View style={s.kpiChangeRow}>
                <Text style={[s.kpiChange, { color: k.isUp ? colors.green : colors.red }]}>
                  {k.isUp ? '▲' : '▼'} {k.change}
                </Text>
                <Text style={s.kpiChangeSub}>vs last {period.toLowerCase()}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Revenue Trend ── */}
        <View style={[s.section]}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>
            📈 Revenue Trend — {period}
          </Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
              <MiniBarChart
                data={revData}
                labelKey="day"
                valueKey="value"
                color={colors.primary}
                c={c}
              />
              {/* Peak annotation */}
              <Text style={[s.chartNote, { color: c.textMuted }]}>
                Peak: {revData.reduce((a, b) => a.value > b.value ? a : b).day} — ₹{revData.reduce((a, b) => a.value > b.value ? a : b).value.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Sales by Order Type ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>🧾 Sales by Order Type</Text>
          <View style={s.grid3}>
            {otRows.map(t => (
              <View key={t.key} style={[s.typeCard, { backgroundColor: t.bg }]}>
                <View style={s.typeTop}>
                  <Text style={s.typeIcon}>{t.icon}</Text>
                  <Text style={[s.typePct, { color: t.color }]}>{t.pct}%</Text>
                </View>
                <Text style={[s.typeAmount, { color: t.color }]}>
                  ₹{Number(t.amount).toLocaleString()}
                </Text>
                <Text style={s.typeLabel}>{t.label}</Text>
                <Text style={s.typeCount}>{t.count} orders</Text>
                <View style={s.typeBarBg}>
                  <View style={[s.typeBarFill, { width: `${t.pct}%` as any, backgroundColor: t.color }]} />
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Payment Methods ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>💳 Payment Methods</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder, padding: 16 }]}>
            {paymentMethodData.map(m => (
              <View key={m.method} style={s.pmRow}>
                <Text style={s.pmIcon}>{m.icon}</Text>
                <Text style={[s.pmLabel, { color: c.textPrimary }]}>{m.method}</Text>
                <View style={[s.pmBarBg, { backgroundColor: c.chipBg }]}>
                  <View style={[s.pmBarFill, { width: `${m.pct}%` as any, backgroundColor: m.color }]} />
                </View>
                <Text style={[s.pmPct, { color: m.color }]}>{m.pct}%</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Top Selling Items ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>🏆 Top Selling Items</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder, overflow: 'hidden' }]}>
            {topItems.map((item, i) => (
              <View
                key={item.name}
                style={[s.listRow, i < topItems.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.cardBorder }]}
              >
                <View style={[s.rankBadge, { backgroundColor: i === 0 ? colors.primary : c.chipBg }]}>
                  <Text style={[s.rankText, { color: i === 0 ? '#fff' : c.chipText }]}>
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[s.listName, { color: c.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  <View style={s.listBarWrap}>
                    <View style={[s.listBarBg, { backgroundColor: c.chipBg }]}>
                      <View style={[
                        s.listBarFill,
                        { width: `${(item.orderCount / maxItemOrders) * 100}%` as any },
                      ]} />
                    </View>
                    <Text style={[s.listBarCount, { color: c.textMuted }]}>{item.orderCount}</Text>
                  </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[s.listRevenue, { color: c.textPrimary }]}>₹{Number(item.revenue).toLocaleString()}</Text>
                  <Text style={[s.listOrders, { color: c.textMuted }]}>orders</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Staff Performance ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>👥 Staff Performance</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder, padding: 16 }]}>
            {topStaff.map((staff, i) => (
              <View key={staff.name} style={{ marginBottom: i < topStaff.length - 1 ? 14 : 0 }}>
                <View style={s.staffRow}>
                  <View style={s.staffAvatar}>
                    <Text style={s.staffAvatarTxt}>{staff.avatar?.slice(0, 2) || staff.name.slice(0, 2)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={[s.staffName, { color: c.textPrimary }]}>{staff.name}</Text>
                      <Text style={[s.staffSales, { color: colors.primary }]}>
                        ₹{Number(staff.totalSales).toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                      <Text style={[s.staffRole, { color: c.textMuted }]}>{staff.role}</Text>
                      <Text style={[s.staffOrders, { color: c.textMuted }]}>{staff.orderCount} orders</Text>
                    </View>
                    <View style={[s.staffBarBg, { backgroundColor: c.chipBg, marginTop: 6 }]}>
                      <View style={[
                        s.staffBarFill,
                        { width: `${(staff.orderCount / maxStaff) * 100}%` as any },
                      ]} />
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* ── Hourly Traffic ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>⏱ Hourly Traffic Pattern</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={{ padding: 16, paddingBottom: 12 }}>
              <MiniBarChart
                data={hourlyData}
                labelKey="hour"
                valueKey="orders"
                color={colors.purple}
                c={c}
              />
              <Text style={[s.chartNote, { color: c.textMuted }]}>
                Busiest: 8pm — 35 orders/hr
              </Text>
            </View>

            {/* Peak hours highlight */}
            <View style={[s.peakRow, { borderTopColor: c.cardBorder }]}>
              <View style={s.peakItem}>
                <Text style={[s.peakLabel, { color: c.textMuted }]}>Morning Peak</Text>
                <Text style={[s.peakValue, { color: colors.amber }]}>9am – 10am</Text>
              </View>
              <View style={[s.peakDivider, { backgroundColor: c.cardBorder }]} />
              <View style={s.peakItem}>
                <Text style={[s.peakLabel, { color: c.textMuted }]}>Lunch Peak</Text>
                <Text style={[s.peakValue, { color: colors.green }]}>12pm – 2pm</Text>
              </View>
              <View style={[s.peakDivider, { backgroundColor: c.cardBorder }]} />
              <View style={s.peakItem}>
                <Text style={[s.peakLabel, { color: c.textMuted }]}>Dinner Peak</Text>
                <Text style={[s.peakValue, { color: colors.blue }]}>7pm – 9pm</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Category Breakdown ── */}
        <View style={s.section}>
          <Text style={[s.sectionTitle, { color: c.textPrimary }]}>🍴 Sales by Category</Text>
          <View style={[s.card, { backgroundColor: c.card, borderColor: c.cardBorder, padding: 16 }]}>
            {[
              { cat: 'Mains',     pct: 34, revenue: 24200, color: colors.primary },
              { cat: 'Biryani',   pct: 22, revenue: 15640, color: colors.blue   },
              { cat: 'Starters',  pct: 18, revenue: 12800, color: colors.amber  },
              { cat: 'Breads',    pct: 12, revenue: 8540,  color: colors.green  },
              { cat: 'Beverages', pct: 8,  revenue: 5690,  color: colors.purple },
              { cat: 'Desserts',  pct: 6,  revenue: 4270,  color: colors.red    },
            ].map(cat => (
              <HBarRow
                key={cat.cat}
                label={`${cat.cat}  ₹${cat.revenue.toLocaleString()}`}
                value={cat.pct}
                maxValue={100}
                color={cat.color}
                c={c}
              />
            ))}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:    { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },

  // Period selector
  periodBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  periodBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  periodBtnActive: { backgroundColor: colors.primary },
  periodText:      { fontSize: 13, fontWeight: '600', color: colors.gray400 },
  periodTextActive:{ color: '#fff' },

  // KPI
  grid2:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 4 },
  kpiCard: { flex: 1, minWidth: '44%', borderRadius: 16, padding: 16 },
  kpiValue:     { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 4 },
  kpiLabel:     { fontSize: 11, color: colors.gray500, marginBottom: 6 },
  kpiChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  kpiChange:    { fontSize: 11, fontWeight: '700' },
  kpiChangeSub: { fontSize: 10, color: colors.gray400 },

  // Section
  section:      { marginTop: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.gray200,
  },

  // Chart note
  chartNote: { fontSize: 11, marginTop: 6, textAlign: 'right' },

  // Order type cards
  grid3:      { flexDirection: 'row', gap: 8 },
  typeCard:   { flex: 1, borderRadius: 14, padding: 12 },
  typeTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  typeIcon:   { fontSize: 18 },
  typePct:    { fontSize: 12, fontWeight: '700' },
  typeAmount: { fontSize: 15, fontWeight: '800', marginBottom: 2 },
  typeLabel:  { fontSize: 11, color: colors.gray600, fontWeight: '600', marginBottom: 1 },
  typeCount:  { fontSize: 10, color: colors.gray400, marginBottom: 6 },
  typeBarBg:  { height: 4, backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 2, overflow: 'hidden' },
  typeBarFill:{ height: 4, borderRadius: 2 },

  // Payment methods
  pmRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pmIcon:   { fontSize: 18, width: 26 },
  pmLabel:  { fontSize: 13, fontWeight: '600', width: 58 },
  pmBarBg:  { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  pmBarFill:{ height: 8, borderRadius: 4 },
  pmPct:    { fontSize: 12, fontWeight: '700', width: 34, textAlign: 'right' },

  // Top items
  listRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  rankBadge:    { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rankText:     { fontSize: 12, fontWeight: '700' },
  listName:     { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  listBarWrap:  { flexDirection: 'row', alignItems: 'center', gap: 6 },
  listBarBg:    { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  listBarFill:  { height: 4, backgroundColor: colors.primary, borderRadius: 2 },
  listBarCount: { fontSize: 11, width: 28, textAlign: 'right' },
  listRevenue:  { fontSize: 13, fontWeight: '700' },
  listOrders:   { fontSize: 10 },

  // Staff
  staffRow:       { flexDirection: 'row', gap: 12, alignItems: 'center' },
  staffAvatar:    { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  staffAvatarTxt: { fontSize: 13, fontWeight: '800', color: colors.primary },
  staffName:      { fontSize: 14, fontWeight: '700' },
  staffSales:     { fontSize: 14, fontWeight: '800' },
  staffRole:      { fontSize: 11, textTransform: 'capitalize' },
  staffOrders:    { fontSize: 11 },
  staffBarBg:     { height: 4, borderRadius: 2, overflow: 'hidden' },
  staffBarFill:   { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  // Hourly peak row
  peakRow:     { flexDirection: 'row', borderTopWidth: 1, paddingVertical: 12 },
  peakItem:    { flex: 1, alignItems: 'center' },
  peakLabel:   { fontSize: 10, marginBottom: 3 },
  peakValue:   { fontSize: 13, fontWeight: '700' },
  peakDivider: { width: 1 },
});
