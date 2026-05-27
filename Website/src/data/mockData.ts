import { Table, MenuItem, Order, StaffMember } from '../types';

export const mockTables: Table[] = [
  { id: 1, number: 1, seats: 2, status: 'available' },
  { id: 2, number: 2, seats: 4, status: 'occupied', server: 'Arjun', orderId: 1001, occupiedSince: '12:30' },
  { id: 3, number: 3, seats: 4, status: 'occupied', server: 'Priya', orderId: 1002, occupiedSince: '12:45' },
  { id: 4, number: 4, seats: 6, status: 'reserved' },
  { id: 5, number: 5, seats: 2, status: 'available' },
  { id: 6, number: 6, seats: 4, status: 'billing', server: 'Arjun', orderId: 1003, occupiedSince: '11:55' },
  { id: 7, number: 7, seats: 8, status: 'occupied', server: 'Ravi', orderId: 1004, occupiedSince: '13:00' },
  { id: 8, number: 8, seats: 2, status: 'dirty' },
  { id: 9, number: 9, seats: 4, status: 'available' },
  { id: 10, number: 10, seats: 4, status: 'occupied', server: 'Priya', orderId: 1005, occupiedSince: '13:15' },
  { id: 11, number: 11, seats: 6, status: 'available' },
  { id: 12, number: 12, seats: 2, status: 'reserved' },
];

export const menuCategories = ['All', 'Starters', 'Mains', 'Biryani', 'Breads', 'Beverages', 'Desserts'];

export const mockMenuItems: MenuItem[] = [
  { id: 1, name: 'Paneer Tikka', category: 'Starters', price: 320, description: 'Marinated cottage cheese grilled in tandoor', available: true, prepTime: 15, popular: true, veg: true },
  { id: 2, name: 'Chicken 65', category: 'Starters', price: 380, description: 'Spicy deep-fried chicken with curry leaves', available: true, prepTime: 12, popular: true, veg: false },
  { id: 3, name: 'Veg Manchurian', category: 'Starters', price: 280, description: 'Crispy vegetable balls in Indo-Chinese sauce', available: true, prepTime: 10, veg: true },
  { id: 4, name: 'Chilli Chicken', category: 'Starters', price: 360, description: 'Wok-tossed chicken with bell peppers and chilli', available: true, prepTime: 12, veg: false },
  { id: 5, name: 'Butter Chicken', category: 'Mains', price: 420, description: 'Tender chicken in rich tomato-butter gravy', available: true, prepTime: 20, popular: true, veg: false },
  { id: 6, name: 'Dal Makhani', category: 'Mains', price: 320, description: 'Slow-cooked black lentils with cream and butter', available: true, prepTime: 15, veg: true },
  { id: 7, name: 'Palak Paneer', category: 'Mains', price: 340, description: 'Cottage cheese in spiced spinach gravy', available: true, prepTime: 15, veg: true },
  { id: 8, name: 'Lamb Rogan Josh', category: 'Mains', price: 480, description: 'Aromatic Kashmiri lamb curry', available: true, prepTime: 25, veg: false },
  { id: 9, name: 'Chicken Biryani', category: 'Biryani', price: 380, description: 'Fragrant basmati rice with spiced chicken', available: true, prepTime: 25, popular: true, veg: false },
  { id: 10, name: 'Veg Biryani', category: 'Biryani', price: 300, description: 'Aromatic rice with seasonal vegetables', available: true, prepTime: 20, veg: true },
  { id: 11, name: 'Mutton Biryani', category: 'Biryani', price: 450, description: 'Slow-cooked mutton with saffron rice', available: true, prepTime: 30, veg: false },
  { id: 12, name: 'Butter Naan', category: 'Breads', price: 60, description: 'Soft leavened bread brushed with butter', available: true, prepTime: 8, popular: true, veg: true },
  { id: 13, name: 'Garlic Naan', category: 'Breads', price: 70, description: 'Naan topped with garlic and cilantro', available: true, prepTime: 8, veg: true },
  { id: 14, name: 'Lachha Paratha', category: 'Breads', price: 65, description: 'Flaky whole wheat layered flatbread', available: true, prepTime: 10, veg: true },
  { id: 15, name: 'Mango Lassi', category: 'Beverages', price: 120, description: 'Chilled yogurt blended with fresh mango', available: true, prepTime: 5, popular: true, veg: true },
  { id: 16, name: 'Masala Chai', category: 'Beverages', price: 80, description: 'Spiced Indian tea with milk', available: true, prepTime: 5, veg: true },
  { id: 17, name: 'Fresh Lime Soda', category: 'Beverages', price: 90, description: 'Fizzy lime drink sweet or salted', available: true, prepTime: 3, veg: true },
  { id: 18, name: 'Gulab Jamun', category: 'Desserts', price: 140, description: 'Soft milk dumplings in rose sugar syrup', available: true, prepTime: 5, popular: true, veg: true },
  { id: 19, name: 'Kulfi Falooda', category: 'Desserts', price: 180, description: 'Traditional ice cream with falooda noodles', available: true, prepTime: 5, veg: true },
  { id: 20, name: 'Ras Malai', category: 'Desserts', price: 160, description: 'Soft cottage cheese patties in sweet cream', available: false, prepTime: 5, veg: true },
];

export const mockOrders: Order[] = [
  {
    id: 1001,
    tableId: 2,
    tableNumber: 2,
    items: [
      { id: 1, menuItem: mockMenuItems[0], quantity: 2, modifiers: ['Extra Spice'], notes: '', status: 'served', price: 640 },
      { id: 2, menuItem: mockMenuItems[4], quantity: 1, modifiers: [], notes: 'Less oil', status: 'preparing', price: 420 },
      { id: 3, menuItem: mockMenuItems[11], quantity: 3, modifiers: [], notes: '', status: 'ready', price: 180 },
    ],
    status: 'preparing',
    createdAt: '12:30',
    server: 'Arjun',
    subtotal: 1240,
    tax: 149,
    serviceCharge: 62,
    discount: 0,
    total: 1451,
  },
  {
    id: 1002,
    tableId: 3,
    tableNumber: 3,
    items: [
      { id: 4, menuItem: mockMenuItems[8], quantity: 2, modifiers: [], notes: '', status: 'ready', price: 760 },
      { id: 5, menuItem: mockMenuItems[14], quantity: 2, modifiers: ['Less Sweet'], notes: '', status: 'served', price: 240 },
    ],
    status: 'ready',
    createdAt: '12:45',
    server: 'Priya',
    subtotal: 1000,
    tax: 120,
    serviceCharge: 50,
    discount: 100,
    total: 1070,
  },
];

export const mockStaff: StaffMember[] = [
  { id: 1, name: 'Arjun Sharma', role: 'server', avatar: 'AS', ordersToday: 12, salesToday: 18400 },
  { id: 2, name: 'Priya Nair', role: 'server', avatar: 'PN', ordersToday: 9, salesToday: 14200 },
  { id: 3, name: 'Ravi Kumar', role: 'cashier', avatar: 'RK', ordersToday: 22, salesToday: 38600 },
  { id: 4, name: 'Sunita Patel', role: 'kitchen', avatar: 'SP', ordersToday: 31, salesToday: 0 },
  { id: 5, name: 'Vikram Singh', role: 'manager', avatar: 'VS', ordersToday: 0, salesToday: 0 },
];

export const salesData = [
  { day: 'Mon', revenue: 42000, orders: 86 },
  { day: 'Tue', revenue: 38000, orders: 74 },
  { day: 'Wed', revenue: 51000, orders: 103 },
  { day: 'Thu', revenue: 47000, orders: 95 },
  { day: 'Fri', revenue: 63000, orders: 128 },
  { day: 'Sat', revenue: 78000, orders: 156 },
  { day: 'Sun', revenue: 71000, orders: 142 },
];

export const categoryData = [
  { name: 'Mains', value: 38 },
  { name: 'Biryani', value: 24 },
  { name: 'Starters', value: 18 },
  { name: 'Beverages', value: 12 },
  { name: 'Desserts', value: 5 },
  { name: 'Breads', value: 3 },
];

export const hourlyData = [
  { hour: '10AM', orders: 8 },
  { hour: '11AM', orders: 15 },
  { hour: '12PM', orders: 34 },
  { hour: '1PM', orders: 48 },
  { hour: '2PM', orders: 41 },
  { hour: '3PM', orders: 18 },
  { hour: '4PM', orders: 12 },
  { hour: '5PM', orders: 22 },
  { hour: '6PM', orders: 35 },
  { hour: '7PM', orders: 52 },
  { hour: '8PM', orders: 61 },
  { hour: '9PM', orders: 44 },
  { hour: '10PM', orders: 28 },
];
