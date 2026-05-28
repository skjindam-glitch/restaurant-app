// ── Auth ──────────────────────────────────────────────────────────────────────
export interface LoginRequest { email: string; password: string; }
export interface UserProfileDto {
  id: number; name: string; email: string; role: string; avatar: string; permissions: string[];
}
export interface LoginResponse { token: string; expiresAt: string; user: UserProfileDto; }

// ── Tables ────────────────────────────────────────────────────────────────────
export interface ActiveOrderSummary {
  id: number; status: string; orderType: string; subtotal: number; itemCount: number;
  pendingItems: number; preparingItems: number; readyItems: number;
}
export interface TableDto {
  id: number; number: number; seats: number; zone?: string; status: string;
  serverName?: string; occupiedSince?: string;
  activeOrderId?: number; activeOrderStatus?: string;
  activeOrders: ActiveOrderSummary[];
}

// ── Menu ──────────────────────────────────────────────────────────────────────
export interface MenuItemDto {
  id: number; name: string; category: string; price: number;
  isVeg: boolean; isPopular: boolean; isAvailable: boolean;
  description?: string; imageUrl?: string;
}

// ── Orders ────────────────────────────────────────────────────────────────────
export interface OrderItemDto {
  id: number; menuItemId: number; name: string; price: number;
  quantity: number; kitchenStatus: string; notes?: string;
}
export interface OrderDto {
  id: number; tableNumber: number; serverName: string;
  status: string; orderType: string; items: OrderItemDto[]; subtotal: number; createdAt: string;
}
export interface OrderItemRequest { menuItemId: number; quantity: number; notes?: string; }
export interface CreateOrderRequest { tableId: number; items: OrderItemRequest[]; orderType?: string; }

// ── Kitchen ───────────────────────────────────────────────────────────────────
export interface KdsItemDto { id: number; name: string; quantity: number; status: string; notes?: string; }
export interface KdsOrderDto {
  id: number; tableNumber: number; serverName: string;
  elapsed: string; isUrgent: boolean; orderStatus: string; items: KdsItemDto[];
}

// ── Billing ───────────────────────────────────────────────────────────────────
export interface BillItemDto { name: string; quantity: number; price: number; lineTotal: number; }
export interface BillDto {
  orderId: number; tableNumber: number; serverName: string; orderTime: string;
  items: BillItemDto[]; subtotal: number; tax: number; serviceCharge: number; total: number;
}
export interface ProcessPaymentRequest { method: string; discountPercent: number; cashReceived?: number; }
export interface PaymentResultDto { paymentId: number; totalCharged: number; changeGiven?: number; method: string; }

// ── Billing History ───────────────────────────────────────────────────────────
export interface PaymentHistoryDto {
  paymentId: number; orderId: number; tableNumber: number; serverName: string;
  orderType: string; method: string; subtotal: number; taxAmount: number; serviceCharge: number;
  discountAmount: number; totalAmount: number; processedAt: string;
  items: BillItemDto[];
}

// ── Split Bill ────────────────────────────────────────────────────────────────
export interface SplitBillRequest { splitCount: number; method: string; discountPercent: number; }
export interface SplitPersonDto { personNumber: number; amount: number; }
export interface SplitBillResultDto { splitCount: number; totalAmount: number; amountPerPerson: number; splits: SplitPersonDto[]; }

// ── Menu management ───────────────────────────────────────────────────────────
export interface CreateMenuItemRequest {
  name: string; category: string; price: number;
  isVeg: boolean; isPopular: boolean; isAvailable: boolean; description?: string;
}

// ── Tables management ─────────────────────────────────────────────────────────
export interface CreateTableRequest { number: number; seats: number; zone: string; }

// ── Investment ────────────────────────────────────────────────────────────────
export interface InvestmentDto {
  id: number; category: string; description: string; amount: number;
  date: string; createdByName: string;
}
export interface InvestmentCategoryDto { category: string; amount: number; count: number; }
export interface InvestmentSummaryDto {
  totalInvestment: number; totalRevenue: number; profit: number;
  byCategory: InvestmentCategoryDto[];
}
export interface CreateInvestmentRequest {
  category: string; description: string; amount: number; date: string;
}

// ── Staff ─────────────────────────────────────────────────────────────────────
export interface StaffDto {
  id: number; name: string; email: string; role: string; avatar: string;
  isActive: boolean; plainPassword?: string; customPermissions?: string;
}
export interface CreateStaffRequest {
  name: string; email: string; password: string; role: string; avatar?: string;
}
export interface UpdateStaffRequest {
  name: string; email: string; password?: string; role: string; avatar?: string;
  isActive: boolean; customPermissions?: string;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export interface KpiDto { value: string; change: string; isUp: boolean; }
export interface DashboardSummaryDto {
  revenue: KpiDto; totalOrders: KpiDto; activeTables: KpiDto; avgOrderTime: KpiDto;
}
export interface TableStatusSummaryDto {
  available: number; occupied: number; reserved: number; billing: number; dirty: number; total: number;
}
export interface TopMenuItemDto { name: string; orderCount: number; revenue: number; }
export interface TopStaffDto { name: string; role: string; avatar: string; orderCount: number; totalSales: number; }
export interface OrderTypeBreakdownDto {
  dineIn: number; dineInCount: number;
  takeaway: number; takeawayCount: number;
  online: number; onlineCount: number;
}
