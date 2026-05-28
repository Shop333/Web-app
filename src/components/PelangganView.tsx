/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { formatRupiah } from '../../lib/utils.js';
import { Customer } from '../types.js';
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  X, 
  Check, 
  ShoppingBag, 
  PhoneCall, 
  Mail, 
  MapPin,
  AlertCircle
} from 'lucide-react';

export default function PelangganView() {
  const { 
    customers, 
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    loading 
  } = useStore();

  const [search, setSearch] = useState('');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Alerts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [valErr, setValErr] = useState<string | null>(null);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenAddForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setValErr(null);
    setShowFormModal(true);
  };

  const handleOpenEditForm = (c: Customer) => {
    setEditingId(c.id!);
    setName(c.name);
    setPhone(c.phone || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setValErr(null);
    setShowFormModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setValErr(null);

    if (!name.trim()) {
      setValErr('Nama pelanggan wajib diisi');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim()
    };

    let result = false;
    if (editingId) {
      result = await updateCustomer(editingId, { id: editingId, ...payload });
      if (result) triggerToast('Profil pelanggan berhasil diupdate.');
    } else {
      result = await addCustomer(payload);
      if (result) triggerToast('Profil pelanggan baru ditambahkan.');
    }

    if (result) {
      setShowFormModal(false);
    } else {
      setValErr(useStore.getState().error || 'Gagal menyimpan profil pelanggan.');
    }
  };

  const handleDeleteCustomer = async (c: Customer) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus pelanggan "${c.name}"?\nSemua log transaksi miliknya akan dialihkan menjadi Pelanggan Umum.`)) {
      const res = await deleteCustomer(c.id!);
      if (res) {
        triggerToast('Profil pelanggan berhasil dihapus.');
      } else {
        triggerToast(useStore.getState().error || 'Gagal menghapus pelanggan.');
      }
    }
  };

  // Search matching customers
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search)) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Toast Alert pop */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-slate-800 border border-emerald-500/20 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold text-slate-150 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header control sections */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100">Daftar Pelanggan Toko</h2>
          <p className="text-xs text-slate-400">Kelola profilisasi, tumpukan transaksi, dan total belanja pelanggan.</p>
        </div>
        
        <button
          onClick={handleOpenAddForm}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md shadow-indigo-600/15"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Pelanggan</span>
        </button>
      </div>

      {/* Search filtering */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3 w-80 select-none">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-slate-500" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari pelanggan by nama atau telp..."
            className="w-full pl-10 pr-3 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 text-xs rounded-xl focus:outline-hidden"
          />
        </div>
      </div>

      {/* Grid of customers listing with detailed cards format */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading.customers ? (
          <div className="col-span-full p-12 text-center text-slate-500 text-xs">
            Memanggil rincian pelanggan dari SQLite...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="col-span-full p-12 text-center text-slate-550 text-xs font-semibold">
            Tidak ditemukan profil pelanggan yang sesuai pencarian.
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div 
              key={c.id} 
              className="bg-slate-850 border border-slate-800 rounded-2xl p-5 hover:bg-slate-800/80 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-indigo-500/15 rounded-xl flex items-center justify-center text-indigo-400 shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-100 text-sm leading-tight">{c.name}</h4>
                      <span className="text-[9px] text-slate-500 font-mono font-bold uppercase tracking-wider block mt-0.5">ID: CS-${String(c.id).padStart(3, '0')}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditForm(c)}
                      className="p-1.5 hover:bg-slate-900 hover:text-indigo-400 text-slate-450 rounded-lg cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(c)}
                      className="p-1.5 hover:bg-slate-900 hover:text-rose-500 text-slate-450 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Sub contact indicators */}
                <div className="space-y-1.5 mt-5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span>{c.phone || 'tanpa no. telp'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[180px]">{c.email || 'tanpa alamat email'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate max-w-[200px]">{c.address || 'tanpa alamat domisili'}</span>
                  </div>
                </div>
              </div>

              {/* Transactions re-aggregated cards */}
              <div className="grid grid-cols-2 gap-2 mt-5 pt-3.5 border-t border-slate-800/60 text-xs font-mono">
                <div className="bg-slate-900/60 p-2 rounded-xl text-center border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-sans block leading-none mb-1">Kunjungan</span>
                  <strong className="text-slate-205 text-sm">{c.total_transactions || 0}x</strong>
                </div>
                <div className="bg-slate-900/60 p-2 rounded-xl text-center border border-slate-900">
                  <span className="text-[10px] text-slate-500 font-sans block leading-none mb-1">Beban Spent</span>
                  <strong className="text-emerald-400 text-sm truncate block">{formatRupiah(c.total_spent || 0)}</strong>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

      {/* FORM MODAL: ADD / EDIT CUSTOMER */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <form 
            onSubmit={handleSaveCustomer}
            className="bg-slate-850 border border-slate-755 max-w-sm w-full rounded-2xl p-5 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-755 pb-2 mb-4">
              {editingId ? 'Edit Detail Pelanggan' : 'Daftarkan Pelanggan Baru'}
            </h3>

            {valErr && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 text-rose-450 text-[11px] font-semibold rounded-lg mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{valErr}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              
              {/* Customer Title */}
              <div>
                <label className="text-slate-400 block mb-1">Nama Lengkap Pelanggan <strong className="text-rose-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Ibu Rina, Agus Santoso"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Phone number */}
              <div>
                <label className="text-slate-400 block mb-1">Nomor Telepon / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Contoh: 0812XXXXXXXX"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Email address */}
              <div>
                <label className="text-slate-400 block mb-1">Alamat Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rudi@gmail.com"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Home Address */}
              <div>
                <label className="text-slate-400 block mb-1">Alamat Domisili / Detil Rumah</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Masukkan jalan, no, kelurahan..."
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden"
                />
              </div>

            </div>

            {/* Submissions */}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-755 text-slate-305 py-2.5 rounded-xl border border-slate-755 text-xs font-bold cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                SIMPAN PROFIL
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
