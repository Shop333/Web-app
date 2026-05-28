/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Category {
  id?: number;
  name: string;
  color: string;
  icon: string;
  created_at?: string;
  product_count?: number; // computed helper
}

export interface Product {
  id?: number;
  name: string;
  sku: string;
  barcode?: string;
  category_id?: number | null;
  category_name?: string; // computed helper
  price: number;
  cost_price: number;
  stock: number;
  min_stock: number;
  unit: string;
  image_url?: string;
  description?: string;
  is_active: number; // 0 or 1 for SQLite boolean representation
  created_at?: string;
  updated_at?: string;
}

export interface Transaction {
  id?: number;
  invoice_number: string;
  customer_id?: number | null;
  customer_name?: string;
  subtotal: number;
  discount: number;
  discount_type: 'nominal' | 'percent';
  tax: number;
  tax_rate: number;
  total: number;
  paid_amount: number;
  change_amount: number;
  payment_method: 'cash' | 'transfer' | 'qris' | 'card';
  status: 'completed' | 'voided';
  note?: string;
  cashier_id?: number;
  cashier_name?: string;
  created_at?: string;
  items?: TransactionItem[];
}

export interface TransactionItem {
  id?: number;
  transaction_id?: number;
  product_id: number;
  product_name: string;
  product_sku?: string;
  quantity: number;
  unit_price: number;
  discount: number; // item-level discount in amount (Rupiah)
  subtotal: number;
}

export interface Customer {
  id?: number;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  total_transactions?: number;
  total_spent?: number;
  created_at?: string;
}

export interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'cashier';
  is_active?: number; // 0 or 1
  created_at?: string;
}

export interface StoreSettings {
  store_name: string;
  store_address: string;
  store_phone: string;
  tax_rate: number;
  currency: string;
  receipt_footer: string;
  low_stock_alert: number;
}

// Client Cart representation
export interface CartItem {
  product: Product;
  quantity: number;
  discount: number; // total discount for this row or per-item
}
