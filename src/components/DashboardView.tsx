/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { useStore } from '../store.js';
import { formatRupiah } from '../../lib/utils.js';
import { 
  DollarSign, 
  ShoppingCart, 
  ShoppingBag, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  ArrowRight,
  PackagePlus,
  ArrowUpRight
} from 'lucide-react';

interface DashboardViewProps {
  onViewChange: (view: string) => void;
}

export default function DashboardView({ onViewChange }: DashboardViewProps) {
  const { 
    summaryMetrics, 
    fetchSummaryMetrics, 
    products, 
    fetchProducts,
    activeCashier 
  } = useStore();

  useEffect(() => {
    fetchSummaryMetrics();
    fetchProducts();
  }, [fetchSummaryMetrics, fetchProducts]);

  const salesToday = summaryMetrics?.todaySales || 0;
  const countToday = summaryMetrics?.todayCount || 0;
  const itemsSoldToday = summaryMetrics?.todayItemsSold || 0;
  const lowStockCount = summaryMetrics?.lowStockAlertCount || 0;
  const salesDiff = summaryMetrics?.salesComparisonPercent || 0;
  const countDiff = summaryMetrics?.txComparisonPercent || 0;

  // Find actual products that are low in stock
  const lowStockProducts = products.filter(p => p.is_active === 1 && p.stock <= p.min_stock);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="bg-radial from-slate-800 to-slate-900 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl shadow-slate-950/20">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">
            Selamat Datang Kembali, {activeCashier?.name || 'Kasir'}!
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Pantau aktivitas toko Anda, tambahkan produk baru, atau kelola sistem POS realtime dari satu dasbor terpadu.
          </p>
        </div>
        <button
          onClick={() => onViewChange('kasir')}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs px-5 py-3 rounded-xl transition-all hover:scale-102 cursor-pointer shadow-lg shadow-indigo-600/20 select-none animate-pulse-slow"
        >
          <span>Mulai Transaksi (Kasir)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Numerical Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Penjualan Hari Ini */}
        <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <DollarSign className="w-24 h-24 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Penjualan Hari Ini</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <DollarSign className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {formatRupiah(salesToday)}
            </h3>
            <div className="flex items-center gap-1.5 mt-2.5">
              {salesDiff >= 0 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{salesDiff}%
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 bg-rose-500/10 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {salesDiff}%
                </span>
              )}
              <span className="text-[10px] text-slate-400">vs kemarin</span>
            </div>
          </div>
        </div>

        {/* Card 2: Jumlah Transaksi */}
        <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingCart className="w-24 h-24 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Transaksi Hari Ini</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <ShoppingCart className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {countToday} <span className="text-xs text-slate-400 font-normal">Sales</span>
            </h3>
            <div className="flex items-center gap-1.5 mt-2.5">
              {countDiff >= 0 ? (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +{countDiff}%
                </span>
              ) : (
                <span className="text-[10px] text-rose-400 bg-rose-500/10 font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                  <TrendingDown className="w-3 h-3" /> {countDiff}%
                </span>
              )}
              <span className="text-[10px] text-slate-400">vs kemarin</span>
            </div>
          </div>
        </div>

        {/* Card 3: Produk Terjual */}
        <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingBag className="w-24 h-24 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Produk Terjual</span>
            <div className="p-2 bg-amber-500/10 rounded-xl">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl font-bold font-mono text-slate-100 tracking-tight">
              {itemsSoldToday} <span className="text-xs text-slate-400 font-normal">items</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-3">
              Total volume barang laku hari ini
            </p>
          </div>
        </div>

        {/* Card 4: Peringatan Stok Rendah */}
        <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="w-24 h-24 text-white" />
          </div>
          <div className="flex justify-between items-start">
            <span className="text-xs text-slate-400 font-medium">Stok Rendah</span>
            <div className={`p-2 rounded-xl ${lowStockCount > 0 ? 'bg-rose-500/15' : 'bg-slate-700/15'}`}>
              <AlertTriangle className={`w-5 h-5 ${lowStockCount > 0 ? 'text-rose-400' : 'text-slate-400'}`} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-xl font-bold font-mono tracking-tight ${lowStockCount > 0 ? 'text-rose-400' : 'text-slate-350'}`}>
              {lowStockCount} <span className="text-xs text-slate-400 font-normal">Produk</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-3">
              {lowStockCount > 0 ? 'Segera lakukan restock barang!' : 'Seluruh stok barang aman'}
            </p>
          </div>
        </div>
      </div>

      {/* Main content grid: Quick Shortcuts and Low Stock Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Menu Shortcuts panel */}
        <div className="lg:col-span-1 bg-slate-850 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-1">Akses Cepat Pintasan</h3>
            <p className="text-[11px] text-slate-400 mb-4">Fitur-fitur utama sistem yang paling sering dioperasikan kasir.</p>
            
            <div className="space-y-2.5">
              <button
                onClick={() => onViewChange('kasir')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 cursor-pointer text-slate-200 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-left">Aplikasi Kasir POS</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onViewChange('produk')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 cursor-pointer text-slate-200 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
                    <PackagePlus className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-left">Tambah / Kelola Produk</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onViewChange('laporan')}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-750 cursor-pointer text-slate-200 transition-all hover:translate-x-1"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-400">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold text-left">Laporan Keuangan</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-400">Punya kendala dengan data? Buka</span>
            <button 
              onClick={() => onViewChange('pengaturan')}
              className="text-[11px] text-indigo-400 hover:underline inline ml-1 cursor-pointer font-semibold"
            >
              Pengaturan Toko
            </button>
          </div>
        </div>

        {/* Low Stock Alerts table section */}
        <div className="lg:col-span-2 bg-slate-850 border border-slate-800 p-5 rounded-2xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Daftar Produk Stok Menipis
                {lowStockCount > 0 && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                    {lowStockCount} Peringatan
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">Produk-produk dengan jumlah stok sisa di bawah batas minimum.</p>
            </div>
            
            <button
              onClick={() => onViewChange('produk')}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer select-none"
            >
              <span>Restock Sekarang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-800/80 text-slate-300 font-bold border-b border-slate-800">
                  <th className="p-3">Nama Produk</th>
                  <th className="p-3">SKU</th>
                  <th className="p-3 text-center">Stok Sisa</th>
                  <th className="p-3 text-center">Limit Minimal</th>
                  <th className="p-3 text-right">Harga Jual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                {lowStockProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-normal">
                      Luar biasa! Seluruh stok produk Anda berada di atas batas minimal.
                    </td>
                  </tr>
                ) : (
                  lowStockProducts.slice(0, 5).map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-3 font-semibold text-slate-100">{p.name}</td>
                      <td className="p-3 font-mono text-slate-400">{p.sku}</td>
                      <td className="p-3 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 font-bold font-mono">
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="p-3 text-center font-mono text-slate-400">{p.min_stock} {p.unit}</td>
                      <td className="p-3 text-right font-mono text-indigo-300 font-semibold">
                        {formatRupiah(p.price)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
