/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { User, StoreSettings } from '../types.js';
import { 
  Settings as SettingIcon, 
  UserPlus, 
  Trash2, 
  UserSquare2, 
  Save, 
  RotateCcw, 
  Check, 
  X,
  AlertCircle,
  Database,
  Lock,
  Building
} from 'lucide-react';

export default function PengaturanView() {
  const { 
    settings, 
    fetchSettings, 
    updateSettings,
    users, 
    fetchUsers, 
    addUser, 
    updateUser, 
    deleteUser,
    loading 
  } = useStore();

  const [activeSubTab, setActiveSubTab] = useState('store'); // 'store', 'users', 'database'

  // Store profile configurations
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [taxRate, setTaxRate] = useState('11');
  const [receiptFooter, setReceiptFooter] = useState('');

  // Cashier lists forms
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'admin' | 'cashier'>('cashier');
  const [userPassStr, setUserPassStr] = useState('');

  // System status alerts
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [valErr, setValErr] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchUsers();
  }, [fetchSettings, fetchUsers]);

  // Sync internal state with fetched settings
  useEffect(() => {
    if (settings) {
      setStoreName(settings.store_name);
      setStoreAddress(settings.store_address);
      setStorePhone(settings.store_phone);
      setTaxRate(String(settings.tax_rate));
      setReceiptFooter(settings.receipt_footer);
    }
  }, [settings]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleSaveStoreSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim()) {
      triggerToast('Nama toko tidak boleh kosong.');
      return;
    }

    const payload: Record<string, string> = {
      store_name: storeName.trim(),
      store_address: storeAddress.trim(),
      store_phone: storePhone.trim(),
      tax_rate: taxRate,
      receipt_footer: receiptFooter.trim()
    };

    const res = await updateSettings(payload);
    if (res) {
      triggerToast('Profil Toko berhasil diperbarui.');
    } else {
      triggerToast(useStore.getState().error || 'Gagal menyimpan profil toko.');
    }
  };

  // Staff User accounts handlers
  const handleOpenUserAdd = () => {
    setEditUserId(null);
    setUserName('');
    setUserEmail('');
    setUserRole('cashier');
    setUserPassStr('');
    setValErr(null);
    setShowUserModal(true);
  };

  const handleOpenUserEdit = (u: User) => {
    setEditUserId(u.id!);
    setUserName(u.name);
    setUserEmail(u.email);
    setUserRole(u.role);
    setUserPassStr(''); // leave empty to not change pass by default
    setValErr(null);
    setShowUserModal(true);
  };

  const handleSaveUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setValErr(null);

    if (!userName.trim()) {
      setValErr('Nama Lengkap wajib diisi.');
      return;
    }
    if (!userEmail.trim()) {
      setValErr('Email / ID Login wajib diisi.');
      return;
    }

    const payload = {
      name: userName.trim(),
      email: userEmail.trim(),
      role: userRole,
      password: userPassStr.trim() || undefined
    };

    let res = false;
    if (editUserId) {
      res = await updateUser(editUserId, { id: editUserId, ...payload });
      if (res) triggerToast('Profil akun kasir diperbarui.');
    } else {
      if (!userPassStr.trim()) {
        setValErr('Sandi password wajib dicantumkan untuk akun staf baru.');
        return;
      }
      res = await addUser(payload);
      if (res) triggerToast('Akun staf kasir baru berhasil didaftarkan.');
    }

    if (res) {
      setShowUserModal(false);
    } else {
      setValErr(useStore.getState().error || 'Email / ID Login sudah digunakan.');
    }
  };

  const handleDeleteUserAccount = async (u: User) => {
    if (users.length <= 1) {
      triggerToast('Proteksi keamanan: Harus ada minimal 1 akun Administrator di dalam sistem.');
      return;
    }
    if (window.confirm(`Apakah Anda yakin ingin menghapus akun staf "${u.name}"?`)) {
      const res = await deleteUser(u.id!);
      if (res) {
        triggerToast('Akun staf berhasil dihapus.');
      } else {
        triggerToast(useStore.getState().error || 'Gagal menghapus akun staf.');
      }
    }
  };

  // Heavy destructive DB purges triggers
  const executeHardResetDB = async (type: string) => {
    if (window.confirm(`⚠️ PERINGATAN KERAS! ⚠️\nApakah Anda benar-benar yakin ingin melakukan RESET database?\nTindakan ini bersifat Permanen dan tidak dapat dibatalkan.`)) {
      const pin = window.prompt('Tulis kata kunci "KONFIRMASI" di bawah ini untuk memulai proses reset:');
      if (pin !== 'KONFIRMASI') {
        alert('Set ulang dibatalkan: Kata kunci tidak cocok.');
        return;
      }

      try {
        const res = await fetch('/api/settings/reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type }) // 'transactions_only', 'all'
        });
        const json = await res.json();
        if (json.success) {
          alert('Database berhasil direset ke pengaturan awal pabrik!');
          window.location.reload();
        } else {
          alert('Gagal: ' + json.error);
        }
      } catch (err) {
        alert('Kesalahan jaringan: Gagal terhubung ke SQLite.');
      }
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200 select-none">
      
      {/* Toast popup Alert */}
      {toastMsg && (
        <div className="fixed top-20 right-6 bg-slate-800 border border-emerald-500/20 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 text-xs font-semibold text-slate-150 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header sections */}
      <div>
        <h2 className="text-xl font-bold text-slate-100">Pengaturan Toko & Manajemen</h2>
        <p className="text-xs text-slate-400">Atur profil resi, pajak PPN global, batasan akun kasir, dan cadangan database SQLite.</p>
      </div>

      {/* Sub category tabs navigation layout */}
      <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-xl w-full max-w-sm select-none">
        <button
          onClick={() => setActiveSubTab('store')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'store' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          Profil Toko
        </button>
        <button
          onClick={() => setActiveSubTab('users')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'users' 
              ? 'bg-indigo-600 text-white shadow-xs' 
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          Staff & Kasir
        </button>
        <button
          onClick={() => setActiveSubTab('database')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg cursor-pointer transition-colors ${
            activeSubTab === 'database' 
              ? 'bg-rose-600 text-white shadow-xs' 
              : 'text-slate-400 hover:text-slate-205'
          }`}
        >
          Sistem DB
        </button>
      </div>

      {activeSubTab === 'store' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-2xl select-none">
          <h3 className="text-sm font-bold text-slate-100 mb-4 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-indigo-400" />
            Informasi Profil Toko & Pencetakan Resi Struk
          </h3>

          <form onSubmit={handleSaveStoreSettings} className="space-y-4 text-xs">
            
            {/* Store title Name */}
            <div>
              <label className="text-slate-400 block mb-1">Nama Toko / Outlet Usaha <strong className="text-rose-500">*</strong></label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Misal: Coffee Shop Jaya, Toko Sembako Jaya"
                className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            {/* Address */}
            <div>
              <label className="text-slate-400 block mb-1">Alamat Ofisial Outlet</label>
              <input
                type="text"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Jln. Raya Barat No. 10..."
                className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 rounded-xl px-3 py-2 text-slate-200"
              />
            </div>

            {/* Twin: Phone and PPN tax */}
            <div className="grid grid-cols-2 gap-3.5">
              <div>
                <label className="text-slate-400 block mb-1">No. Telp Toko / No. WA</label>
                <input
                  type="text"
                  value={storePhone}
                  onChange={(e) => setStorePhone(e.target.value)}
                  placeholder="0813-XXXX-XXXX"
                  className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 font-mono rounded-xl px-3 py-2 text-slate-202"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Persentase Pajak Jual (PPN %)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    placeholder="11"
                    min="0"
                    max="100"
                    className="w-full bg-slate-850 hover:bg-slate-800 border border-slate-750 font-mono font-bold rounded-xl px-3 py-2 text-slate-202"
                  />
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-slate-500 font-bold">%</div>
                </div>
              </div>
            </div>

            {/* Footer messaging on printed receipts */}
            <div>
              <label className="text-slate-400 block mb-1">Catatan Kaki Resi (Footer Struk Thermal)</label>
              <textarea
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Terima kasih atas kunjungan Anda!, Barang laku tidak dapat dikembalikan..."
                rows={2}
                className="w-full bg-slate-855 hover:bg-slate-800 border border-slate-750 rounded-xl px-3 py-2"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-550 text-white font-bold px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 transition-all text-xs"
              >
                <Save className="w-4 h-4" />
                Simpan Profil Toko
              </button>
            </div>

          </form>
        </div>
      )}

      {activeSubTab === 'users' && (
        <div className="space-y-4">
          
          <div className="flex justify-between items-center w-full max-w-3xl">
            <h3 className="text-sm font-bold text-slate-100">Daftar Akun Otoritas Staf Kasir</h3>
            <button
              id="add-user-btn"
              onClick={handleOpenUserAdd}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-550 text-white text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Daftarkan Akun
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden w-full max-w-3xl select-none">
            <table className="w-full text-left font-medium text-xs">
              <thead>
                <tr className="bg-slate-850 text-slate-350 border-b border-slate-800">
                  <th className="p-3.5">Nama & Email Staf</th>
                  <th className="p-3.5">Role Otoritas</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-850/30">
                    <td className="p-3.5 font-bold flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-indigo-600/15 text-indigo-400 flex items-center justify-center">
                        <UserSquare2 className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-slate-100">{u.name}</span>
                        <span className="block text-[10px] text-slate-400 font-normal font-mono">{u.email}</span>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.role === 'admin' 
                          ? 'bg-purple-500/10 text-purple-400' 
                          : 'bg-slate-850 text-slate-350'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenUserEdit(u)}
                          className="px-2.5 py-1.5 hover:bg-slate-800 text-indigo-400 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Atur
                        </button>
                        <button
                          onClick={() => handleDeleteUserAccount(u)}
                          className="px-2.5 py-1.5 hover:bg-slate-800 text-rose-500 text-[11px] font-bold rounded-lg cursor-pointer"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {activeSubTab === 'database' && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl w-full max-w-2xl select-none text-xs">
          <h3 className="text-sm font-bold text-rose-450 border-b border-slate-800 pb-2 mb-4 flex items-center gap-2">
            <Database className="w-4 h-4 text-rose-500" />
            Konfigurasi & Set Ulang Database (Destruktif)
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Option A: purge transaction journal sheets but keep product master */}
              <div className="bg-slate-850 border border-rose-500/15 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-rose-450 mb-1 flex items-center gap-1">
                    Cosmetic Purge: Riwayat Jurnal
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Mengosongkan seluruh riwayat penjualan, invoice, dan rekap keuangan pada kasir. Daftar produk dan kategori tag tetap utuh di database SQLite.
                  </p>
                </div>
                <button
                  onClick={() => executeHardResetDB('transactions_only')}
                  className="w-full bg-rose-600/15 hover:bg-rose-600/30 text-rose-450 font-bold py-2 rounded-lg text-center mt-4 transition-colors cursor-pointer"
                >
                  Kosongkan Transaksi
                </button>
              </div>

              {/* Option B: Clean slate hard factory reset */}
              <div className="bg-slate-850 border border-rose-500/15 p-4 rounded-xl flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-rose-450 mb-1 flex items-center gap-1">
                    Full System Wipe: Reset Total
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    Menghapus seluruh transaksi, produk, kategori tag, profil pelanggan, dan mengembalikan user admin ke akun default bawaan pabrik.
                  </p>
                </div>
                <button
                  onClick={() => executeHardResetDB('all')}
                  className="w-full bg-rose-600 hover:bg-rose-550 text-white font-bold py-2 rounded-lg text-center mt-4 transition-colors cursor-pointer"
                >
                  Set Ulang Total Toko
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL USER / CASHIER ACCOUNTS DETAIL */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs select-none animate-in fade-in duration-150">
          <form 
            onSubmit={handleSaveUserAccount}
            className="bg-slate-850 border border-slate-755 max-w-sm w-full rounded-2xl p-5 shadow-2xl relative"
          >
            <button
              type="button"
              onClick={() => setShowUserModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-250 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-bold text-slate-100 border-b border-slate-755 pb-2 mb-4">
              {editUserId ? 'Detail Otoritas Akun Kasir' : 'Daftarkan Akun Kasir Baru'}
            </h3>

            {valErr && (
              <div className="bg-rose-500/10 border border-rose-500/20 p-2 text-rose-450 text-[11px] font-semibold rounded-lg mb-3 flex items-center gap-1.5 leading-normal">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{valErr}</span>
              </div>
            )}

            <div className="space-y-4 text-xs">
              
              {/* Name field */}
              <div>
                <label className="text-slate-400 block mb-1">Nama Lengkap Staf <strong className="text-rose-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Misal: Rudi Hermawan"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Email field */}
              <div>
                <label className="text-slate-400 block mb-1">ID Login / Email <strong className="text-rose-500">*</strong></label>
                <input
                  type="text"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Misal: rudi@maju.pos or rudi"
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500 font-mono"
                />
              </div>

              {/* Password field string */}
              <div>
                <label className="text-slate-400 block mb-1">
                  {editUserId ? 'Password Baru (Biarkan kosong jika tetap)' : 'Kata Sandi / Password Staf *'}
                </label>
                <input
                  type="password"
                  required={!editUserId}
                  value={userPassStr}
                  onChange={(e) => setUserPassStr(e.target.value)}
                  placeholder="Isi sandi pengaman..."
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {/* Role dropdown lists */}
              <div>
                <label className="text-slate-400 block mb-1">Role Akun Otoritas</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value as 'admin' | 'cashier')}
                  className="w-full bg-slate-900 border border-slate-754 rounded-xl px-3 py-2 text-slate-202 text-xs focus:outline-hidden focus:border-indigo-500 font-semibold cursor-pointer"
                >
                  <option value="cashier">CASHIER (Hanya halaman Kasir, Transaksi, Laporan, Pelanggan)</option>
                  <option value="admin">ADMINISTRATOR (Akses Penuh Semua Pengaturan & Set Ulang Database)</option>
                </select>
              </div>

            </div>

            {/* Modal action buttons */}
            <div className="flex gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-755 text-slate-305 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                BATAL
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-550 text-white py-2.5 rounded-xl text-xs font-bold cursor-pointer"
              >
                SIMPAN AKUN
              </button>
            </div>

          </form>
        </div>
      )}

    </div>
  );
}
