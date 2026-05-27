import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Modal, Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import { ScreenHeader } from '../components/ScreenHeader';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import type { InvestmentDto, InvestmentSummaryDto, CreateInvestmentRequest } from '../api/types';

const CATEGORIES = [
  { id: 'ingredients', label: 'Ingredients', emoji: '🛒', bg: '#fff7ed', fg: '#c2410c' },
  { id: 'utilities',   label: 'Utilities',   emoji: '⚡', bg: '#fefce8', fg: '#a16207' },
  { id: 'labor',       label: 'Labor',       emoji: '👥', bg: '#eff6ff', fg: '#1d4ed8' },
  { id: 'maintenance', label: 'Maintenance', emoji: '🔧', bg: '#fef2f2', fg: '#b91c1c' },
  { id: 'equipment',   label: 'Equipment',   emoji: '📦', bg: '#f5f3ff', fg: '#6d28d9' },
  { id: 'other',       label: 'Other',       emoji: '❓', bg: '#f9fafb', fg: '#6b7280' },
];

function catInfo(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[5];
}

function formatDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(s: string, n: number) {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const TODAY = new Date().toISOString().slice(0, 10);

export default function InvestmentScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const canManage = user?.role === 'manager' || user?.role === 'admin';

  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [investments, setInvestments] = useState<InvestmentDto[]>([]);
  const [summary, setSummary] = useState<InvestmentSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ category: 'ingredients', description: '', amount: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async (date: string, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [inv, sum] = await Promise.all([
        api.get<InvestmentDto[]>(`/api/investment?date=${date}`),
        api.get<InvestmentSummaryDto>(`/api/investment/summary?date=${date}`),
      ]);
      setInvestments(inv);
      setSummary(sum);
    } catch {
      setError('Failed to load investment data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(selectedDate); }, [selectedDate, fetchData]);

  const addInvestment = async () => {
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('Enter a valid amount.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const req: CreateInvestmentRequest = {
        category: form.category,
        description: form.description.trim(),
        amount,
        date: selectedDate,
      };
      await api.post<InvestmentDto>('/api/investment', req);
      setShowAdd(false);
      setForm({ category: 'ingredients', description: '', amount: '' });
      await fetchData(selectedDate);
    } catch {
      setFormError('Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const deleteInvestment = (inv: InvestmentDto) => {
    Alert.alert('Delete Expense', `Delete "${inv.description}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/investment/${inv.id}`);
            await fetchData(selectedDate);
          } catch {
            setError('Failed to delete expense.');
          }
        },
      },
    ]);
  };

  const profit = summary ? Number(summary.profit) : 0;
  const isProfit = profit >= 0;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Investment" subtitle={`${investments.length} expense${investments.length !== 1 ? 's' : ''}`} />

      {/* Date Navigator */}
      <View style={[styles.dateRow, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
        <TouchableOpacity onPress={() => setSelectedDate(d => addDays(d, -1))} style={styles.arrow}>
          <Text style={[styles.arrowText, { color: c.textSecondary }]}>‹</Text>
        </TouchableOpacity>
        <View style={styles.dateMid}>
          <Text style={[styles.dateLabel, { color: c.textPrimary }]}>{formatDate(selectedDate)}</Text>
          {selectedDate !== TODAY && (
            <TouchableOpacity onPress={() => setSelectedDate(TODAY)}>
              <Text style={styles.todayLink}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setSelectedDate(d => addDays(d, 1))}
          disabled={selectedDate >= TODAY}
          style={[styles.arrow, selectedDate >= TODAY && { opacity: 0.25 }]}
        >
          <Text style={[styles.arrowText, { color: c.textSecondary }]}>›</Text>
        </TouchableOpacity>
        {canManage && (
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        )}
      </View>

      {error !== '' && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => fetchData(selectedDate, true)} tintColor={colors.primary} />
        }
      >
        {/* Summary Cards */}
        {summary && (
          <View style={styles.cardsRow}>
            <View style={[styles.card, { backgroundColor: colors.redLt, borderColor: '#fecaca' }]}>
              <Text style={styles.cardEmoji}>💸</Text>
              <Text style={[styles.cardLabel, { color: c.textSecondary }]}>Investment</Text>
              <Text style={[styles.cardValue, { color: colors.red }]}>₹{Number(summary.totalInvestment).toLocaleString()}</Text>
              <Text style={[styles.cardSub, { color: c.textMuted }]}>{investments.length} entries</Text>
            </View>
            <View style={[styles.card, { backgroundColor: colors.greenLt, borderColor: '#bbf7d0' }]}>
              <Text style={styles.cardEmoji}>💰</Text>
              <Text style={[styles.cardLabel, { color: c.textSecondary }]}>Revenue</Text>
              <Text style={[styles.cardValue, { color: colors.green }]}>₹{Number(summary.totalRevenue).toLocaleString()}</Text>
              <Text style={[styles.cardSub, { color: c.textMuted }]}>Paid orders</Text>
            </View>
            <View style={[styles.card, isProfit
              ? { backgroundColor: colors.greenLt, borderColor: '#bbf7d0' }
              : { backgroundColor: colors.redLt, borderColor: '#fecaca' }]}
            >
              <Text style={styles.cardEmoji}>{isProfit ? '📈' : '📉'}</Text>
              <Text style={styles.cardLabel}>Net {isProfit ? 'Profit' : 'Loss'}</Text>
              <Text style={[styles.cardValue, { color: isProfit ? colors.green : colors.red }]}>
                {isProfit ? '+' : ''}₹{Math.abs(profit).toLocaleString()}
              </Text>
              <Text style={styles.cardSub}>Rev − Cost</Text>
            </View>
          </View>
        )}

        {/* Expense List */}
        <Text style={[styles.sectionTitle, { color: c.textSecondary }]}>Expenses · {formatDate(selectedDate)}</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 32 }} />
        ) : investments.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={[styles.emptyTitle, { color: c.textSecondary }]}>No expenses recorded</Text>
            {canManage && <Text style={[styles.emptySub, { color: c.textMuted }]}>Tap "+ Add" to record an expense</Text>}
          </View>
        ) : (
          investments.map(inv => {
            const cat = catInfo(inv.category);
            return (
              <View key={inv.id} style={[styles.expenseRow, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
                <View style={[styles.catBadge, { backgroundColor: cat.bg }]}>
                  <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                </View>
                <View style={styles.expenseInfo}>
                  <Text style={[styles.expenseName, { color: c.textPrimary }]} numberOfLines={1}>{inv.description}</Text>
                  <Text style={[styles.expenseMeta, { color: c.textMuted }]}>{cat.label} · {inv.createdByName}</Text>
                </View>
                <Text style={styles.expenseAmt}>-₹{Number(inv.amount).toLocaleString()}</Text>
                {canManage && (
                  <TouchableOpacity onPress={() => deleteInvestment(inv)} style={styles.delBtn}>
                    <Text style={{ fontSize: 16 }}>🗑</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Category Breakdown */}
        {summary && summary.byCategory.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20, color: c.textSecondary }]}>By Category</Text>
            <View style={[styles.breakCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {[...summary.byCategory]
                .sort((a, b) => b.amount - a.amount)
                .map(cat => {
                  const info = catInfo(cat.category);
                  const pct = summary.totalInvestment > 0
                    ? Math.round((cat.amount / summary.totalInvestment) * 100) : 0;
                  return (
                    <View key={cat.category} style={styles.breakRow}>
                      <View style={styles.breakMeta}>
                        <Text style={[styles.breakLabel, { color: c.textSecondary }]}>{info.emoji} {info.label} ×{cat.count}</Text>
                        <Text style={[styles.breakAmt, { color: c.textPrimary }]}>₹{Number(cat.amount).toLocaleString()} ({pct}%)</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: c.chipBg }]}>
                        <View style={[styles.progressFill, { width: `${pct}%` as any }]} />
                      </View>
                    </View>
                  );
                })}
            </View>

            {/* Profit Calculation */}
            <View style={[styles.breakCard, { marginTop: 10, backgroundColor: c.card, borderColor: c.cardBorder }]}>
              <Text style={[styles.calcTitle, { color: c.textMuted }]}>PROFIT CALCULATION</Text>
              <View style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: c.textSecondary }]}>Revenue</Text>
                <Text style={[styles.calcVal, { color: colors.green }]}>+₹{Number(summary.totalRevenue).toLocaleString()}</Text>
              </View>
              <View style={styles.calcRow}>
                <Text style={[styles.calcLabel, { color: c.textSecondary }]}>Investment</Text>
                <Text style={[styles.calcVal, { color: colors.red }]}>-₹{Number(summary.totalInvestment).toLocaleString()}</Text>
              </View>
              <View style={[styles.calcRow, styles.calcTotalRow, { borderTopColor: c.cardBorder }]}>
                <Text style={[styles.calcTotalLabel, { color: c.textPrimary }]}>Net Profit</Text>
                <Text style={[styles.calcVal, styles.calcTotalVal, { color: isProfit ? colors.green : colors.red }]}>
                  {isProfit ? '+' : ''}₹{Math.abs(profit).toLocaleString()}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Add Expense Modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowAdd(false)} />
          <View style={[styles.sheet, { backgroundColor: c.card }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.textPrimary }]}>Add Expense</Text>
              <TouchableOpacity onPress={() => { setShowAdd(false); setFormError(''); }}>
                <Text style={[styles.closeBtn, { color: c.textMuted }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {formError !== '' && (
              <View style={styles.formError}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Category</Text>
              <View style={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setForm(f => ({ ...f, category: cat.id }))}
                    style={[
                      styles.catPill,
                      { backgroundColor: c.card, borderColor: c.cardBorder },
                      form.category === cat.id && styles.catPillActive,
                    ]}
                  >
                    <Text style={{ fontSize: 22 }}>{cat.emoji}</Text>
                    <Text style={[styles.catPillLabel, { color: c.textSecondary }, form.category === cat.id && { color: colors.primary, fontWeight: '700' }]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Description *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={form.description}
                onChangeText={t => setForm(f => ({ ...f, description: t }))}
                placeholder="e.g. Daily vegetable purchase"
                placeholderTextColor={c.textMuted}
              />

              <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Amount (₹) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                value={form.amount}
                onChangeText={t => setForm(f => ({ ...f, amount: t }))}
                placeholder="0.00"
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
              />

              <View style={styles.modalActions}>
                <TouchableOpacity onPress={() => { setShowAdd(false); setFormError(''); }} style={[styles.cancelBtn, { borderColor: c.cardBorder }]}>
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={addInvestment} style={styles.saveBtn} disabled={saving}>
                  {saving
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.saveBtnText}>Add Expense</Text>
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

  dateRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  arrow: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 28, color: colors.gray600, lineHeight: 34 },
  dateMid: { flex: 1, alignItems: 'center' },
  dateLabel: { fontSize: 15, fontWeight: '700', color: colors.gray900 },
  todayLink: { fontSize: 12, color: colors.primary, marginTop: 2 },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  errorBanner: { backgroundColor: colors.redLt, padding: 12, margin: 12, borderRadius: 10 },
  errorText: { color: colors.red, fontSize: 13 },

  scroll: { padding: 14, paddingBottom: 32 },

  cardsRow: { flexDirection: 'row', gap: 8, marginBottom: 18 },
  card: { flex: 1, borderRadius: 14, padding: 11, borderWidth: 1 },
  cardEmoji: { fontSize: 18, marginBottom: 3 },
  cardLabel: { fontSize: 10, color: colors.gray600, marginBottom: 2 },
  cardValue: { fontSize: 15, fontWeight: '800' },
  cardSub: { fontSize: 10, color: colors.gray400, marginTop: 2 },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: colors.gray700, marginBottom: 10 },

  emptyBox: { backgroundColor: colors.white, borderRadius: 14, padding: 36, alignItems: 'center', borderWidth: 1, borderColor: colors.gray200 },
  emptyIcon: { fontSize: 36, marginBottom: 8 },
  emptyTitle: { fontSize: 14, fontWeight: '600', color: colors.gray500 },
  emptySub: { fontSize: 12, color: colors.gray400, marginTop: 4 },

  expenseRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.gray100 },
  catBadge: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  expenseInfo: { flex: 1 },
  expenseName: { fontSize: 14, fontWeight: '600', color: colors.gray900 },
  expenseMeta: { fontSize: 12, color: colors.gray400, marginTop: 2 },
  expenseAmt: { fontSize: 14, fontWeight: '700', color: colors.red, marginRight: 6 },
  delBtn: { padding: 6 },

  breakCard: { backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.gray100 },
  breakRow: { marginBottom: 12 },
  breakMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakLabel: { fontSize: 13, color: colors.gray700 },
  breakAmt: { fontSize: 12, fontWeight: '600', color: colors.gray900 },
  progressTrack: { height: 6, backgroundColor: colors.gray100, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 3 },

  calcTitle: { fontSize: 10, fontWeight: '700', color: colors.gray400, letterSpacing: 1, marginBottom: 10 },
  calcRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calcLabel: { fontSize: 13, color: colors.gray500 },
  calcVal: { fontSize: 13, fontWeight: '600' },
  calcTotalRow: { borderTopWidth: 1, borderTopColor: colors.gray100, paddingTop: 8, marginTop: 4 },
  calcTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  calcTotalVal: { fontSize: 14, fontWeight: '800' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36, maxHeight: '90%' },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  closeBtn: { fontSize: 18, color: colors.gray400, padding: 4 },

  formError: { backgroundColor: colors.redLt, borderWidth: 1, borderColor: '#fecaca', borderRadius: 10, padding: 10, marginBottom: 12 },
  formErrorText: { color: colors.red, fontSize: 13 },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  catPill: { width: '30%', flexGrow: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, borderWidth: 2, borderColor: colors.gray200, backgroundColor: colors.white },
  catPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLt },
  catPillLabel: { fontSize: 11, color: colors.gray600, marginTop: 4 },

  input: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14, color: colors.gray900, backgroundColor: colors.white, marginBottom: 14 },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 4, marginBottom: 8 },
  cancelBtn: { flex: 1, borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, color: colors.gray600, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  saveBtnText: { fontSize: 14, color: '#fff', fontWeight: '700' },
});
