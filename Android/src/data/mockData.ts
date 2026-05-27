export interface ActiveOrderSummary {
  id: number;
  status: string;
  orderType: string;
  subtotal: number;
  itemCount: number;
}

export interface MockTable {
  id: number;
  number: number;
  seats: number;
  status: 'available' | 'occupied' | 'reserved' | 'billing' | 'dirty';
  server?: string;
  orderId?: number;
  since?: string;
  activeOrders: ActiveOrderSummary[];
}

export const mockTables: MockTable[] = [
  { id: 1, number: 1, seats: 2, status: 'available', activeOrders: [] },
  {
    id: 2, number: 2, seats: 4, status: 'occupied', server: 'Arjun', orderId: 1001, since: '12:30',
    activeOrders: [{ id: 1001, status: 'active', orderType: 'dine-in', subtotal: 1640, itemCount: 4 }],
  },
  {
    id: 3, number: 3, seats: 4, status: 'occupied', server: 'Priya', orderId: 1002, since: '12:45',
    activeOrders: [{ id: 1002, status: 'active', orderType: 'dine-in', subtotal: 760, itemCount: 2 }],
  },
  { id: 4, number: 4, seats: 6, status: 'reserved', activeOrders: [] },
  { id: 5, number: 5, seats: 2, status: 'available', activeOrders: [] },
  {
    id: 6, number: 6, seats: 4, status: 'billing', server: 'Arjun', orderId: 1003, since: '11:55',
    activeOrders: [{ id: 1003, status: 'billing', orderType: 'dine-in', subtotal: 1640, itemCount: 4 }],
  },
  {
    id: 7, number: 7, seats: 8, status: 'occupied', server: 'Ravi', orderId: 1004, since: '13:00',
    activeOrders: [
      { id: 1004, status: 'active', orderType: 'dine-in', subtotal: 640, itemCount: 2 },
      { id: 1006, status: 'active', orderType: 'takeaway', subtotal: 420, itemCount: 1 },
    ],
  },
  { id: 8, number: 8, seats: 2, status: 'dirty', activeOrders: [] },
  { id: 9, number: 9, seats: 4, status: 'available', activeOrders: [] },
  {
    id: 10, number: 10, seats: 4, status: 'occupied', server: 'Priya', orderId: 1005, since: '13:15',
    activeOrders: [{ id: 1005, status: 'active', orderType: 'online', subtotal: 980, itemCount: 3 }],
  },
];

export const mockMenuItems = [
  { id: 1,  name: 'Paneer Tikka',    category: 'Starters',  price: 320, veg: true,  popular: true,  available: true },
  { id: 2,  name: 'Chicken 65',      category: 'Starters',  price: 380, veg: false, popular: true,  available: true },
  { id: 3,  name: 'Veg Manchurian',  category: 'Starters',  price: 280, veg: true,  popular: false, available: true },
  { id: 4,  name: 'Chilli Chicken',  category: 'Starters',  price: 360, veg: false, popular: false, available: true },
  { id: 5,  name: 'Butter Chicken',  category: 'Mains',     price: 420, veg: false, popular: true,  available: true },
  { id: 6,  name: 'Dal Makhani',     category: 'Mains',     price: 320, veg: true,  popular: false, available: true },
  { id: 7,  name: 'Palak Paneer',    category: 'Mains',     price: 340, veg: true,  popular: false, available: true },
  { id: 8,  name: 'Chicken Biryani', category: 'Biryani',   price: 380, veg: false, popular: true,  available: true },
  { id: 9,  name: 'Veg Biryani',     category: 'Biryani',   price: 300, veg: true,  popular: false, available: true },
  { id: 10, name: 'Butter Naan',     category: 'Breads',    price: 60,  veg: true,  popular: true,  available: true },
  { id: 11, name: 'Garlic Naan',     category: 'Breads',    price: 70,  veg: true,  popular: false, available: true },
  { id: 12, name: 'Mango Lassi',     category: 'Beverages', price: 120, veg: true,  popular: true,  available: true },
  { id: 13, name: 'Masala Chai',     category: 'Beverages', price: 80,  veg: true,  popular: false, available: true },
  { id: 14, name: 'Gulab Jamun',     category: 'Desserts',  price: 140, veg: true,  popular: true,  available: true },
  { id: 15, name: 'Kulfi Falooda',   category: 'Desserts',  price: 180, veg: true,  popular: false, available: true },
];

export const categories = ['All', 'Starters', 'Mains', 'Biryani', 'Breads', 'Beverages', 'Desserts'];

export const kdsOrders = [
  {
    id: 1001, table: 2, server: 'Arjun', elapsed: '18 min', urgent: true,
    items: [
      { id: 1, name: 'Paneer Tikka',   qty: 2, status: 'preparing', notes: 'Extra Spice' },
      { id: 2, name: 'Butter Chicken', qty: 1, status: 'pending',   notes: 'Less oil'    },
      { id: 3, name: 'Butter Naan',    qty: 3, status: 'ready',     notes: ''            },
    ],
  },
  {
    id: 1002, table: 3, server: 'Priya', elapsed: '8 min', urgent: false,
    items: [
      { id: 4, name: 'Chicken Biryani', qty: 2, status: 'preparing', notes: ''           },
      { id: 5, name: 'Mango Lassi',     qty: 2, status: 'ready',     notes: 'Less Sweet' },
    ],
  },
  {
    id: 1004, table: 7, server: 'Ravi', elapsed: '4 min', urgent: false,
    items: [
      { id: 6, name: 'Dal Makhani', qty: 2, status: 'pending', notes: '' },
      { id: 7, name: 'Garlic Naan', qty: 4, status: 'pending', notes: '' },
    ],
  },
];

export const billingOrders = [
  {
    id: 1003, table: 6, server: 'Arjun', time: '11:55',
    items: [
      { name: 'Butter Chicken', qty: 2, price: 420 },
      { name: 'Dal Makhani',    qty: 1, price: 320 },
      { name: 'Butter Naan',    qty: 4, price: 60  },
      { name: 'Mango Lassi',    qty: 2, price: 120 },
    ],
    subtotal: 1640, tax: 82, service: 82,
  },
];

export const paymentHistory = [
  {
    paymentId: 1, orderId: 1003, tableNumber: 6, serverName: 'Arjun',
    orderType: 'dine-in', method: 'card',
    subtotal: 1640, taxAmount: 82, serviceCharge: 82, discountAmount: 0, totalAmount: 1804,
    processedAt: new Date(Date.now() - 30 * 60000).toISOString(),
    items: [
      { name: 'Butter Chicken', quantity: 2, price: 420, lineTotal: 840 },
      { name: 'Dal Makhani',    quantity: 1, price: 320, lineTotal: 320 },
      { name: 'Butter Naan',    quantity: 4, price: 60,  lineTotal: 240 },
      { name: 'Mango Lassi',    quantity: 2, price: 120, lineTotal: 240 },
    ],
  },
  {
    paymentId: 2, orderId: 1002, tableNumber: 3, serverName: 'Priya',
    orderType: 'takeaway', method: 'upi',
    subtotal: 760, taxAmount: 38, serviceCharge: 38, discountAmount: 76, totalAmount: 760,
    processedAt: new Date(Date.now() - 90 * 60000).toISOString(),
    items: [
      { name: 'Chicken Biryani', quantity: 2, price: 380, lineTotal: 760 },
    ],
  },
  {
    paymentId: 3, orderId: 1001, tableNumber: 2, serverName: 'Arjun',
    orderType: 'dine-in', method: 'cash',
    subtotal: 1200, taxAmount: 60, serviceCharge: 60, discountAmount: 0, totalAmount: 1320,
    processedAt: new Date(Date.now() - 3 * 3600000).toISOString(),
    items: [
      { name: 'Paneer Tikka',   quantity: 2, price: 320, lineTotal: 640 },
      { name: 'Butter Naan',    quantity: 4, price: 60,  lineTotal: 240 },
      { name: 'Masala Chai',    quantity: 4, price: 80,  lineTotal: 320 },
    ],
  },
  {
    paymentId: 4, orderId: 1000, tableNumber: 9, serverName: 'Ravi',
    orderType: 'online', method: 'wallet',
    subtotal: 840, taxAmount: 42, serviceCharge: 42, discountAmount: 84, totalAmount: 840,
    processedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    items: [
      { name: 'Chicken Biryani', quantity: 1, price: 380, lineTotal: 380 },
      { name: 'Butter Chicken',  quantity: 1, price: 420, lineTotal: 420 },
      { name: 'Mango Lassi',     quantity: 1, price: 120, lineTotal: 120 },
    ],
  },
];
