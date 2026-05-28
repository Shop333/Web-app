/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from './store.js';
import Sidebar from './components/Sidebar.js';
import Topbar from './components/Topbar.js';

// Import all sub views
import DashboardView from './components/DashboardView.js';
import KasirView from './components/KasirView.js';
import ProdukView from './components/ProdukView.js';
import KategoriView from './components/KategoriView.js';
import TransaksiView from './components/TransaksiView.js';
import LaporanView from './components/LaporanView.js';
import PelangganView from './components/PelangganView.js';
import PengaturanView from './components/PengaturanView.js';

import { Terminal, ShieldClose } from 'lucide-react';

export default function App() {
  const { fetchSettings, fetchProducts, fetchCategories, fetchTransactions, fetchCustomers, activeCashier } = useStore();
  const [activeView, setActiveView] = useState('dashboard');

  // Trigger base masters synchronization on reload
  useEffect(() => {
    fetchSettings();
    fetchProducts();
    fetchCategories();
    fetchTransactions();
    fetchCustomers();
  }, [fetchSettings, fetchProducts, fetchCategories, fetchTransactions, fetchCustomers]);

  // View routing switcher
  const renderActiveView = () => {
    switch (activeView) {
      case 'dashboard':
        return <DashboardView onViewChange={setActiveView} />;
      case 'kasir':
        return <KasirView />;
      case 'produk':
        return <ProdukView />;
      case 'kategori':
        return <KategoriView />;
      case 'transaksi':
        return <TransaksiView />;
      case 'laporan':
        return <LaporanView />;
      case 'pelanggan':
        return <PelangganView />;
      case 'pengaturan':
        // Protect setting configuration from non-admins if desired, or let everyone access, 
        // let's allow access but highlight role controls.
        return <PengaturanView />;
      default:
        return <DashboardView onViewChange={setActiveView} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans overflow-hidden antialiased selection:bg-indigo-550/30 selection:text-white">
      {/* Sidebar navigation panel - Fixed left row */}
      <Sidebar activeView={activeView} onViewChange={setActiveView} />

      {/* Main Container - Right side */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        
        {/* Top bar header */}
        <Topbar />

        {/* Dynamic viewport view content section */}
        <main className="flex-1 overflow-y-auto p-6 scrollbar-thin hover:scrollbar-thumb-slate-800 bg-slate-950/20 backdrop-blur-xs">
          <div className="max-w-[1600px] mx-auto w-full">
            {renderActiveView()}
          </div>
        </main>

      </div>
    </div>
  );
}
