import { useState, useEffect, useCallback } from 'react';
import { Clock, CheckCircle, ChefHat, Flame, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import type { KdsOrderDto } from '../api/types';

type KDSFilter = 'all' | 'pending' | 'preparing' | 'ready';

const statusConfig = {
  pending:  { label: 'New Order', color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-300 dark:border-yellow-800',  badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',  dot: 'bg-yellow-500'  },
  preparing:{ label: 'Preparing', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800',  badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',  dot: 'bg-orange-500'  },
  ready:    { label: 'Ready',     color: 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-800',    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',    dot: 'bg-green-500'   },
  served:   { label: 'Served',    color: 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700',      badge: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',      dot: 'bg-gray-400'    },
};

const nextStatus: Record<string, string> = {
  pending: 'preparing',
  preparing: 'ready',
};

function getOrderStatus(items: KdsOrderDto['items']): 'pending' | 'preparing' | 'ready' {
  if (items.every(i => i.status === 'ready' || i.status === 'served')) return 'ready';
  if (items.some(i => i.status === 'preparing')) return 'preparing';
  return 'pending';
}

export default function Kitchen() {
  const [orders, setOrders] = useState<KdsOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<KDSFilter>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null); // "orderId-itemId" or "serve-orderId"
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<KdsOrderDto[]>('/api/kitchen');
      setOrders(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
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
    const next = nextStatus[currentStatus];
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const markAllServed = async (orderId: number) => {
    const key = `serve-${orderId}`;
    setActionLoading(key);
    try {
      await api.post(`/api/kitchen/${orderId}/serve`, {});
      setOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = orders.filter(o => {
    if (filter === 'all') return true;
    return getOrderStatus(o.items) === filter;
  });

  const counts = {
    all:       orders.length,
    pending:   orders.filter(o => getOrderStatus(o.items) === 'pending').length,
    preparing: orders.filter(o => getOrderStatus(o.items) === 'preparing').length,
    ready:     orders.filter(o => getOrderStatus(o.items) === 'ready').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5 h-[calc(100vh-8rem)] flex flex-col">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm shrink-0">
          <AlertCircle size={15} />
          {error}
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          {(['all', 'pending', 'preparing', 'ready'] as KDSFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition capitalize flex items-center gap-2 ${filter === f ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'}`}
            >
              {f !== 'all' && <span className={`w-2 h-2 rounded-full ${f === 'pending' ? 'bg-yellow-500' : f === 'preparing' ? 'bg-orange-500' : 'bg-green-500'}`} />}
              {f === 'all' ? 'All Orders' : f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="text-xs opacity-70">{counts[f]}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-500">
          <div className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 rounded-xl">
            <Flame size={14} className="text-orange-500" />
            <span className="font-medium text-orange-700">{orders.length} active tickets</span>
          </div>
          <button
            onClick={() => fetchOrders(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:border-gray-300 transition"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* KDS Grid */}
      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center">
          <div>
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <ChefHat size={28} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-500">No active orders</p>
            <p className="text-sm text-gray-400 mt-1">Kitchen is clear</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4 overflow-y-auto flex-1">
          {filtered.map(order => {
            const orderStatus = getOrderStatus(order.items);
            const cfg = statusConfig[orderStatus];
            return (
              <div key={order.id} className={`rounded-2xl border-2 p-4 flex flex-col ${cfg.color} ${order.isUrgent ? 'ring-2 ring-red-400 ring-offset-2' : ''}`}>
                {/* Card Header */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">T{order.tableNumber}</span>
                      {order.isUrgent && <AlertCircle size={16} className="text-red-500" />}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{order.serverName} • #{order.id}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>{cfg.label}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500 mt-1 justify-end">
                      <Clock size={11} />
                      {order.elapsed}
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2 flex-1">
                  {order.items.map(item => {
                    const iCfg = statusConfig[item.status as keyof typeof statusConfig] ?? statusConfig.served;
                    const itemKey = `${order.id}-${item.id}`;
                    return (
                      <div key={item.id} className="bg-white/70 dark:bg-gray-900/40 rounded-xl p-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-gray-900 dark:text-white text-sm">×{item.quantity}</span>
                              <span className="text-sm text-gray-900 dark:text-white truncate">{item.name}</span>
                            </div>
                            {item.notes && (
                              <p className="text-xs text-blue-600 mt-0.5 italic">"{item.notes}"</p>
                            )}
                          </div>
                          <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${iCfg.dot}`} />
                        </div>
                        {item.status !== 'served' && item.status !== 'ready' && (
                          <button
                            onClick={() => updateItemStatus(order.id, item.id, item.status)}
                            disabled={actionLoading === itemKey}
                            className={`mt-2 w-full py-1 rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                              item.status === 'pending'
                                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                                : 'bg-orange-500 text-white hover:bg-orange-600'
                            }`}
                          >
                            {actionLoading === itemKey && <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />}
                            {item.status === 'pending' ? 'Start Preparing' : 'Mark Ready'}
                          </button>
                        )}
                        {item.status === 'ready' && (
                          <div className="mt-2 flex items-center gap-1 text-green-600 text-xs font-medium">
                            <CheckCircle size={12} />
                            Ready to serve
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Card Footer */}
                {orderStatus === 'ready' && (
                  <button
                    onClick={() => markAllServed(order.id)}
                    disabled={actionLoading === `serve-${order.id}`}
                    className="mt-3 w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {actionLoading === `serve-${order.id}`
                      ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <ChefHat size={14} />
                    }
                    Mark All Served
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
