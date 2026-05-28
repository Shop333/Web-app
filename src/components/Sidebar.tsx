/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  FolderHeart, 
  History, 
  TrendingUp, 
  Users, 
  Settings,
  ShoppingBag
} from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'kasir', label: 'Kasir POS', icon: ShoppingCart },
    { id: 'produk', label: 'Kelola Produk', icon: Package },
    { id: 'kategori', label: 'Kategori', icon: FolderHeart },
    { id: 'transaksi', label: 'Riwayat Transaksi', icon: History },
    { id: 'laporan', label: 'Laporan', icon: TrendingUp },
    { id: 'pelanggan', label: 'Data Pelanggan', icon: Users },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen h-sticky overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-500/10">
          <ShoppingBag className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-white font-semibold text-base leading-tight">MAJU POS</h1>
          <span className="text-xs text-indigo-400 font-medium">Smart Offline POS</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              id={`nav-link-${item.id}`}
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Version Details */}
      <div className="p-4 border-t border-slate-800/60 text-center">
        <p className="text-[10px] font-mono text-slate-500">
          SISTEM POS v2.6.0 • OFFLINE
        </p>
      </div>
    </aside>
  );
}
