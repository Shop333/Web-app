/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { formatRupiah, generateSKU } from '../../lib/utils.js';
import { Product } from '../types.js';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Upload, 
  AlertTriangle, 
  X, 
  Filter,
  CheckCircle,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function ProdukView() {
  const { 
    products, 
    categories, 
    fetchProducts, 
    fetchCategories,
    addProduct, 
    updateProduct, 
    deleteProduct,
    importProducts,
    loading 
  } = useStore();

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState<string>('all');
  const [stockStatus, setStockStatus] = useState<string>('all'); // 'all', 'low', 'out'
  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form values
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [catId, setCatId] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [minStock, setMinStock] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  // CSV Import state variables
  const [csvText, setCsvText] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // System notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [valError, setValError] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setName('');
    setSku('');
    setBarcode('');
    setCatId(categories[0]?.id ? String(categories[0].id) : '');
    setPrice('');
    setCostPrice('');
    setStock('');
    setMinStock('5');
    setUnit('pcs');
    setImageUrl('');
    setDescription('');
    setIsActive(true);
    setValError(null);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (p: Product) => {
    setEditingId(p.id!);
    setName(p.name);
    setSku(p.sku);
    setBarcode(p.barcode || '');
    setCatId(p.category_id ? String(p.category_id) : '');
    setPrice(String(p.price));
    setCostPrice(String(p.cost_price));
    setStock(String(p.stock));
    setMinStock(String(p.min_stock));
    setUnit(p.unit);
    setImageUrl(p.image_url || '');
    setDescription(p.description || '');
    setIsActive(p.is_active === 1);
    setValError(null);
    setShowFormModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setValError(null);

    if (!name.trim()) {
      setValError('Nama produk tidak boleh kosong');
      return;
    }
    if (!price || parseFloat(price) <= 0) {
      setValError('Harga jual harus lebih besar dari 0');
      return;
    }

    const payload = {
      name,
      sku: sku.trim() || generateSKU(name),
      barcode,
      category_id: catId ? parseInt(catId) : null,
      price: parseFloat(price),
      cost_price: parseFloat(costPrice) || 0,
      stock: parseInt(stock) || 0,
      min_stock: parseInt(minStock) || 5,
      unit,
      image_url: imageUrl,
      description,
      is_active: isActive ? 1 : 0
    };

    let success = false;
    if (editingId) {
      success = await updateProduct(editingId, { id: editingId, ...payload });
      if (success) triggerToast('Produk berhasil diupdate!');
    } else {
      success = await addProduct(payload);
      if (success) triggerToast('Produk baru berhasil didaftarkan!');
    }

    if (success) {
      setShowFormModal(false);
    } else {
      setValError(useStore.getState().error || 'Kesalahan sistem dalam memproses database.');
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus produk "${p.name}"?`)) {
      const success = await deleteProduct(p.id!);
      if (success) {
        triggerToast('Produk berhasil dihapus dari master sistem.');
      } else {
        triggerToast(useStore.getState().error || 'Produk gagal dihapus.');
      }
    }
  };

  // CSV processing parser (Excel compatible semi-colon or comma delimitations)
  const handleImportCsv = async () => {
    setImportStatus(null);
    if (!csvText.trim()) {
      setImportStatus('Gagal: Teks CSV kosong');
      return;
    }

    const lines = csvText.split('\n');
    const parsedProducts = [];
    
    // Header pattern expected: name,sku,price,cost_price,stock,min_stock,unit,description
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(/[;,]/); // Split by comma or semicolon
      if (cols.length < 3) continue;

      parsedProducts.push({
        name: cols[0]?.replace(/"/g, '').trim(),
        sku: cols[1]?.replace(/"/g, '').trim(),
        barcode: cols[2]?.replace(/"/g, '').trim(),
        price: parseFloat(cols[3]) || 0,
        cost_price: parseFloat(cols[4]) || 0,
        stock: parseInt(cols[5]) || 0,
        min_stock: parseInt(cols[6]) || 5,
        unit: cols[7]?.replace(/"/g, '').trim() || 'pcs',
        description: cols[8]?.replace(/"/g, '').trim() || ''
      });
    }

    if (parsedProducts.length === 0) {
      setImportStatus('Gagal: Format baris data tidak terdeteksi');
      return;
    }

    const res = await importProducts(parsedProducts);
    if (res) {
      setImportStatus(`Sukses mengimport ${parsedProducts.length} produk ke POS.`);
      setCsvText('');
      setTimeout(() => setShowImportModal(false), 2000);
    } else {
      setImportStatus(`Gagal: ${useStore.getState().error}`);
    }
  };

  // Generate Sample CSV format text for helper downloads
  const getSampleCSV = () => {
    return "nama,sku,barcode,harga_jual,harga_beli,stok_awal,stok_min,satuan,deskripsi\n" +
      "Produk Contoh A,SKU-SAMPLE-1,123456789,15000,9000,100,5,pcs,Contoh Deskripsi\n" +
      "Produk Contoh B,,987654321,22000,14000,50,5,pack,Cemilan Gurih";
  };

  // Filter list
  const filteredList = products.filter(p => {
    // Search match
    const searchMatch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()) || (p.barcode && p.barcode.includes(search));
    
    // Category match
    const catMatch = selectedCat === 'all' || String(p.category_id) === selectedCat;
    
    // Stock boundary filter
    let stockMatch = true;
    if (stockStatus === 'low') {
      stockMatch = p.stock <= p.min_stock;
    } else if (stockStatus === 'out') {
      stockMatch = p.stock <= 0;
    }

    return searchMatch && catMatch && stockMatch;
  });

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Toast popup alerts */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-slate-800 border border-emerald-500/20 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold text-slate-150 animate-bounce">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header controls layout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Kelola Produk & Stok</h2>
          <p className="text-xs text-slate-400">Total terdaftar: <strong className="text-indigo-400 font-mono">{products.length}</strong> produk di database local.</p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 select-none">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-750 text-xs text-slate-200 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Import CSV</span>
          </button>
          
          <button
            id="add-product-btn"
            onClick={handleOpenAddForm}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/15"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Produk</span>
          </button>
        </div>
      </div>

      {/* Filtering control row */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center gap-3 select-none">
        
        {/* Row 1: Search query */}
        <div className="relative w-full md:flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari produk berdasarkan name, SKU, atau Barcode..."
            className="w-full pl-9 pr-3 py-2 bg-slate-850 hover:bg-slate-800/80 border border-slate-750 rounded-xl text-slate-200 placeholder-slate-500 text-xs focus:outline-hidden"
          />
        </div>

        {/* Row 2: Category Selector */}
        <div className="w-full md:w-56 flex items-center gap-2.5 bg-slate-850 border border-slate-755 rounded-xl px-2 py-1 relative">
          <Filter className="w-3.5 h-3.5 text-slate-450" />
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-350 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Row 3: Stock status filter */}
        <div className="w-full md:w-48 flex items-center gap-2.5 bg-slate-850 border border-slate-755 rounded-xl px-2 py-1">
          <AlertTriangle className="w-3.5 h-3.5 text-slate-450" />
          <select
            value={stockStatus}
            onChange={(e) => setStockStatus(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-350 font-semibold focus:outline-hidden cursor-pointer"
          >
            <option value="all">Semua Status Stok</option>
            <option value="low">Stok Mengkhawatirkan</option>
            <option value="out">Habis Total (0)</option>
          </select>
        </div>
      </div>

      {/* Primary Datagrid spreadsheet */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs select-none">
            <thead>
              <tr className="bg-slate-850/80 text-slate-300 font-bold border-b border-slate-800">
                <th className="p-3.5">Produk</th>
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Kategori</th>
                <th className="p-3.5 text-right">Modal</th>
                <th className="p-3.5 text-right">Harga Jual</th>
                <th className="p-3.5 text-center">Stok</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-200">
              {loading.products ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500 font-normal">
                    Mengambil data persediaan barang dari SQLite server...
                  </td>
                </tr>
              ) : filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-550 font-normal">
                    Tidak ditemukan daftar produk yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredList.map((p) => {
                  const isLow = p.stock <= p.min_stock;
                  const isOut = p.stock <= 0;
                  return (
                    <tr key={p.id} className="hover:bg-slate-850/45 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-750 flex items-center justify-center text-[10px] font-bold text-slate-500 overflow-hidden shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              p.sku.substring(4, 7) || 'PRD'
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-100 text-sm leading-tight block">{p.name}</span>
                            <span className="text-[10px] text-slate-450 block font-normal">{p.barcode || 'tiada barcode'} • {p.unit}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-350">{p.sku}</td>
                      <td className="p-3.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] text-slate-300 bg-slate-800">
                          {p.category_name || 'Tanpa Kategori'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono text-slate-450">{formatRupiah(p.cost_price)}</td>
                      <td className="p-3.5 text-right font-mono text-indigo-300 font-bold">{formatRupiah(p.price)}</td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold font-mono text-[10px] ${
                          isOut 
                            ? 'bg-rose-500/15 text-rose-455' 
                            : isLow 
                              ? 'bg-amber-500/15 text-amber-450' 
                              : 'bg-slate-800 text-slate-305'
                        }`}>
                          {p.stock}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          p.is_active === 1 
                            ? 'bg-emerald-500/10 text-emerald-450' 
                            : 'bg-slate-800 text-slate-500'
                        }`}>
                          {p.is_active === 1 ? 'AKTIF' : 'NONAKTIF'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-2 text-right">
                          <button
                            onClick={() => handleOpenEditForm(p)}
                            className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 text-slate-400 rounded-lg Transition-all cursor-pointer"
                            title="Edit data produk"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 hover:bg-slate-800 hover:text-rose-500 text-slate-400 rounded-lg transition-all cursor-pointer"
                            title="Hapus produk"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM DIALOG MODAL: ADD / EDIT PRODUCT */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <form 
            onSubmit={handleSaveProduct}
            className="bg-slate-850 border border-slate-750 max-w-lg w-full rounded-2xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-thin"
          >
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-750 pb-2 mb-4">
              {editingId ? 'Edit Detail Produk' : 'Registrasikan Produk Baru'}
            </h3>

            {valError && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg text-rose-450 text-[11px] font-semibold flex items-center gap-2 mb-3 leading-normal">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{valError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs">
              
              {/* Product title */}
              <div>
                <label className="text-slate-400 block mb-1">Nama Produk <strong className="text-rose-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Kopi Latte Premium, Sabun Cair"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* SKU and Barcode twin columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">SKU (Auto-gen bila kosong)</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Contoh: SKU-KOPI-02"
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Barcode scanner ID</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Masukan serial barcode..."
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Category, Stock units twin columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Kategori Produk</label>
                  <select
                    value={catId}
                    onChange={(e) => setCatId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="">Tanpa Kategori</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Satuan Produk</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Contoh: pcs, porsi, botol, keping"
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Buying / Selling Price Twin Columns */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Harga Beli (Modal)</label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    placeholder="Rp"
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Harga Jual <strong className="text-rose-500">*</strong></label>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Rp"
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Stock and Limit Alert Threshold levels */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Stok Awal</label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="Kuantitas sisa..."
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Stok Limit Minimal Alert</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Image URL path finder */}
              <div>
                <label className="text-slate-400 block mb-1">Image URL (Tinggalkan kosong untuk default)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://image-cloud.com/product..."
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              {/* Text Description fields */}
              <div>
                <label className="text-slate-400 block mb-1">Keterangan / Deskripsi Produk</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="..."
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden"
                />
              </div>

              {/* Status active boolean checkbox toggle */}
              <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <input
                  id="isActiveCheck"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer shrink-0"
                />
                <label htmlFor="isActiveCheck" className="text-slate-300 cursor-pointer text-xs font-semibold select-none">
                  Aktifkan produk ini (Ditampilkan di layar pilihan POS kasir)
                </label>
              </div>

            </div>

            {/* Form actions submits */}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 py-2.5 rounded-xl border border-slate-755 text-xs font-bold cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                SIMPAN PRODUK
              </button>
            </div>

          </form>
        </div>
      )}

      {/* CSV SPREADSHEET BULK IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <div className="bg-slate-850 border border-slate-750 max-w-lg w-full rounded-2xl p-5 shadow-2xl relative">
            
            <button
              onClick={() => setShowImportModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-750 pb-2 mb-3 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
              Mutil-Row CSV Bulk Import
            </h3>

            {importStatus && (
              <div className={`p-2.5 rounded-xl text-xs font-semibold mb-3 leading-normal border ${
                importStatus.includes('Sukses') 
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-450' 
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-450'
              }`}>
                {importStatus}
              </div>
            )}

            <div className="space-y-3.5 text-xs select-none">
              <p className="text-slate-400 text-xs">
                Masukkan baris data produk yang dipisahkan sela koma atau titik koma (CSV format). Header baris pertama wajib dicantumkan sesuai ketentuan.
              </p>

              <div>
                <span className="text-slate-400 font-medium block mb-1">Contoh/Template Format CSV:</span>
                <pre className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-[10px] font-mono text-indigo-300 overflow-x-auto select-all">
                  {getSampleCSV()}
                </pre>
              </div>

              <div>
                <label className="text-slate-400 block mb-1">Tempelkan Teks CSV Kemari:</label>
                <textarea
                  rows={5}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="nama,sku,barcode,harga_jual,harga_beli,stok_awal,stok_min,satuan,deskripsi..."
                  className="w-full bg-slate-900 border border-slate-750 rounded-xl px-3 py-2 text-slate-200 font-mono text-xs focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                BATAL
              </button>
              <button
                onClick={handleImportCsv}
                className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2/5 rounded-xl text-xs font-bold cursor-pointer"
              >
                PROSES IMPORT DATA
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
