import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Minus, Trash2, Search, ChevronDown, Leaf, Drumstick, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '../api/client';
import type { MenuItemDto, TableDto, CreateOrderRequest, OrderDto } from '../api/types';

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  notes: string;
}

export default function Orders() {
  const [searchParams] = useSearchParams();
  const [menuItems, setMenuItems] = useState<MenuItemDto[]>([]);
  const [categories, setCategories] = useState<string[]>(['All']);
  const [tables, setTables] = useState<TableDto[]>([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedTableId, setSelectedTableId] = useState<number>(0);
  const [orderType, setOrderType] = useState<string>('dine-in');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [existingOrder, setExistingOrder] = useState<OrderDto | null>(null);

  const orderIdParam = searchParams.get('orderId');
  const isAddMode = !!orderIdParam;

  useEffect(() => {
    const tableIdParam = searchParams.get('tableId');
    const promises: Promise<unknown>[] = [
      api.get<MenuItemDto[]>('/api/menu'),
      api.get<string[]>('/api/menu/categories'),
      api.get<TableDto[]>('/api/tables'),
    ];
    if (orderIdParam) promises.push(api.get<OrderDto>(`/api/orders/${orderIdParam}`));

    Promise.all(promises)
      .then(([items, cats, tbls, existingOrd]) => {
        setMenuItems(items as MenuItemDto[]);
        setCategories(['All', ...(cats as string[])]);
        const available = (tbls as TableDto[]).filter(t => t.status === 'available' || t.status === 'occupied');
        setTables(available);
        if (tableIdParam) {
          const preSelected = available.find(t => t.id === Number(tableIdParam));
          if (preSelected) setSelectedTableId(preSelected.id);
          else if (available.length > 0) setSelectedTableId(available[0].id);
        } else if (available.length > 0) {
          setSelectedTableId(available[0].id);
        }
        if (existingOrd) setExistingOrder(existingOrd as OrderDto);
      })
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [searchParams, orderIdParam]);

  const filtered = menuItems.filter(item => {
    const matchCat = activeCategory === 'All' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const addToCart = (item: MenuItemDto) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { menuItemId: item.id, name: item.name, price: item.price, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (id: number, delta: number) => {
    setCart(prev =>
      prev.map(c => c.menuItemId === id ? { ...c, quantity: Math.max(0, c.quantity + delta) } : c)
          .filter(c => c.quantity > 0)
    );
  };

  const removeFromCart = (id: number) => setCart(prev => prev.filter(c => c.menuItemId !== id));

  const getCartQty = (id: number) => cart.find(c => c.menuItemId === id)?.quantity ?? 0;

  const subtotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const tax = Math.round(subtotal * 0.05);
  const serviceCharge = Math.round(subtotal * 0.05);
  const total = subtotal + tax + serviceCharge;

  const sendToKitchen = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    setError('');
    setSuccess('');
    try {
      if (isAddMode && orderIdParam) {
        await api.post(`/api/orders/${orderIdParam}/add-items`, {
          items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes || undefined })),
        });
        setCart([]);
        setSuccess(`${cart.reduce((s, c) => s + c.quantity, 0)} item${cart.reduce((s, c) => s + c.quantity, 0) !== 1 ? 's' : ''} added to Order #${orderIdParam}!`);
      } else {
        if (!selectedTableId) return;
        const body: CreateOrderRequest = {
          tableId: selectedTableId,
          items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: c.notes || undefined })),
          orderType,
        };
        const order = await api.post<{ id: number }>('/api/orders', body);
        await api.post(`/api/orders/${order.id}/send-to-kitchen`, {});
        setCart([]);
        setSuccess(`Order #${order.id} sent to kitchen!`);
      }
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTable = tables.find(t => t.id === selectedTableId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Menu Panel */}
      <div className="flex-1 flex flex-col min-w-0">
        {error && (
          <div className="mb-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
            <AlertCircle size={15} />
            {error}
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu items..."
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="relative">
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(Number(e.target.value))}
              className="appearance-none px-4 pr-8 py-2.5 text-sm bg-white dark:bg-gray-800 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500 font-medium cursor-pointer"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  T{t.number} — {t.status}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${activeCategory === cat ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Items Grid */}
        <div className="grid grid-cols-3 gap-3 overflow-y-auto flex-1">
          {filtered.map(item => {
            const qty = getCartQty(item.id);
            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 transition-all ${!item.isAvailable ? 'opacity-50' : 'border-gray-100 dark:border-gray-700 hover:border-orange-200 hover:shadow-sm'} ${qty > 0 ? 'border-orange-300 shadow-sm' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 mb-1">
                      {item.isVeg
                        ? <Leaf size={12} className="text-green-600 shrink-0" />
                        : <Drumstick size={12} className="text-red-500 shrink-0" />
                      }
                      {item.isPopular && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Popular</span>}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{item.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3">
                  <p className="text-base font-bold text-gray-900 dark:text-white">₹{item.price}</p>
                  {!item.isAvailable ? (
                    <span className="text-xs text-red-500 font-medium">Unavailable</span>
                  ) : qty === 0 ? (
                    <button
                      onClick={() => addToCart(item)}
                      className="w-8 h-8 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600 transition"
                    >
                      <Plus size={16} />
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => updateQty(item.id, -1)} className="w-7 h-7 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center hover:bg-orange-200 transition">
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-bold text-gray-900 w-5 text-center">{qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-7 h-7 bg-orange-500 text-white rounded-lg flex items-center justify-center hover:bg-orange-600 transition">
                        <Plus size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cart Panel */}
      <div className="w-80 shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {isAddMode ? `Add to Order #${orderIdParam}` : 'Current Order'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedTable ? `T${selectedTable.number}` : '—'} • {cart.length} new item{cart.length !== 1 ? 's' : ''}
              </p>
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-xs text-red-500 hover:text-red-600 font-medium">Clear</button>
            )}
          </div>
        </div>

        {/* Order Type — hidden in add-items mode since order type is already set */}
        {!isAddMode && <div className="px-5 py-2.5 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          {[
            { value: 'dine-in', label: '🪑 Dine-in' },
            { value: 'takeaway', label: '🛍️ Takeaway' },
            { value: 'online', label: '🌐 Online' },
          ].map(t => (
            <button
              key={t.value}
              onClick={() => setOrderType(t.value)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${orderType === t.value ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>}

        {/* Success banner */}
        {success && (
          <div className="mx-4 mt-3 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
            <CheckCircle size={15} />
            {success}
          </div>
        )}

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Already-ordered items (locked, read-only) */}
          {isAddMode && existingOrder && existingOrder.items.length > 0 && (
            <div className="mb-1">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2">Already in Kitchen</p>
              <div className="space-y-1.5 opacity-60 mb-3">
                {existingOrder.items.map(item => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{item.name} ×{item.quantity}</p>
                      <p className="text-xs text-gray-400">{item.kitchenStatus}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 ml-2">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs font-semibold text-orange-500 uppercase tracking-widest mb-2">Add New Items</p>
            </div>
          )}

          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <Plus size={20} className="text-gray-400" />
              </div>
              <p className="text-sm text-gray-500 font-medium">No new items</p>
              <p className="text-xs text-gray-400 mt-1">Add items from the menu</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.menuItemId} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">₹{item.price} each</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => updateQty(item.menuItemId, -1)} className="w-6 h-6 bg-white border border-gray-200 text-gray-600 rounded-md flex items-center justify-center hover:bg-gray-100">
                    <Minus size={12} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 w-4 text-center">{item.quantity}</span>
                  <button onClick={() => updateQty(item.menuItemId, 1)} className="w-6 h-6 bg-orange-500 text-white rounded-md flex items-center justify-center hover:bg-orange-600">
                    <Plus size={12} />
                  </button>
                  <button onClick={() => removeFromCart(item.menuItemId)} className="w-6 h-6 text-gray-400 rounded-md flex items-center justify-center hover:text-red-500 ml-1">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Tax (5%)</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{tax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-gray-400">
                <span>Service (5%)</span>
                <span className="font-medium text-gray-900 dark:text-white">₹{serviceCharge.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-gray-700 dark:text-white">
                <span>Total</span>
                <span className="text-orange-600">₹{total.toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={sendToKitchen}
              disabled={submitting || (!isAddMode && !selectedTableId)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition mt-2 text-sm flex items-center justify-center gap-2"
            >
              {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? (isAddMode ? 'Adding…' : 'Sending…') : (isAddMode ? `Add to Order #${orderIdParam}` : 'Send to Kitchen')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
