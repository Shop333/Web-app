/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { formatRupiah } from '../../lib/utils.js';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  ArrowRight, 
  Coins, 
  ShoppingBag, 
  CreditCard,
  PieChart as PieIcon, 
  BarChart2,
  TableProperties
} from 'lucide-react';

export default function LaporanView() {
  const { 
    reportData, 
    fetchReportData,
    summaryMetrics,
    fetchSummaryMetrics,
    loading 
  } = useStore();

  const [activeTab, setActiveTab] = useState('summary'); // 'summary', 'charts', 'profit_table'
  const [reportPeriod, setReportPeriod] = useState('week'); // 'week', 'month'

  useEffect(() => {
    fetchReportData(reportPeriod);
    fetchSummaryMetrics();
  }, [fetchReportData, reportPeriod, fetchSummaryMetrics]);

  // Extract variables
  const lastXDaysSales = reportData?.lastXDaysSales || [];
  const hourlySales = reportData?.hourlySales || [];
  const categoryShare = reportData?.categoryShare || [];
  const topProducts = reportData?.topProducts || [];
  const dailyProfitReport = reportData?.dailyProfitReport || [];
  const paymentTallies = reportData?.paymentTallies || [];

  // Helper colors for pie chart cell rendering
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#4b5563'];

  // Sum aggregates for selected journal table logs
  const getPeriodAggregates = () => {
    let salesTotal = 0;
    let costTotal = 0;
    let profitTotal = 0;
    let txCount = 0;

    dailyProfitReport.forEach((row: any) => {
      salesTotal += row.total;
      costTotal += row.cost;
      profitTotal += row.profit;
      txCount += row.txCount;
    });

    return { salesTotal, costTotal, profitTotal, txCount };
  };

  const periodAggs = getPeriodAggregates();

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Header period selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Laporan Analisis & Grafik Keuangan</h2>
          <p className="text-xs text-slate-400">Tinjau pendapatan harian, laba kotor, metode pembayaran favorit, dan grafik terlaris.</p>
        </div>

        {/* Tab switch buttons */}
        <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0 select-none font-medium text-xs">
          <button
            onClick={() => setActiveTab('summary')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activeTab === 'summary' 
                ? 'bg-indigo-600 text-white font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ringkasan Keuangan
          </button>
          <button
            onClick={() => setActiveTab('charts')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activeTab === 'charts' 
                ? 'bg-indigo-600 text-white font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Visualisasi Grafik
          </button>
          <button
            onClick={() => setActiveTab('profit_table')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-colors ${
              activeTab === 'profit_table' 
                ? 'bg-indigo-600 text-white font-bold' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Laba Kotor Per Hari
          </button>
        </div>
      </div>

      {activeTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Card Overviews */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Sales performance index */}
            <div className="bg-slate-850 border border-slate-850 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-semibold block">Total Revenue Jurnal Terpilih</span>
              <h3 className="text-2xl font-black font-mono text-indigo-400 tracking-tight block mt-2">
                {formatRupiah(periodAggs.salesTotal)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2">Akumulasi seluruh penjualan sukses selama periode penyaringan.</p>
            </div>

            {/* Total estimated cost pricing of inventory */}
            <div className="bg-slate-850 border border-slate-850 p-5 rounded-2xl">
              <span className="text-xs text-slate-400 font-semibold block">Total Harga Beli (Modal Persediaan)</span>
              <h3 className="text-xl font-bold font-mono text-rose-400 tracking-tight block mt-2">
                {formatRupiah(periodAggs.costTotal)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2.5">Harga modal tebus persediaan yang laku terjual.</p>
            </div>

            {/* Profit margin indices */}
            <div className="bg-slate-850 border border-slate-855 p-5 rounded-2xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <Coins className="w-16 h-16 text-emerald-400" />
              </div>
              <span className="text-xs text-emerald-450 font-semibold block">Estimasi Laba Kotor (Gross Profit)</span>
              <h3 className="text-2xl font-black font-mono text-emerald-400 tracking-tight block mt-2">
                {formatRupiah(periodAggs.profitTotal)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2">Dihitung sebagai: <strong>(Harga Jual - Harga Beli)</strong> dari produk laku.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            {/* Left: Payment tallies breakdown */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-150 mb-1 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  Rekap per Metode Pembayaran
                </h4>
                <p className="text-[11px] text-slate-400 mb-4">Grafik rincian metode pembayaran yang paling populer pada kasir.</p>
                
                <div className="space-y-3 font-mono text-xs select-none">
                  {paymentTallies.length === 0 ? (
                    <p className="text-[11px] text-slate-500 text-center py-6">Kekurangan jumlah data penjualan.</p>
                  ) : (
                    paymentTallies.map((t: any, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-900 border border-slate-800">
                        <div>
                          <span className="font-bold text-slate-200 block uppercase">{t.method}</span>
                          <span className="text-[10px] text-slate-450 font-normal block mt-0.5">{t.count} Transaksi</span>
                        </div>
                        <span className="font-bold text-indigo-305">{formatRupiah(t.total)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Top Selling Products review */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
              <h4 className="text-sm font-semibold text-slate-150 mb-1 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-indigo-400" />
                Daftar Top 10 Produk Terlaris
              </h4>
              <p className="text-[11px] text-slate-400 mb-4">Urutan produk dengan kuantitas penjualan terakumulasi paling tinggi.</p>

              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900 select-none">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-800 text-slate-350 border-b border-slate-800">
                      <th className="p-2.5">Produk</th>
                      <th className="p-2.5 text-center">Terjual</th>
                      <th className="p-2.5 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-250 font-medium">
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center text-slate-500 font-normal">Tiada log laku.</td>
                      </tr>
                    ) : (
                      topProducts.map((p: any, idx) => (
                        <tr key={idx} className="hover:bg-slate-850/50">
                          <td className="p-2.5 font-sans font-semibold text-slate-200 truncate max-w-[140px]">{p.name}</td>
                          <td className="p-2.5 text-center font-bold text-emerald-400">{p.quantity}</td>
                          <td className="p-2.5 text-right text-indigo-305">{formatRupiah(p.revenue)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'charts' && (
        <div className="space-y-6">
          
          {/* Period query filters */}
          <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center gap-3 w-56 font-medium text-xs">
            <span className="text-xs text-slate-450 font-semibold ml-1">Period:</span>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-indigo-400 focus:outline-hidden cursor-pointer"
            >
              <option value="week">7 Hari Terakhir</option>
              <option value="month">30 Hari Terakhir</option>
            </select>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 select-none">
            
            {/* Chart 1: Revenue Line graph */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl pb-7">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-400" /> Pendapatan Terakumulasi Harian
              </h4>
              <div className="h-64 font-sans text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lastXDaysSales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }} />
                    <Legend />
                    <Line type="monotone" dataKey="total" name="Total Omset (Rp)" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Today Hourly Breakdown graph */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl pb-7">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-emerald-450" /> Beban Transaksi per Jam (Hari Ini)
              </h4>
              <div className="h-64 font-sans text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlySales}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
                    <XAxis dataKey="hour" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569', borderRadius: '12px' }} />
                    <Legend />
                    <Bar dataKey="total" name="Total Penjualan (Rp)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Category pie division */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl pb-7">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <PieIcon className="w-4 h-4 text-amber-500" /> Pembagian Penjualan per Kategori
              </h4>
              <div className="h-64 font-sans text-xs flex justify-center items-center">
                {categoryShare.length === 0 ? (
                  <p className="text-xs text-slate-500">Kekurangan jumlah data penjualan.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryShare}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        nameKey="name"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryShare.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatRupiah(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 4: Top products bar horizontal chart */}
            <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl pb-7">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-purple-400" /> Top 10 Produk Berdasarkan Kuantitas
              </h4>
              <div className="h-64 font-sans text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topProducts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                    <XAxis type="number" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={80} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="quantity" name="Porsi / Barang Terjual" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        </div>
      )}

      {activeTab === 'profit_table' && (
        <div className="space-y-4">
          
          <div className="bg-slate-850 border border-slate-800 p-5 rounded-2xl">
            <h4 className="text-sm font-semibold text-slate-150 mb-1 flex items-center gap-2">
              <TableProperties className="w-4 h-4 text-indigo-450" />
              Laporan Margin Laba Kotor Keuangan Harian
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Rincian omset harian yang dikurangi oleh harga beli modal bersih untuk melacak margin profitabilitas toko.</p>

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-900 select-none">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 font-bold border-b border-slate-800">
                    <th className="p-3.5">Tanggal</th>
                    <th className="p-3.5 text-center">Tx Count</th>
                    <th className="p-3.5 text-right">Subtotal Jual</th>
                    <th className="p-3.5 text-right">Diskon Global</th>
                    <th className="p-3.5 text-right">Pajak PPN</th>
                    <th className="p-3.5 text-right">Omset Bersih (After Disc)</th>
                    <th className="p-3.5 text-right">Harga Modal Bersih</th>
                    <th className="p-3.5 text-right">Margin Laba Kotor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {loading.reports ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-normal">Memanggil jurnal laba kotor dari SQLite...</td>
                    </tr>
                  ) : dailyProfitReport.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-12 text-center text-slate-500 font-normal">Belum ada riwayat penjualan yang terdaftar.</td>
                    </tr>
                  ) : (
                    dailyProfitReport.map((row: any, idx: number) => {
                      const netRevenue = row.subtotal - row.discount;
                      const profitMargin = netRevenue - row.cost;
                      
                      return (
                        <tr key={idx} className="hover:bg-slate-850/45 transition-colors">
                          <td className="p-3.5 font-bold text-slate-100 font-sans">{row.date}</td>
                          <td className="p-3.5 text-center font-bold text-slate-300">{row.txCount} sales</td>
                          <td className="p-3.5 text-right text-slate-400">{formatRupiah(row.subtotal)}</td>
                          <td className="p-3.5 text-right text-rose-450">-{formatRupiah(row.discount)}</td>
                          <td className="p-3.5 text-right text-slate-450">+{formatRupiah(row.tax)}</td>
                          <td className="p-3.5 text-right font-bold text-slate-205">{formatRupiah(row.total)}</td>
                          <td className="p-3.5 text-right text-rose-400">-{formatRupiah(row.cost)}</td>
                          <td className="p-3.5 text-right font-black text-emerald-400 text-sm">{formatRupiah(profitMargin)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
