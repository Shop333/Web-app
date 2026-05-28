/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { Product, Category, Transaction, Customer, User, StoreSettings, CartItem } from './types.js';

interface POSState {
  // Master Lists
  products: Product[];
  categories: Category[];
  customers: Customer[];
  users: User[];
  settings: StoreSettings | null;
  transactions: Transaction[];
  
  // Active POS Cart
  cart: CartItem[];
  cartCustomer: Customer | null;
  cartDiscount: number;
  cartDiscountType: 'nominal' | 'percent';
  isTaxEnabled: boolean;
  activeCashier: User | null;
  
  // Dashboard Metrics & Chart data caching
  summaryMetrics: any;
  reportData: any;
  loading: Record<string, boolean>;
  error: string | null;

  // Actions
  setLoading: (key: string, val: boolean) => void;
  setError: (err: string | null) => void;
  
  // Authentication Session
  setActiveCashier: (user: User | null) => void;

  // Sync Master Data
  fetchProducts: () => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<boolean>;
  updateProduct: (id: number, product: Product) => Promise<boolean>;
  deleteProduct: (id: number) => Promise<boolean>;
  importProducts: (products: any[]) => Promise<boolean>;

  fetchCategories: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<boolean>;
  updateCategory: (id: number, category: Category) => Promise<boolean>;
  deleteCategory: (id: number) => Promise<boolean>;

  fetchCustomers: () => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<boolean>;
  updateCustomer: (id: number, customer: Customer) => Promise<boolean>;
  deleteCustomer: (id: number) => Promise<boolean>;

  fetchUsers: () => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<boolean>;
  updateUser: (id: number, user: User) => Promise<boolean>;
  deleteUser: (id: number) => Promise<boolean>;

  fetchSettings: () => Promise<void>;
  updateSettings: (settings: Record<string, string>) => Promise<boolean>;
  resetDatabase: () => Promise<boolean>;

  // Transaction Actions
  fetchTransactions: () => Promise<void>;
  createTransaction: (txData: any) => Promise<Transaction | null>;
  voidTransaction: (id: number) => Promise<boolean>;

  // Reports
  fetchSummaryMetrics: () => Promise<void>;
  fetchReportData: (range: string) => Promise<void>;

  // POS operations
  addToCart: (product: Product, qty?: number) => void;
  removeFromCart: (productId: number) => void;
  updateCartQty: (productId: number, qty: number) => void;
  updateItemDiscount: (productId: number, discountAmount: number) => void;
  clearCart: () => void;
  setCartCustomer: (customer: Customer | null) => void;
  setCartDiscount: (amount: number, type: 'nominal' | 'percent') => void;
  setTaxEnabled: (enabled: boolean) => void;
}

export const useStore = create<POSState>((set, get) => {
  const getHeaders = () => ({ 'Content-Type': 'application/json' });

  return {
    products: [],
    categories: [],
    customers: [],
    users: [],
    settings: null,
    transactions: [],
    
    cart: [],
    cartCustomer: null,
    cartDiscount: 0,
    cartDiscountType: 'nominal',
    isTaxEnabled: true,
    activeCashier: null,

    summaryMetrics: null,
    reportData: null,
    loading: {},
    error: null,

    setLoading: (key, val) => set((state) => ({ loading: { ...state.loading, [key]: val } })),
    setError: (err) => set({ error: err }),
    
    setActiveCashier: (user) => set({ activeCashier: user }),

    fetchProducts: async () => {
      get().setLoading('products', true);
      try {
        const res = await fetch('/api/products');
        const json = await res.json();
        if (json.success) set({ products: json.data });
        else set({ error: json.error });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('products', false);
      }
    },

    addProduct: async (prod) => {
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(prod)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchProducts();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    updateProduct: async (id, prod) => {
      try {
        const res = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(prod)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchProducts();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    deleteProduct: async (id) => {
      try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await get().fetchProducts();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    importProducts: async (productsList) => {
      try {
        const res = await fetch('/api/products/import', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ products: productsList })
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchProducts();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchCategories: async () => {
      get().setLoading('categories', true);
      try {
        const res = await fetch('/api/categories');
        const json = await res.json();
        if (json.success) set({ categories: json.data });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('categories', false);
      }
    },

    addCategory: async (cat) => {
      try {
        const res = await fetch('/api/categories', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(cat)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchCategories();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    updateCategory: async (id, cat) => {
      try {
        const res = await fetch(`/api/categories/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(cat)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchCategories();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    deleteCategory: async (id) => {
      try {
        const res = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await get().fetchCategories();
          await get().fetchProducts(); // categories unbind from products
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchCustomers: async () => {
      get().setLoading('customers', true);
      try {
        const res = await fetch('/api/customers');
        const json = await res.json();
        if (json.success) set({ customers: json.data });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('customers', false);
      }
    },

    addCustomer: async (cust) => {
      try {
        const res = await fetch('/api/customers', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(cust)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchCustomers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    updateCustomer: async (id, cust) => {
      try {
        const res = await fetch(`/api/customers/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(cust)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchCustomers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    deleteCustomer: async (id) => {
      try {
        const res = await fetch(`/api/customers/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await get().fetchCustomers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchUsers: async () => {
      get().setLoading('users', true);
      try {
        const res = await fetch('/api/users');
        const json = await res.json();
        if (json.success) set({ users: json.data });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('users', false);
      }
    },

    addUser: async (user) => {
      try {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(user)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchUsers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    updateUser: async (id, user) => {
      try {
        const res = await fetch(`/api/users/${id}`, {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(user)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchUsers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    deleteUser: async (id) => {
      try {
        const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
        const json = await res.json();
        if (json.success) {
          await get().fetchUsers();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchSettings: async () => {
      get().setLoading('settings', true);
      try {
        const res = await fetch('/api/settings');
        const json = await res.json();
        if (json.success) {
          const config: StoreSettings = {
            store_name: json.data.store_name || 'Toko Berkah Utama',
            store_address: json.data.store_address || 'Jl. Jenderal Sudirman No. 42',
            store_phone: json.data.store_phone || '08xxxxxxxxxx',
            tax_rate: parseFloat(json.data.tax_rate) || 11,
            currency: json.data.currency || 'Rp',
            receipt_footer: json.data.receipt_footer || 'Terima kasih!',
            low_stock_alert: parseInt(json.data.low_stock_alert) || 5
          };
          set({ settings: config, isTaxEnabled: true });
        }
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('settings', false);
      }
    },

    updateSettings: async (settingsMap) => {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(settingsMap)
        });
        const json = await res.json();
        if (json.success) {
          await get().fetchSettings();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    resetDatabase: async () => {
      try {
        const res = await fetch('/api/settings/reset-database', { method: 'POST' });
        const json = await res.json();
        if (json.success) {
          get().clearCart();
          await get().fetchProducts();
          await get().fetchTransactions();
          await get().fetchSummaryMetrics();
          await get().fetchReportData('today');
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchTransactions: async () => {
      get().setLoading('transactions', true);
      try {
        const res = await fetch('/api/transactions');
        const json = await res.json();
        if (json.success) set({ transactions: json.data });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('transactions', false);
      }
    },

    createTransaction: async (txData) => {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(txData)
        });
        const json = await res.json();
        if (json.success) {
          get().clearCart();
          await get().fetchProducts(); // reload stocks
          await get().fetchTransactions();
          await get().fetchSummaryMetrics();
          return json.data;
        } else {
          set({ error: json.error });
          return null;
        }
      } catch (err: any) {
        set({ error: err.message });
        return null;
      }
    },

    voidTransaction: async (id) => {
      try {
        const res = await fetch(`/api/transactions/${id}/void`, { method: 'PUT' });
        const json = await res.json();
        if (json.success) {
          await get().fetchTransactions();
          await get().fetchProducts();
          await get().fetchSummaryMetrics();
          return true;
        } else {
          set({ error: json.error });
          return false;
        }
      } catch (err: any) {
        set({ error: err.message });
        return false;
      }
    },

    fetchSummaryMetrics: async () => {
      try {
        const res = await fetch('/api/reports/summary');
        const json = await res.json();
        if (json.success) set({ summaryMetrics: json.data });
      } catch (err: any) {
        console.error("Failed to fetch reports cards", err);
      }
    },

    fetchReportData: async (range) => {
      get().setLoading('reports', true);
      try {
        const res = await fetch(`/api/reports/sales?range=${range}`);
        const json = await res.json();
        if (json.success) set({ reportData: json.data });
      } catch (err: any) {
        set({ error: err.message });
      } finally {
        get().setLoading('reports', false);
      }
    },

    // Cart Handlers
    addToCart: (product, qty = 1) => {
      const { cart } = get();
      const existing = cart.find(x => x.product.id === product.id);
      
      if (existing) {
        // Increment quantity up to stock
        const newQty = existing.quantity + qty;
        if (newQty <= (product.stock || 0) + 10) { // buffer to let sell happen if warning active
          get().updateCartQty(product.id!, newQty);
        }
      } else {
        set({ cart: [...cart, { product, quantity: qty, discount: 0 }] });
      }
    },

    removeFromCart: (productId) => {
      const { cart } = get();
      set({ cart: cart.filter(x => x.product.id !== productId) });
    },

    updateCartQty: (productId, qty) => {
      const { cart } = get();
      if (qty <= 0) {
        get().removeFromCart(productId);
      } else {
        set({
          cart: cart.map(x => 
            x.product.id === productId ? { ...x, quantity: qty } : x
          )
        });
      }
    },

    updateItemDiscount: (productId, amount) => {
      const { cart } = get();
      set({
        cart: cart.map(x => 
          x.product.id === productId ? { ...x, discount: Math.max(0, amount) } : x
        )
      });
    },

    clearCart: () => {
      set({
        cart: [],
        cartCustomer: null,
        cartDiscount: 0,
        cartDiscountType: 'nominal'
      });
    },

    setCartCustomer: (customer) => set({ cartCustomer: customer }),

    setCartDiscount: (amount, type) => set({ cartDiscount: amount, cartDiscountType: type }),

    setTaxEnabled: (enabled) => set({ isTaxEnabled: enabled })
  };
});
