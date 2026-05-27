export type TableStatus = 'available' | 'occupied' | 'reserved' | 'dirty' | 'billing';
export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'served' | 'closed';
export type PaymentMethod = 'cash' | 'card' | 'upi' | 'wallet';
export type UserRole = 'admin' | 'manager' | 'server' | 'cashier' | 'kitchen';

export interface Table {
  id: number;
  number: number;
  seats: number;
  status: TableStatus;
  server?: string;
  orderId?: number;
  occupiedSince?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  category: string;
  price: number;
  description: string;
  image?: string;
  available: boolean;
  prepTime: number;
  popular?: boolean;
  veg: boolean;
}

export interface OrderItem {
  id: number;
  menuItem: MenuItem;
  quantity: number;
  modifiers: string[];
  notes: string;
  status: 'pending' | 'preparing' | 'ready' | 'served';
  price: number;
}

export interface Order {
  id: number;
  tableId: number;
  tableNumber: number;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: string;
  server: string;
  subtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  total: number;
}

export interface StaffMember {
  id: number;
  name: string;
  role: UserRole;
  avatar: string;
  ordersToday: number;
  salesToday: number;
}
