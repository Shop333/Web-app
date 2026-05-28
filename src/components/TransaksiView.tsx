/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { formatRupiah, formatDate } from '../../lib/utils.js';
import { Transaction } from '../types.js';
import { 
  Search, 
  History, 
  Printer, 
  Trash2, 
  X, 
  CheckCircle, 
  AlertTriangle,
  FileText,
  Calendar,
  CreditCard,
  Ban
} from 'lucide-react';

export default function TransaksiView() {
  const { 
    transactions, 
    fetchTransactions, 
    voidTransaction, 
    settings,
    loading 
  } = useStore();

  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'completed', 'voided'
  const [dateFilter, setDateFilter] = useState(''); // YYYY-MM-DD filter

  // Detail Modal popup
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [txDetails, setTxDetails] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // System alerts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Fetch full items details for a transaction
  const handleOpenDetail = async (tx: Transaction) => {
    setSelectedTx(tx);
    setLoadingDetails(true);
    try {
      const res = await fetch(`/api/transactions/${tx.id}`);
      const json = await res.json();
      if (json.success) {
        setTxDetails(json.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleVoidTx = async (txId: number) => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin membatalkan (Void) transaksi ini?\nStok produk sisa akan dikembalikan secara otomatis dan stat pelanggan ditarik.')) {
      const res = await voidTransaction(txId);
      if (res) {
        triggerToast('Transaksi berhasil dibatalkan (VOID STATUS).');
        if (selectedTx && selectedTx.id === txId) {
          // reload detail modal
          const updated = { ...txDetails, status: 'voided' };
          setTxDetails(updated);
        }
      } else {
        triggerToast(useStore.getState().error || 'Gagal membatalkan transaksi.');
      }
    }
  };

  // Reprint Receipt trigger
  const reprintThermalReceipt = () => {
    if (!printRef.current) return;
    const printContent = printRef.current.innerHTML;

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
            <title>Cetak Ulang Struk</title>
            <style>
              body {
                font-family: 'Courier New', Courier, monospace;
                font-size: 11px;
                color: #000;
                margin: 0;
                padding: 10px;
                width: 76mm;
              }
              .text-center { text-align: center; }
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

  // Filter computations
  const filteredList = transactions.filter((t) => {
    // Search match: invoice or customer name
    const searchMatch = !search || 
      t.invoice_number.toLowerCase().includes(search.toLowerCase()) || 
      (t.customer_name && t.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.cashier_name && t.cashier_name.toLowerCase().includes(search.toLowerCase()));

    // Method match
    const methodMatch = methodFilter === 'all' || t.payment_method === methodFilter;

    // Status match
    const statusMatch = statusFilter === 'all' || t.status === statusFilter;

    // Date YYYY-MM-DD match
    const dateMatch = !dateFilter || (t.created_at && t.created_at.startsWith(dateFilter));

    return searchMatch && methodMatch && statusMatch && dateMatch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Toast popup */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-slate-800 border border-emerald-500/20 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold text-slate-150 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Riwayat Penjualan & Transaksi</h2>
        <p className="text-xs text-slate-400">Review invoice, cetak ulang struk, atau lakukan pembatalan transaksi kasir.</p>
      </div>

      {/* Filters row bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-3 select-none">
        
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari Invoice atau Pelanggan..."
            className="w-full pl-9 pr-3 py-2 bg-slate-850 hover:bg-slate-800/80 border border-slate-750 text-xs text-slate-200 rounded-xl focus:outline-hidden"
          />
        </div>

        {/* Payment Methods */}
        <div className="flex items-center gap-2 bg-slate-850 border border-slate-755 rounded-xl px-2">
          <CreditCard className="w-4 h-4 text-slate-450" />
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-350 font-semibold focus:outline-hidden cursor-pointer py-2"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="card">Kartu Debit/Kredit</option>
            <option value="transfer">Transfer Bank</option>
          </select>
        </div>

        {/* Match status */}
        <div className="flex items-center gap-2 bg-slate-850 border border-slate-755 rounded-xl px-2">
          <Ban className="w-4 h-4 text-slate-450" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-350 font-semibold focus:outline-hidden cursor-pointer py-2"
          >
            <option value="all">Semua Status</option>
            <option value="completed">Sukses (Completed)</option>
            <option value="voided">Dibatalkan (Voided)</option>
          </select>
        </div>

        {/* Match date */}
        <div className="flex items-center gap-2 bg-slate-850 border border-slate-755 rounded-xl px-2">
          <Calendar className="w-4 h-4 text-slate-450" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-350 font-semibold focus:outline-hidden cursor-pointer py-1.5"
          />
        </div>

      </div>

      {/* Transaction journals master table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl select-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-850/80 text-slate-300 font-bold border-b border-slate-800">
                <th className="p-3.5">Invoice</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Kasir</th>
                <th className="p-3.5">Nama Pelanggan</th>
                <th className="p-3.5 text-right">Total Transaksi</th>
                <th className="p-3.5 text-center">Metode Bayar</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
              {loading.transactions ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-normal">
                    Mengambil riwayat transaksi dari SQLite server...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-550 font-normal">
                    Tidak ditemukan data transaksi yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredList.map((t) => {
                  const isVoided = t.status === 'voided';
                  return (
                    <tr key={t.id} className="hover:bg-slate-850/45 transition-colors">
                      <td className="p-3.5 font-bold font-mono text-indigo-400">{t.invoice_number}</td>
                      <td className="p-3.5 text-slate-400">{formatDate(t.created_at)}</td>
                      <td className="p-3.5 text-slate-300">{t.cashier_name || 'Kasir'}</td>
                      <td className="p-3.5 font-semibold text-slate-100">{t.customer_name || 'Pelanggan Umum'}</td>
                      <td className="p-3.5 text-right font-bold font-mono text-slate-100">{formatRupiah(t.total)}</td>
                      <td className="p-3.5 text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-wide bg-slate-800 text-indigo-305">
                          {t.payment_method}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          isVoided 
                            ? 'bg-rose-500/15 text-rose-450' 
                            : 'bg-emerald-500/10 text-emerald-450'
                        }`}>
                          {isVoided ? 'VOIDED' : 'COMPLETED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleOpenDetail(t)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL DRAWER */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-slate-850 border border-slate-750 max-w-md w-full rounded-2xl p-5 shadow-2xl relative max-h-[85vh] overflow-y-auto scrollbar-thin">
            
            <button
              onClick={() => {
                setSelectedTx(null);
                setTxDetails(null);
              }}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-750 pb-2 mb-4 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Detail Pembelian Kasir
            </h3>

            {loadingDetails ? (
              <div className="p-12 text-center text-xs text-slate-500">
                Memanggil detail invoice dari SQLite...
              </div>
            ) : txDetails ? (
              <div className="space-y-4 text-xs select-none">
                
                {/* Meta details column */}
                <div className="grid grid-cols-2 gap-3.5 bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-[11px] text-slate-400 leading-snug">
                  <div>
                    <span className="block mb-1">Invoice: <strong className="text-indigo-400">{txDetails.invoice_number}</strong></span>
                    <span className="block">Status: <strong className={txDetails.status === 'completed' ? 'text-emerald-400' : 'text-rose-400'}>{txDetails.status.toUpperCase()}</strong></span>
                  </div>
                  <div className="text-right">
                    <span className="block mb-1">{formatDate(txDetails.created_at)}</span>
                    <span className="block">Kasir: <strong className="text-slate-200">{txDetails.cashier_name}</strong></span>
                  </div>
                </div>

                {/* Items Purchased table */}
                <div>
                  <h4 className="font-semibold text-slate-350 mb-1.5 block">Item-item Belanja:</h4>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900 p-1.5 font-mono">
                    {txDetails.items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between p-2 hover:bg-slate-850 rounded-lg text-[11px]">
                        <div className="min-w-0 flex-1">
                          <span className="text-slate-200 block truncate leading-tight">{it.product_name}</span>
                          <span className="text-[10px] text-slate-450 block mt-0.5">{it.quantity}x @ {formatRupiah(it.unit_price)}</span>
                        </div>
                        <span className="text-indigo-305 font-bold self-end shrink-0">{formatRupiah(it.subtotal)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Computational aggregates */}
                <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-xl space-y-1.5 text-slate-300">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatRupiah(txDetails.subtotal)}</span>
                  </div>
                  {txDetails.discount > 0 && (
                    <div className="flex justify-between text-rose-400">
                      <span>Diskon Global:</span>
                      <span>-{formatRupiah(txDetails.discount)}</span>
                    </div>
                  )}
                  {txDetails.tax > 0 && (
                    <div className="flex justify-between">
                      <span>PPN ({txDetails.tax_rate || 11}%):</span>
                      <span>{formatRupiah(txDetails.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-indigo-400 font-extrabold border-t border-slate-800 pt-1.5 mt-1 text-sm font-mono leading-normal">
                    <span>BEBAN TOTAL:</span>
                    <span>{formatRupiah(txDetails.total)}</span>
                  </div>
                  <div className="border-t border-slate-800 my-1 pt-1 opacity-50"></div>
                  <div className="flex justify-between text-[11px]">
                    <span>Tunai/Metode:</span>
                    <span className="font-bold">{txDetails.payment_method.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span>Nominal Pembayaran:</span>
                    <span>{formatRupiah(txDetails.paid_amount)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-indigo-400 font-semibold">
                    <span>Kembalian Tunai:</span>
                    <span>{formatRupiah(txDetails.change_amount)}</span>
                  </div>
                </div>

                {/* Reprint Thermal receipt container (Hidden) */}
                <div className="hidden">
                  <div ref={printRef} id="thermal-reprint-output">
                    <div className="text-center">
                      <span className="title">{settings?.store_name}</span><br />
                      <span>{settings?.store_address}</span><br />
                      <span>Telp: {settings?.store_phone}</span>
                    </div>
                    <div className="divider"></div>
                    <div className="text-center bold" style={{ fontSize: '13px' }}>SALINAN STRUK BELANJA</div>
                    <div className="divider"></div>
                    <div className="meta-sec">
                      Invoice: {txDetails.invoice_number}<br />
                      Tgl: {new Date(txDetails.created_at || Date.now()).toLocaleString('id-ID')}<br />
                      Kasir: {txDetails.cashier_name}<br />
                      Plg: {txDetails.customer_name || 'Pelanggan Umum'}
                    </div>
                    <div className="divider"></div>
                    <div className="bold item-row">
                      <span className="item-name">Produk</span>
                      <span className="item-qty text-right">Qty</span>
                      <span className="item-price">Total</span>
                    </div>
                    <div className="divider"></div>
                    {txDetails.items?.map((it: any, idx: number) => (
                      <div key={idx} className="item-row">
                        <span className="item-name">{it.product_name}</span>
                        <span className="item-qty text-right">{it.quantity}x</span>
                        <span className="item-price">{formatRupiah(it.subtotal)}</span>
                      </div>
                    ))}
                    <div className="divider"></div>
                    <div className="item-row">
                      <span>Subtotal</span>
                      <span className="bold">{formatRupiah(txDetails.subtotal)}</span>
                    </div>
                    {txDetails.discount > 0 && (
                      <div className="item-row">
                        <span>Diskon</span>
                        <span className="bold">-{formatRupiah(txDetails.discount)}</span>
                      </div>
                    )}
                    {txDetails.tax > 0 && (
                      <div className="item-row">
                        <span>PPN ({txDetails.tax_rate || 11}%)</span>
                        <span className="bold">{formatRupiah(txDetails.tax)}</span>
                      </div>
                    )}
                    <div className="bold item-row" style={{ fontSize: '12px' }}>
                      <span>TOTAL</span>
                      <span>{formatRupiah(txDetails.total)}</span>
                    </div>
                    <div className="divider"></div>
                    <div className="item-row">
                      <span>Metode</span>
                      <span>{txDetails.payment_method.toUpperCase()}</span>
                    </div>
                    <div className="item-row">
                      <span>Bayar</span>
                      <span>{formatRupiah(txDetails.paid_amount)}</span>
                    </div>
                    {txDetails.change_amount > 0 && (
                      <div className="item-row">
                        <span>Kembalian</span>
                        <span>{formatRupiah(txDetails.change_amount)}</span>
                      </div>
                    )}
                    <div className="divider" style={{ marginTop: '10px' }}></div>
                    <div className="text-center" style={{ fontSize: '10px', marginTop: '6px' }}>
                      {settings?.receipt_footer}
                    </div>
                  </div>
                </div>

                {/* Void & Reprint Actions */}
                <div className="flex gap-2 pt-2 select-none">
                  {txDetails.status === 'completed' && (
                    <button
                      onClick={() => handleVoidTx(txDetails.id)}
                      className="flex-1 bg-slate-900 border border-rose-500/20 text-rose-450 hover:bg-rose-500/10 font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4 text-rose-500" />
                      Void Transaksi
                    </button>
                  )}
                  <button
                    onClick={reprintThermalReceipt}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-white" />
                    Cetak Ulang Struk
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

    </div>
  );
}
