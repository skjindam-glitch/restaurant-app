import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Leaf, Drumstick, Star, AlertCircle, X } from 'lucide-react';
import { api } from '../api/client';
import type { MenuItemDto, CreateMenuItemRequest } from '../api/types';

interface MenuForm {
  name: string;
  category: string;
  price: string;
  isVeg: boolean;
  isPopular: boolean;
  isAvailable: boolean;
  description: string;
}

const emptyForm = (): MenuForm => ({
  name: '', category: '', price: '', isVeg: true, isPopular: false, isAvailable: true, description: '',
});

export default function Menu() {
  const [items, setItems] = useState<MenuItemDto[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editItem, setEditItem] = useState<MenuItemDto | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<MenuForm>(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      const [data, cats] = await Promise.all([
        api.get<MenuItemDto[]>('/api/menu'),
        api.get<string[]>('/api/menu/categories'),
      ]);
      setItems(data);
      setCategories(cats);
      setError('');
    } catch (err) {
      setError((err as Error).message);
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
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: MenuItemDto) => {
    try {
      const updated = await api.patch<MenuItemDto>(`/api/menu/${item.id}/availability`);
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const deleteItem = async (id: number) => {
    if (!window.confirm('Delete this menu item?')) return;
    try {
      await api.delete(`/api/menu/${id}`);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Top Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 dark:text-white dark:placeholder-gray-500"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} items</span>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white text-sm font-semibold rounded-xl hover:bg-orange-600 transition"
          >
            <Plus size={16} />
            Add Item
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {allCategories.map(cat => {
          const count = cat === 'All' ? items.length : items.filter(i => i.category === cat).length;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                activeCategory === cat
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {cat}
              <span className={`text-xs ${activeCategory === cat ? 'opacity-75' : 'text-gray-400 dark:text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Item</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Category</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Price</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-5 py-3.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {filtered.map(item => (
              <tr key={item.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/40 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.isVeg ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                      {item.isVeg ? <Leaf size={14} className="text-green-600 dark:text-green-400" /> : <Drumstick size={14} className="text-red-500 dark:text-red-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</span>
                        {item.isPopular && <Star size={12} className="text-amber-500 fill-amber-500" />}
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-xs truncate">{item.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg">{item.category}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm font-bold text-gray-900 dark:text-white">₹{item.price}</span>
                </td>
                <td className="px-5 py-3.5">
                  <button
                    onClick={() => toggleAvailability(item)}
                    className={`flex items-center gap-1.5 text-sm font-medium transition ${item.isAvailable ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                  >
                    {item.isAvailable
                      ? <ToggleRight size={20} className="text-green-500 dark:text-green-400" />
                      : <ToggleLeft size={20} className="text-gray-400 dark:text-gray-500" />
                    }
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEdit(item)}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 rounded-lg transition"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{editItem ? 'Edit Item' : 'Add New Item'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                <AlertCircle size={14} />
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Item Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Paneer Tikka"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
                  <select
                    value={form.category}
                    onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Price (₹)</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    placeholder="320"
                    className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isVeg: true }))}
                    className={`flex-1 py-2 border-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                      form.isVeg
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Leaf size={14} /> Veg
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isVeg: false }))}
                    className={`flex-1 py-2 border-2 rounded-xl text-sm font-medium flex items-center justify-center gap-1.5 transition ${
                      !form.isVeg
                        ? 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Drumstick size={14} /> Non-Veg
                  </button>
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPopular}
                    onChange={e => setForm(f => ({ ...f, isPopular: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Mark as Popular</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isAvailable}
                    onChange={e => setForm(f => ({ ...f, isAvailable: e.target.checked }))}
                    className="w-4 h-4 accent-orange-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Available</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="Brief description of the dish..."
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 resize-none bg-white dark:bg-gray-700 dark:text-white dark:placeholder-gray-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {editItem ? 'Save Changes' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
