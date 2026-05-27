import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../api/client';
import type { KdsOrderDto } from '../api/types';
import { kdsOrders as mockKds } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

type ItemStatus = 'pending' | 'preparing' | 'ready' | 'served';

const itemStatusNext: Record<string, ItemStatus> = {
  pending: 'preparing',
  preparing: 'ready',
};

const itemCfg: Record<string, { label: string; color: string; bg: string; btnColor: string; btnLabel: string }> = {
  pending:   { label: 'Pending',   color: colors.amber,   bg: colors.amberLt, btnColor: '#d97706',      btnLabel: 'Start Cooking' },
  preparing: { label: 'Preparing', color: colors.primary, bg: '#fff7ed',      btnColor: colors.primary, btnLabel: 'Mark Ready'    },
  ready:     { label: '✓ Ready',   color: colors.green,   bg: colors.greenLt, btnColor: colors.green,   btnLabel: ''              },
  served:    { label: 'Served',    color: colors.gray400, bg: colors.gray100, btnColor: '',             btnLabel: ''              },
};

function getOrderStatus(items: KdsOrderDto['items']): 'pending' | 'preparing' | 'ready' {
  if (items.every(i => i.status === 'ready' || i.status === 'served')) return 'ready';
  if (items.some(i => i.status === 'preparing')) return 'preparing';
  return 'pending';
}

export default function KitchenScreen() {
  const { c } = useTheme();
  const [orders, setOrders] = useState<KdsOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<KdsOrderDto[]>('/api/kitchen');
      setOrders(data);
    } catch {
      setOrders(mockKds as unknown as KdsOrderDto[]);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const id = setInterval(fetchOrders, 10_000);
    return () => clearInterval(id);
  }, [fetchOrders]);

  const updateItemStatus = async (orderId: number, itemId: number, currentStatus: string) => {
    const next = itemStatusNext[currentStatus];
    if (!next) return;
    const key = `${orderId}-${itemId}`;
    setActionLoading(key);
    try {
      await api.patch(`/api/kitchen/${orderId}/items/${itemId}/status`, { status: next });
      setOrders(prev => prev.map(o =>
        o.id !== orderId ? o : {
          ...o,
          items: o.items.map(item =>
            item.id !== itemId ? item : { ...item, status: next }
          ),
        }
      ));
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const markAllServed = async (orderId: number) => {
    const key = `serve-${orderId}`;
    setActionLoading(key);
    try {
      await api.post(`/api/kitchen/${orderId}/serve`, {});
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch { /* ignore */ } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === 'all' ? orders : orders.filter(o => getOrderStatus(o.items) === filter);

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => getOrderStatus(o.items) === 'pending').length,
    preparing: orders.filter(o => getOrderStatus(o.items) === 'preparing').length,
    ready:     orders.filter(o => getOrderStatus(o.items) === 'ready').length,
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Filter + Refresh Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.filterBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}
        contentContainerStyle={styles.filterContent}
      >
        {(['all', 'pending', 'preparing', 'ready'] as const).map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterBtn, filter === f && styles.filterBtnActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? `All (${counts.all})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${counts[f]})`}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          onPress={() => fetchOrders(true)}
          style={[styles.filterBtn, { backgroundColor: '#fff7ed', borderWidth: 1, borderColor: colors.primary }]}
        >
          <Text style={[styles.filterText, { color: colors.primary }]}>
            {refreshing ? '⟳' : '↻'} Refresh
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Stats Bar */}
      <View style={[styles.statsBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: c.textPrimary }]}>{orders.length}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Active Tickets</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.amber }]}>{counts.pending}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.primary }]}>{counts.preparing}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Preparing</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statVal, { color: colors.green }]}>{counts.ready}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Ready</Text>
        </View>
      </View>

      {/* Orders */}
      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchOrders(true)} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={{ fontSize: 40, marginBottom: 12 }}>👨‍🍳</Text>
            <Text style={styles.emptyTitle}>Kitchen is clear</Text>
            <Text style={styles.emptySub}>No active orders at the moment</Text>
          </View>
        }
        renderItem={({ item: order }) => {
          const orderStatus = getOrderStatus(order.items);
          const orderCfg = itemCfg[orderStatus];
          return (
            <View style={[styles.orderCard, { backgroundColor: c.card, borderColor: order.isUrgent ? colors.red : c.cardBorder }]}>
              <View style={styles.cardHeader}>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.tableNum, { color: c.textPrimary }]}>T{order.tableNumber}</Text>
                    {order.isUrgent && <Text style={styles.urgentBadge}>🔴 URGENT</Text>}
                  </View>
                  <Text style={[styles.cardMeta, { color: c.textMuted }]}>{order.serverName} #{order.id}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <View style={[styles.statusPill, { backgroundColor: orderCfg.bg }]}>
                    <Text style={[styles.statusPillText, { color: orderCfg.color }]}>{orderCfg.label}</Text>
                  </View>
                  <Text style={styles.elapsed}>🕐 {order.elapsed}</Text>
                </View>
              </View>

              {order.items.map(item => {
                const cfg = itemCfg[item.status as keyof typeof itemCfg] ?? itemCfg.served;
                const itemKey = `${order.id}-${item.id}`;
                return (
                  <View key={item.id} style={[styles.itemRow, { backgroundColor: cfg.bg }]}>
                    <View style={{ flex: 1 }}>
                      <View style={styles.itemNameRow}>
                        <Text style={styles.itemQty}>×{item.quantity}</Text>
                        <Text style={styles.itemName}>{item.name}</Text>
                      </View>
                      {item.notes ? <Text style={styles.itemNotes}>📝 {item.notes}</Text> : null}
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 6 }}>
                      <Text style={[styles.itemStatus, { color: cfg.color }]}>{cfg.label}</Text>
                      {cfg.btnLabel ? (
                        <TouchableOpacity
                          style={[styles.itemBtn, { backgroundColor: cfg.btnColor }, actionLoading === itemKey && { opacity: 0.6 }]}
                          onPress={() => updateItemStatus(order.id, item.id, item.status)}
                          disabled={actionLoading === itemKey}
                        >
                          {actionLoading === itemKey
                            ? <ActivityIndicator size="small" color={colors.white} />
                            : <Text style={styles.itemBtnText}>{cfg.btnLabel}</Text>
                          }
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              {orderStatus === 'ready' && (
                <TouchableOpacity
                  style={[styles.markAllBtn, actionLoading === `serve-${order.id}` && { opacity: 0.6 }]}
                  onPress={() => markAllServed(order.id)}
                  disabled={actionLoading === `serve-${order.id}`}
                >
                  {actionLoading === `serve-${order.id}`
                    ? <ActivityIndicator color={colors.green} />
                    : <Text style={styles.markAllText}>✓ Mark All Served</Text>
                  }
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  filterBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 60 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  filterBtnActive: { backgroundColor: colors.gray900 },
  filterText: { fontSize: 13, fontWeight: '500', color: colors.gray600 },
  filterTextActive: { color: colors.white },
  statsBar: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, paddingVertical: 12 },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800', color: colors.gray900 },
  statLabel: { fontSize: 11, color: colors.gray400, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: colors.gray200 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray700 },
  emptySub: { fontSize: 13, color: colors.gray400, marginTop: 4 },
  orderCard: { backgroundColor: colors.white, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: colors.gray200 },
  urgentCard: { borderColor: colors.red },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tableNum: { fontSize: 22, fontWeight: '900', color: colors.gray900 },
  urgentBadge: { fontSize: 11, fontWeight: '700', color: colors.red },
  cardMeta: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPillText: { fontSize: 12, fontWeight: '700' },
  elapsed: { fontSize: 11, color: colors.gray400, marginTop: 4 },
  itemRow: { borderRadius: 12, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  itemQty: { fontSize: 14, fontWeight: '800', color: colors.gray700 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.gray900, flex: 1 },
  itemNotes: { fontSize: 11, color: colors.blue, fontStyle: 'italic' },
  itemStatus: { fontSize: 11, fontWeight: '700' },
  itemBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, minWidth: 90, alignItems: 'center' },
  itemBtnText: { fontSize: 11, fontWeight: '700', color: colors.white },
  markAllBtn: { backgroundColor: colors.greenLt, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  markAllText: { fontSize: 14, fontWeight: '700', color: colors.green },
});
