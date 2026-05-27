import { useState, useEffect } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { TrendingUp, ShoppingBag, Users, Clock, ArrowUpRight, ArrowDownRight, UtensilsCrossed, ShoppingBag as BagIcon, Globe } from 'lucide-react';
import { salesData, categoryData, hourlyData } from '../data/mockData';
import { api } from '../api/client';
import type { DashboardSummaryDto, TableStatusSummaryDto, TopStaffDto, OrderTypeBreakdownDto } from '../api/types';

const COLORS = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5', '#fff7ed'];

const colorMap: Record<string, string> = {
  orange: 'bg-orange-100 text-orange-600',
  blue:   'bg-blue-100 text-blue-600',
  green:  'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
};

const orderTypeConfig = [
  { key: 'dineIn'   as const, label: 'Dine-in',  Icon: UtensilsCrossed, badgeCls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',   amtCls: 'text-blue-600 dark:text-blue-400',   barCls: 'bg-blue-500',   bgCls: 'bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900'   },
  { key: 'takeaway' as const, label: 'Takeaway',  Icon: BagIcon,         badgeCls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', amtCls: 'text-amber-600 dark:text-amber-400', barCls: 'bg-amber-500', bgCls: 'bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900' },
  { key: 'online'   as const, label: 'Online',    Icon: Globe,           badgeCls: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300', amtCls: 'text-green-600 dark:text-green-400', barCls: 'bg-green-500', bgCls: 'bg-green-50 dark:bg-green-950/30 border-green-100 dark:border-green-900' },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [tableStatus, setTableStatus] = useState<TableStatusSummaryDto | null>(null);
  const [topStaff, setTopStaff] = useState<TopStaffDto[]>([]);
  const [orderTypes, setOrderTypes] = useState<OrderTypeBreakdownDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<DashboardSummaryDto>('/api/dashboard/summary'),
      api.get<TableStatusSummaryDto>('/api/dashboard/tables'),
      api.get<TopStaffDto[]>('/api/dashboard/top-staff?limit=3'),
      api.get<OrderTypeBreakdownDto>('/api/dashboard/order-types?period=today'),
    ])
      .then(([s, t, staff, ot]) => { setSummary(s); setTableStatus(t); setTopStaff(staff); setOrderTypes(ot); })
      .catch(err => setError(err.message));
  }, []);

  const kpis = summary
    ? [
        { label: "Today's Revenue", value: summary.revenue.value,      change: summary.revenue.change,      up: summary.revenue.isUp,      icon: TrendingUp, color: 'orange' },
        { label: 'Total Orders',    value: summary.totalOrders.value,  change: summary.totalOrders.change,  up: summary.totalOrders.isUp,  icon: ShoppingBag, color: 'blue'   },
        { label: 'Active Tables',   value: summary.activeTables.value, change: summary.activeTables.change, up: summary.activeTables.isUp, icon: Users,       color: 'green'  },
        { label: 'Avg. Order Time', value: summary.avgOrderTime.value, change: summary.avgOrderTime.change, up: summary.avgOrderTime.isUp, icon: Clock,       color: 'purple' },
      ]
    : null;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        {kpis
          ? kpis.map(({ label, value, change, up, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
                    <Icon size={20} />
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${up ? 'text-green-600' : 'text-red-500'}`}>
                    {up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
              </div>
            ))
          : Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-xl mb-4" />
                <div className="h-7 bg-gray-200 rounded w-24 mb-2" />
                <div className="h-4 bg-gray-100 rounded w-32" />
              </div>
            ))
        }
      </div>

      {/* Order Type Breakdown */}
      <div className="grid grid-cols-3 gap-4">
        {orderTypes
          ? (() => {
              const total = orderTypes.dineIn + orderTypes.takeaway + orderTypes.online;
              return orderTypeConfig.map(({ key, label, Icon, badgeCls, amtCls, barCls, bgCls }) => {
                const countKey = `${key}Count` as 'dineInCount' | 'takeawayCount' | 'onlineCount';
                const amount = orderTypes[key];
                const count  = orderTypes[countKey];
                const pct    = total > 0 ? Math.round((amount / total) * 100) : 0;
                return (
                  <div key={key} className={`rounded-2xl p-5 border shadow-sm ${bgCls}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon size={16} className={amtCls} />
                        <span className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{label}</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>{pct}%</span>
                    </div>
                    <p className={`text-2xl font-bold mb-0.5 ${amtCls}`}>₹{Number(amount).toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{count} order{count !== 1 ? 's' : ''} today</p>
                    <div className="h-1.5 bg-white/60 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full ${barCls} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              });
            })()
          : orderTypeConfig.map(({ key }) => (
              <div key={key} className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-4" />
                <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
                <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-20 mb-4" />
                <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full" />
              </div>
            ))
        }
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Revenue Chart — uses static sample data */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Weekly Revenue</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Last 7 days performance</p>
            </div>
            <div className="flex gap-2">
              {['7D', '30D', '90D'].map(r => (
                <button key={r} className={`px-3 py-1 rounded-lg text-xs font-medium transition ${r === '7D' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={salesData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString()}`, 'Revenue']} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={2.5} fill="url(#revGradient)" dot={false} activeDot={{ r: 5, fill: '#f97316' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Sales by Category</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Today's breakdown</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" paddingAngle={3}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => [`${v}%`, '']} contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {categoryData.map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600 dark:text-gray-300">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900 dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-3 gap-4">
        {/* Hourly Orders */}
        <div className="col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Hourly Orders</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's traffic by hour</p>
            </div>
            <span className="px-3 py-1 bg-orange-50 text-orange-600 text-xs font-medium rounded-full">Peak: 8PM — 61 orders</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hourlyData} margin={{ top: 0, right: 5, left: 0, bottom: 0 }} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="hour" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Table Status + Staff */}
        <div className="space-y-4">
          {/* Table Status */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Table Status</h3>
            {tableStatus
              ? (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Available', count: tableStatus.available, color: 'bg-green-100 text-green-700' },
                    { label: 'Occupied',  count: tableStatus.occupied,  color: 'bg-orange-100 text-orange-700' },
                    { label: 'Reserved',  count: tableStatus.reserved,  color: 'bg-blue-100 text-blue-700' },
                    { label: 'Billing',   count: tableStatus.billing,   color: 'bg-purple-100 text-purple-700' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                      <p className="text-xl font-bold">{count}</p>
                      <p className="text-xs font-medium">{label}</p>
                    </div>
                  ))}
                </div>
              )
              : <div className="h-24 bg-gray-50 rounded-xl animate-pulse" />
            }
          </div>

          {/* Top Staff */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Top Staff Today</h3>
            {topStaff.length > 0
              ? (
                <div className="space-y-3">
                  {topStaff.map(staff => (
                    <div key={staff.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">
                        {staff.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{staff.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{staff.orderCount} orders</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{(staff.totalSales / 1000).toFixed(1)}k</span>
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full" />
                      <div className="flex-1"><div className="h-3 bg-gray-200 rounded w-24 mb-1" /><div className="h-2 bg-gray-100 rounded w-16" /></div>
                    </div>
                  ))}
                </div>
              )
            }
          </div>
        </div>
      </div>
    </div>
  );
}
