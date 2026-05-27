import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, Download, Calendar, UtensilsCrossed, ShoppingBag, Globe } from 'lucide-react';
import { salesData, hourlyData, mockStaff } from '../data/mockData';
import { api } from '../api/client';
import type { OrderTypeBreakdownDto, TopMenuItemDto } from '../api/types';

const ORDER_TYPE_COLORS = { dineIn: '#3b82f6', takeaway: '#f59e0b', online: '#22c55e' };

type Period = 'today' | 'week' | 'month' | 'all';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Today',
  week:  'This Week',
  month: 'This Month',
  all:   'All Time',
};

const orderTypeConfig = [
  { key: 'dineIn'   as const, countKey: 'dineInCount'   as const, label: 'Dine-in',  Icon: UtensilsCrossed, color: ORDER_TYPE_COLORS.dineIn,   badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   amtCls: 'text-blue-600 dark:text-blue-400',   bgCls: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900'   },
  { key: 'takeaway' as const, countKey: 'takeawayCount' as const, label: 'Takeaway',  Icon: ShoppingBag,     color: ORDER_TYPE_COLORS.takeaway, badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', amtCls: 'text-amber-600 dark:text-amber-400', bgCls: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900' },
  { key: 'online'   as const, countKey: 'onlineCount'   as const, label: 'Online',    Icon: Globe,           color: ORDER_TYPE_COLORS.online,   badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', amtCls: 'text-green-600 dark:text-green-400', bgCls: 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900' },
];

export default function Reports() {
  const [period, setPeriod] = useState<Period>('week');
  const [orderTypes, setOrderTypes] = useState<OrderTypeBreakdownDto | null>(null);
  const [topItems, setTopItems] = useState<TopMenuItemDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<OrderTypeBreakdownDto>(`/api/dashboard/order-types?period=${period}`),
      api.get<TopMenuItemDto[]>('/api/dashboard/top-items?limit=5'),
    ])
      .then(([ot, items]) => { setOrderTypes(ot); setTopItems(items); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period]);

  const otTotal = orderTypes ? orderTypes.dineIn + orderTypes.takeaway + orderTypes.online : 0;
  const otCount = orderTypes ? orderTypes.dineInCount + orderTypes.takeawayCount + orderTypes.onlineCount : 0;

  const donutData = orderTypes ? [
    { name: 'Dine-in',  value: Number(orderTypes.dineIn),   color: ORDER_TYPE_COLORS.dineIn   },
    { name: 'Takeaway', value: Number(orderTypes.takeaway), color: ORDER_TYPE_COLORS.takeaway },
    { name: 'Online',   value: Number(orderTypes.online),   color: ORDER_TYPE_COLORS.online   },
  ].filter(d => d.value > 0) : [];

  const maxItemOrders = topItems.length > 0 ? Math.max(...topItems.map(i => i.orderCount)) : 1;

  return (
    <div className="space-y-5">
      {/* Header — period selector + export */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${
                period === p
                  ? 'bg-orange-500 text-white'
                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300'
              }`}
            >
              {p === 'all' && <Calendar size={13} />}
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            const rows = [
              ['Day', 'Revenue (₹)', 'Orders'],
              ...salesData.map((d: { day: string; revenue: number; orders: number }) => [d.day, d.revenue, d.orders]),
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`;
            a.click(); URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 transition"
        >
          <Download size={15} />
          Export Report
        </button>
      </div>

      {/* ── Sales by Order Type ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Sales by Order Type</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {PERIOD_LABELS[period]} — {otCount} orders · ₹{Number(otTotal).toLocaleString()} total
            </p>
          </div>
          {loading && <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {orderTypeConfig.map(({ key, countKey, label, Icon, amtCls, badgeCls, bgCls, color }) => {
            const amount = orderTypes ? Number(orderTypes[key]) : 0;
            const count  = orderTypes ? orderTypes[countKey] : 0;
            const pct    = otTotal > 0 ? Math.round((amount / otTotal) * 100) : 0;
            return (
              <div key={key} className={`rounded-2xl p-4 border ${bgCls}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon size={15} className={amtCls} />
                    <span className="font-semibold text-sm text-gray-700 dark:text-gray-200">{label}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{pct}%</span>
                </div>
                <p className={`text-xl font-bold ${amtCls} mb-0.5`}>₹{amount.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2.5">{count} order{count !== 1 ? 's' : ''}</p>
                <div className="h-1.5 bg-white/70 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Donut + legend */}
        <div className="grid grid-cols-2 gap-6 items-center">
          <div>
            {donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    dataKey="value"
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {donutData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip
                    formatter={(v) => [`₹${Number(v).toLocaleString()}`, '']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                No data for this period
              </div>
            )}
          </div>
          <div className="space-y-3">
            {orderTypeConfig.map(({ key, countKey, label, color }) => {
              const amount = orderTypes ? Number(orderTypes[key]) : 0;
              const count  = orderTypes ? orderTypes[countKey] : 0;
              const pct    = otTotal > 0 ? Math.round((amount / otTotal) * 100) : 0;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <div className="flex-1">
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white">₹{amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{count} orders</span>
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400 font-medium">Total</span>
              <span className="font-bold text-orange-500">₹{Number(otTotal).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue vs Orders chart */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Revenue vs Orders</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days comparison</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesData}>
              <defs>
                <linearGradient id="revG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordG" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" orientation="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Area yAxisId="rev" type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2} fill="url(#revG)" name="Revenue (₹)" dot={false} />
              <Area yAxisId="ord" type="monotone" dataKey="orders"  stroke="#3b82f6" strokeWidth={2} fill="url(#ordG)" name="Orders"      dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Items (live) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Top Selling Items</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">All time</p>
          {topItems.length > 0 ? (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center gap-3">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 ${i === 0 ? 'bg-orange-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                      <span className="text-sm font-bold text-gray-900 dark:text-white ml-2">₹{(item.revenue / 1000).toFixed(1)}k</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${(item.orderCount / maxItemOrders) * 100}%` }} />
                      </div>
                      <span className="text-xs text-gray-400 shrink-0">{item.orderCount}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg shrink-0" />
                  <div className="flex-1">
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-1.5" />
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Staff Performance</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={mockStaff.filter(s => s.salesToday > 0)} layout="vertical" margin={{ left: 0, right: 30 }} barSize={14}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} width={80} />
            <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Sales']} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
            <Bar dataKey="salesToday" fill="#f97316" radius={[0, 4, 4, 0]} name="Sales Today" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hourly Traffic */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Hourly Traffic Pattern</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Order volume by hour — identify peak and off-peak periods</p>
          </div>
          <span className="px-3 py-1 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 text-xs font-medium rounded-full">Peak: 8PM — 61 orders</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={hourlyData} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
            <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
