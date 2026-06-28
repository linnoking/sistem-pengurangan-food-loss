/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { Sprout, ShoppingBag, ShieldAlert, Sliders, RefreshCw, Layers, Lock } from 'lucide-react';
import { Role } from '../types';

export default function Navbar() {
  const { activeRole, setRole, resetAllData } = useApp();

  const rolesList: { id: Role; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    {
      id: 'PETANI',
      label: 'Petani',
      icon: <Sprout className="w-4 h-4" />,
      color: 'bg-nat-green text-white border-nat-green hover:bg-nat-green-hover',
      desc: 'Melaporkan jadwal tanam, memantau risiko susut, dan mencocokkan panen.',
    },
    {
      id: 'PEMBELI',
      label: 'Pembeli / Koperasi',
      icon: <ShoppingBag className="w-4 h-4" />,
      color: 'bg-nat-brown text-white border-nat-brown hover:opacity-95',
      desc: 'Menginput kebutuhan komoditas, mengajukan pre-order, dan membeli surplus.',
    },
    {
      id: 'DINAS',
      label: 'Dinas Pertanian',
      icon: <Layers className="w-4 h-4" />,
      color: 'bg-nat-dark text-white border-nat-dark hover:opacity-95',
      desc: 'Memonitoring sebaran wilayah surplus, risiko busuk, dan laporan agregat.',
    },
    {
      id: 'ADMIN',
      label: 'Admin',
      icon: <Sliders className="w-4 h-4" />,
      color: 'bg-nat-sage text-white border-nat-sage hover:opacity-95',
      desc: 'Mengatur bobot algoritma pencocokan (lokasi, volume, harga) dan reset sistem.',
    },
    {
      id: 'BLOCKCHAIN',
      label: 'Blockchain Ledger',
      icon: <Lock className="w-4 h-4 text-emerald-400" />,
      color: 'bg-slate-900 text-white border-slate-900 hover:bg-slate-850',
      desc: 'Melihat histori transaksi pre-order terenkripsi dan verifikasi contract.',
    },
  ];

  return (
    <header className="bg-white border-b border-nat-border sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-nat-green rounded-xl flex items-center justify-center shadow-md shadow-nat-green/10">
              <Sprout className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-nat-dark tracking-tight leading-none">
                SinergiTani <span className="font-normal text-nat-sage">FoodLoss</span>
              </h1>
              <p className="text-[10px] font-semibold text-nat-sage tracking-wider uppercase mt-1">
                Sistem Mitigasi Food Loss & Sinergi Hulu-Hilir
              </p>
            </div>
          </div>

          {/* Quick Info & Action */}
          <div className="flex items-center space-x-4">
            <button
              onClick={resetAllData}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-nat-text hover:text-nat-green hover:bg-nat-light-cream rounded-lg transition-colors border border-transparent hover:border-nat-border"
              title="Kembalikan data ke kondisi awal"
              id="reset-data-btn"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="font-medium">Reset Data</span>
            </button>
            <div className="hidden md:flex items-center space-x-2 bg-nat-light-cream text-nat-green text-xs px-3 py-1.5 rounded-full font-semibold border border-nat-border">
              <div className="w-1.5 h-1.5 bg-nat-green rounded-full animate-pulse" />
              <span>Sinergi Hulu-Hilir Aktif</span>
            </div>
          </div>
        </div>

        {/* Demo Role Switcher Bar */}
        <div className="border-t border-nat-light-cream py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-nat-green shrink-0" />
            <span className="text-xs font-semibold text-nat-dark">Simulasi Peran MVP:</span>
            <span className="text-[11px] text-nat-sage hidden lg:inline">Klik peran di bawah untuk menguji alur kerja lengkap hulu-hilir</span>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {rolesList.map((role) => {
              const isSelected = activeRole === role.id;
              return (
                <button
                  key={role.id}
                  id={`role-btn-${role.id.toLowerCase()}`}
                  onClick={() => setRole(role.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? `${role.color} ring-2 ring-nat-green/20 font-semibold shadow-sm`
                      : 'bg-white text-nat-text border-nat-border hover:bg-nat-light-cream hover:text-nat-dark'
                  }`}
                  title={role.desc}
                >
                  {role.icon}
                  <span>{role.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
