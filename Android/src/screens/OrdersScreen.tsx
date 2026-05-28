import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, FlatList, ActivityIndicator,
} from 'react-native';
import { useShellNavigation } from '../navigation/AppNavigator';
import { api } from '../api/client';
import type { MenuItemDto, TableDto, OrderDto } from '../api/types';
import { mockMenuItems, categories as mockCategories } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';

interface CartItem { id: number; name: string; price: number; qty: number; veg: boolean }

const ORDER_TYPES = [
  { value: 'dine-in',  label: '🪑 Dine-in'  },
  { value: 'takeaway', label: '🛵 Takeaway' },
  { value: 'online',   label: '🌐 Online'   },
];

const kitchenStatusLabel: Record<string, string> = {
  pending:   '⏳ Pending',
  preparing: '🔥 Cooking',
  ready:     '✓ Ready',
};

export default function OrdersScreen() {
  const { params } = useShellNavigation();
  const { c } = useTheme();
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [cats, setCats] = useState<string[]>(['All']);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<number>(0);
  const [orderType, setOrderType] = useState('dine-in');
  const [existingOrder, setExistingOrder] = useState<OrderDto | null>(null);

  const orderId = params?.orderId as number | undefined;
  const isAddMode = !!orderId;

  const fetchData = useCallback(async () => {
    try {
      const fetchList: Promise<unknown>[] = [
        api.get<MenuItemDto[]>('/api/menu'),
        api.get<TableDto[]>('/api/tables'),
      ];
      if (orderId) fetchList.push(api.get<OrderDto>(`/api/orders/${orderId}`));

      const [menuData, tableData, existingOrd] = await Promise.all(fetchList) as [MenuItemDto[], TableDto[], OrderDto?];
      setMenuItems(menuData);
      const uniqueCats = ['All', ...Array.from(new Set(menuData.map(i => i.category)))];
      setCats(uniqueCats);
      const activeTables = tableData.filter(t => t.status === 'available' || t.status === 'occupied');
      setTables(activeTables);
      if (existingOrd) setExistingOrder(existingOrd);
      // Pre-select table from navigation params, else first available
      const paramTableId = params?.tableId;
      if (paramTableId) {
        setSelectedTableId(paramTableId);
      } else if (activeTables.length > 0 && selectedTableId === 0) {
        setSelectedTableId(activeTables[0].id);
      }
    } catch {
      setMenuItems(mockMenuItems as unknown as MenuItemDto[]);
      setCats(['All', ...mockCategories.slice(1)]);
    } finally {
      setLoading(false);
    }
  }, [params?.tableId, orderId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && item.isAvailable;
  });

  const getQty = (id: number) => cart.find(c => c.id === id)?.qty || 0;
  const totalItems = cart.reduce((s, c) => s + c.qty, 0);
  const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
  const tax = Math.round(subtotal * 0.05);
  const service = Math.round(subtotal * 0.05);
  const total = subtotal + tax + service;

  const addItem = (item: MenuItemDto) => {
    setCart(prev => {
      const ex = prev.find(c => c.id === item.id);
      if (ex) return prev.map(c => c.id === item.id ? { ...c, qty: c.qty + 1 } : c);
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1, veg: item.isVeg }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev => prev.map(c => c.id === id ? { ...c, qty: Math.max(0, c.qty + delta) } : c).filter(c => c.qty > 0));
  };

  const removeItem = (id: number) => setCart(prev => prev.filter(c => c.id !== id));

  const sendToKitchen = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    try {
      if (isAddMode && orderId) {
        await api.post(`/api/orders/${orderId}/add-items`, {
          items: cart.map(c => ({ menuItemId: c.id, quantity: c.qty })),
        });
        const totalAdded = cart.reduce((s, c) => s + c.qty, 0);
        setSuccess(`${totalAdded} item${totalAdded !== 1 ? 's' : ''} added to Order #${orderId}!`);
        setCart([]);
        setShowCart(false);
      } else {
        if (!selectedTableId) return;
        const order = await api.post<{ id: number }>('/api/orders', {
          tableId: selectedTableId,
          items: cart.map(c => ({ menuItemId: c.id, quantity: c.qty })),
          orderType,
        });
        await api.post(`/api/orders/${order.id}/send-to-kitchen`, {});
        setSuccess(`Order #${order.id} sent to kitchen!`);
        setCart([]);
        setShowCart(false);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);

  // ── Success banner ──────────────────────────────────────────────────────────
  if (success && !showCart) {
    return (
      <View style={[styles.root, styles.center, { backgroundColor: c.bg }]}>
        <Text style={{ fontSize: 64, marginBottom: 20 }}>{isAddMode ? '✅' : '🍽'}</Text>
        <Text style={[styles.sentTitle, { color: c.textPrimary }]}>{isAddMode ? 'Items Added!' : 'Order Sent to Kitchen!'}</Text>
        <Text style={[styles.sentSub, { color: c.textMuted }]}>{success}</Text>
        <TouchableOpacity style={styles.newOrderBtn} onPress={() => setSuccess('')}>
          <Text style={styles.newOrderBtnText}>{isAddMode ? 'Add More Items' : 'New Order'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Cart view ───────────────────────────────────────────────────────────────
  if (showCart) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <View style={[styles.cartHeader, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
          <TouchableOpacity onPress={() => setShowCart(false)}>
            <Text style={styles.backBtn}>← Menu</Text>
          </TouchableOpacity>
          <Text style={[styles.cartTitle, { color: c.textPrimary }]}>
            {isAddMode ? `Add to Order #${orderId}` : `${selectedTable ? `T${selectedTable.number}` : 'Order'} · ${totalItems} items`}
          </Text>
          <TouchableOpacity onPress={() => setCart([])}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Order Type — hidden in add mode */}
        {!isAddMode && (
          <View style={[styles.orderTypeRow, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
            {ORDER_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                onPress={() => setOrderType(t.value)}
                style={[styles.orderTypeBtn, { backgroundColor: c.chipBg }, orderType === t.value && styles.orderTypeBtnActive]}
              >
                <Text style={[styles.orderTypeText, { color: c.textSecondary }, orderType === t.value && { color: colors.white }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <ScrollView style={styles.cartList}>
          {/* Already in kitchen section (add mode only) */}
          {isAddMode && existingOrder && existingOrder.items.length > 0 && (
            <View style={styles.existingSection}>
              <Text style={[styles.existingSectionTitle, { color: c.textMuted }]}>Already in Kitchen</Text>
              {existingOrder.items.map(item => (
                <View key={item.id} style={[styles.existingItem, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.existingItemName, { color: c.textSecondary }]}>{item.name} ×{item.quantity}</Text>
                    <Text style={[styles.existingItemStatus, { color: c.textMuted }]}>{kitchenStatusLabel[item.kitchenStatus] ?? item.kitchenStatus}</Text>
                  </View>
                  <Text style={[styles.existingItemAmt, { color: c.textMuted }]}>₹{(item.price * item.quantity).toLocaleString()}</Text>
                </View>
              ))}
              <Text style={[styles.newItemsLabel, { color: colors.primary }]}>New Items</Text>
            </View>
          )}

          {cart.map(item => (
            <View key={item.id} style={[styles.cartItem, { backgroundColor: c.card, borderBottomColor: c.cardBorder }]}>
              <View style={[styles.vegDot, { backgroundColor: item.veg ? colors.green : colors.red }]} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.cartItemName, { color: c.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.cartItemPrice, { color: c.textMuted }]}>₹{item.price} each</Text>
              </View>
              <View style={styles.qtyRow}>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: c.chipBg }]} onPress={() => updateQty(item.id, -1)}>
                  <Text style={[styles.qtyBtnText, { color: c.textSecondary }]}>−</Text>
                </TouchableOpacity>
                <Text style={[styles.qtyNum, { color: c.textPrimary }]}>{item.qty}</Text>
                <TouchableOpacity style={[styles.qtyBtn, { backgroundColor: colors.primary }]} onPress={() => updateQty(item.id, 1)}>
                  <Text style={[styles.qtyBtnText, { color: colors.white }]}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.id)}>
                  <Text style={[styles.removeBtnText, { color: c.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={[styles.cartSummary, { backgroundColor: c.card, borderTopColor: c.cardBorder }]}>
          {!isAddMode && <>
            <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Subtotal</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{subtotal.toLocaleString()}</Text></View>
            <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Tax (5%)</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{tax.toLocaleString()}</Text></View>
            <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Service (5%)</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{service.toLocaleString()}</Text></View>
            <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: c.cardBorder }]}>
              <Text style={[styles.totalKey, { color: c.textPrimary }]}>Total</Text>
              <Text style={styles.totalVal}>₹{total.toLocaleString()}</Text>
            </View>
          </>}
          {isAddMode && (
            <View style={[styles.summaryRow, { marginBottom: 4 }]}>
              <Text style={[styles.summaryKey, { color: c.textSecondary }]}>New items subtotal</Text>
              <Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{subtotal.toLocaleString()}</Text>
            </View>
          )}
          {error ? <Text style={styles.errorText}>⚠️  {error}</Text> : null}
          <TouchableOpacity
            style={[styles.sendBtn, (submitting || (!isAddMode && !selectedTableId)) && { opacity: 0.7 }]}
            onPress={sendToKitchen}
            disabled={submitting || (!isAddMode && !selectedTableId)}
          >
            {submitting
              ? <ActivityIndicator color={colors.white} />
              : <Text style={styles.sendBtnText}>{isAddMode ? '➕  Add to Order' : '🍽  Send to Kitchen'}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Menu view ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* Top bar: search + table selector */}
          <View style={[styles.topBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: c.inputBg, color: c.textPrimary }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search menu items..."
              placeholderTextColor={colors.gray400}
            />
            {tables.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tableChips}>
                {tables.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setSelectedTableId(t.id)}
                    style={[styles.tableChip, { backgroundColor: c.chipBg, borderColor: c.cardBorder }, selectedTableId === t.id && styles.tableChipActive]}
                  >
                    <Text style={[styles.tableChipText, { color: c.textSecondary }, selectedTableId === t.id && { color: colors.white }]}>
                      T{t.number}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>

          {/* Categories */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]} contentContainerStyle={styles.catContent}>
            {cats.map(cat => (
              <TouchableOpacity key={cat} onPress={() => setActiveCategory(cat)} style={[styles.catBtn, { backgroundColor: c.chipBg }, activeCategory === cat && styles.catBtnActive]}>
                <Text style={[styles.catText, { color: c.textSecondary }, activeCategory === cat && styles.catTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Menu Items */}
          <FlatList
            data={filtered}
            keyExtractor={item => String(item.id)}
            contentContainerStyle={styles.menuGrid}
            renderItem={({ item }) => {
              const qty = getQty(item.id);
              return (
                <View style={[styles.menuCard, { backgroundColor: c.card, borderColor: c.cardBorder }, qty > 0 && styles.menuCardActive]}>
                  <View style={styles.menuCardTop}>
                    <View style={[styles.vegDot, { backgroundColor: item.isVeg ? colors.green : colors.red }]} />
                    {item.isPopular && <Text style={styles.popularTag}>Popular</Text>}
                  </View>
                  <Text style={[styles.menuName, { color: c.textPrimary }]}>{item.name}</Text>
                  <Text style={[styles.menuCategory, { color: c.textMuted }]}>{item.category}</Text>
                  <View style={styles.menuBottom}>
                    <Text style={[styles.menuPrice, { color: c.textPrimary }]}>₹{item.price}</Text>
                    {qty === 0 ? (
                      <TouchableOpacity style={styles.addBtn} onPress={() => addItem(item)}>
                        <Text style={styles.addBtnText}>+</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnSm, { backgroundColor: c.chipBg }]} onPress={() => updateQty(item.id, -1)}>
                          <Text style={[styles.qtyBtnText, { color: c.textSecondary }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.qtyNumSm, { color: c.textPrimary }]}>{qty}</Text>
                        <TouchableOpacity style={[styles.qtyBtn, styles.qtyBtnSm, { backgroundColor: colors.primary }]} onPress={() => updateQty(item.id, 1)}>
                          <Text style={[styles.qtyBtnText, { color: colors.white }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {/* Cart FAB */}
          {totalItems > 0 && (
            <TouchableOpacity style={styles.fab} onPress={() => setShowCart(true)}>
              <Text style={styles.fabText}>🛒  {totalItems} items · ₹{subtotal.toLocaleString()}</Text>
              <Text style={styles.fabArrow}>→</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  sentTitle: { fontSize: 22, fontWeight: '800', color: colors.gray900, marginBottom: 8 },
  sentSub: { fontSize: 14, color: colors.gray400, marginBottom: 24 },
  newOrderBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  newOrderBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  topBar: { backgroundColor: colors.white, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.gray200, gap: 8 },
  searchInput: { backgroundColor: colors.gray100, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: colors.gray900 },
  tableChips: { gap: 6 },
  tableChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.gray100, borderWidth: 1, borderColor: colors.gray200 },
  tableChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tableChipText: { fontSize: 12, fontWeight: '700', color: colors.gray700 },
  catBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 52 },
  catContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  catBtnActive: { backgroundColor: colors.primary },
  catText: { fontSize: 13, fontWeight: '500', color: colors.gray600 },
  catTextActive: { color: colors.white },
  menuGrid: { padding: 12, gap: 10, paddingBottom: 80 },
  menuCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1.5, borderColor: colors.gray200 },
  menuCardActive: { borderColor: colors.primary },
  menuCardTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  vegDot: { width: 10, height: 10, borderRadius: 5 },
  popularTag: { fontSize: 11, fontWeight: '600', color: colors.amber, backgroundColor: colors.amberLt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  menuName: { fontSize: 15, fontWeight: '700', color: colors.gray900, marginBottom: 2 },
  menuCategory: { fontSize: 12, color: colors.gray400, marginBottom: 10 },
  menuBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  menuPrice: { fontSize: 17, fontWeight: '800', color: colors.gray900 },
  addBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 20, color: colors.white, fontWeight: '700', lineHeight: 24 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  qtyBtnSm: { width: 28, height: 28 },
  qtyBtnText: { fontSize: 18, color: colors.gray700, fontWeight: '700', lineHeight: 22 },
  qtyNum: { fontSize: 16, fontWeight: '700', color: colors.gray900, minWidth: 24, textAlign: 'center' },
  qtyNumSm: { fontSize: 14, fontWeight: '700', color: colors.gray900, minWidth: 20, textAlign: 'center' },
  fab: {
    position: 'absolute', bottom: 20, left: 20, right: 20,
    backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  fabText: { fontSize: 15, fontWeight: '700', color: colors.white },
  fabArrow: { fontSize: 18, color: colors.white },
  cartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  backBtn: { fontSize: 14, fontWeight: '600', color: colors.primary },
  cartTitle: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  clearBtn: { fontSize: 13, color: colors.red },
  orderTypeRow: { flexDirection: 'row', backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, padding: 10, gap: 8 },
  orderTypeBtn: { flex: 1, paddingVertical: 7, borderRadius: 10, backgroundColor: colors.gray100, alignItems: 'center' },
  orderTypeBtnActive: { backgroundColor: colors.primary },
  orderTypeText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  cartList: { flex: 1 },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, backgroundColor: colors.white, marginHorizontal: 12, marginTop: 8, borderRadius: 14, borderWidth: 1, borderColor: colors.gray100 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  cartItemPrice: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  removeBtn: { width: 28, height: 28, borderRadius: 8, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { fontSize: 12, color: colors.red, fontWeight: '700' },
  cartSummary: { backgroundColor: colors.white, padding: 20, borderTopWidth: 1, borderTopColor: colors.gray200 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryKey: { fontSize: 14, color: colors.gray500 },
  summaryVal: { fontSize: 14, fontWeight: '500', color: colors.gray900 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 12, marginTop: 4 },
  totalKey: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  totalVal: { fontSize: 18, fontWeight: '800', color: colors.primary },
  errorText: { fontSize: 13, color: colors.red, marginBottom: 8, fontWeight: '500' },
  sendBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 12 },
  sendBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  existingSection: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: 4 },
  existingSectionTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  existingItem: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 6, opacity: 0.7 },
  existingItemName: { fontSize: 13, fontWeight: '600' },
  existingItemStatus: { fontSize: 11, marginTop: 1 },
  existingItemAmt: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
  newItemsLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, color: colors.primary, marginTop: 8, marginBottom: 4 },
});
