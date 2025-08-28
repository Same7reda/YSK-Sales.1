
export interface Product {
  id: string;
  name: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  unit: string;
  supplier?: string;
  productionDate?: string;
  expiryDate?: string;
  barcode: string;
  isComposite?: boolean;
  compositeItems?: { productId: string; quantity: number }[];
}

export interface Transaction {
  id: string;
  type: 'invoice' | 'payment' | 'return';
  date: string;
  amount: number; // positive for invoice total, positive for payment amount, positive for return amount
  notes: string;
  returnedItems?: InvoiceItem[];
}

export interface CustomerGroup {
  id: string;
  name: string;
  discountPercentage: number;
}

export interface Customer {
  id:string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  debt: number;
  address?: string;
  notes?: string;
  groupId?: string;
  groupName?: string;
  transactions: Transaction[];
}

export interface InvoiceItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  isNew?: boolean; // Temporary flag for new products in purchase invoices
  returnedQuantity?: number;
}

export interface Invoice {
  id: string;
  customerName: string;
  customerId?: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  tax: {
    type: 'percentage' | 'fixed';
    value: number;
  };
  total: number;
  paymentMethod: 'cash' | 'credit' | 'partial';
  paidAmount: number;
  dueAmount: number;
  date: string;
  status: 'paid' | 'partial' | 'due' | 'returned' | 'partially_returned';
  bookingId?: string;
  returnedAmount?: number;
  couponCode?: string;
}

export interface Expense {
  id: string;
  type: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface SupplierTransaction {
  id: string;
  type: 'purchase' | 'payment';
  date: string;
  amount: number;
  notes: string;
}

export interface Supplier {
  id:string;
  name: string;
  phone: string;
  notes?: string;
  debt: number;
  transactions: SupplierTransaction[];
}

export interface PurchaseInvoice {
    id: string;
    supplierId: string;
    supplierName: string;
    items: InvoiceItem[];
    total: number;
    paymentMethod: 'cash' | 'credit' | 'partial';
    paidAmount: number;
    dueAmount: number;
    date: string;
}

export interface BookingItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface Booking {
  id: string;
  customerId: string;
  customerName: string;
  items: BookingItem[];
  bookingDate: string; // ISO string for date and time
  status: 'confirmed' | 'completed' | 'canceled';
  deposit: number;
  notes?: string;
}

export interface PurchaseOrder {
    id: string;
    supplierId: string;
    supplierName: string;
    items: InvoiceItem[];
    total: number;
    status: 'pending' | 'partially_received' | 'received' | 'canceled';
    orderDate: string;
    expectedDate: string;
    notes?: string;
}

export interface StockTakeItem {
    productId: string;
    productName: string;
    expected: number;
    counted: number;
    difference: number;
    costAtTime: number;
    isCounted: boolean;
}

export interface StockTake {
    id: string;
    date: string;
    items: StockTakeItem[];
    status: 'in_progress' | 'completed';
    notes?: string;
    isBlind?: boolean;
    discrepancyValue?: {
        shortage: number;
        overage: number;
    };
}

export interface Coupon {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    expiryDate: string;
    isActive: boolean;
}

export type Page = 'dashboard' | 'inventory' | 'pos' | 'invoices' | 'customers' | 'expenses' | 'suppliers' | 'bookings' | 'reports' | 'settings' | 'audit_log' | 'purchase_orders' | 'stock_take' | 'coupons';

// New advanced permission types
export interface PagePermissions {
  view: boolean;
  edit: boolean;
  delete: boolean;
  print: boolean;
}

// FIX: The UserPermissions type was inconsistent with its usage. It has been updated to a simpler model
// that matches the existing implementation and resolves type errors.
export interface UserPermissions {
    visiblePages: Page[];
    canEditData: boolean;
    maxDiscountPercentage: number;
    canUseAssistant: boolean;
}


export interface User {
  id: string;
  username: string;
  passwordHash: string;
  securityQuestion: string;
  securityAnswer: string;
  fullName: string;
  phone: string;
  email: string;
  jobTitle: string;
  avatarUrl: string; // data URL
  permissions: UserPermissions;
  isAdmin: boolean;
  isActive: boolean;
}

export interface NotificationSettings {
  lowStockThreshold: number;
  bookingReminderDays: number;
  customerDebtThreshold: number;
  supplierDueThreshold: number;
  expiryReminderDays: number;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// --- Activation System Types ---
export interface FirebaseActivationConfig {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
}

export interface ActivationData {
  key: string;
  deviceId: string;
  activatedAt: number;
  lastUsedDate: number;
  expiryDate: number;
}

// --- Invoice Customization Types ---
export interface InvoiceSettings {
  logo: string; // data URL
  shopName: string;
  phone: string;
  address: string;
  footerMessage: string;
  footerImage: string; // data URL
  secondaryFooterMessage: string;
  fontSizes: {
    header: number;
    body: number;
    totals: number;
  };
  logoSize: number; // in pixels
  footerImageSize: number; // in pixels
}

export interface PrintSettings {
  defaultFormat: 'a4' | '80mm' | '58mm';
  autoPrint: boolean;
}

// --- Audit Log Types ---
export interface AuditLogEntry {
    id: string;
    timestamp: string;
    userId: string;
    username: string;
    actionType: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PAYMENT';
    entityType: string; // e.g., 'Product', 'Customer', 'Invoice'
    entityId?: string;
    details: string;
}