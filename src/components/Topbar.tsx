/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { User, Clock, UserCheck, ChevronDown, Check } from 'lucide-react';

export default function Topbar() {
  const { settings, users, activeCashier, setActiveCashier, fetchUsers } = useStore();
  const [time, setTime] = useState<string>('');
  const [showPicker, setShowPicker] = useState(false);

  // Synchronize users and set default cashier on boot
  useEffect(() => {
    fetchUsers().then(() => {
      const state = useStore.getState();
      if (!state.activeCashier && state.users.length > 0) {
        // Set first user (usually Admin or first cashier) as default active cashier
        setActiveCashier(state.users[0]);
      }
    });
  }, [fetchUsers, setActiveCashier]);

  // Real-time Indonesian styled clock ticker
  useEffect(() => {
    const ticker = setInterval(() => {
      const now = new Date();
      setTime(
        now.toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }) + ' - ' + now.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    }, 1000);

    return () => clearInterval(ticker);
  }, []);

  return (
    <header id="app-topbar" className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 relative z-30">
      {/* Store Identity */}
      <div className="flex flex-col">
        <h2 className="text-sm font-semibold text-slate-100">
          {settings?.store_name || 'Toko Berkah Utama'}
        </h2>
        <span className="text-[11px] text-slate-400">
          {settings?.store_address || 'Mengambil info toko...'}
        </span>
      </div>

      {/* Clock and Active Staff profile picker */}
      <div className="flex items-center gap-5">
        {/* Real-time Clock Widget */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-850 px-3 py-1.5 rounded-xl border border-slate-800/80">
          <Clock className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-mono font-medium text-slate-300 min-w-[200px]">
            {time || 'Mengambil waktu...'}
          </span>
        </div>

        {/* Staff / Cashier Picker Dropdown */}
        <div className="relative">
          <button
            id="cashier-picker-btn"
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center gap-2.5 bg-slate-800 hover:bg-slate-750 transition-colors px-3.5 py-1.5 rounded-xl border border-slate-700/80 cursor-pointer text-slate-100 font-medium text-xs select-none"
          >
            <div className="w-5 h-5 bg-indigo-500/15 rounded-full flex items-center justify-center">
              <User className="w-3 h-3 text-indigo-400" />
            </div>
            <span>
              Kasir: <strong className="text-indigo-300">{activeCashier?.name || 'Loading...'}</strong> 
              <span className="ml-1 text-[10px] bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded-md uppercase font-bold tracking-wider">
                {activeCashier?.role || 'cashier'}
              </span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showPicker && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 z-40 bg-transparent"
                onClick={() => setShowPicker(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-slate-850 border border-slate-750 rounded-xl shadow-2xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-1 border-b border-slate-750 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                  Pilih User Aktif
                </div>
                <div className="max-h-56 overflow-y-auto scrollbar-thin">
                  {users.map((u) => {
                    const isSelected = activeCashier?.id === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          setActiveCashier(u);
                          setShowPicker(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-slate-800 text-indigo-400 font-semibold' 
                            : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{u.name}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            Role: {u.role === 'admin' ? 'Administrator' : 'Kasir'}
                          </span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
