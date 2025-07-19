// Local storage utilities for demo
// In production, this would use a proper database

export interface Employee {
  id: string;
  name: string;
  role: string;
  dailyWage: number;
  phone: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  notes: string;
  createdAt: string;
}

export interface QuotationItem {
  id: string;
  description: string;
  qty: string;
  rate: string;
  amount: number;
}

export interface Quotation {
  id: string;
  quotationNo: string;
  date: string;
  client: string;
  contact: string;
  project: string;
  location: string;
  trn: string;
  items: QuotationItem[];
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  grandTotal: number;
  amountInWords: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  invoiceNo: string;
  date: string;
  dueDate: string;
  client: string;
  contact: string;
  project: string;
  location: string;
  trn: string;
  items: QuotationItem[];
  subtotal: number;
  vatPercentage: number;
  vatAmount: number;
  grandTotal: number;
  amountInWords: string;
  paymentStatus: 'paid' | 'partial' | 'pending';
  paidAmount: number;
  balanceAmount: number;
  createdAt: string;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNo: string;
  paymentDate: string;
  method: string;
  amount: number;
  notes: string;
  createdAt: string;
}

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // Format: "YYYY-MM" (e.g., "2025-03")
  monthDisplay: string; // Format: "March 2025"
  daysWorked: number;
  dailyWage: number;
  monthlyWage: number;
  createdAt: string;
}

// Generic storage functions
export const getStorageData = <T>(key: string): T[] => {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : [];
};

export const setStorageData = <T>(key: string, data: T[]): void => {
  localStorage.setItem(key, JSON.stringify(data));
};

export const addItem = <T extends { id: string }>(key: string, item: T): void => {
  const items = getStorageData<T>(key);
  items.push(item);
  setStorageData(key, items);
};

export const updateItem = <T extends { id: string }>(key: string, id: string, updates: Partial<T>): void => {
  const items = getStorageData<T>(key);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    items[index] = { ...items[index], ...updates };
    setStorageData(key, items);
  }
};

export const deleteItem = <T extends { id: string }>(key: string, id: string): void => {
  const items = getStorageData<T>(key);
  const filtered = items.filter(item => item.id !== id);
  setStorageData(key, filtered);
};

// Specific storage keys
export const STORAGE_KEYS = {
  EMPLOYEES: 'employees',
  EXPENSES: 'expenses',
  QUOTATIONS: 'quotations',
  INVOICES: 'invoices',
  PAYMENTS: 'payments',
  ATTENDANCE: 'attendance'
} as const;