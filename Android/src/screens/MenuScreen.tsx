import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, ScrollView, Switch, Alert,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { MenuItemDto, CreateMenuItemRequest } from '../api/types';
import { mockMenuItems } from '../data/mockData';
import { colors } from '../theme/colors';
import { useTheme } from '../context/ThemeContext';
import { ScreenHeader } from '../components/ScreenHeader';

interface MenuForm {
  name: string; category: string; price: string;
  isVeg: boolean; isPopular: boolean; isAvailable: boolean; description: string;
}

const emptyForm = (): MenuForm => ({
  name: '', category: '', price: '', isVeg: true, isPopular: false, isAvailable: true, description: '',
});

export default function MenuScreen() {
  const { c } = useTheme();
  const { user } = useAuth();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [error, setError] = useState('');

  const [editItem, setEditItem] = useState<MenuItemDto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MenuForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [data, cats] = await Promise.all([
        api.get<MenuItemDto[]>('/api/menu'),
        api.get<string[]>('/api/menu/categories'),
      ]);
      setItems(data);
      setCategories(cats);
      setError('');
    } catch {
      setItems(mockMenuItems as unknown as MenuItemDto[]);
      setCategories([...new Set((mockMenuItems as unknown as MenuItemDto[]).map(i => i.category))]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const allCategories = ['All', ...categories];

  const filtered = items.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const openAdd = () => {
    setEditItem(null);
    setForm({ ...emptyForm(), category: categories[0] ?? '' });
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (item: MenuItemDto) => {
    setEditItem(item);
    setForm({
      name: item.name,
      category: item.category,
      price: String(item.price),
      isVeg: item.isVeg,
      isPopular: item.isPopular,
      isAvailable: item.isAvailable,
      description: item.description ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const saveItem = async () => {
    if (!form.name.trim() || !form.category || !form.price) {
      setFormError('Name, category, and price are required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const body: CreateMenuItemRequest = {
        name: form.name.trim(),
        category: form.category,
        price: parseFloat(form.price),
        isVeg: form.isVeg,
        isPopular: form.isPopular,
        isAvailable: form.isAvailable,
        description: form.description.trim() || undefined,
      };
      if (editItem) {
        const updated = await api.put<MenuItemDto>(`/api/menu/${editItem.id}`, body);
        setItems(prev => prev.map(i => i.id === editItem.id ? updated : i));
      } else {
        const created = await api.post<MenuItemDto>('/api/menu', body);
        setItems(prev => [...prev, created]);
      }
      setShowModal(false);
    } catch (e) {
      setFormError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItemDto) => {
    setTogglingId(item.id);
    try {
      const updated = await api.patch<MenuItemDto>(`/api/menu/${item.id}/availability`, {});
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch { /* ignore */ } finally {
      setTogglingId(null);
    }
  };

  const deleteItem = (item: MenuItemDto) => {
    Alert.alert('Delete Item', `Delete "${item.name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/api/menu/${item.id}`);
            setItems(prev => prev.filter(i => i.id !== item.id));
          } catch (e) {
            setError((e as Error).message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg }]}>
        <ScreenHeader title="Menu" subtitle="Manage your menu items" />
        <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <ScreenHeader title="Menu" subtitle={`${filtered.length} items`} />

      {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

      {/* Search + Add */}
      <View style={[styles.topBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: c.inputBg, color: c.textPrimary }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search menu items..."
          placeholderTextColor={c.textMuted}
        />
        {canManage && (
          <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
            <Text style={styles.addBtnText}>+ Add Item</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.catBar, { backgroundColor: c.header, borderBottomColor: c.headerBorder }]} contentContainerStyle={styles.catContent}>
        {allCategories.map(cat => {
          const count = cat === 'All' ? items.length : items.filter(i => i.category === cat).length;
          return (
            <TouchableOpacity
              key={cat}
              onPress={() => setActiveCategory(cat)}
              style={[styles.catBtn, { backgroundColor: c.chipBg }, activeCategory === cat && styles.catBtnActive]}
            >
              <Text style={[styles.catText, { color: c.textSecondary }, activeCategory === cat && styles.catTextActive]}>
                {cat} <Text style={[styles.catCount, { color: c.textMuted }]}>{count}</Text>
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            <View style={[styles.vegBadge, { backgroundColor: item.isVeg ? '#f0fdf4' : '#fef2f2' }]}>
              <Text style={{ fontSize: 16 }}>{item.isVeg ? '🌿' : '🍗'}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={[styles.itemName, { color: c.textPrimary }]}>{item.name}</Text>
                {item.isPopular && <Text style={styles.popularBadge}>⭐ Popular</Text>}
              </View>
              <Text style={[styles.itemCat, { color: c.textSecondary }]}>{item.category}</Text>
              {item.description ? <Text style={[styles.itemDesc, { color: c.textMuted }]} numberOfLines={1}>{item.description}</Text> : null}
            </View>
            <View style={styles.itemRight}>
              <Text style={[styles.itemPrice, { color: c.textPrimary }]}>₹{item.price}</Text>
              <View style={styles.itemActions}>
                <TouchableOpacity
                  style={[styles.availToggle, { backgroundColor: item.isAvailable ? '#f0fdf4' : '#f3f4f6' }]}
                  onPress={() => toggleAvailability(item)}
                  disabled={togglingId === item.id}
                >
                  {togglingId === item.id
                    ? <ActivityIndicator size="small" color={colors.primary} />
                    : <Text style={{ fontSize: 11, fontWeight: '700', color: item.isAvailable ? colors.green : colors.gray400 }}>
                        {item.isAvailable ? 'On' : 'Off'}
                      </Text>
                  }
                </TouchableOpacity>
                {canManage && (
                  <>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(item)}>
                      <Text style={{ fontSize: 14 }}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteItem(item)}>
                      <Text style={{ fontSize: 14 }}>🗑️</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        )}
      />

      {/* Add / Edit Modal */}
      {showModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { backgroundColor: c.card }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: c.textPrimary }]}>{editItem ? 'Edit Item' : 'Add New Item'}</Text>
                <TouchableOpacity onPress={() => setShowModal(false)}>
                  <Text style={[styles.modalClose, { color: c.textMuted }]}>✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                {formError ? <Text style={styles.formError}>{formError}</Text> : null}

                <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Item Name *</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                  value={form.name}
                  onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  placeholder="e.g. Paneer Tikka"
                  placeholderTextColor={c.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Category</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {categories.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        onPress={() => setForm(f => ({ ...f, category: cat }))}
                        style={[styles.catPill, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, form.category === cat && styles.catPillActive]}
                      >
                        <Text style={[styles.catPillText, { color: c.textSecondary }, form.category === cat && { color: colors.white }]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Price (₹) *</Text>
                <TextInput
                  style={[styles.fieldInput, { backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                  value={form.price}
                  onChangeText={v => setForm(f => ({ ...f, price: v }))}
                  keyboardType="decimal-pad"
                  placeholder="e.g. 320"
                  placeholderTextColor={c.textMuted}
                />

                <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Type</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                  <TouchableOpacity
                    style={[styles.typeBtn, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, form.isVeg && styles.typeBtnVeg]}
                    onPress={() => setForm(f => ({ ...f, isVeg: true }))}
                  >
                    <Text>🌿</Text>
                    <Text style={[styles.typeBtnText, { color: c.textSecondary }, form.isVeg && { color: colors.green }]}>Veg</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.typeBtn, { backgroundColor: c.inputBg, borderColor: c.cardBorder }, !form.isVeg && styles.typeBtnNonVeg]}
                    onPress={() => setForm(f => ({ ...f, isVeg: false }))}
                  >
                    <Text>🍗</Text>
                    <Text style={[styles.typeBtnText, { color: c.textSecondary }, !form.isVeg && { color: colors.red }]}>Non-Veg</Text>
                  </TouchableOpacity>
                </View>

                <View style={[styles.switchRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.switchLabel, { color: c.textLabel }]}>Mark as Popular</Text>
                  <Switch
                    value={form.isPopular}
                    onValueChange={v => setForm(f => ({ ...f, isPopular: v }))}
                    trackColor={{ false: c.cardBorder, true: colors.primary }}
                    thumbColor={c.white}
                  />
                </View>
                <View style={[styles.switchRow, { borderBottomColor: c.cardBorder }]}>
                  <Text style={[styles.switchLabel, { color: c.textLabel }]}>Available</Text>
                  <Switch
                    value={form.isAvailable}
                    onValueChange={v => setForm(f => ({ ...f, isAvailable: v }))}
                    trackColor={{ false: c.cardBorder, true: colors.green }}
                    thumbColor={c.white}
                  />
                </View>

                <Text style={[styles.fieldLabel, { color: c.textLabel }]}>Description</Text>
                <TextInput
                  style={[styles.fieldInput, { minHeight: 70, textAlignVertical: 'top', backgroundColor: c.inputBg, borderColor: c.inputBorder, color: c.textPrimary }]}
                  value={form.description}
                  onChangeText={v => setForm(f => ({ ...f, description: v }))}
                  multiline
                  placeholder="Brief description..."
                  placeholderTextColor={c.textMuted}
                />
              </ScrollView>

              <View style={styles.modalBtns}>
                <TouchableOpacity style={[styles.cancelBtn, { borderColor: c.cardBorder }]} onPress={() => setShowModal(false)}>
                  <Text style={[styles.cancelBtnText, { color: c.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                  onPress={saveItem}
                  disabled={saving}
                >
                  {saving
                    ? <ActivityIndicator size="small" color={colors.white} />
                    : <Text style={styles.saveBtnText}>{editItem ? 'Save Changes' : 'Add Item'}</Text>
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
  errorBanner: { margin: 12, padding: 10, backgroundColor: '#fef2f2', borderRadius: 10, fontSize: 13, color: colors.red },
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200 },
  searchInput: { flex: 1, backgroundColor: colors.gray100, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 13, color: colors.gray900 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  addBtnText: { fontSize: 13, fontWeight: '700', color: colors.white },
  catBar: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.gray200, maxHeight: 48 },
  catContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  catBtn: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.gray100 },
  catBtnActive: { backgroundColor: colors.primary },
  catText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  catTextActive: { color: colors.white },
  catCount: { fontSize: 10, opacity: 0.7 },
  list: { padding: 12, gap: 8, paddingBottom: 40 },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.white, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: colors.gray200 },
  vegBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  itemName: { fontSize: 14, fontWeight: '700', color: colors.gray900 },
  itemCat: { fontSize: 12, color: colors.gray400 },
  itemDesc: { fontSize: 11, color: colors.gray400, fontStyle: 'italic' },
  popularBadge: { fontSize: 10, color: colors.amber, backgroundColor: colors.amberLt, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, fontWeight: '600' },
  itemRight: { alignItems: 'flex-end', gap: 6 },
  itemPrice: { fontSize: 15, fontWeight: '800', color: colors.gray900 },
  itemActions: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  availToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, minWidth: 36, alignItems: 'center' },
  editBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fff7ed', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  modalClose: { fontSize: 18, color: colors.gray400 },
  formError: { backgroundColor: '#fef2f2', borderRadius: 10, padding: 10, fontSize: 13, color: colors.red, marginBottom: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.gray700, marginBottom: 6 },
  fieldInput: { borderWidth: 1, borderColor: colors.gray200, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: colors.gray900, marginBottom: 14, backgroundColor: colors.white },
  catPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: colors.gray100 },
  catPillActive: { backgroundColor: colors.primary },
  catPillText: { fontSize: 12, fontWeight: '600', color: colors.gray600 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 12, borderRadius: 12, borderWidth: 2, borderColor: colors.gray200 },
  typeBtnVeg: { borderColor: colors.green, backgroundColor: '#f0fdf4' },
  typeBtnNonVeg: { borderColor: colors.red, backgroundColor: '#fef2f2' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: colors.gray600 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.gray100, marginBottom: 4 },
  switchLabel: { fontSize: 14, color: colors.gray700 },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: colors.gray200, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontWeight: '600', color: colors.gray600 },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: colors.white },
});
