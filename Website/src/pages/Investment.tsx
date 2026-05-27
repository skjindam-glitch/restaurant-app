import { useState, useEffect } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, X, AlertCircle, RefreshCw, DollarSign, ShoppingBag, Zap, Users, Wrench, Package, HelpCircle } from 'lucide-react';
import { api } from '../api/client';
import type { InvestmentDto, CreateInvestmentRequest, InvestmentSummaryDto } from '../api/types';

const CATEGORIES = [
  { id: 'ingredients', label: 'Ingredients',  icon: ShoppingBag, color: 'bg-orange-100 text-orange-700' },
  { id: 'utilities',   label: 'Utilities',    icon: Zap,         color: 'bg-yellow-100 text-yellow-700' },
  { id: 'labor',       label: 'Labor',        icon: Users,       color: 'bg-blue-100 text-blue-700'     },
  { id: 'maintenance', label: 'Maintenance',  icon: Wrench,      color: 'bg-red-100 text-red-700'       },
  { id: 'equipment',   label: 'Equipment',    icon: Package,     color: 'bg-purple-100 text-purple-700' },
  { id: 'other',       label: 'Other',        icon: HelpCircle,  color: 'bg-gray-100 text-gray-600'     },
];

function catInfo(id: string) {
  return CATEGORIES.find(c => c.id === id) ?? CATEGORIES[5];
}

const today = new Date().toISOString().slice(0, 10);

export default function Investment() {
  const [selectedDate, setSelectedDate] = useState(today);
  const [investments, setInvestments] = useState<InvestmentDto[]>([]);
  const [summary, setSummary] = useState<InvestmentSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ category: 'ingredients', description: '', amount: '' });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = async (date: string, manual = false) => {
    if (manual) setRefreshing(true);
    else setLoading(true);
    try {
      const [inv, sum] = await Promise.all([
        api.get<InvestmentDto[]>(`/api/investment?date=${date}`),
        api.get<InvestmentSummaryDto>(`/api/investment/summary?date=${date}`),
      ]);
      setInvestments(inv);
      setSummary(sum);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(selectedDate); }, [selectedDate]);

  const addInvestment = async () => {
    if (!form.description.trim()) { setFormError('Description is required.'); return; }
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { setFormError('Enter a valid amount.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const req: CreateInvestmentRequest = { category: form.category, description: form.description, amount, date: selectedDate };
      await api.post<InvestmentDto>('/api/investment', req);
      setShowAddModal(false);
      setForm({ category: 'ingredients', description: '', amount: '' });
      await fetchData(selectedDate);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const deleteInvestment = async (id: number) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await api.delete(`/api/investment/${id}`);
      await fetchData(selectedDate);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const profit = summary ? Number(summary.profit) : 0;
  const isProfit = profit >= 0;

  return (
    <div className="space-y-5">
      {/* Date Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button onClick={() => fetchData(selectedDate, true)} className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 transition">
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
        </button>
        <button
          onClick={() => setShowAddModal(true)}
          className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
        >
          <Plus size={16} />
          Add Expense
        </button>
      </div>

      {error && <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm"><AlertCircle size={15} />{error}</div>}

      {/* Profit Summary Cards */}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-red-100 rounded-xl flex items-center justify-center">
                <TrendingDown size={16} className="text-red-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Investment</p>
            </div>
            <p className="text-2xl font-bold text-red-600 mt-2">₹{Number(summary.totalInvestment).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">{investments.length} expense entries</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 bg-green-100 rounded-xl flex items-center justify-center">
                <DollarSign size={16} className="text-green-600" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Today's Revenue</p>
            </div>
            <p className="text-2xl font-bold text-green-600 mt-2">₹{Number(summary.totalRevenue).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">From completed payments</p>
          </div>
          <div className={`rounded-2xl p-5 border shadow-sm ${isProfit ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
                {isProfit ? <TrendingUp size={16} className="text-green-600" /> : <TrendingDown size={16} className="text-red-600" />}
              </div>
              <p className={`text-sm font-medium ${isProfit ? 'text-green-700' : 'text-red-700'}`}>Net {isProfit ? 'Profit' : 'Loss'}</p>
            </div>
            <p className={`text-2xl font-bold mt-2 ${isProfit ? 'text-green-700' : 'text-red-700'}`}>
              {isProfit ? '+' : ''}₹{Math.abs(profit).toLocaleString()}
            </p>
            <p className={`text-xs mt-1 ${isProfit ? 'text-green-600' : 'text-red-600'}`}>
              Revenue − Investment
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-5">
        {/* Expense List */}
        <div className="col-span-2 space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Expenses for {selectedDate}</h3>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : investments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-10 text-center">
              <Package size={32} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">No expenses recorded for this date</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Expense" to track an investment</p>
            </div>
          ) : (
            investments.map(inv => {
              const cat = catInfo(inv.category);
              const CatIcon = cat.icon;
              return (
                <div key={inv.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                    <CatIcon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{inv.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{cat.label} • Added by {inv.createdByName}</p>
                  </div>
                  <p className="text-base font-bold text-red-600 shrink-0">-₹{Number(inv.amount).toLocaleString()}</p>
                  <button onClick={() => deleteInvestment(inv.id)} className="text-gray-300 hover:text-red-500 transition ml-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Category Breakdown */}
        <div className="space-y-3">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">By Category</h3>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-3">
            {summary && summary.byCategory.length > 0 ? (
              summary.byCategory
                .sort((a, b) => b.amount - a.amount)
                .map(cat => {
                  const info = catInfo(cat.category);
                  const CatIcon = info.icon;
                  const pct = summary.totalInvestment > 0
                    ? Math.round((cat.amount / summary.totalInvestment) * 100)
                    : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <CatIcon size={13} className="text-gray-500" />
                          <span className="text-sm text-gray-700 dark:text-gray-300">{info.label}</span>
                          <span className="text-xs text-gray-400">×{cat.count}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">₹{Number(cat.amount).toLocaleString()}</span>
                          <span className="text-xs text-gray-400 ml-1">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">No expenses yet</p>
            )}
          </div>

          {/* Profit Proof */}
          {summary && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">Profit Calculation</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Revenue</span>
                  <span className="font-medium text-green-600">+₹{Number(summary.totalRevenue).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Investment</span>
                  <span className="font-medium text-red-500">-₹{Number(summary.totalInvestment).toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-base pt-2 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Net Profit</span>
                  <span className={isProfit ? 'text-green-600' : 'text-red-600'}>
                    {isProfit ? '+' : ''}₹{Math.abs(profit).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Add Expense</h3>
              <button onClick={() => { setShowAddModal(false); setFormError(''); }} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            {formError && (
              <div className="mb-4 flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                <AlertCircle size={13} />{formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, category: cat.id }))}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition text-xs font-medium ${form.category === cat.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                      >
                        <Icon size={16} className={form.category === cat.id ? 'text-orange-600' : 'text-gray-500'} />
                        {cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g. Daily vegetable purchase"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹) *</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setFormError(''); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:border-gray-300 transition">
                Cancel
              </button>
              <button onClick={addInvestment} disabled={saving}
                className="flex-1 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
