import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Modal, ActivityIndicator, FlatList, RefreshControl,
} from 'react-native';
import { api } from '../api/client';
import type { BillDto, PaymentResultDto, SplitBillResultDto } from '../api/types';
import { billingOrders } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';

type PayMethod = 'cash' | 'card' | 'upi' | 'wallet';

const payMethods: { id: PayMethod; label: string; icon: string }[] = [
  { id: 'cash',   label: 'Cash',   icon: '💵' },
  { id: 'card',   label: 'Card',   icon: '💳' },
  { id: 'upi',    label: 'UPI',    icon: '📱' },
  { id: 'wallet', label: 'Wallet', icon: '👛' },
];

export default function BillingScreen() {
  const { c } = useTheme();
  const [bills, setBills] = useState<BillDto[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [discount, setDiscount] = useState(0);
  const [payMethod, setPayMethod] = useState<PayMethod>('card');
  const [cashInput, setCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentResultDto | null>(null);
  const [error, setError] = useState('');

  // Split bill
  const [splitModal, setSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitResult, setSplitResult] = useState<SplitBillResultDto | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);

  const fetchBills = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<BillDto[]>('/api/billing/pending');
      setBills(data);
      setError('');
    } catch {
      // fallback to mock
      const mock = billingOrders.map(o => ({
        orderId: o.id, tableNumber: o.table, serverName: o.server, orderTime: o.time,
        items: o.items.map(i => ({ name: i.name, quantity: i.qty, price: i.price, lineTotal: i.qty * i.price })),
        subtotal: o.subtotal, tax: o.tax, serviceCharge: o.service,
        total: o.subtotal + o.tax + o.service,
      }));
      setBills(mock as BillDto[]);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []);

  // Auto-select first bill
  useEffect(() => {
    if (bills.length > 0 && !selectedBill) setSelectedBill(bills[0]);
  }, [bills]);

  useEffect(() => {
    fetchBills();
    const id = setInterval(fetchBills, 10_000);
    return () => clearInterval(id);
  }, [fetchBills]);

  const selectBill = (bill: BillDto) => {
    setSelectedBill(bill);
    setDiscount(0);
    setCashInput('');
    setResult(null);
    setSplitResult(null);
    setError('');
  };

  const discountAmt = selectedBill ? Math.round(selectedBill.subtotal * (discount / 100)) : 0;
  const payableTotal = selectedBill
    ? selectedBill.subtotal + selectedBill.tax + selectedBill.serviceCharge - discountAmt
    : 0;
  const cashChange = cashInput && parseInt(cashInput) >= payableTotal
    ? parseInt(cashInput) - payableTotal : 0;

  const processPayment = async () => {
    if (!selectedBill) return;
    if (payMethod === 'cash' && (!cashInput || parseInt(cashInput) < payableTotal)) {
      setError(`Cash received must be at least ₹${payableTotal}`);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<PaymentResultDto>(`/api/billing/${selectedBill.orderId}/pay`, {
        method: payMethod,
        discountPercent: discount,
        cashReceived: payMethod === 'cash' ? parseInt(cashInput) : undefined,
      });
      setResult(res);
      setBills(prev => prev.filter(b => b.orderId !== selectedBill.orderId));
      setSelectedBill(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSplitModal = async () => {
    if (!selectedBill) return;
    setSplitModal(true);
    setSplitResult(null);
  };

  const calculateSplit = async () => {
    if (!selectedBill) return;
    setSplitLoading(true);
    try {
      const res = await api.post<SplitBillResultDto>(`/api/billing/${selectedBill.orderId}/split`, {
        splitCount, method: payMethod, discountPercent: discount,
      });
      setSplitResult(res);
    } catch {
      // local fallback
      const perPerson = Math.ceil(payableTotal / splitCount);
      setSplitResult({
        splitCount,
        totalAmount: payableTotal,
        amountPerPerson: perPerson,
        splits: Array.from({ length: splitCount }, (_, i) => ({
          personNumber: i + 1,
          amount: i === splitCount - 1 ? payableTotal - perPerson * (splitCount - 1) : perPerson,
        })),
      });
    } finally {
      setSplitLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDiscount(0);
    setCashInput('');
    setPayMethod('card');
    setError('');
    if (bills.length > 0) setSelectedBill(bills[0]);
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (result) {
    return (
      <View style={[styles.successRoot, { backgroundColor: c.bg }]}>
        <Text style={styles.successIcon}>✅</Text>
        <Text style={[styles.successTitle, { color: c.textPrimary }]}>Payment Successful!</Text>
        <Text style={[styles.successSub, { color: c.textSecondary }]}>Payment #{result.paymentId}</Text>
        <Text style={styles.successAmount}>₹{Number(result.totalCharged).toLocaleString()}</Text>
        {result.method === 'cash' && result.changeGiven != null && result.changeGiven > 0 && (
          <View style={styles.changeBadge}>
            <Text style={styles.changeText}>Change to return: ₹{Number(result.changeGiven).toLocaleString()}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.newTxBtn} onPress={reset}>
          <Text style={styles.newTxText}>New Transaction</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ScreenHeader title="Billing" subtitle="Process payments" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────
  if (bills.length === 0 && !selectedBill) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ScreenHeader title="Billing" subtitle="Process payments" />
        <View style={styles.center}>
          <Text style={{ fontSize: 40, marginBottom: 12 }}>💳</Text>
          <Text style={[styles.emptyTitle, { color: c.textPrimary }]}>No pending bills</Text>
          <Text style={[styles.emptySub, { color: c.textSecondary }]}>Bills appear when kitchen marks orders ready</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={() => fetchBills(true)}>
            <Text style={styles.refreshBtnText}>↻  Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main ────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Billing" subtitle={`${bills.length} pending bill${bills.length !== 1 ? 's' : ''}`} />

      {/* Bill selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.selectorBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}
        contentContainerStyle={styles.selectorContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchBills(true)} colors={[colors.primary]} />}
      >
        {bills.map(b => (
          <TouchableOpacity
            key={b.orderId}
            onPress={() => selectBill(b)}
            style={[
              styles.selectorChip,
              { backgroundColor: c.chipBg },
              selectedBill?.orderId === b.orderId && styles.selectorChipActive,
            ]}
          >
            <Text style={[styles.selectorTable, { color: c.textPrimary }, selectedBill?.orderId === b.orderId && { color: colors.white }]}>
              T{b.tableNumber}
            </Text>
            <Text style={[styles.selectorAmount, { color: c.textSecondary }, selectedBill?.orderId === b.orderId && { color: colors.white }]}>
              ₹{Number(b.total).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {selectedBill && (
          <>
            {/* Items */}
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <View style={styles.cardTitleRow}>
                <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Order Items</Text>
                <Text style={[styles.orderMeta, { color: c.textMuted }]}>Table {selectedBill.tableNumber} · #{selectedBill.orderId}</Text>
              </View>
              {selectedBill.items.map((item, i) => (
                <View key={i} style={[styles.itemRow, i < selectedBill.items.length - 1 && [styles.itemBorder, { borderBottomColor: c.cardBorder }]]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, { color: c.textPrimary }]}>{item.name}</Text>
                    <Text style={[styles.itemQty, { color: c.textMuted }]}>× {item.quantity} @ ₹{Number(item.price).toLocaleString()}</Text>
                  </View>
                  <Text style={[styles.itemTotal, { color: c.textPrimary }]}>₹{Number(item.lineTotal).toLocaleString()}</Text>
                </View>
              ))}
            </View>

            {/* Discount */}
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Apply Discount</Text>
              <View style={styles.discountRow}>
                <TextInput
                  style={[styles.discountInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                  value={discount > 0 ? String(discount) : ''}
                  onChangeText={v => setDiscount(Math.min(100, Math.max(0, Number(v))))}
                  placeholder="Enter % discount"
                  placeholderTextColor={c.textMuted}
                  keyboardType="numeric"
                />
                <View style={styles.discountPresets}>
                  {[5, 10, 15, 20].map(p => (
                    <TouchableOpacity
                      key={p}
                      style={[styles.presetBtn, { backgroundColor: c.chipBg }, discount === p && styles.presetBtnActive]}
                      onPress={() => setDiscount(discount === p ? 0 : p)}
                    >
                      <Text style={[styles.presetText, { color: c.textSecondary }, discount === p && styles.presetTextActive]}>{p}%</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Bill Summary */}
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Bill Summary</Text>
              <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Subtotal</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{Number(selectedBill.subtotal).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Tax (5%)</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{Number(selectedBill.tax).toLocaleString()}</Text></View>
              <View style={styles.summaryRow}><Text style={[styles.summaryKey, { color: c.textSecondary }]}>Service (5%)</Text><Text style={[styles.summaryVal, { color: c.textPrimary }]}>₹{Number(selectedBill.serviceCharge).toLocaleString()}</Text></View>
              {discountAmt > 0 && (
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryKey, { color: colors.green }]}>Discount ({discount}%)</Text>
                  <Text style={{ color: colors.green, fontWeight: '600' }}>-₹{discountAmt.toLocaleString()}</Text>
                </View>
              )}
              <View style={[styles.summaryRow, styles.totalRow, { borderTopColor: c.cardBorder }]}>
                <Text style={[styles.totalKey, { color: c.textPrimary }]}>Total Payable</Text>
                <Text style={styles.totalVal}>₹{payableTotal.toLocaleString()}</Text>
              </View>
            </View>

            {/* Payment Method */}
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Payment Method</Text>
              <View style={styles.payGrid}>
                {payMethods.map(m => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => { setPayMethod(m.id); setCashInput(''); setError(''); }}
                    style={[styles.payBtn, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, payMethod === m.id && styles.payBtnActive]}
                  >
                    <Text style={styles.payIcon}>{m.icon}</Text>
                    <Text style={[styles.payLabel, { color: c.textSecondary }, payMethod === m.id && { color: colors.primary }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {payMethod === 'cash' && (
                <View style={styles.cashRow}>
                  <TextInput
                    style={[styles.cashInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                    value={cashInput}
                    onChangeText={setCashInput}
                    placeholder={`₹${payableTotal} or more`}
                    placeholderTextColor={c.textMuted}
                    keyboardType="numeric"
                  />
                  {cashChange > 0 && (
                    <View style={styles.changePill}>
                      <Text style={styles.changePillText}>Change: ₹{cashChange.toLocaleString()}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {error ? <Text style={styles.errorText}>⚠️  {error}</Text> : null}

            <TouchableOpacity
              style={[styles.confirmBtn, submitting && { opacity: 0.7 }]}
              onPress={processPayment}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.confirmText}>Confirm Payment · ₹{payableTotal.toLocaleString()}</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity style={styles.splitBtn} onPress={openSplitModal}>
              <Text style={styles.splitText}>✂️  Split Bill</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Split Bill Modal */}
      <Modal visible={splitModal} animationType="slide" transparent onRequestClose={() => setSplitModal(false)}>
        <View style={split.overlay}>
          <TouchableOpacity style={split.backdrop} activeOpacity={1} onPress={() => setSplitModal(false)} />
          <View style={[split.sheet, { backgroundColor: c.card }]}>
            <View style={[split.handle, { backgroundColor: c.cardBorder }]} />
            <View style={split.titleRow}>
              <Text style={[split.title, { color: c.textPrimary }]}>✂️  Split Bill</Text>
              <TouchableOpacity onPress={() => setSplitModal(false)}>
                <Text style={[split.close, { color: c.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[split.label, { color: c.textLabel }]}>Split between how many people?</Text>
            <View style={split.countRow}>
              {[2, 3, 4, 5, 6].map(n => (
                <TouchableOpacity
                  key={n}
                  onPress={() => { setSplitCount(n); setSplitResult(null); }}
                  style={[split.countBtn, { borderColor: c.cardBorder }, splitCount === n && split.countBtnActive]}
                >
                  <Text style={[split.countText, { color: c.textSecondary }, splitCount === n && split.countTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[split.calcBtn, splitLoading && { opacity: 0.7 }]}
              onPress={calculateSplit}
              disabled={splitLoading}
            >
              {splitLoading
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={split.calcBtnText}>Calculate Split</Text>
              }
            </TouchableOpacity>

            {splitResult && (
              <View style={split.result}>
                <View style={split.resultSummary}>
                  <Text style={[split.resultLabel, { color: c.textSecondary }]}>Total Bill</Text>
                  <Text style={[split.resultTotal, { color: c.textPrimary }]}>₹{Number(splitResult.totalAmount).toLocaleString()}</Text>
                </View>
                <View style={split.resultSummary}>
                  <Text style={[split.resultLabel, { color: c.textSecondary }]}>Per Person (approx.)</Text>
                  <Text style={[split.resultTotal, { color: colors.purple }]}>
                    ₹{Math.ceil(Number(splitResult.amountPerPerson)).toLocaleString()}
                  </Text>
                </View>
                <View style={split.personGrid}>
                  {splitResult.splits.map(s => (
                    <View key={s.personNumber} style={split.personCard}>
                      <Text style={split.personLabel}>Person {s.personNumber}</Text>
                      <Text style={split.personAmount}>₹{Math.ceil(Number(s.amount)).toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity style={[split.doneBtn, { borderColor: c.cardBorder }]} onPress={() => setSplitModal(false)}>
              <Text style={[split.doneBtnText, { color: c.textSecondary }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.gray50 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.gray700, marginBottom: 6 },
  emptySub: { fontSize: 13, color: colors.gray400, textAlign: 'center', paddingHorizontal: 32 },
  refreshBtn: { marginTop: 20, backgroundColor: colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  refreshBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
  selectorBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 80 },
  selectorContent: { padding: 12, gap: 8 },
  selectorChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.gray100, minWidth: 80, alignItems: 'center' },
  selectorChipActive: { backgroundColor: colors.primary },
  selectorTable: { fontSize: 13, fontWeight: '700', color: colors.gray700 },
  selectorAmount: { fontSize: 12, fontWeight: '600', color: colors.gray500, marginTop: 2 },
  content: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.white, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.gray200 },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  orderMeta: { fontSize: 12, color: colors.gray400 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  itemName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  itemQty: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  itemTotal: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  discountRow: { gap: 10 },
  discountInput: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.gray900 },
  discountPresets: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.gray100, alignItems: 'center' },
  presetBtnActive: { backgroundColor: colors.primary },
  presetText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  presetTextActive: { color: colors.white },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryKey: { fontSize: 14, color: colors.gray500 },
  summaryVal: { fontSize: 14, fontWeight: '500', color: colors.gray900 },
  totalRow: { borderTopWidth: 1, borderTopColor: colors.gray200, paddingTop: 12, marginTop: 4, marginBottom: 0 },
  totalKey: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  totalVal: { fontSize: 20, fontWeight: '800', color: colors.primary },
  payGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  payBtn: { flex: 1, minWidth: '22%', alignItems: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.gray200, backgroundColor: colors.gray50 },
  payBtnActive: { borderColor: colors.primary, backgroundColor: '#fff7ed' },
  payIcon: { fontSize: 22, marginBottom: 4 },
  payLabel: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  cashRow: { marginTop: 12, gap: 8 },
  cashInput: { backgroundColor: colors.gray50, borderWidth: 1, borderColor: colors.gray200, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: colors.gray900 },
  changePill: { backgroundColor: '#f0fdf4', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center' },
  changePillText: { fontSize: 14, fontWeight: '600', color: colors.green },
  errorText: { fontSize: 13, color: colors.red, marginBottom: 10, fontWeight: '500' },
  confirmBtn: { backgroundColor: colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 4, marginBottom: 10 },
  confirmText: { fontSize: 16, fontWeight: '700', color: colors.white },
  splitBtn: { borderWidth: 1.5, borderColor: colors.gray200, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  splitText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  successRoot: { flex: 1, backgroundColor: colors.gray50, alignItems: 'center', justifyContent: 'center', padding: 32 },
  successIcon: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.gray900, marginBottom: 6 },
  successSub: { fontSize: 14, color: colors.gray400, marginBottom: 12 },
  successAmount: { fontSize: 40, fontWeight: '900', color: colors.green, marginBottom: 20 },
  changeBadge: { backgroundColor: colors.amberLt, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, marginBottom: 24 },
  changeText: { fontSize: 16, fontWeight: '600', color: colors.amber },
  newTxBtn: { backgroundColor: colors.primary, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14 },
  newTxText: { fontSize: 15, fontWeight: '700', color: colors.white },
});

const split = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingTop: 12 },
  handle: { width: 40, height: 4, backgroundColor: colors.gray200, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  close: { fontSize: 18, color: colors.gray400 },
  label: { fontSize: 14, fontWeight: '600', color: colors.gray700, marginBottom: 12 },
  countRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  countBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 2, borderColor: colors.gray200, alignItems: 'center', justifyContent: 'center' },
  countBtnActive: { borderColor: colors.purple, backgroundColor: '#f5f3ff' },
  countText: { fontSize: 16, fontWeight: '700', color: colors.gray600 },
  countTextActive: { color: colors.purple },
  calcBtn: { backgroundColor: colors.purple, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginBottom: 16 },
  calcBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
  result: { marginBottom: 8 },
  resultSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resultLabel: { fontSize: 14, color: colors.gray500 },
  resultTotal: { fontSize: 16, fontWeight: '700', color: colors.gray900 },
  personGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  personCard: { flex: 1, minWidth: '44%', backgroundColor: '#f5f3ff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ede9fe' },
  personLabel: { fontSize: 12, color: colors.gray400, marginBottom: 4 },
  personAmount: { fontSize: 22, fontWeight: '800', color: colors.purple },
  doneBtn: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 16 },
  doneBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
});
