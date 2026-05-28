/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { formatRupiah, calculateChange } from '../../lib/utils.js';
import { Product, Customer } from '../types.js';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Users,
  CreditCard,
  QrCode,
  DollarSign,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X,
  Printer
} from 'lucide-react';

export default function KasirView() {
  const {
    products,
    categories,
    customers,
    settings,
    cart,
    cartCustomer,
    cartDiscount,
    cartDiscountType,
    isTaxEnabled, 
    activeCashier,
    addToCart,
    removeFromCart,
    updateCartQty,
    updateItemDiscount,
    clearCart,
    setCartCustomer,
    setCartDiscount,
    setTaxEnabled,
    fetchProducts,
    fetchCategories,
    fetchCustomers,
    fetchSettings,
    createTransaction
  } = useStore();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  
  // Checkout controls
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer' | 'qris' | 'card'>('cash');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustDropdown, setShowCustDropdown] = useState(false);
  const [note, setNote] = useState('');

  // Individual item discount editing states
  const [editingDiscountId, setEditingDiscountId] = useState<number | null>(null);
  const [tempDiscountVal, setTempDiscountVal] = useState<string>('');

  // Manual Quantity input cache
  const [editingQtyId, setEditingQtyId] = useState<number | null>(null);
  const [tempQtyVal, setTempQtyVal] = useState<string>('');

  // Finished dialog helper
  const [completedTx, setCompletedTx] = useState<any | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  // Refs for focusing
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cashInputRef = useRef<HTMLInputElement>(null);
  
  // Print container reference
  const printRef = useRef<HTMLDivElement>(null);

  // Load backend master lists
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchCustomers();
    fetchSettings();
  }, [fetchProducts, fetchCategories, fetchCustomers, fetchSettings]);

  // Handle Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F2: Pay / Open checkout drawer
      if (e.key === 'F2') {
        e.preventDefault();
        if (cart.length > 0) {
          triggerCheckoutModal();
        }
      }
      // ESC: Close Modals or Clear cart
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showPaymentModal) {
          setShowPaymentModal(false);
        } else if (completedTx) {
          setCompletedTx(null);
        } else {
          clearCart();
        }
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [cart, showPaymentModal, completedTx]);

  // Open Payment dialog and pre-calculate cash suggested amount
  const triggerCheckoutModal = () => {
    setLocalError(null);
    const totals = getCartTotals();
    setPaidAmount(String(totals.total)); // Suggest exactly fitting cash payment
    setShowPaymentModal(true);
    setTimeout(() => {
      cashInputRef.current?.focus();
      cashInputRef.current?.select();
    }, 150);
  };

  // Computations for Cartesian Basket totals
  const getCartTotals = () => {
    let subtotal = 0;
    cart.forEach(item => {
      // Cart logic: subtotal for this item-row is (price * qty) - itemDiscount
      const itemRowSub = (item.product.price * item.quantity) - (item.discount || 0);
      subtotal += Math.max(0, itemRowSub);
    });

    // Subtotal after overall discount
    let overallDiscountVal = cartDiscount;
    if (cartDiscountType === 'percent') {
      overallDiscountVal = Math.round((subtotal * cartDiscount) / 100);
    }
    const afterDiscount = Math.max(0, subtotal - overallDiscountVal);

    // Dynamic taxes (PPN)
    const taxRatePercent = settings?.tax_rate || 11;
    const taxVal = isTaxEnabled ? Math.round((afterDiscount * taxRatePercent) / 100) : 0;

    const totalVal = afterDiscount + taxVal;

    return {
      itemsCount: cart.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      overallDiscountValue: overallDiscountVal,
      tax: taxVal,
      total: totalVal
    };
  };

  const totals = getCartTotals();

  // Search/Filter matching products
  const filteredProducts = products.filter(p => {
    if (p.is_active !== 1) return false;
    
    // By Category Tab
    if (selectedCategory !== null && p.category_id !== selectedCategory) return false;
    
    // By Text criteria (name, sku, barcode)
    if (search.trim()) {
      const criteria = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(criteria) ||
        p.sku.toLowerCase().includes(criteria) ||
        (p.barcode && p.barcode.toLowerCase().includes(criteria))
      );
    }
    return true;
  });

  // Hot Product Scanning action (if exact SKU/Barcode is matched, automatically put to cart)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    const cleanScan = val.trim();
    if (cleanScan.length >= 4) {
      const match = products.find(p => p.is_active === 1 && (p.sku === cleanScan || p.barcode === cleanScan));
      if (match) {
        addToCart(match);
        setSearch(''); // Flush search box
      }
    }
  };

  // Submit actual cart block to DB
  const executePayment = async () => {
    setLocalError(null);
    const paidNum = parseFloat(paidAmount) || 0;
    if (paymentMethod === 'cash' && paidNum < totals.total) {
      setLocalError(`Nominal pembayaran tunai kurang dari total belanja (${formatRupiah(totals.total)})`);
      return;
    }

    const txData = {
      customer_id: cartCustomer ? cartCustomer.id : null,
      customer_name: cartCustomer ? cartCustomer.name : 'Pelanggan Umum',
      subtotal: totals.subtotal,
      discount: totals.overallDiscountValue,
      discount_type: cartDiscountType,
      tax: totals.tax,
      tax_rate: settings?.tax_rate || 11,
      total: totals.total,
      paid_amount: paymentMethod === 'cash' ? paidNum : totals.total,
      change_amount: paymentMethod === 'cash' ? calculateChange(totals.total, paidNum) : 0,
      payment_method: paymentMethod,
      note: note || 'Pembelian kasir POS',
      cashier_id: activeCashier ? activeCashier.id : 1,
      cashier_name: activeCashier ? activeCashier.name : 'Kasir',
      items: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount: item.discount,
        subtotal: (item.product.price * item.quantity) - (item.discount || 0)
      }))
    };

    const result = await createTransaction(txData);
    if (result) {
      setCompletedTx(result);
      setShowPaymentModal(false);
      setNote('');
    } else {
      setLocalError(useStore.getState().error || 'Gagal memproses transaksi pada server. Periksa koneksi lokal Anda.');
    }
  };

  // Receipt HTML printing
  const printReceipt = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;
    const originalContent = document.body.innerHTML;

    // Use iframe or simple window document rewrite
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Cetak Struk Belanja</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11.5px;
                color: #000;
                margin: 0;
                padding: 10px;
                width: 76mm; /* thermal width standard */
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .divider { border-top: 1px dashed #000; margin: 6px 0; }
              .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
              .item-name { flex: 1; margin-right: 10px; }
              .item-price { min-width: 60px; text-align: right; }
              .item-qty { min-width: 35px; }
              .bold { font-weight: bold; }
              .title { font-size: 14px; font-weight: bold; margin-bottom: 3px; }
              .meta-sec { font-size: 11px; margin-bottom: 4px; }
            </style>
          </head>
          <body>
            ${printContent}
            <script>
              window.onload = function() {
                window.print();
                setTimeout(() => { window.parent.document.body.removeChild(window.frameElement); }, 100);
              }
            </script>
          </body>
        </html>
      `);
      doc.close();
    }
  };

  // Find Customer list suggestions
  const activeCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
    (c.phone && c.phone.includes(customerSearch))
  );

  return (
    <div className="h-[calc(100vh-5rem)] flex gap-4 overflow-hidden select-none animate-in fade-in duration-200">
      
      {/* LEFT COLUMN: Catalog panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-900 border border-slate-800 rounded-2xl p-4 overflow-hidden">
        
        {/* Dynamic searchable inputs */}
        <div className="relative mb-3.5">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-450" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Cari produk berdasarkan Nama, SKU, atau Scan Barcode... [F1]"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800/80 border border-slate-750 text-slate-100 placeholder-slate-450 text-xs focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories filters (Chips) */}
        <div className="flex gap-2 pb-3 mb-1 overflow-x-auto scrollbar-thin shrink-0 select-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors ${
              selectedCategory === null 
                ? 'bg-indigo-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
            }`}
          >
            Semua Produk
          </button>
          {categories.map((c) => {
            const isSel = selectedCategory === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id!)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer shrink-0 transition-colors flex items-center gap-1.5 ${
                  isSel 
                    ? 'text-white' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-750 hover:text-slate-200'
                }`}
                style={isSel ? { backgroundColor: c.color } : undefined}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </button>
            );
          })}
        </div>

        {/* Products Catalog list */}
        <div className="flex-1 overflow-y-auto scrollbar-thin select-none pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-slate-500 gap-2">
              <AlertCircle className="w-8 h-8 text-slate-600" />
              <p className="text-xs">Tidak ada produk aktif yang cocok.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.stock <= 0;
                return (
                  <button
                    key={p.id}
                    disabled={isOutOfStock}
                    onClick={() => addToCart(p)}
                    className={`flex flex-col text-left bg-slate-850 hover:bg-slate-800 border rounded-xl overflow-hidden cursor-pointer transition-all duration-150 hover:scale-102 focus:outline-hidden relative group select-none ${
                      isOutOfStock 
                        ? 'opacity-50 border-slate-850 cursor-not-allowed'
                        : p.stock <= p.min_stock 
                          ? 'border-amber-500/50' 
                          : 'border-slate-800/80 hover:border-slate-700/80'
                    }`}
                  >
                    {/* Placeholder image representation with Indigo-grade aesthetics */}
                    <div className="h-24 w-full bg-slate-800 flex items-center justify-center relative overflow-hidden shrink-0">
                      {p.image_url ? (
                        <img 
                          src={p.image_url} 
                          alt={p.name} 
                          className="object-cover w-full h-full"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-radial from-slate-800 to-slate-850 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase font-mono">
                            {p.sku.substring(4, 8) || 'UNIT'}
                          </span>
                        </div>
                      )}
                      
                      {/* Out of Stock banner */}
                      {isOutOfStock ? (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                          <span className="text-[10px] font-bold bg-rose-600/90 text-white px-2 py-1 rounded-sm tracking-wider uppercase">
                            HABIS
                          </span>
                        </div>
                      ) : p.stock <= p.min_stock ? (
                        <div className="absolute top-2 right-2 bg-amber-600/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm">
                          LIMIT
                        </div>
                      ) : null}
                    </div>

                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[9px] text-indigo-400 font-mono font-bold tracking-wider block">
                          {p.sku}
                        </span>
                        <h4 className="text-[11px] font-semibold text-slate-100 truncate mt-0.5 group-hover:text-indigo-400 transition-colors">
                          {p.name}
                        </h4>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                        <span className="text-xs font-bold font-mono text-emerald-400">
                          {formatRupiah(p.price)}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          Stok: <strong className={p.stock <= p.min_stock ? 'text-amber-400' : 'text-slate-300'}>{p.stock}</strong>
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart pane */}
      <div className="w-[360px] bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between overflow-hidden shrink-0 select-none">
        
        {/* Cart Header */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-800 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-indigo-400" />
            <span className="text-xs font-bold text-slate-200">Keranjang Belanja</span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Bersihkan
            </button>
          )}
        </div>

        {/* Cart List Node Container */}
        <div className="flex-1 overflow-y-auto scrollbar-thin select-none py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2">
              <ShoppingCart className="w-10 h-10 text-slate-700/80" />
              <p className="text-xs">Keranjang masih kosong.</p>
              <p className="text-[10px] text-slate-500">Klik produk sebelah kiri untuk menambahkan pembelian.</p>
            </div>
          ) : (
            cart.map((item) => {
              const itemRowSubtotal = (item.product.price * item.quantity) - (item.discount || 0);
              return (
                <div 
                  key={item.product.id} 
                  className="bg-slate-850 border border-slate-800 rounded-xl p-2.5 space-y-2 relative group"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono text-indigo-400 tracking-wider">
                        {item.product.sku}
                      </span>
                      <h5 className="text-[11px] font-semibold text-slate-200 truncate leading-tight">
                        {item.product.name}
                      </h5>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.product.id!)}
                      className="text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quantity and Line Discount adjustments */}
                  <div className="flex justify-between items-center gap-1">
                    
                    {/* Manual / Auto Quantity adjustment */}
                    <div className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 px-1.5 py-1 rounded-lg border border-slate-700/80">
                      <button
                        onClick={() => updateCartQty(item.product.id!, item.quantity - 1)}
                        className="p-1 rounded bg-slate-700 text-slate-200 hover:bg-indigo-600 cursor-pointer hover:text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      
                      {editingQtyId === item.product.id ? (
                        <input
                          type="number"
                          value={tempQtyVal}
                          onChange={(e) => setTempQtyVal(e.target.value)}
                          onBlur={() => {
                            const parsed = parseInt(tempQtyVal);
                            if (!isNaN(parsed) && parsed > 0) {
                              updateCartQty(item.product.id!, parsed);
                            } else {
                              updateCartQty(item.product.id!, 1);
                            }
                            setEditingQtyId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const parsed = parseInt(tempQtyVal);
                              if (!isNaN(parsed) && parsed > 0) {
                                updateCartQty(item.product.id!, parsed);
                              }
                              setEditingQtyId(null);
                            }
                          }}
                          className="w-10 bg-slate-900 border border-slate-700 text-center font-mono text-xs text-white rounded focus:outline-hidden"
                          autoFocus
                        />
                      ) : (
                        <span 
                          onClick={() => {
                            setEditingQtyId(item.product.id!);
                            setTempQtyVal(String(item.quantity));
                          }}
                          className="w-8 text-center font-medium font-mono text-xs text-slate-100 cursor-pointer hover:underline"
                        >
                          {item.quantity}
                        </span>
                      )}

                      <button
                        onClick={() => updateCartQty(item.product.id!, item.quantity + 1)}
                        className="p-1 rounded bg-slate-700 text-slate-200 hover:bg-indigo-600 cursor-pointer hover:text-white"
                        disabled={item.quantity >= item.product.stock}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {item.product.unit}
                      </span>
                    </div>

                    {/* Inline item discount widget */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex flex-col text-right">
                        {item.discount > 0 && (
                          <span className="text-[9px] font-mono text-rose-400 tracking-tight line-through">
                            {formatRupiah(item.product.price * item.quantity)}
                          </span>
                        )}
                        <span className="text-xs font-bold font-mono text-slate-100">
                          {formatRupiah(itemRowSubtotal)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Set custom individual row discount */}
                  <div className="pt-1 border-t border-slate-800/40 flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-normal">Diskon Item:</span>
                    <div>
                      {editingDiscountId === item.product.id ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            value={tempDiscountVal}
                            placeholder="Nominal"
                            onChange={(e) => setTempDiscountVal(e.target.value)}
                            onBlur={() => {
                              const disc = parseFloat(tempDiscountVal) || 0;
                              updateItemDiscount(item.product.id!, disc);
                              setEditingDiscountId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const disc = parseFloat(tempDiscountVal) || 0;
                                updateItemDiscount(item.product.id!, disc);
                                setEditingDiscountId(null);
                              }
                            }}
                            className="w-16 bg-slate-900 text-right font-mono text-[10px] border border-slate-700 text-white rounded px-1 px-py-0.5"
                            autoFocus
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingDiscountId(item.product.id!);
                            setTempDiscountVal(String(item.discount || ''));
                          }}
                          className="text-[10px] text-indigo-400 hover:underline cursor-pointer select-none"
                        >
                          {item.discount > 0 ? `-${formatRupiah(item.discount)}` : 'Set Diskon'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Totalizing controls / attributes */}
        <div className="border-t border-slate-800 pt-3 space-y-2 shrink-0 select-none">
          
          {/* Discount overall and PPN toggle */}
          <div className="grid grid-cols-2 gap-2">
            
            {/* Overall store discount */}
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800">
              <label className="text-[10px] font-medium text-slate-400 block mb-1">Diskon Global</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  placeholder="IDR / %"
                  value={cartDiscount || ''}
                  onChange={(e) => setCartDiscount(parseFloat(e.target.value) || 0, cartDiscountType)}
                  className="w-full bg-slate-900 border border-slate-750 font-mono text-[11px] text-slate-200 px-2 py-1 rounded"
                />
                <button
                  onClick={() => setCartDiscount(cartDiscount, cartDiscountType === 'nominal' ? 'percent' : 'nominal')}
                  className="px-1.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold font-mono text-[10px] rounded cursor-pointer border border-slate-750"
                  title="Ganti tipe diskon (nominal / %)"
                >
                  {cartDiscountType === 'nominal' ? 'Rp' : '%'}
                </button>
              </div>
            </div>

            {/* PPN Tax toggler */}
            <div className="bg-slate-850 p-2 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-medium text-slate-400">Pajak PPN ({settings?.tax_rate || 11}%)</span>
                <input
                  id="tax-toggle"
                  type="checkbox"
                  checked={isTaxEnabled}
                  onChange={(e) => setTaxEnabled(e.target.checked)}
                  className="w-3.5 h-3.5 accent-indigo-500 rounded cursor-pointer"
                />
              </div>
              <span className="text-[10px] font-mono text-slate-350 mt-1 block">
                {isTaxEnabled ? `+ ${formatRupiah(totals.tax)}` : 'Nonaktif'}
              </span>
            </div>
          </div>

          {/* Customer association */}
          <div className="bg-slate-850 p-2 rounded-xl border border-slate-800 relative">
            <label className="text-[10px] font-medium text-slate-400 flex items-center gap-1 mb-1">
              <Users className="w-3 h-3 text-indigo-400" /> Pelanggan / Kasir
            </label>
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="Pelanggan Umum..."
                value={cartCustomer ? cartCustomer.name : customerSearch}
                onChange={(e) => {
                  setCartCustomer(null);
                  setCustomerSearch(e.target.value);
                  setShowCustDropdown(true);
                }}
                onFocus={() => setShowCustDropdown(true)}
                className="w-full bg-slate-900 border border-slate-750 text-xs text-slate-200 px-2.5 py-1 rounded-lg"
              />
              {cartCustomer && (
                <button
                  onClick={() => {
                    setCartCustomer(null);
                    setCustomerSearch('');
                  }}
                  className="text-slate-400 hover:text-rose-400 text-xs px-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dynamic Customer suggestions dropdown */}
            {showCustDropdown && !cartCustomer && customerSearch.trim() && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setShowCustDropdown(false)}
                />
                <div className="absolute left-0 right-0 bottom-full mb-1 w-full bg-slate-850 border border-slate-750 rounded-lg shadow-xl py-1 z-40 max-h-36 overflow-y-auto scrollbar-thin">
                  {activeCustomers.length === 0 ? (
                    <div className="p-2 text-center text-slate-50 relative">
                      <p className="text-[10px] text-slate-400 mb-1">Pelanggan baru?</p>
                      <button
                        onClick={() => {
                          // Quick temporary guest customer allocation
                          setCartCustomer({ name: customerSearch });
                          setShowCustDropdown(false);
                        }}
                        className="text-[10px] text-indigo-400 underline font-semibold block mx-auto cursor-pointer"
                      >
                        Gunakan "{customerSearch}"
                      </button>
                    </div>
                  ) : (
                    activeCustomers.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setCartCustomer(c);
                          setShowCustDropdown(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-850 transition-colors border-b border-slate-800"
                      >
                        <div className="font-semibold">{c.name}</div>
                        <div className="text-[9px] text-slate-400">{c.phone || 'tanpa no.telp'}</div>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          {/* Subtotal & Final total calculation */}
          <div className="bg-slate-850 border border-slate-800/80 p-3 rounded-xl space-y-1.5 font-medium">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Subtotal ({totals.itemsCount} item)</span>
              <span className="font-mono">{formatRupiah(totals.subtotal)}</span>
            </div>
            
            {totals.overallDiscountValue > 0 && (
              <div className="flex justify-between text-xs text-rose-400">
                <span>Diskon Global</span>
                <span className="font-mono">-{formatRupiah(totals.overallDiscountValue)}</span>
              </div>
            )}
            
            <div className="flex justify-between items-center text-xs text-slate-100 font-bold border-t border-slate-850 pt-1.5 mt-1">
              <span>TOTAL AKHIR</span>
              <span className="font-mono text-base text-indigo-400 font-extrabold">
                {formatRupiah(totals.total)}
              </span>
            </div>
          </div>

          {/* CTA: Check-out Button */}
          <button
            id="pay-trigger-btn"
            disabled={cart.length === 0}
            onClick={triggerCheckoutModal}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-550 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/15 flex items-center justify-center gap-2 cursor-pointer select-none"
          >
            <Receipt className="w-4 h-4" />
            <span>BAYAR SEKARANG [F2]</span>
          </button>
        </div>
      </div>

      {/* MODAL WINDOW 1: PAYMENT DIALOG DRAWER */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-slate-850 border border-slate-750 max-w-md w-full rounded-2xl p-5 shadow-2xl relative">
            
            <button
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-750 mb-4">
              <CreditCard className="w-4 h-4 text-indigo-400" />
              Selesaikan Pembayaran
            </h3>

            {localError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-[11px] text-rose-450 flex items-center gap-2 mb-3 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{localError}</span>
              </div>
            )}

            {/* Total recap billing */}
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl text-center mb-4">
              <span className="text-[10px] text-slate-450 uppercase font-bold tracking-wider block">Tagihan Pembayaran</span>
              <span className="text-2xl font-mono font-black text-indigo-400 tracking-tight block mt-1">
                {formatRupiah(totals.total)}
              </span>
            </div>

            {/* Selector: Payment method */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Metode Pembayaran</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'cash' as const, label: 'TUNAI', icon: DollarSign },
                  { id: 'qris' as const, label: 'QRIS', icon: QrCode },
                  { id: 'card' as const, label: 'KARTU', icon: CreditCard },
                  { id: 'transfer' as const, label: 'TRANSFER', icon: Receipt },
                ].map((m) => {
                  const isS = paymentMethod === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        setPaymentMethod(m.id);
                        if (m.id !== 'cash') {
                          setPaidAmount(String(totals.total));
                        }
                      }}
                      className={`flex flex-col items-center justify-center p-2.5 border rounded-xl gap-1 transition-all cursor-pointer select-none ${
                        isS 
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400 font-bold' 
                          : 'bg-slate-800 border-slate-750 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[9px] tracking-wide font-semibold">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dynamic input: Cash amount / Transacted note */}
            {paymentMethod === 'cash' && (
              <div className="mb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">
                  Nominal Uang Diterima (Tunai)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-xs font-mono font-bold text-slate-450">Rp</span>
                  </div>
                  <input
                    ref={cashInputRef}
                    type="number"
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="Masukkan jumlah bayar..."
                    className="w-full pl-8 pr-4 py-2.5 bg-slate-900 border border-slate-750 rounded-xl text-slate-100 font-mono text-sm focus:outline-hidden focus:border-indigo-500 font-bold"
                  />
                </div>

                {/* Quick denomination buttons */}
                <div className="grid grid-cols-4 gap-1.5 mt-2 select-none">
                  {[totals.total, 5000, 10000, 20000, 50000, 100000].map((val, idx) => {
                    let text = val === totals.total ? 'Pas' : formatRupiah(val);
                    let actualValue = val;
                    
                    // Quick additions for other bills
                    if (val !== totals.total) {
                      if (val < totals.total && totals.total < 100000) {
                        // let's adjust or keep fixed values
                      }
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => setPaidAmount(String(actualValue))}
                        className="bg-slate-800 hover:bg-slate-700/80 border border-slate-750 text-[10px] py-1.5 rounded-lg text-slate-300 font-bold font-mono cursor-pointer select-none"
                      >
                        {text}
                      </button>
                    );
                  })}
                </div>

                {/* Cashback calculation output */}
                {parseFloat(paidAmount) >= totals.total && (
                  <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-center rounded-xl mt-3.5 flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-medium">UANG KEMBALIAN:</span>
                    <strong className="text-base font-mono font-black text-indigo-400">
                      {formatRupiah(calculateChange(totals.total, parseFloat(paidAmount) || 0))}
                    </strong>
                  </div>
                )}
              </div>
            )}

            {/* Admin log notes */}
            <div className="mb-5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Catatan Transaksi</label>
              <input
                type="text"
                placeholder="Catatan tambahan (opsional)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-slate-900 border border-slate-750 rounded-xl text-xs text-slate-200 px-3 py-2 focus:outline-hidden focus:border-indigo-500"
              />
            </div>

            {/* Checkout Action Buttons */}
            <div className="flex gap-2.5">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750/80 text-slate-300 py-2.5 rounded-xl border border-slate-750 font-bold text-xs cursor-pointer select-none"
              >
                KEMBALI
              </button>
              <button
                id="submit-payment-btn"
                onClick={executePayment}
                className="flex-[2] bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/15 select-none"
              >
                PROSES TRANSAKSI
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL WINDOW 2: TRANSACTION INVOICE COMPLETED RECEIPT */}
      {completedTx && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-200">
          <div className="bg-slate-850 border border-slate-750 max-w-sm w-full rounded-2xl p-5 shadow-2xl relative flex flex-col items-center text-center">
            
            <div className="w-12 h-12 bg-emerald-500/15 rounded-full flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-450" />
            </div>

            <h3 className="text-sm font-bold text-slate-100">Transaksi Berhasil!</h3>
            <p className="text-[11px] text-slate-400 mt-1 mb-4">Invoice: {completedTx.invoice_number}</p>

            {/* Hidden component styled specifically for thermal print rendering */}
            <div className="hidden">
              <div ref={printRef} id="thermal-receipt-output">
                <div className="text-center">
                  <span className="title">{settings?.store_name || 'Toko Berkah Utama'}</span><br />
                  <span>{settings?.store_address || 'Jl. Jenderal Sudirman No. 42'}</span><br />
                  <span>Telp: {settings?.store_phone || '08xxxxxxxxxx'}</span>
                </div>
                <div className="divider"></div>
                <div className="meta-sec">
                  No: ${completedTx.invoice_number}<br />
                  Tgl: ${new Date(completedTx.created_at || Date.now()).toLocaleString('id-ID')}<br />
                  Kasir: ${completedTx.cashier_name || 'Admin'}<br />
                  Plg: ${completedTx.customer_name || 'Pelanggan Umum'}
                </div>
                <div className="divider"></div>
                <div className="bold item-row">
                  <span className="item-name">Produk</span>
                  <span className="item-qty text-right">Qty</span>
                  <span className="item-price">Total</span>
                </div>
                <div className="divider"></div>
                ${completedTx.items?.map((item: any) => `
                  <div className="item-row">
                    <span className="item-name">${item.product_name}</span>
                    <span className="item-qty text-right">${item.quantity}x</span>
                    <span className="item-price">${formatRupiah(item.subtotal)}</span>
                  </div>
                `).join('')}
                <div className="divider"></div>
                <div className="item-row">
                  <span>Subtotal</span>
                  <span className="bold">${formatRupiah(completedTx.subtotal)}</span>
                </div>
                ${completedTx.discount > 0 ? `
                  <div className="item-row">
                    <span>Diskon</span>
                    <span className="bold text-right">-${formatRupiah(completedTx.discount)}</span>
                  </div>
                ` : ''}
                ${completedTx.tax > 0 ? `
                  <div className="item-row">
                    <span>PPN (${completedTx.tax_rate || 11}%)</span>
                    <span className="bold text-right">${formatRupiah(completedTx.tax)}</span>
                  </div>
                ` : ''}
                <div className="bold item-row" style="font-size: 13px;">
                  <span>TOTAL BEBAN</span>
                  <span>${formatRupiah(completedTx.total)}</span>
                </div>
                <div className="divider"></div>
                <div className="item-row">
                  <span>Metode</span>
                  <span className="bold text-right">${completedTx.payment_method.toUpperCase()}</span>
                </div>
                <div className="item-row">
                  <span>Bayar</span>
                  <span className="bold text-right">${formatRupiah(completedTx.paid_amount)}</span>
                </div>
                ${completedTx.change_amount > 0 ? `
                  <div className="item-row">
                    <span>Kembalian</span>
                    <span className="bold text-right">${formatRupiah(completedTx.change_amount)}</span>
                  </div>
                ` : ''}
                <div className="divider" style="margin-top: 10px;"></div>
                <div className="text-center" style="font-size: 10px; margin-top: 6px;">
                  ${settings?.receipt_footer || 'Terima kasih telah berbelanja!'}
                </div>
              </div>
            </div>

            {/* UI receipt visual preview card */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 text-left text-xs space-y-2 mb-4 font-mono select-none">
              <div className="text-center font-sans">
                <h4 className="font-extrabold text-[#94a3b8] uppercase">{settings?.store_name}</h4>
                <p className="text-[10px] text-slate-500 leading-tight">{settings?.store_address}</p>
                <p className="text-[10px] text-slate-500">Telp: {settings?.store_phone}</p>
                <div className="border-t border-dashed border-slate-750 my-2"></div>
              </div>

              <div className="space-y-1 text-slate-400 text-[11px]">
                <div className="flex justify-between">
                  <span>Invoice:</span>
                  <strong className="text-slate-200">{completedTx.invoice_number}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Kasir:</span>
                  <span className="text-slate-300">{completedTx.cashier_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pelanggan:</span>
                  <span className="text-slate-300">{completedTx.customer_name}</span>
                </div>
              </div>
              
              <div className="border-t border-dashed border-slate-750 my-2"></div>

              <div className="space-y-1.5 text-[11px]">
                {completedTx.items?.map((it: any) => (
                  <div key={it.id} className="flex justify-between text-slate-200">
                    <span className="truncate max-w-[150px]">{it.product_name}</span>
                    <span>
                      {it.quantity}x <strong className="font-bold text-slate-450">{formatRupiah(it.unit_price)}</strong>
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-dashed border-slate-750 my-2"></div>

              <div className="space-y-1 text-slate-300 text-[11px]">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatRupiah(completedTx.subtotal)}</span>
                </div>
                {completedTx.discount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Diskon:</span>
                    <span>-{formatRupiah(completedTx.discount)}</span>
                  </div>
                )}
                {completedTx.tax > 0 && (
                  <div className="flex justify-between">
                    <span>PPN ({completedTx.tax_rate}%):</span>
                    <span>{formatRupiah(completedTx.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-emerald-400 font-bold border-t border-slate-800 pt-1 mt-1 text-xs">
                  <span>TOTAL:</span>
                  <span>{formatRupiah(completedTx.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diterima:</span>
                  <span>{formatRupiah(completedTx.paid_amount)}</span>
                </div>
                {completedTx.change_amount > 0 && (
                  <div className="flex justify-between text-indigo-400">
                    <span>Kembali:</span>
                    <span>{formatRupiah(completedTx.change_amount)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Print action and Clear success screen buttons */}
            <div className="w-full flex gap-2">
              <button
                id="print-receipt-btn"
                onClick={printReceipt}
                className="flex-1 bg-slate-800 hover:bg-slate-700/80 text-white font-bold py-3 rounded-xl border border-slate-755 text-xs cursor-pointer flex items-center justify-center gap-2 select-none"
              >
                <Printer className="w-4 h-4 text-indigo-400" />
                Cetak Struk
              </button>
              <button
                onClick={() => setCompletedTx(null)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-xs cursor-pointer select-none shadow-lg shadow-indigo-600/15"
              >
                Transaksi Baru
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
