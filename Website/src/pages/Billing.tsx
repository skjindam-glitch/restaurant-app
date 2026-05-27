import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CheckCircle, Percent, CreditCard, Banknote, Smartphone, Gift, AlertCircle, RefreshCw, FileText, Printer, X, Split, Users } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../api/client';
import type { BillDto, PaymentResultDto, SplitBillResultDto } from '../api/types';
import { PaymentMethod } from '../types';

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { id: 'cash',   label: 'Cash',   icon: Banknote    },
  { id: 'card',   label: 'Card',   icon: CreditCard  },
  { id: 'upi',    label: 'UPI',    icon: Smartphone  },
  { id: 'wallet', label: 'Wallet', icon: Gift        },
];

export default function Billing() {
  const [searchParams] = useSearchParams();
  const [bills, setBills] = useState<BillDto[]>([]);
  const [selectedBill, setSelectedBill] = useState<BillDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [discount, setDiscount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cashInput, setCashInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PaymentResultDto | null>(null);
  const [billModal, setBillModal] = useState<{ bill: BillDto; total: number } | null>(null);

  // Split bill
  const [splitModal, setSplitModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitResult, setSplitResult] = useState<SplitBillResultDto | null>(null);
  const [splitLoading, setSplitLoading] = useState(false);

  const [refreshing, setRefreshing] = useState(false);

  const fetchBills = useCallback(async (manual = false) => {
    if (manual) setRefreshing(true);
    try {
      const data = await api.get<BillDto[]>('/api/billing/pending');
      setBills(data);
      setError('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      if (manual) setRefreshing(false);
    }
  }, []); // no selectedBill dep — selection is handled in the effect below

  // Auto-select: on first load honour ?orderId param; on refresh keep current selection
  // if it still exists, otherwise fall back to the first bill.
  useEffect(() => {
    if (bills.length === 0) return;
    setSelectedBill(prev => {
      if (prev) {
        const stillExists = bills.find(b => b.orderId === prev.orderId);
        return stillExists ?? bills[0];
      }
      const orderIdParam = searchParams.get('orderId');
      if (orderIdParam) {
        const match = bills.find(b => b.orderId === Number(orderIdParam));
        return match ?? bills[0];
      }
      return bills[0];
    });
  }, [bills, searchParams]);

  useEffect(() => {
    fetchBills();
    const id = setInterval(fetchBills, 10_000);
    return () => clearInterval(id);
  }, [fetchBills]);

  const selectBill = (bill: BillDto) => {
    setSelectedBill(bill);
    setDiscount(0);
    setCashInput('');
    setResult(null);
    setSplitResult(null);
  };

  const discountAmount = selectedBill ? Math.round(selectedBill.subtotal * discount / 100) : 0;
  const payableTotal = selectedBill
    ? selectedBill.subtotal + selectedBill.tax + selectedBill.serviceCharge - discountAmount
    : 0;
  const cashChange = cashInput && parseInt(cashInput) >= payableTotal
    ? parseInt(cashInput) - payableTotal
    : 0;

  const processPayment = async () => {
    if (!selectedBill) return;
    if (paymentMethod === 'cash' && (!cashInput || parseInt(cashInput) < payableTotal)) {
      setError('Cash received must be at least ₹' + payableTotal);
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<PaymentResultDto>(`/api/billing/${selectedBill.orderId}/pay`, {
        method: paymentMethod,
        discountPercent: discount,
        cashReceived: paymentMethod === 'cash' ? parseInt(cashInput) : undefined,
      });
      setResult(res);
      setBills(prev => prev.filter(b => b.orderId !== selectedBill.orderId));
      setSelectedBill(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const openSplitModal = async () => {
    if (!selectedBill) return;
    setSplitModal(true);
    setSplitLoading(true);
    try {
      const res = await api.post<SplitBillResultDto>(`/api/billing/${selectedBill.orderId}/split`, {
        splitCount,
        method: paymentMethod,
        discountPercent: discount,
      });
      setSplitResult(res);
    } catch {
      // ignore — show manual calculation
    } finally {
      setSplitLoading(false);
    }
  };

  const recalculateSplit = async () => {
    if (!selectedBill) return;
    setSplitLoading(true);
    try {
      const res = await api.post<SplitBillResultDto>(`/api/billing/${selectedBill.orderId}/split`, {
        splitCount,
        method: paymentMethod,
        discountPercent: discount,
      });
      setSplitResult(res);
    } catch {
      // fallback to local calculation
      const perPerson = Math.ceil(payableTotal / splitCount);
      setSplitResult({
        splitCount,
        totalAmount: payableTotal,
        amountPerPerson: perPerson,
        splits: Array.from({ length: splitCount }, (_, i) => ({
          personNumber: i + 1,
          amount: i === splitCount - 1 ? payableTotal - perPerson * (splitCount - 1) : perPerson,
        })),
      });
    } finally {
      setSplitLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setDiscount(0);
    setCashInput('');
    setPaymentMethod('card');
    if (bills.length > 0) setSelectedBill(bills[0]);
  };

  if (result) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Payment Successful!</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-2">Payment #{result.paymentId}</p>
          <p className="text-3xl font-bold text-green-600 mb-6">₹{Number(result.totalCharged).toLocaleString()}</p>
          {result.method === 'cash' && result.changeGiven != null && result.changeGiven > 0 && (
            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl px-6 py-3 mb-6">
              <p className="text-amber-800 dark:text-amber-300 font-semibold">Change to return: ₹{Number(result.changeGiven).toLocaleString()}</p>
            </div>
          )}
          <button onClick={reset} className="px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition">
            New Transaction
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6 h-[calc(100vh-8rem)]">
      {/* Order List Sidebar */}
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 text-sm">Pending Bills</h3>
          <button onClick={() => fetchBills(true)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
            <AlertCircle size={13} />
            {error}
          </div>
        )}

        {bills.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <p className="text-sm font-medium">No pending bills</p>
            <p className="text-xs mt-1">Bills appear when kitchen marks orders ready</p>
          </div>
        ) : (
          bills.map(bill => (
            <div
              key={bill.orderId}
              onClick={() => selectBill(bill)}
              className={`p-4 rounded-xl cursor-pointer border transition ${selectedBill?.orderId === bill.orderId ? 'border-orange-400 bg-orange-50 dark:bg-orange-950/30 dark:border-orange-600' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-orange-200 dark:hover:border-orange-700'}`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-semibold text-gray-900 dark:text-white text-sm">Table {bill.tableNumber}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">#{bill.orderId}</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">{bill.serverName} • {bill.orderTime}</p>
              <p className="text-base font-bold text-orange-600">₹{Number(bill.total).toLocaleString()}</p>
            </div>
          ))
        )}
      </div>

      {/* Bill Details */}
      {selectedBill ? (
        <>
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bill — Table {selectedBill.tableNumber}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Order #{selectedBill.orderId} • {selectedBill.serverName} • {selectedBill.orderTime}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={openSplitModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-700 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30 transition"
                  >
                    <Split size={13} />
                    Split Bill
                  </button>
                  <button
                    onClick={() => setBillModal({ bill: selectedBill, total: payableTotal })}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 rounded-lg hover:border-orange-300 hover:text-orange-600 transition"
                  >
                    <FileText size={13} />
                    View Bill
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="text-gray-500 dark:text-gray-400 text-xs border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left pb-2 font-medium">Item</th>
                    <th className="text-center pb-2 font-medium">Qty</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                    <th className="text-right pb-2 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                  {selectedBill.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2.5 font-medium text-gray-900 dark:text-white">{item.name}</td>
                      <td className="py-2.5 text-center text-gray-600 dark:text-gray-400">{item.quantity}</td>
                      <td className="py-2.5 text-right text-gray-600 dark:text-gray-400">₹{Number(item.price).toLocaleString()}</td>
                      <td className="py-2.5 text-right font-medium text-gray-900 dark:text-white">₹{Number(item.lineTotal).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mb-5 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Apply Discount (%)</p>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2 flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800">
                    <Percent size={13} className="text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={discount || ''}
                      onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))}
                      placeholder="0"
                      className="flex-1 text-sm focus:outline-none bg-transparent dark:text-white"
                    />
                  </div>
                  <div className="flex gap-1.5">
                    {[5, 10, 15, 20].map(v => (
                      <button key={v} onClick={() => setDiscount(v)} className={`px-2.5 py-1.5 text-xs rounded-lg font-medium transition border ${discount === v ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-600' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 hover:border-orange-300 text-gray-600 dark:text-gray-300'}`}>
                        {v}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-700">
              <div className="space-y-1.5 text-sm mb-4">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{Number(selectedBill.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Tax (5%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{Number(selectedBill.tax).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Service Charge (5%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">₹{Number(selectedBill.serviceCharge).toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount ({discount}%)</span>
                    <span className="font-medium">-₹{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-600 dark:text-white">
                  <span>Total Payable</span>
                  <span className="text-orange-600">₹{payableTotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Panel */}
          <div className="w-72 shrink-0 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Payment Method</h3>

            <div className="grid grid-cols-2 gap-2 mb-5">
              {paymentMethods.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => { setPaymentMethod(id); setCashInput(''); setError(''); }}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition ${paymentMethod === id ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300'}`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>

            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Cash Received</label>
                <input
                  type="number"
                  value={cashInput}
                  onChange={e => setCashInput(e.target.value)}
                  placeholder={`₹${payableTotal}`}
                  className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:border-orange-500 bg-white dark:bg-gray-700 dark:text-white"
                />
                {cashInput && parseInt(cashInput) >= payableTotal && (
                  <div className="mt-2 p-2.5 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <p className="text-sm text-green-700 dark:text-green-400 font-medium">Change: ₹{cashChange.toLocaleString()}</p>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'upi' && (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-center">
                <QRCodeSVG
                  value={`upi://pay?pa=restaurant@upi&pn=RestaurantOS&am=${payableTotal}&tn=Order%20%23${selectedBill?.orderId}`}
                  size={100}
                  className="mx-auto mb-2"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">Scan to pay ₹{payableTotal.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">UPI ID: restaurant@upi</p>
              </div>
            )}

            {error && (
              <div className="mb-3 flex items-center gap-2 p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-xs">
                <AlertCircle size={13} />
                {error}
              </div>
            )}

            <div className="mt-auto space-y-2">
              <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl text-center mb-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">Amount to collect</p>
                <p className="text-2xl font-bold text-orange-600">₹{payableTotal.toLocaleString()}</p>
              </div>

              <button
                onClick={processPayment}
                disabled={submitting}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 text-white font-semibold rounded-xl transition text-sm flex items-center justify-center gap-2"
              >
                {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {submitting ? 'Processing…' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <CreditCard size={28} className="text-gray-400" />
            </div>
            <p className="font-medium text-gray-500 dark:text-gray-400">Select a pending bill</p>
            <p className="text-sm mt-1 text-gray-400">Bills appear when kitchen marks orders ready</p>
          </div>
        </div>
      )}

      {/* Split Bill Modal */}
      {splitModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                  <Split size={16} className="text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Split Bill</h3>
              </div>
              <button onClick={() => { setSplitModal(false); setSplitResult(null); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">Split between how many people?</label>
              <div className="flex items-center gap-3">
                <div className="flex gap-2">
                  {[2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      onClick={() => { setSplitCount(n); setSplitResult(null); }}
                      className={`w-10 h-10 rounded-xl text-sm font-bold transition border-2 ${splitCount === n ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/30 text-purple-600' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:border-purple-300'}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <button
                  onClick={recalculateSplit}
                  disabled={splitLoading}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-purple-500 text-white text-xs font-medium rounded-lg hover:bg-purple-600 transition disabled:opacity-60"
                >
                  {splitLoading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Users size={13} />}
                  Calculate
                </button>
              </div>
            </div>

            {splitResult ? (
              <div className="space-y-3">
                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500 dark:text-gray-400">Total Bill</span>
                    <span className="font-bold text-gray-900 dark:text-white">₹{Number(splitResult.totalAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 dark:text-gray-400">Per Person (approx.)</span>
                    <span className="font-bold text-purple-600">₹{Math.ceil(Number(splitResult.amountPerPerson)).toLocaleString()}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {splitResult.splits.map(s => (
                    <div key={s.personNumber} className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-800 rounded-xl text-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Person {s.personNumber}</p>
                      <p className="text-xl font-bold text-purple-600">₹{Math.ceil(Number(s.amount)).toLocaleString()}</p>
                    </div>
                  ))}
                </div>

                <p className="text-xs text-gray-400 text-center">Show each person their amount to collect payment separately</p>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Select number of people and tap Calculate</p>
              </div>
            )}

            <button onClick={() => { setSplitModal(false); setSplitResult(null); }} className="mt-4 w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-300 hover:border-gray-300 transition">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Printable Bill Modal */}
      {billModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Bill Receipt</h3>
              <div className="flex gap-2">
                <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition">
                  <Printer size={13} />
                  Print
                </button>
                <button onClick={() => setBillModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="text-center mb-4">
              <p className="font-bold text-lg">RestaurantOS</p>
              <p className="text-xs text-gray-500">Table {billModal.bill.tableNumber} • Order #{billModal.bill.orderId}</p>
              <p className="text-xs text-gray-400">{new Date().toLocaleString('en-IN')}</p>
            </div>

            <div className="border-t border-dashed border-gray-200 py-3 space-y-1.5">
              {billModal.bill.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-700">{item.name} ×{item.quantity}</span>
                  <span className="font-medium">₹{Number(item.lineTotal).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 py-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>₹{Number(billModal.bill.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Tax (5%)</span><span>₹{Number(billModal.bill.tax).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Service (5%)</span><span>₹{Number(billModal.bill.serviceCharge).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold text-base pt-1 border-t border-gray-200">
                <span>Total</span><span className="text-orange-600">₹{billModal.total.toLocaleString()}</span>
              </div>
            </div>

            <div className="text-center py-3 border-t border-dashed border-gray-200">
              <QRCodeSVG
                value={`upi://pay?pa=restaurant@upi&pn=RestaurantOS&am=${billModal.total}&tn=Order%20%23${billModal.bill.orderId}`}
                size={120}
                className="mx-auto mb-2"
              />
              <p className="text-xs text-gray-500 font-medium">Scan to pay ₹{billModal.total.toLocaleString()}</p>
              <p className="text-xs text-gray-400">UPI ID: restaurant@upi</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
