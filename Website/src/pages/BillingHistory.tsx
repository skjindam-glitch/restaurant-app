import { useState, useEffect, useRef } from 'react';
import {
  Search, CreditCard, Banknote, Smartphone, Gift, TrendingUp, RefreshCw,
  ShoppingBag, Bike, Globe2, X, Receipt, UtensilsCrossed, User, Clock,
  CheckCircle, Printer
} from 'lucide-react';
import { api } from '../api/client';
import type { PaymentHistoryDto } from '../api/types';

const methodIcon: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  cash:   Banknote,
  card:   CreditCard,
  upi:    Smartphone,
  wallet: Gift,
};

const methodColor: Record<string, string> = {
  cash:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  card:   'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  upi:    'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  wallet: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
};

const orderTypeMeta: Record<string, { label: string; cls: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  'dine-in':  { label: 'Dine-in',  cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   icon: ShoppingBag },
  'takeaway': { label: 'Takeaway', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', icon: Bike        },
  'online':   { label: 'Online',   cls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', icon: Globe2      },
};

function BillModal({ bill, onClose }: { bill: PaymentHistoryDto; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const typeMeta  = orderTypeMeta[bill.orderType || 'dine-in'] || orderTypeMeta['dine-in'];
  const TypeIcon  = typeMeta.icon;
  const MethodIcon = methodIcon[bill.method] || CreditCard;

  const subtotal       = Number(bill.subtotal);
  const tax            = Number(bill.taxAmount);
  const serviceCharge  = Number(bill.serviceCharge);
  const discount       = Number(bill.discountAmount);
  const total          = Number(bill.totalAmount);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' });

  // close on backdrop click
  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  // close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handlePrint = () => window.print();

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* ── Orange header ── */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 pt-6 pb-5 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <Receipt size={20} className="text-white" />
              </div>
              <div>
                <p className="text-orange-100 text-xs font-medium uppercase tracking-wider">Payment Receipt</p>
                <p className="text-white font-bold text-lg leading-tight">#{bill.paymentId}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            >
              <X size={15} />
            </button>
          </div>

          {/* Meta pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-white text-xs font-medium">
              <UtensilsCrossed size={11} />
              Table {bill.tableNumber}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/20 rounded-full text-white text-xs font-medium">
              Order #{bill.orderId}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white`}>
              <TypeIcon size={11} />
              {typeMeta.label}
            </span>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Server + Time */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
              <div className="w-7 h-7 bg-orange-100 dark:bg-orange-900/40 rounded-full flex items-center justify-center">
                <User size={13} className="text-orange-600 dark:text-orange-400" />
              </div>
              <span className="font-medium">{bill.serverName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Clock size={12} />
              {formatTime(bill.processedAt)}
            </div>
          </div>

          {/* ── Items ── */}
          <div>
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Items Ordered
            </p>

            {bill.items && bill.items.length > 0 ? (
              <div className="space-y-1">
                {/* Header row */}
                <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                  <span>Item</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Amount</span>
                </div>
                {/* Item rows */}
                {bill.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-3 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700"
                  >
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{item.name}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 text-center">×{item.quantity}</span>
                    <span className="text-sm font-semibold text-gray-800 dark:text-white text-right">
                      ₹{Number(item.lineTotal).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl">
                No item details available
              </div>
            )}
          </div>

          {/* ── Bill Breakdown ── */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2.5">
            <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Bill Summary
            </p>

            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Subtotal</span>
              <span className="font-medium">₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Tax (5%)</span>
              <span className="font-medium">₹{tax.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300">
              <span>Service Charge (5%)</span>
              <span className="font-medium">₹{serviceCharge.toLocaleString()}</span>
            </div>

            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                <span>Discount</span>
                <span className="font-semibold">−₹{discount.toLocaleString()}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-300 dark:border-gray-600 pt-3 mt-1 flex justify-between items-center">
              <span className="font-bold text-gray-900 dark:text-white text-base">Total Paid</span>
              <span className="font-bold text-orange-500 text-xl">₹{total.toLocaleString()}</span>
            </div>
          </div>

          {/* ── Payment Method ── */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
              Payment Method
            </span>
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${methodColor[bill.method] || methodColor.card}`}>
              <MethodIcon size={14} />
              {bill.method.toUpperCase()}
            </span>
          </div>

          {/* ── Thank you ── */}
          <div className="flex items-center justify-center gap-2 py-3 border-t border-dashed border-gray-200 dark:border-gray-700">
            <CheckCircle size={14} className="text-green-500" />
            <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
              Payment confirmed · Thank you for visiting!
            </p>
          </div>
        </div>

        {/* ── Footer actions ── */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 shrink-0">
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Printer size={14} />
            Print
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillingHistory() {
  const [payments, setPayments] = useState<PaymentHistoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedBill, setSelectedBill] = useState<PaymentHistoryDto | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async (manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const data = await api.get<PaymentHistoryDto[]>('/api/billing/history');
      setPayments(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => { fetchHistory(); }, []);

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

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Transactions', value: filtered.length.toString(),                                                                                       color: 'text-blue-600'   },
          { label: 'Total Revenue',      value: `₹${totalRevenue.toLocaleString()}`,                                                                               color: 'text-green-600'  },
          { label: 'Avg. Bill',          value: filtered.length > 0 ? `₹${Math.round(totalRevenue / filtered.length).toLocaleString()}` : '₹0',                   color: 'text-orange-600' },
          { label: 'UPI / Card',         value: filtered.filter(p => p.method === 'upi' || p.method === 'card').length.toString(),                                 color: 'text-purple-600' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search table, server, order #..."
            className="pl-9 pr-4 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:border-orange-500 dark:text-white w-56"
          />
        </div>

        <div className="flex gap-1.5">
          {['all', 'cash', 'card', 'upi', 'wallet'].map(m => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${methodFilter === m ? 'bg-orange-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-orange-300'}`}
            >
              {m === 'all' ? 'All' : m.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5">
          {['all', 'dine-in', 'takeaway', 'online'].map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-2 rounded-xl text-xs font-medium capitalize transition ${typeFilter === t ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-blue-300'}`}
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchHistory(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 transition"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3 font-medium">Payment</th>
              <th className="text-left px-4 py-3 font-medium">Table / Order</th>
              <th className="text-left px-4 py-3 font-medium">Server</th>
              <th className="text-left px-4 py-3 font-medium">Type</th>
              <th className="text-left px-4 py-3 font-medium">Method</th>
              <th className="text-left px-4 py-3 font-medium">Items</th>
              <th className="text-right px-4 py-3 font-medium">Subtotal</th>
              <th className="text-right px-4 py-3 font-medium">Discount</th>
              <th className="text-right px-4 py-3 font-medium">Total</th>
              <th className="text-left px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-5 py-12 text-center text-gray-400">
                  <TrendingUp size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium">No payment records found</p>
                  <p className="text-xs mt-1">Payments appear after bills are processed</p>
                </td>
              </tr>
            ) : (
              filtered.map(p => {
                const MethodIcon = methodIcon[p.method] || CreditCard;
                const typeMeta   = orderTypeMeta[p.orderType || 'dine-in'] || orderTypeMeta['dine-in'];
                const TypeIcon   = typeMeta.icon;
                const itemCount  = p.items?.length ?? 0;

                return (
                  <tr
                    key={p.paymentId}
                    onClick={() => setSelectedBill(p)}
                    className="hover:bg-orange-50/60 dark:hover:bg-orange-900/10 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3 font-semibold text-orange-500">#{p.paymentId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white">T{p.tableNumber}</p>
                      <p className="text-xs text-gray-400">Order #{p.orderId}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{p.serverName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${typeMeta.cls}`}>
                        <TypeIcon size={10} />
                        {typeMeta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <MethodIcon size={13} />
                        <span className="capitalize text-xs">{p.method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {itemCount > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                          {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">₹{Number(p.subtotal).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-green-600">
                      {Number(p.discountAmount) > 0 ? `−₹${Number(p.discountAmount).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">₹{Number(p.totalAmount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{formatDate(p.processedAt)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-medium text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap flex items-center gap-1">
                        <Receipt size={12} />
                        View Bill
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <tr className="text-sm font-semibold">
                <td colSpan={9} className="px-4 py-3 text-gray-600 dark:text-gray-300">Total ({filtered.length} payments)</td>
                <td className="px-4 py-3 text-right text-orange-600">₹{totalRevenue.toLocaleString()}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Bill Detail Modal */}
      {selectedBill && (
        <BillModal
          bill={selectedBill}
          onClose={() => setSelectedBill(null)}
        />
      )}
    </div>
  );
}
