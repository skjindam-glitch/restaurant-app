import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { useShellNavigation } from '../navigation/AppNavigator';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { TableDto, CreateTableRequest } from '../api/types';
import { mockTables } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

type TableStatus = 'available' | 'occupied' | 'reserved' | 'billing' | 'dirty';

const statusCfg: Record<TableStatus, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: 'Available',      color: colors.green,  bg: '#f0fdf4', dot: colors.green   },
  occupied:  { label: 'Occupied',       color: colors.primary,bg: '#fff7ed', dot: colors.primary },
  reserved:  { label: 'Reserved',       color: colors.blue,   bg: '#eff6ff', dot: colors.blue    },
  billing:   { label: 'Billing',        color: colors.purple, bg: '#f5f3ff', dot: colors.purple  },
  dirty:     { label: 'Needs Cleaning', color: colors.red,    bg: '#fef2f2', dot: colors.red     },
};

const orderStatusBadge: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: 'In Kitchen', color: '#92400e', bg: '#fef3c7' },
  ready:   { label: 'Ready',      color: colors.green, bg: '#f0fdf4' },
  billing: { label: 'Billing',    color: colors.purple, bg: '#f5f3ff' },
};

const ZONES = [
  { key: 'all',          label: 'All',          icon: '🏠' },
  { key: 'ground-floor', label: 'Ground Floor', icon: '🪑' },
  { key: 'first-floor',  label: 'First Floor',  icon: '🏢' },
  { key: 'garden',       label: 'Garden',       icon: '🌿' },
  { key: 'rooftop',      label: 'Rooftop',      icon: '☁️' },
  { key: 'vip',          label: 'VIP Room',     icon: '⭐' },
  { key: 'bar',          label: 'Bar Area',     icon: '🍹' },
];

const filters = [
  { key: 'all',       label: 'All'       },
  { key: 'available', label: 'Available' },
  { key: 'occupied',  label: 'Occupied'  },
  { key: 'reserved',  label: 'Reserved'  },
  { key: 'billing',   label: 'Billing'   },
  { key: 'dirty',     label: 'Cleaning'  },
];

const NEW_ZONES = ZONES.filter(z => z.key !== 'all');

export default function TablesScreen() {
  const { navigateTo } = useShellNavigation();
  const { c } = useTheme();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [selected, setSelected] = useState<TableDto | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Seat guests modal
  const [seatModal, setSeatModal] = useState<{ tableId: number; tableNumber: number } | null>(null);
  const [guestCount, setGuestCount] = useState('2');
  const [seatError, setSeatError] = useState('');

  // Add Table modal
  const [addModal, setAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newSeats, setNewSeats] = useState('4');
  const [newZone, setNewZone] = useState('ground-floor');
  const [addError, setAddError] = useState('');

  const fetchTables = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<TableDto[]>('/api/tables');
      setTables(data);
    } catch {
      setTables(mockTables as unknown as TableDto[]);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    const id = setInterval(fetchTables, 15_000);
    return () => clearInterval(id);
  }, [fetchTables]);

  const seatGuests = async () => {
    if (!seatModal || !user) return;
    const count = parseInt(guestCount);
    if (!count || count < 1) { setSeatError('Enter a valid guest count.'); return; }
    setActionLoading(true);
    setSeatError('');
    try {
      await api.post(`/api/tables/${seatModal.tableId}/seat`, { serverId: user.id, guestCount: count });
      await fetchTables();
      setSeatModal(null);
      setGuestCount('2');
      setSelected(null);
    } catch (e) {
      setSeatError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const markCleaned = async (tableId: number) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/tables/${tableId}/status`, { status: 'available' });
      await fetchTables();
      setSelected(null);
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  const addTable = async () => {
    const num = parseInt(newNumber);
    const seats = parseInt(newSeats);
    if (!num || num < 1) { setAddError('Enter a valid table number.'); return; }
    if (!seats || seats < 1) { setAddError('Enter a valid seat count.'); return; }
    setActionLoading(true);
    setAddError('');
    try {
      const body: CreateTableRequest = { number: num, seats, zone: newZone };
      await api.post<TableDto>('/api/tables', body);
      await fetchTables();
      setAddModal(false);
      setNewNumber(''); setNewSeats('4'); setNewZone('ground-floor');
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const generateBill = async (orderId: number) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/orders/${orderId}/status?status=billing`);
      await fetchTables();
    } catch { /* ignore */ } finally {
      setActionLoading(false);
    }
  };

  let filtered = filter === 'all' ? tables : tables.filter(t => t.status === filter);
  if (zoneFilter !== 'all') filtered = filtered.filter(t => (t.zone || 'ground-floor') === zoneFilter);

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {/* Zone Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.zoneBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}
        contentContainerStyle={styles.zoneContent}
      >
        {ZONES.map(z => (
          <TouchableOpacity
            key={z.key}
            onPress={() => setZoneFilter(z.key)}
            style={[styles.zoneBtn, { backgroundColor: c.chipBg }, zoneFilter === z.key && styles.zoneBtnActive]}
          >
            <Text style={styles.zoneIcon}>{z.icon}</Text>
            <Text style={[styles.zoneText, { color: c.textSecondary }, zoneFilter === z.key && styles.zoneTextActive]}>{z.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Status Filter */}
      <View style={[styles.statusRow, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusContent}>
          {filters.map(f => (
            <TouchableOpacity
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterBtn, { backgroundColor: c.chipBg }, filter === f.key && { backgroundColor: c.activeChipBg }]}
            >
              <Text style={[styles.filterText, { color: c.textSecondary }, filter === f.key && { color: c.activeChipText }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setAddModal(true)}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Table Grid */}
      <FlatList
        data={filtered}
        numColumns={2}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTables(true)} colors={[colors.primary]} />}
        renderItem={({ item }) => {
          const cfg = statusCfg[item.status as TableStatus] ?? statusCfg.available;
          const isSelected = selected?.id === item.id;
          const orderCount = item.activeOrders?.length ?? 0;
          const zoneInfo = ZONES.find(z => z.key === (item.zone || 'ground-floor'));
          return (
            <TouchableOpacity
              style={[styles.tableCard, { backgroundColor: cfg.bg }, isSelected && styles.tableCardSelected]}
              onPress={() => setSelected(isSelected ? null : item)}
              activeOpacity={0.85}
            >
              <View style={styles.tableHeader}>
                <Text style={[styles.tableNum, { color: c.textPrimary }]}>T{item.number}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {orderCount > 1 && (
                    <View style={styles.orderCountBadge}>
                      <Text style={styles.orderCountText}>{orderCount}</Text>
                    </View>
                  )}
                  <View style={[styles.dot, { backgroundColor: cfg.dot }]} />
                </View>
              </View>
              <Text style={[styles.tableStatus, { color: cfg.color }]}>{cfg.label}</Text>
              <Text style={[styles.tableMeta, { color: c.textMuted }]}>💺 {item.seats} seats</Text>
              {zoneInfo && zoneInfo.key !== 'all' && (
                <Text style={[styles.tableMeta, { color: c.textMuted }]}>{zoneInfo.icon} {zoneInfo.label}</Text>
              )}
              {item.serverName && <Text style={[styles.tableMeta, { color: c.textMuted }]}>👤 {item.serverName}</Text>}
              {item.occupiedSince && <Text style={[styles.tableMeta, { color: c.textMuted }]}>🕐 Since {item.occupiedSince}</Text>}

              {item.status === 'available' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.green }]}
                  onPress={() => { setSeatModal({ tableId: item.id, tableNumber: item.number }); setSeatError(''); }}
                >
                  <Text style={styles.actionBtnText}>Seat Guests</Text>
                </TouchableOpacity>
              )}
              {item.status === 'dirty' && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.red }]}
                  onPress={() => markCleaned(item.id)}
                  disabled={actionLoading}
                >
                  <Text style={styles.actionBtnText}>Mark Cleaned</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Detail Bottom Sheet */}
      {selected && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSelected(null)}>
          <View style={styles.sheetOverlay}>
            <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setSelected(null)} />
            <View style={[styles.sheet, { backgroundColor: c.card }]}>
              <View style={[styles.sheetHandle, { backgroundColor: c.cardBorder }]} />
              <View style={styles.sheetHeader}>
                <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>Table {selected.number}</Text>
                <TouchableOpacity onPress={() => setSelected(null)}>
                  <Text style={[styles.sheetClose, { color: c.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={[styles.sheetRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.sheetKey, { color: c.textSecondary }]}>Status</Text>
                  <Text style={[styles.sheetVal, { color: statusCfg[selected.status as TableStatus]?.color }]}>
                    {statusCfg[selected.status as TableStatus]?.label}
                  </Text>
                </View>
                <View style={[styles.sheetRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.sheetKey, { color: c.textSecondary }]}>Seats</Text>
                  <Text style={[styles.sheetVal, { color: c.textPrimary }]}>{selected.seats}</Text>
                </View>
                {selected.zone && (
                  <View style={[styles.sheetRow, { borderBottomColor: c.cardBorder }]}>
                    <Text style={[styles.sheetKey, { color: c.textSecondary }]}>Zone</Text>
                    <Text style={[styles.sheetVal, { color: c.textPrimary }]}>
                      {ZONES.find(z => z.key === selected.zone)?.label || selected.zone}
                    </Text>
                  </View>
                )}
                {selected.serverName && (
                  <View style={[styles.sheetRow, { borderBottomColor: c.cardBorder }]}>
                    <Text style={[styles.sheetKey, { color: c.textSecondary }]}>Server</Text>
                    <Text style={[styles.sheetVal, { color: c.textPrimary }]}>{selected.serverName}</Text>
                  </View>
                )}

                {/* Active Orders */}
                {(selected.activeOrders?.length ?? 0) > 0 && (
                  <View style={styles.ordersSection}>
                    <Text style={[styles.ordersSectionTitle, { color: c.textMuted }]}>Active Orders</Text>
                    {selected.activeOrders.map(o => {
                      const badge = orderStatusBadge[o.status];
                      return (
                        <View key={o.id} style={[styles.orderCard, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
                          <View style={styles.orderCardLeft}>
                            <Text style={styles.orderCardId}>#{o.id}</Text>
                            <View style={[styles.orderTypePill, { backgroundColor: '#fff7ed' }]}>
                              <Text style={styles.orderTypePillText}>
                                {o.orderType === 'dine-in' ? '🍽' : o.orderType === 'takeaway' ? '🛵' : '🌐'}  {o.orderType}
                              </Text>
                            </View>
                          </View>
                          <View style={styles.orderCardRight}>
                            {badge && (
                              <View style={[styles.orderStatusBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.orderStatusText, { color: badge.color }]}>{badge.label}</Text>
                              </View>
                            )}
                            <Text style={[styles.orderCardAmount, { color: c.textPrimary }]}>₹{Number(o.subtotal).toLocaleString()}</Text>
                            <Text style={[styles.orderCardItems, { color: c.textMuted }]}>{o.itemCount} items</Text>
                            {o.status !== 'billing' ? (
                              <TouchableOpacity
                                style={[styles.generateBillBtn, { opacity: actionLoading ? 0.6 : 1 }]}
                                onPress={() => generateBill(o.id)}
                                disabled={actionLoading}
                              >
                                <Text style={styles.generateBillText}>💳 Generate Bill</Text>
                              </TouchableOpacity>
                            ) : (
                              <View style={[styles.generateBillBtn, { backgroundColor: colors.purple }]}>
                                <Text style={styles.generateBillText}>Process Payment →</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Actions */}
                {(selected.status === 'occupied' || selected.status === 'billing' || selected.status === 'reserved') && (
                  <TouchableOpacity
                    style={[styles.sheetBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
                    onPress={() => {
                      const tableId = selected.id;
                      const tableNumber = selected.number;
                      setSelected(null);
                      navigateTo('orders', { tableId, tableNumber });
                    }}
                  >
                    <Text style={styles.sheetBtnText}>
                      {(selected.activeOrders?.length ?? 0) > 0 ? '➕  New Order (2nd Customer)' : '🍽  Add Order'}
                    </Text>
                  </TouchableOpacity>
                )}
                {selected.status === 'available' && (
                  <TouchableOpacity
                    style={[styles.sheetBtn, { backgroundColor: colors.green, marginTop: 14 }]}
                    onPress={() => {
                      setSeatModal({ tableId: selected.id, tableNumber: selected.number });
                      setSeatError('');
                      setSelected(null);
                    }}
                  >
                    <Text style={styles.sheetBtnText}>Seat New Guests</Text>
                  </TouchableOpacity>
                )}
                {selected.status === 'dirty' && (
                  <TouchableOpacity
                    style={[styles.sheetBtn, { backgroundColor: colors.red, marginTop: 14, opacity: actionLoading ? 0.6 : 1 }]}
                    onPress={() => markCleaned(selected.id)}
                    disabled={actionLoading}
                  >
                    <Text style={styles.sheetBtnText}>Mark as Cleaned</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* Seat Guests Modal */}
      {seatModal && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setSeatModal(null)}>
          <View style={styles.centeredOverlay}>
            <View style={[styles.centeredSheet, { backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Seat Guests — T{seatModal.tableNumber}</Text>
              {seatError ? <Text style={styles.modalError}>{seatError}</Text> : null}
              <Text style={[styles.modalLabel, { color: c.textLabel }]}>Number of Guests</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={guestCount}
                onChangeText={setGuestCount}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                placeholderTextColor={c.textMuted}
              />
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: c.cardBorder }]} onPress={() => setSeatModal(null)}>
                  <Text style={[styles.modalCancelText, { color: c.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.green }, actionLoading && { opacity: 0.6 }]}
                  onPress={seatGuests}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={styles.modalConfirmText}>Seat Guests</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Add Table Modal */}
      {addModal && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setAddModal(false)}>
          <View style={styles.centeredOverlay}>
            <View style={[styles.centeredSheet, { backgroundColor: c.card }]}>
              <Text style={[styles.modalTitle, { color: c.textPrimary }]}>Add New Table</Text>
              {addError ? <Text style={styles.modalError}>{addError}</Text> : null}
              <Text style={[styles.modalLabel, { color: c.textLabel }]}>Table Number</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={newNumber}
                onChangeText={setNewNumber}
                keyboardType="number-pad"
                placeholder="e.g. 11"
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.modalLabel, { color: c.textLabel }]}>Seat Capacity</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={newSeats}
                onChangeText={setNewSeats}
                keyboardType="number-pad"
                placeholder="e.g. 4"
                placeholderTextColor={c.textMuted}
              />
              <Text style={[styles.modalLabel, { color: c.textLabel }]}>Zone</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {NEW_ZONES.map(z => (
                    <TouchableOpacity
                      key={z.key}
                      onPress={() => setNewZone(z.key)}
                      style={[styles.zonePill, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, newZone === z.key && styles.zonePillActive]}
                    >
                      <Text style={styles.zoneIcon}>{z.icon}</Text>
                      <Text style={[styles.zonePillText, { color: c.textSecondary }, newZone === z.key && { color: colors.white }]}>{z.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.modalCancelBtn, { borderColor: c.cardBorder }]} onPress={() => setAddModal(false)}>
                  <Text style={[styles.modalCancelText, { color: c.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmBtn, { backgroundColor: colors.primary }, actionLoading && { opacity: 0.6 }]}
                  onPress={addTable}
                  disabled={actionLoading}
                >
                  {actionLoading
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={styles.modalConfirmText}>Add Table</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  zoneBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 72 },
  zoneContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  zoneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  zoneBtnActive: { backgroundColor: colors.primary },
  zoneIcon: { fontSize: 13 },
  zoneText: { fontSize: 12, fontWeight: '500', color: colors.gray600 },
  zoneTextActive: { color: colors.white },
  statusRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, paddingRight: 12 },
  statusContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 6 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  filterBtnActive: { backgroundColor: colors.gray900 },
  filterText: { fontSize: 12, fontWeight: '500', color: colors.gray600 },
  filterTextActive: { color: colors.white },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginLeft: 4 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  grid: { padding: 16, gap: 12 },
  tableCard: { flex: 1, borderRadius: 16, padding: 14, borderWidth: 2, borderColor: 'transparent' },
  tableCardSelected: { borderColor: colors.primary },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  tableNum: { fontSize: 20, fontWeight: '800', color: colors.gray900 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  orderCountBadge: { backgroundColor: colors.primary, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  orderCountText: { fontSize: 11, fontWeight: '800', color: colors.white },
  tableStatus: { fontSize: 12, fontWeight: '600', marginBottom: 6 },
  tableMeta: { fontSize: 11, color: colors.gray500, marginBottom: 2 },
  actionBtn: { marginTop: 10, borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  // Bottom Sheet
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12, maxHeight: '80%' },
  sheetHandle: { width: 40, height: 4, backgroundColor: colors.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  sheetClose: { fontSize: 18, color: colors.gray400 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  sheetKey: { fontSize: 14, color: colors.gray500 },
  sheetVal: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  ordersSection: { marginTop: 14 },
  ordersSectionTitle: { fontSize: 11, fontWeight: '700', color: colors.gray400, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  orderCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: colors.gray50, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.gray200 },
  orderCardLeft: { gap: 4 },
  orderCardId: { fontSize: 14, fontWeight: '700', color: colors.primary },
  orderTypePill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  orderTypePillText: { fontSize: 11, fontWeight: '600', color: colors.primary },
  orderCardRight: { alignItems: 'flex-end', gap: 4 },
  orderStatusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  orderStatusText: { fontSize: 11, fontWeight: '600' },
  orderCardAmount: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
  orderCardItems: { fontSize: 11, color: colors.gray400 },
  generateBillBtn: { backgroundColor: colors.purple, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginTop: 2 },
  generateBillText: { fontSize: 11, fontWeight: '700', color: colors.white },
  sheetBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  sheetBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  // Centered modals
  centeredOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  centeredSheet: { backgroundColor: colors.white, borderRadius: 20, padding: 24, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900, marginBottom: 16 },
  modalError: { fontSize: 13, color: colors.red, marginBottom: 12, backgroundColor: '#fef2f2', padding: 10, borderRadius: 10 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  modalInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.gray900, marginBottom: 14, backgroundColor: colors.white },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  modalConfirmText: { fontSize: 14, fontWeight: '700', color: colors.white },
  zonePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  zonePillActive: { backgroundColor: colors.primary },
  zonePillText: { fontSize: 12, fontWeight: '500', color: colors.gray600 },
});
