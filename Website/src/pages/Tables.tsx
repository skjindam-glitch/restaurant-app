import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Clock, User, RefreshCw, X, Plus, ChefHat, MapPin, CreditCard } from 'lucide-react';
import { TableStatus } from '../types';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { TableDto, CreateTableRequest } from '../api/types';

const statusConfig: Record<TableStatus, { label: string; color: string; bg: string; dot: string; darkBg: string }> = {
  available: { label: 'Available',      color: 'text-green-700',  bg: 'bg-green-50 border-green-200 hover:border-green-400',   dot: 'bg-green-500',  darkBg: 'dark:bg-green-950/40 dark:border-green-800' },
  occupied:  { label: 'Occupied',       color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200 hover:border-orange-400', dot: 'bg-orange-500', darkBg: 'dark:bg-orange-950/40 dark:border-orange-800' },
  reserved:  { label: 'Reserved',       color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200 hover:border-blue-400',       dot: 'bg-blue-500',   darkBg: 'dark:bg-blue-950/40 dark:border-blue-800' },
  billing:   { label: 'Billing',        color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200 hover:border-purple-400', dot: 'bg-purple-500', darkBg: 'dark:bg-purple-950/40 dark:border-purple-800' },
  dirty:     { label: 'Needs Cleaning', color: 'text-red-700',    bg: 'bg-red-50 border-red-200 hover:border-red-400',          dot: 'bg-red-500',    darkBg: 'dark:bg-red-950/40 dark:border-red-800' },
};

const orderStatusBadge: Record<string, { label: string; cls: string }> = {
  active:  { label: 'In Kitchen', cls: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
  ready:   { label: 'Ready',      cls: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
  billing: { label: 'Billing',    cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
};

const ZONES = [
  { key: 'all',          label: 'All Zones',    icon: '🏠' },
  { key: 'ground-floor', label: 'Ground Floor', icon: '🪑' },
  { key: 'first-floor',  label: 'First Floor',  icon: '🏢' },
  { key: 'garden',       label: 'Garden',       icon: '🌿' },
  { key: 'rooftop',      label: 'Rooftop',      icon: '☁️' },
  { key: 'vip',          label: 'VIP Room',     icon: '⭐' },
  { key: 'bar',          label: 'Bar Area',     icon: '🍹' },
];

type Filter = 'all' | TableStatus;

function toStatus(s: string): TableStatus {
  return s as TableStatus;
}

export default function Tables() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canManage = user?.role === 'admin' || user?.role === 'manager';

  const [tables, setTables] = useState<TableDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [zoneFilter, setZoneFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [kitchenPopup, setKitchenPopup] = useState<TableDto | null>(null);

  const [seatModal, setSeatModal] = useState<{ tableId: number; tableNumber: number } | null>(null);
  const [guestCount, setGuestCount] = useState('2');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const [addModal, setAddModal] = useState(false);
  const [newNumber, setNewNumber] = useState('');
  const [newSeats, setNewSeats] = useState('4');
  const [newZone, setNewZone] = useState('ground-floor');
  const [addError, setAddError] = useState('');

  const fetchTables = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const data = await api.get<TableDto[]>('/api/tables');
      setTables(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTables();
    const id = setInterval(() => fetchTables(), 10_000);
    return () => clearInterval(id);
  }, [fetchTables]);

  const seatGuests = async () => {
    if (!seatModal || !user) return;
    const count = parseInt(guestCount);
    if (!count || count < 1) { setActionError('Enter a valid guest count.'); return; }
    setActionLoading(true);
    setActionError('');
    try {
      await api.post(`/api/tables/${seatModal.tableId}/seat`, { serverId: user.id, guestCount: count });
      await fetchTables();
      setSeatModal(null);
      setGuestCount('2');
    } catch (err) {
      setActionError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const markCleaned = async (tableId: number) => {
    setActionLoading(true);
    try {
      await api.put(`/api/tables/${tableId}/status`, { status: 'available' });
      await fetchTables();
    } catch (err) {
      setError((err as Error).message);
    } finally {
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
      setNewNumber('');
      setNewSeats('4');
      setNewZone('ground-floor');
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const newOrderForTable = (tableId: number) => navigate(`/orders?tableId=${tableId}`);

  const generateBill = async (orderId: number) => {
    setActionLoading(true);
    try {
      await api.patch(`/api/orders/${orderId}/status?status=billing`);
      await fetchTables();
      navigate(`/billing?orderId=${orderId}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  let filtered = filter === 'all' ? tables : tables.filter(t => t.status === filter);
  if (zoneFilter !== 'all') filtered = filtered.filter(t => (t.zone || 'ground-floor') === zoneFilter);
  const selected = tables.find(t => t.id === selectedId);

  const counts = {
    all:       tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied:  tables.filter(t => t.status === 'occupied').length,
    reserved:  tables.filter(t => t.status === 'reserved').length,
    billing:   tables.filter(t => t.status === 'billing').length,
    dirty:     tables.filter(t => t.status === 'dirty').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-6 h-[calc(100vh-8rem)]">
        {/* Main Floor Plan */}
        <div className="flex-1 flex flex-col min-w-0">
          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}

          {/* Single-row filter toolbar — never wraps */}
          <div className="flex items-center gap-2 mb-4 min-w-0">
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              {ZONES.map(z => (
                <option key={z.key} value={z.key}>{z.icon} {z.label}</option>
              ))}
            </select>

            <select
              value={filter}
              onChange={e => setFilter(e.target.value as Filter)}
              className="shrink-0 px-3 py-2 rounded-xl text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">All Status ({counts.all})</option>
              {(Object.keys(statusConfig) as TableStatus[]).map(s => (
                <option key={s} value={s}>{statusConfig[s].label} ({counts[s]})</option>
              ))}
            </select>

            <div className="ml-auto flex shrink-0 gap-2">
              {canManage && (
                <button
                  onClick={() => setAddModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-orange-500 text-white hover:bg-orange-600 transition whitespace-nowrap"
                >
                  <Plus size={14} />
                  Add Table
                </button>
              )}
              <button
                onClick={() => fetchTables(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 transition disabled:opacity-60 whitespace-nowrap"
              >
                <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
                Refresh
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-4 gap-4 overflow-y-auto flex-1 pb-4">
            {filtered.map(table => {
              const cfg = statusConfig[toStatus(table.status)];
              const orderBadge = table.activeOrderStatus ? orderStatusBadge[table.activeOrderStatus] : null;
              const zoneInfo = ZONES.find(z => z.key === (table.zone || 'ground-floor'));
              const hasOrders = (table.activeOrders?.length ?? 0) > 0;
              return (
                <div
                  key={table.id}
                  onClick={() => setSelectedId(table.id === selectedId ? null : table.id)}
                  className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${cfg.bg} ${cfg.darkBg} ${
                    selectedId === table.id
                      ? 'border-orange-500 ring-2 ring-inset ring-orange-400 shadow-md shadow-orange-100 dark:shadow-orange-900/30'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">T{table.number}</p>
                      <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                    </div>
                    <span className={`w-3 h-3 rounded-full ${cfg.dot} mt-1`} />
                  </div>

                  <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                    <Users size={12} />
                    <span>{table.seats} seats</span>
                  </div>

                  {zoneInfo && zoneInfo.key !== 'all' && (
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 text-xs mb-1">
                      <MapPin size={11} />
                      <span>{zoneInfo.label}</span>
                    </div>
                  )}

                  {table.serverName && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                      <User size={12} />
                      <span>{table.serverName}</span>
                    </div>
                  )}

                  {table.occupiedSince && (
                    <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-xs mb-1">
                      <Clock size={12} />
                      <span>Since {table.occupiedSince}</span>
                    </div>
                  )}

                  {/* Kitchen status — tappable to open popup */}
                  {hasOrders && (
                    <button
                      onClick={e => { e.stopPropagation(); setKitchenPopup(table); }}
                      className="flex items-center gap-1.5 mt-1.5 hover:opacity-75 transition"
                    >
                      <ChefHat size={11} className="text-gray-500 dark:text-gray-400 shrink-0" />
                      {table.activeOrders.length > 1 ? (
                        <span className="text-xs font-semibold px-1.5 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300">
                          {table.activeOrders.length} orders ›
                        </span>
                      ) : orderBadge ? (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded-md ${orderBadge.cls}`}>
                          {orderBadge.label} ›
                        </span>
                      ) : null}
                    </button>
                  )}

                  {table.status === 'available' && (
                    <button
                      onClick={e => { e.stopPropagation(); setSeatModal({ tableId: table.id, tableNumber: table.number }); }}
                      className="mt-3 w-full py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition"
                    >
                      Seat Guests
                    </button>
                  )}
                  {table.status === 'dirty' && (
                    <button
                      onClick={e => { e.stopPropagation(); markCleaned(table.id); }}
                      disabled={actionLoading}
                      className="mt-3 w-full py-1.5 bg-red-500 text-white text-xs font-medium rounded-lg hover:bg-red-600 transition disabled:opacity-60"
                    >
                      Mark Cleaned
                    </button>
                  )}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="col-span-4 flex flex-col items-center justify-center py-16 text-gray-400">
                <span className="text-4xl mb-3">🪑</span>
                <p className="text-sm">No tables in this view</p>
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="w-72 shrink-0">
          {selected ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 h-full overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Table {selected.number}</h3>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[toStatus(selected.status)].color} ${statusConfig[toStatus(selected.status)].bg.split(' ')[0]}`}>
                  {statusConfig[toStatus(selected.status)].label}
                </span>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Seats</span>
                  <span className="font-medium dark:text-white">{selected.seats}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Zone</span>
                  <span className="font-medium dark:text-white">
                    {ZONES.find(z => z.key === (selected.zone || 'ground-floor'))?.label || 'Ground Floor'}
                  </span>
                </div>
                {selected.serverName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Server</span>
                    <span className="font-medium dark:text-white">{selected.serverName}</span>
                  </div>
                )}
                {selected.occupiedSince && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Since</span>
                    <span className="font-medium dark:text-white">{selected.occupiedSince}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {/* Active Orders with customer labels */}
                {selected.activeOrders?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                      Active Orders
                    </p>
                    {selected.activeOrders.map((order, index) => {
                      const badge = orderStatusBadge[order.status];
                      const typeLabel: Record<string, string> = { 'dine-in': 'Dine-in', 'takeaway': 'Takeaway', 'online': 'Online' };
                      return (
                        <div key={order.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 border border-gray-100 dark:border-gray-600">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-orange-500 bg-orange-50 dark:bg-orange-900/30 px-1.5 py-0.5 rounded-md">C{index + 1}</span>
                              <span className="text-sm font-bold text-gray-900 dark:text-white">#{order.id}</span>
                              <span className="text-xs text-gray-400">{typeLabel[order.orderType] ?? order.orderType}</span>
                            </div>
                            {badge && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.cls}`}>
                                {badge.label}
                              </span>
                            )}
                          </div>

                          {/* Kitchen item breakdown */}
                          {order.itemCount > 0 && (
                            <div className="flex items-center gap-1.5 mb-2">
                              {order.pendingItems > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300">⏳ {order.pendingItems}</span>
                              )}
                              {order.preparingItems > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">🔥 {order.preparingItems}</span>
                              )}
                              {order.readyItems > 0 && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">✓ {order.readyItems}</span>
                              )}
                              <span className="text-xs text-gray-400 ml-auto">₹{Number(order.subtotal).toLocaleString()}</span>
                            </div>
                          )}

                          <div className="flex gap-1.5">
                            {order.status !== 'billing' && (
                              <button
                                onClick={() => navigate(`/orders?tableId=${selected.id}&orderId=${order.id}`)}
                                className="flex-1 py-1.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition flex items-center justify-center gap-1"
                              >
                                <Plus size={11} />
                                Add Items
                              </button>
                            )}
                            {order.status !== 'billing' ? (
                              <button
                                onClick={() => generateBill(order.id)}
                                disabled={actionLoading}
                                className="flex-1 py-1.5 bg-purple-500 text-white text-xs font-semibold rounded-lg hover:bg-purple-600 transition disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                <CreditCard size={11} />
                                Bill
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate(`/billing?orderId=${order.id}`)}
                                className="w-full py-1.5 bg-purple-600 text-white text-xs font-semibold rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-1.5"
                              >
                                <CreditCard size={11} />
                                Process Payment
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Add order / new customer */}
                {(selected.status === 'occupied' || selected.status === 'billing' || selected.status === 'ready') && (
                  <button
                    onClick={() => newOrderForTable(selected.id)}
                    className="w-full py-2.5 bg-orange-500 text-white text-sm font-medium rounded-xl hover:bg-orange-600 transition flex items-center justify-center gap-2"
                  >
                    <Plus size={15} />
                    {selected.activeOrders?.length > 0
                      ? `New Order — Customer ${selected.activeOrders.length + 1}`
                      : 'Add Order'}
                  </button>
                )}

                {selected.status === 'available' && (
                  <button
                    onClick={() => setSeatModal({ tableId: selected.id, tableNumber: selected.number })}
                    className="w-full py-2.5 bg-green-600 text-white text-sm font-medium rounded-xl hover:bg-green-700 transition"
                  >
                    Seat New Guests
                  </button>
                )}
                {selected.status === 'dirty' && (
                  <button
                    onClick={() => markCleaned(selected.id)}
                    disabled={actionLoading}
                    className="w-full py-2.5 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition disabled:opacity-60"
                  >
                    Mark as Cleaned
                  </button>
                )}
                {selected.status === 'reserved' && (
                  <button
                    onClick={() => setSeatModal({ tableId: selected.id, tableNumber: selected.number })}
                    className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition"
                  >
                    Check In Guests
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 h-full flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mb-3">
                <Users size={24} className="text-gray-400" />
              </div>
              <p className="font-medium text-gray-600 dark:text-gray-300 text-sm">Select a table</p>
              <p className="text-xs text-gray-400 mt-1">Click on any table to view details and actions</p>
            </div>
          )}
        </div>
      </div>

      {/* Kitchen Status Popup */}
      {kitchenPopup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ChefHat size={18} className="text-orange-500" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">
                  Table {kitchenPopup.number} — Kitchen
                </h3>
              </div>
              <button onClick={() => setKitchenPopup(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2.5">
              {kitchenPopup.activeOrders.map((order, i) => {
                const badge = orderStatusBadge[order.status];
                return (
                  <div key={order.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-xs font-bold text-orange-500 mb-0.5">Customer {i + 1}</p>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                          Order #{order.id} · {order.itemCount} item{order.itemCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {badge && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.cls}`}>
                          {badge.label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {order.pendingItems > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300">⏳ {order.pendingItems} pending</span>
                      )}
                      {order.preparingItems > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">🔥 {order.preparingItems} cooking</span>
                      )}
                      {order.readyItems > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">✓ {order.readyItems} ready</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {kitchenPopup.activeOrders.length} order{kitchenPopup.activeOrders.length !== 1 ? 's' : ''} active
              </span>
              <span className="text-base font-bold text-orange-500">
                ₹{kitchenPopup.activeOrders.reduce((s, o) => s + Number(o.subtotal), 0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Seat Guests Modal */}
      {seatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Seat Guests — T{seatModal.tableNumber}</h3>
              <button onClick={() => { setSeatModal(null); setActionError(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">{actionError}</div>
            )}

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Number of Guests</label>
              <input
                type="number"
                min="1"
                max="20"
                value={guestCount}
                onChange={e => setGuestCount(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setSeatModal(null); setActionError(''); }} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 transition">
                Cancel
              </button>
              <button onClick={seatGuests} disabled={actionLoading} className="flex-1 py-2.5 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Seat Guests
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Table Modal */}
      {addModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add New Table</h3>
              <button onClick={() => { setAddModal(false); setAddError(''); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            {addError && (
              <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">{addError}</div>
            )}

            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Table Number</label>
                <input
                  type="number"
                  min="1"
                  value={newNumber}
                  onChange={e => setNewNumber(e.target.value)}
                  placeholder="e.g. 11"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Seat Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={newSeats}
                  onChange={e => setNewSeats(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Zone</label>
                <select
                  value={newZone}
                  onChange={e => setNewZone(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                >
                  {ZONES.filter(z => z.key !== 'all').map(z => (
                    <option key={z.key} value={z.key}>{z.icon} {z.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setAddModal(false); setAddError(''); }} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 transition">
                Cancel
              </button>
              <button onClick={addTable} disabled={actionLoading} className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {actionLoading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Add Table
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
