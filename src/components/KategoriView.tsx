/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { Category } from '../types.js';
import { 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  FolderHeart,
  Palette,
  Check,
  Flame,
  CupSoda,
  Cookie,
  Package,
  Home,
  Tags
} from 'lucide-react';

export default function KategoriView() {
  const { 
    categories, 
    fetchCategories, 
    addCategory, 
    updateCategory, 
    deleteCategory,
    loading 
  } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [selectedIcon, setSelectedIcon] = useState('Package');

  // Custom Notifications / validations
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [valErr, setValErr] = useState<string | null>(null);

  // Load masters on load
  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Pre-selected styling color options matching indigo palette
  const presetColors = [
    '#6366f1', // Indigo
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#10b981', // Green
    '#f59e0b', // Yellow
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#14b8a6', // Teal
  ];

  // Map of preset icons we support
  const presetIcons = [
    { id: 'Flame', icon: Flame, desc: 'Makanan' },
    { id: 'CupSoda', icon: CupSoda, desc: 'Minuman' },
    { id: 'Cookie', icon: Cookie, desc: 'Camilan' },
    { id: 'Package', icon: Package, desc: 'Sembako' },
    { id: 'Home', icon: Home, desc: 'Rumah' },
    { id: 'Tags', icon: Tags, desc: 'Atribut' },
  ];

  const handleOpenAddForm = () => {
    setEditingId(null);
    setName('');
    setSelectedColor('#6366f1');
    setSelectedIcon('Package');
    setValErr(null);
    setShowModal(true);
  };

  const handleOpenEditForm = (c: Category) => {
    setEditingId(c.id!);
    setName(c.name);
    setSelectedColor(c.color);
    setSelectedIcon(c.icon);
    setValErr(null);
    setShowModal(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setValErr(null);

    if (!name.trim()) {
      setValErr('Nama kategori wajib diisi.');
      return;
    }

    const payload = {
      name: name.trim(),
      color: selectedColor,
      icon: selectedIcon
    };

    let result = false;
    if (editingId) {
      result = await updateCategory(editingId, { id: editingId, ...payload });
      if (result) triggerToast('Kategori berhasil diperbarui.');
    } else {
      result = await addCategory(payload);
      if (result) triggerToast('Kategori baru ditambahkan.');
    }

    if (result) {
      setShowModal(false);
    } else {
      setValErr(useStore.getState().error || 'Gagal menyimpan kategori.');
    }
  };

  const handleDeleteCategory = async (c: Category) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus kategori "${c.name}"?\nSemua produk di dalam kategori ini tidak akan memiliki kategori (NULL).`)) {
      const result = await deleteCategory(c.id!);
      if (result) {
        triggerToast('Kategori berhasil dihapus.');
      } else {
        triggerToast(useStore.getState().error || 'Gagal menghapus kategori.');
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Toast Alert popup */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-slate-800 border border-emerald-500/20 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold text-slate-150 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header sections */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Kategori Persediaan</h2>
          <p className="text-xs text-slate-400">Atur kategori dengan tag warna untuk merapikan layout POS kasir.</p>
        </div>
        
        <button
          onClick={handleOpenAddForm}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori</span>
        </button>
      </div>

      {/* Categories Grid displays with total count indices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {loading.categories ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs">
            Mengambil data kategori dari SQLite datastore...
          </div>
        ) : categories.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs text-slate-550">
            Kategori kosong. Daftarkan kategori baru di atas untuk mengelompokkan barang.
          </div>
        ) : (
          categories.map((c) => {
            // Find matched icon representation
            const iconObj = presetIcons.find(i => i.id === c.icon) || presetIcons[3];
            const IconComp = iconObj.icon;
            
            return (
              <div 
                key={c.id} 
                className="bg-slate-850 hover:bg-slate-800/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between transition-all hover:scale-101 relative group"
              >
                {/* Decorative background circle */}
                <div 
                  className="absolute -top-3 -right-3 w-16 h-16 rounded-full opacity-5 group-hover:opacity-10 transition-all"
                  style={{ backgroundColor: c.color }}
                />

                <div className="flex items-center gap-3.5 mb-5">
                  <div 
                    className="p-3 rounded-xl text-white shadow-lg"
                    style={{ backgroundColor: c.color, boxShadow: `0 8px 16px -4px ${c.color}20` }}
                  >
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-150 leading-snug">{c.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wider uppercase block mt-0.5">
                      SISTEM {c.icon} ICON
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-800/40 text-xs">
                  <span className="text-slate-400">
                    Isi: <strong className="text-slate-200 font-mono">{c.product_count || 0}</strong> produk
                  </span>
                  
                  <div className="flex items-center gap-1 relative z-20">
                    <button
                      onClick={() => handleOpenEditForm(c)}
                      className="p-1.5 hover:bg-slate-800 hover:text-indigo-400 text-slate-400 rounded-lg cursor-pointer"
                      title="Edit kategori"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c)}
                      className="p-1.5 hover:bg-slate-800 hover:text-rose-500 text-slate-400 rounded-lg cursor-pointer"
                      title="Hapus kategori"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FORM DIALOG: ADD / EDIT CATEGORY */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <form 
            onSubmit={handleSaveCategory}
            className="bg-slate-850 border border-slate-755 max-w-sm w-full rounded-2xl p-5 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-755 pb-2 mb-4">
              {editingId ? 'Edit Kategori Tag' : 'Daftarkan Kategori Baru'}
            </h3>

            {valErr && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 text-rose-450 text-[11px] font-semibold rounded-lg mb-3">
                {valErr}
              </div>
            )}

            <div className="space-y-4 text-xs">
              
              {/* Category title */}
              <div>
                <label className="text-slate-400 block mb-1">Nama Kategori <strong className="text-rose-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Misal: Sembako, Kebutuhan Rumah"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-255 focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Color preset list select */}
              <div>
                <label className="text-slate-400 block mb-2 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-indigo-400" />
                  Warna Identitas Tag
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {presetColors.map((color) => {
                    const isSel = selectedColor === color;
                    return (
                      <button
                        type="button"
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className="h-8 rounded-lg border border-slate-755 cursor-pointer relative flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        {isSel && (
                          <div className="w-4 h-4 bg-slate-905/85 rounded-full flex items-center justify-center text-white">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <div className="col-span-4 flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-450">Color Selector:</span>
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      className="w-8 h-6 bg-transparent border-none cursor-pointer p-0"
                    />
                    <span className="font-mono text-[10px] text-slate-350">{selectedColor}</span>
                  </div>
                </div>
              </div>

              {/* Icon preset list select */}
              <div>
                <label className="text-slate-400 block mb-2">Simbol Ikon Representatif</label>
                <div className="grid grid-cols-3 gap-2">
                  {presetIcons.map((i) => {
                    const isSel = selectedIcon === i.id;
                    const IconComp = i.icon;
                    return (
                      <button
                        type="button"
                        key={i.id}
                        onClick={() => setSelectedIcon(i.id)}
                        className={`flex items-center gap-1.5 p-2 border rounded-lg cursor-pointer text-[10px] font-semibold transition-all select-none ${
                          isSel 
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-400' 
                            : 'bg-slate-800 border-slate-755 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                        <span>{i.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Modal actions submissions */}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-300 py-2.5 rounded-xl border border-slate-756 text-xs font-bold cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                SIMPAN KATEGORI
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
