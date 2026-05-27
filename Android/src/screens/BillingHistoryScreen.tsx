import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { api } from '../api/client';
import type { PaymentHistoryDto } from '../api/types';
import { paymentHistory as mockHistory } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';

const methodColor: Record<string, string> = {
  cash:   '#16a34a', card: '#2563eb', upi: '#7c3aed', wallet: colors.primary,
};
const methodBg: Record<string, string> = {
  cash:   '#f0fdf4', card: '#eff6ff', upi: '#f5f3ff', wallet: '#fff7ed',
};
const methodIcon: Record<string, string> = {
  cash: '💵', card: '💳', upi: '📱', wallet: '👛',
};
const typeIcon: Record<string, string> = {
  'dine-in': '🍽', takeaway: '🛵', online: '🌐',
};
const typeBg: Record<string, string> = {
  'dine-in': '#eff6ff', takeaway: '#fffbeb', online: '#f0fdf4',
};
const typeColor: Record<string, string> = {
  'dine-in': '#2563eb', takeaway: '#d97706', online: '#16a34a',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function BillModal({ bill, onClose }: { bill: PaymentHistoryDto; onClose: () => void }) {
  const { c } = useTheme();
  const total    = Number(bill.totalAmount);
  const subtotal = Number(bill.subtotal);
  const tax      = Number(bill.taxAmount);
  const service  = Number(bill.serviceCharge);
  const discount = Number(bill.discountAmount);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={modal.overlay}>
        <TouchableOpacity style={modal.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[modal.sheet, { backgroundColor: c.card }]}>
          {/* Orange header */}
          <View style={modal.header}>
            <View style={modal.headerRow}>
              <View style={modal.headerIcon}><Text style={{ fontSize: 20 }}>🧾</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={modal.headerSub}>Payment Receipt</Text>
                <Text style={modal.headerTitle}>#{bill.paymentId}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={modal.closeBtn}>
                <Text style={modal.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={modal.pills}>
              <View style={modal.pill}><Text style={modal.pillText}>🍽  Table {bill.tableNumber}</Text></View>
              <View style={modal.pill}><Text style={modal.pillText}>Order #{bill.orderId}</Text></View>
              <View style={modal.pill}>
                <Text style={modal.pillText}>{typeIcon[bill.orderType] || '🍽'}  {bill.orderType}</Text>
              </View>
            </View>
          </View>

          <ScrollView style={modal.body} showsVerticalScrollIndicator={false}>
            {/* Server + time */}
            <View style={modal.metaRow}>
              <View style={[modal.serverBadge, { backgroundColor: c.chipBg }]}>
                <Text style={modal.serverIcon}>👤</Text>
                <Text style={[modal.serverName, { color: c.textSecondary }]}>{bill.serverName}</Text>
              </View>
              <Text style={[modal.timeText, { color: c.textMuted }]}>🕐  {formatDate(bill.processedAt)}</Text>
            </View>

            {/* Items */}
            <Text style={[modal.sectionLabel, { color: c.textSecondary }]}>Items Ordered</Text>
            <View style={[modal.itemsHeader, { borderBottomColor: c.cardBorder }]}>
              <Text style={[modal.itemCol, { flex: 1, color: c.textMuted }]}>Item</Text>
              <Text style={[modal.itemCol, { width: 40, textAlign: 'center', color: c.textMuted }]}>Qty</Text>
              <Text style={[modal.itemCol, { width: 80, textAlign: 'right', color: c.textMuted }]}>Amount</Text>
            </View>
            {bill.items && bill.items.length > 0 ? (
              bill.items.map((item, i) => (
                <View key={i} style={[modal.itemRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[modal.itemName, { flex: 1, color: c.textPrimary }]}>{item.name}</Text>
                  <Text style={[modal.itemQty, { width: 40, textAlign: 'center', color: c.textSecondary }]}>×{item.quantity}</Text>
                  <Text style={[modal.itemAmount, { width: 80, textAlign: 'right', color: c.textPrimary }]}>
                    ₹{Number(item.lineTotal).toLocaleString()}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={[modal.noItems, { color: c.textMuted }]}>No item details available</Text>
            )}

            {/* Summary */}
            <Text style={[modal.sectionLabel, { marginTop: 16, color: c.textSecondary }]}>Bill Summary</Text>
            <View style={[modal.summaryBox, { backgroundColor: c.bg, borderColor: c.cardBorder }]}>
              <View style={modal.summaryRow}>
                <Text style={[modal.summaryKey, { color: c.textSecondary }]}>Subtotal</Text>
                <Text style={[modal.summaryVal, { color: c.textPrimary }]}>₹{subtotal.toLocaleString()}</Text>
              </View>
              <View style={modal.summaryRow}>
                <Text style={[modal.summaryKey, { color: c.textSecondary }]}>Tax (5%)</Text>
                <Text style={[modal.summaryVal, { color: c.textPrimary }]}>₹{tax.toLocaleString()}</Text>
              </View>
              <View style={modal.summaryRow}>
                <Text style={[modal.summaryKey, { color: c.textSecondary }]}>Service Charge (5%)</Text>
                <Text style={[modal.summaryVal, { color: c.textPrimary }]}>₹{service.toLocaleString()}</Text>
              </View>
              {discount > 0 && (
                <View style={modal.summaryRow}>
                  <Text style={[modal.summaryKey, { color: colors.green }]}>Discount</Text>
                  <Text style={[modal.summaryVal, { color: colors.green }]}>−₹{discount.toLocaleString()}</Text>
                </View>
              )}
              <View style={[modal.summaryRow, modal.totalRow, { borderTopColor: c.cardBorder }]}>
                <Text style={[modal.totalKey, { color: c.textPrimary }]}>Total Paid</Text>
                <Text style={modal.totalVal}>₹{total.toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment method */}
            <View style={modal.methodRow}>
              <Text style={[modal.sectionLabel, { color: c.textSecondary }]}>Payment Method</Text>
              <View style={[modal.methodPill, { backgroundColor: methodBg[bill.method] || '#fff7ed' }]}>
                <Text style={{ fontSize: 16 }}>{methodIcon[bill.method] || '💳'}</Text>
                <Text style={[modal.methodLabel, { color: methodColor[bill.method] || colors.primary }]}>
                  {bill.method.toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Thank you */}
            <View style={[modal.thankYou, { backgroundColor: c.chipBg }]}>
              <Text style={[modal.thankYouText, { color: c.textSecondary }]}>✓  Payment confirmed · Thank you for visiting!</Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={modal.closeFullBtn} onPress={onClose}>
            <Text style={modal.closeFullText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

export default function BillingHistoryScreen() {
  const { c } = useTheme();
  const [payments, setPayments] = useState<PaymentHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<PaymentHistoryDto | null>(null);

  const fetchHistory = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<PaymentHistoryDto[]>('/api/billing/history');
      setPayments(data);
      setError('');
    } catch {
      // fall back to mock data when API is unreachable
      setPayments(mockHistory as unknown as PaymentHistoryDto[]);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filtered = payments.filter(p => {
    const matchSearch = search === '' ||
      `T${p.tableNumber}`.toLowerCase().includes(search.toLowerCase()) ||
      p.serverName.toLowerCase().includes(search.toLowerCase()) ||
      `#${p.orderId}`.includes(search);
    const matchMethod = methodFilter === 'all' || p.method === methodFilter;
    const matchType   = typeFilter === 'all' || (p.orderType || 'dine-in') === typeFilter;
    return matchSearch && matchMethod && matchType;
  });

  const totalRevenue = filtered.reduce((s, p) => s + Number(p.totalAmount), 0);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ScreenHeader title="Billing History" subtitle="All completed payments" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Billing History" subtitle="All completed payments" />

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Transactions', value: String(filtered.length),                                                                  color: colors.blue   },
          { label: 'Revenue',      value: `₹${totalRevenue.toLocaleString()}`,                                                      color: colors.green  },
          { label: 'Avg Bill',     value: filtered.length > 0 ? `₹${Math.round(totalRevenue / filtered.length).toLocaleString()}` : '₹0', color: colors.primary },
          { label: 'UPI / Card',   value: String(filtered.filter(p => p.method === 'upi' || p.method === 'card').length),           color: colors.purple },
        ].map(s => (
          <View key={s.label} style={[styles.statCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
            <Text style={[styles.statLabel, { color: c.textMuted }]}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <View style={[styles.searchWrap, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: c.textPrimary }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search table, server, order..."
            placeholderTextColor={c.textMuted}
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.methodFilters}>
          {['all', 'cash', 'card', 'upi', 'wallet'].map(m => (
            <TouchableOpacity
              key={m}
              onPress={() => setMethodFilter(m)}
              style={[styles.filterBtn, { backgroundColor: c.chipBg }, methodFilter === m && styles.filterBtnActive]}
            >
              <Text style={[styles.filterBtnText, { color: c.textSecondary }, methodFilter === m && styles.filterBtnTextActive]}>
                {m === 'all' ? 'All' : m.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[styles.methodFilters, { marginTop: 6 }]}>
          {(['all', 'dine-in', 'takeaway', 'online'] as const).map(t => (
            <TouchableOpacity
              key={t}
              onPress={() => setTypeFilter(t)}
              style={[styles.filterBtn, { backgroundColor: c.chipBg }, typeFilter === t && { backgroundColor: '#2563eb' }]}
            >
              <Text style={[styles.filterBtnText, { color: c.textSecondary }, typeFilter === t && styles.filterBtnTextActive]}>
                {t === 'all' ? 'All Types' : t === 'dine-in' ? '🍽 Dine-in' : t === 'takeaway' ? '🛵 Takeaway' : '🌐 Online'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.paymentId)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} colors={[colors.primary]} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No payment records</Text>
            <Text style={[styles.emptySub, { color: c.textMuted }]}>Payments appear after bills are processed</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity style={[styles.row, { backgroundColor: c.card, borderColor: c.cardBorder }]} onPress={() => setSelectedBill(p)} activeOpacity={0.8}>
            <View style={styles.rowLeft}>
              <Text style={styles.payId}>#{p.paymentId}</Text>
              <Text style={[styles.tableText, { color: c.textPrimary }]}>Table {p.tableNumber}</Text>
              <Text style={[styles.orderText, { color: c.textMuted }]}>Order #{p.orderId}</Text>
            </View>
            <View style={styles.rowMid}>
              <Text style={[styles.server, { color: c.textSecondary }]}>{p.serverName}</Text>
              <View style={[styles.typePill, { backgroundColor: typeBg[p.orderType] || '#fff7ed' }]}>
                <Text style={[styles.typePillText, { color: typeColor[p.orderType] || colors.primary }]}>
                  {typeIcon[p.orderType] || '🍽'}  {p.orderType}
                </Text>
              </View>
              <View style={[styles.methodBadge, { backgroundColor: methodBg[p.method] || '#fff7ed' }]}>
                <Text style={{ fontSize: 13 }}>{methodIcon[p.method] || '💳'}</Text>
                <Text style={[styles.methodText, { color: methodColor[p.method] || colors.primary }]}>
                  {p.method.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.total, { color: c.textPrimary }]}>₹{Number(p.totalAmount).toLocaleString()}</Text>
              <Text style={[styles.time, { color: c.textMuted }]}>{formatDate(p.processedAt)}</Text>
              <Text style={styles.viewBill}>View Bill →</Text>
            </View>
          </TouchableOpacity>
        )}
      />

      {selectedBill && <BillModal bill={selectedBill} onClose={() => setSelectedBill(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statsRow: { flexDirection: 'row', padding: 12, gap: 8 },
  statCard: { flex: 1, backgroundColor: colors.white, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  statVal: { fontSize: 15, fontWeight: '800' },
  statLabel: { fontSize: 10, color: colors.gray400, marginTop: 2, textAlign: 'center' },
  filterRow: { paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 10 },
  searchIcon: { fontSize: 14, marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: colors.gray900 },
  methodFilters: { gap: 6, paddingVertical: 2 },
  filterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  filterBtnActive: { backgroundColor: colors.primary },
  filterBtnText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  filterBtnTextActive: { color: colors.white },
  errorText: { color: colors.red, fontSize: 12, paddingHorizontal: 16, marginBottom: 8 },
  list: { padding: 12, gap: 10, paddingBottom: 40 },
  row: {
    backgroundColor: colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', borderWidth: 1, borderColor: colors.gray200, gap: 10,
  },
  rowLeft: { alignItems: 'flex-start', justifyContent: 'center', minWidth: 60 },
  payId: { fontSize: 15, fontWeight: '800', color: colors.primary, marginBottom: 2 },
  tableText: { fontSize: 13, fontWeight: '700', color: colors.gray900 },
  orderText: { fontSize: 11, color: colors.gray400 },
  rowMid: { flex: 1, gap: 4, justifyContent: 'center' },
  server: { fontSize: 13, fontWeight: '600', color: colors.gray700 },
  typePill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  typePillText: { fontSize: 11, fontWeight: '600' },
  methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  methodText: { fontSize: 11, fontWeight: '700' },
  rowRight: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  total: { fontSize: 16, fontWeight: '800', color: colors.gray900 },
  time: { fontSize: 10, color: colors.gray400, textAlign: 'right' },
  viewBill: { fontSize: 11, fontWeight: '600', color: colors.primary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray700 },
  emptySub: { fontSize: 13, color: colors.gray400, marginTop: 4 },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  header: { backgroundColor: colors.primary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  headerIcon: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  headerSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: colors.white },
  closeBtn: { width: 32, height: 32, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 14, color: colors.white, fontWeight: '700' },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  pillText: { fontSize: 12, color: colors.white, fontWeight: '500' },
  body: { padding: 20 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  serverBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  serverIcon: { fontSize: 16 },
  serverName: { fontSize: 14, fontWeight: '600', color: colors.gray800 },
  timeText: { fontSize: 12, color: colors.gray400 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  itemsHeader: { flexDirection: 'row', paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: colors.gray100, marginBottom: 6 },
  itemCol: { fontSize: 11, fontWeight: '600', color: colors.gray400, textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.gray50 },
  itemName: { fontSize: 14, fontWeight: '500', color: colors.gray900 },
  itemQty: { fontSize: 14, color: colors.gray500 },
  itemAmount: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  noItems: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingVertical: 16 },
  summaryBox: { backgroundColor: colors.gray50, borderRadius: 14, padding: 14, marginTop: 8 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { fontSize: 13, color: colors.gray500 },
  summaryVal: { fontSize: 13, fontWeight: '600', color: colors.gray900 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 10, marginTop: 4, marginBottom: 0 },
  totalKey: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  totalVal: { fontSize: 18, fontWeight: '800', color: colors.primary },
  methodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  methodPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  methodLabel: { fontSize: 13, fontWeight: '700' },
  thankYou: { marginTop: 16, marginBottom: 8, borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 16, alignItems: 'center' },
  thankYouText: { fontSize: 12, color: colors.gray400, fontWeight: '500' },
  closeFullBtn: { margin: 16, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  closeFullText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
