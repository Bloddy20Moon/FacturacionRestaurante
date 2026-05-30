export type PaymentMethod = 'Cash' | 'Card' | 'Transfer';

export interface OpenOrder {
  orderId: number;
  tableId: number;
  tableName: string;
  openedAtUtc: string;
  itemCount: number;
}

export interface TableStatus {
  tableId: number;
  tableName: string;
  isActive: boolean;
  openOrderId?: number;
}

export interface MenuProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  imageUrl?: string;
}

export interface DashboardSummary {
  year: number;
  month: number;
  revenueMonth: number;
  ticketsIssued: number;
  openOrders: number;
  revenueByDay: { day: number; totalRevenue: number }[];
}

export interface PrebillItem {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface PrebillResult {
  orderId: number;
  tableName: string;
  appliedDiscountCode?: string;
  paymentMethod: PaymentMethod;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  serviceChargeAmount: number;
  total: number;
  items: PrebillItem[];
}

export interface CloseOrderResult {
  orderId: number;
  documentNumber: string;
  paymentMethod: PaymentMethod;
  closedAtUtc: string;
  total: number;
}

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}
