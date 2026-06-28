/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MatchWeights, COMMODITY_LIST } from '../types';
import { 
  Sliders, 
  Settings, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  MapPin, 
  Scale, 
  DollarSign,
  Layers,
  Activity,
  User,
  AlertTriangle
} from 'lucide-react';

export default function AdminView() {
  const { 
    matches, 
    harvests, 
    demands, 
    weights, 
    updateWeights, 
    updateMatchStatus, 
    resetAllData, 
    showNotification 
  } = useApp();

  // Slider state
  const [wLocation, setWLocation] = useState(weights.wLocation);
  const [wVolume, setWVolume] = useState(weights.wVolume);
  const [wPrice, setWPrice] = useState(weights.wPrice);

  const totalWeights = wLocation + wVolume + wPrice;
  const isValidSum = Math.abs(totalWeights - 1.0) < 0.01;

  const handleSaveWeights = () => {
    if (!isValidSum) {
      // Auto normalize if sum is not exactly 1.0
      const sum = wLocation + wVolume + wPrice;
      if (sum === 0) {
        showNotification('Bobot tidak boleh nol semua!', 'warning');
        return;
      }
      const normLoc = Math.round((wLocation / sum) * 100) / 100;
      const normVol = Math.round((wVolume / sum) * 100) / 100;
      const normPrice = Math.round((1 - normLoc - normVol) * 100) / 100; // balance remaining to ensure exact 1.0 sum

      setWLocation(normLoc);
      setWVolume(normVol);
      setWPrice(normPrice);
      updateWeights({ wLocation: normLoc, wVolume: normVol, wPrice: normPrice });
    } else {
      updateWeights({ wLocation, wVolume, wPrice });
    }
  };

  const handleQuickResetWeights = () => {
    setWLocation(0.4);
    setWVolume(0.3);
    setWPrice(0.3);
    updateWeights({ wLocation: 0.4, wVolume: 0.3, wPrice: 0.3 });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-700" />
            Panel Kontrol Konfigurasi Admin (Matching Tuning)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Otoritas platform: atur keseimbangan rumus pencocokan nasional, awasi sengketa, dan kelola database.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tuning Algoritma Matching */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-50 flex items-center gap-1.5">
            <Sliders className="w-4 h-4 text-emerald-600" />
            Kalibrasi Skor Pencocokan (Weights)
          </h3>

          <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
            Ubah prioritas rumus pencocokan cerdas. Total bobot ketiga kriteria <span className="font-bold text-slate-800">harus bernilai 1.00 (100%)</span>.
          </p>

          <div className="space-y-5">
            {/* 1. Bobot Jarak */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  Kedekatan Lokasi (w1)
                </span>
                <span className="font-mono font-bold text-slate-900">{Math.round(wLocation * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wLocation}
                onChange={(e) => setWLocation(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 block">Menekan kehilangan susut bobot saat logistik perjalanan.</span>
            </div>

            {/* 2. Bobot Volume */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  Kesesuaian Volume (w2)
                </span>
                <span className="font-mono font-bold text-slate-900">{Math.round(wVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wVolume}
                onChange={(e) => setWVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 block">Mengurangi surplus berlebih yang terbuang sia-sia di lahan tani.</span>
            </div>

            {/* 3. Bobot Harga */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  Kesesuaian Harga (w3)
                </span>
                <span className="font-mono font-bold text-slate-900">{Math.round(wPrice * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={wPrice}
                onChange={(e) => setWPrice(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <span className="text-[10px] text-slate-400 block">Menjamin keadilan ekonomi hpp dan merangsang serapan pasar.</span>
            </div>

            {/* Weights Math Checking Bar */}
            <div className={`rounded-xl p-3 text-center border ${
              isValidSum 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              <div className="text-xs font-bold">
                Jumlah Bobot: <span className="font-mono">{totalWeights.toFixed(2)}</span> / 1.00
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                {isValidSum 
                  ? '✓ Persentase tepat 100%! Algoritma siap dikalibrasi.' 
                  : '⚠ Jumlah bobot tidak sama dengan 1.00. Sistem akan otomatis melakukan normalisasi proporsional.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleQuickResetWeights}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-3 rounded-lg text-xs transition-colors cursor-pointer"
              >
                Setel Bawaan
              </button>
              <button
                type="button"
                onClick={handleSaveWeights}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors shadow-sm cursor-pointer"
              >
                Terapkan Bobot
              </button>
            </div>
          </div>
        </div>

        {/* Log Transaksi & Pengawasan Sengketa */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Buku Besar & Pengawasan Transaksi Platform ({matches.length})
            </h3>
            <span className="text-[10px] text-slate-400 font-medium">Monitoring Real-Time Sinergi Hulu-Hilir</span>
          </div>

          {matches.length > 0 ? (
            <div className="space-y-3">
              {matches.map((match) => {
                const harvest = harvests.find(h => h.id === match.harvestId);
                const demand = demands.find(d => d.id === match.demandId);
                if (!harvest || !demand) return null;

                const crop = COMMODITY_LIST[harvest.commodity];

                return (
                  <div key={match.id} className="border border-slate-100 rounded-xl p-3.5 bg-slate-50/50 hover:bg-slate-50 hover:shadow-sm transition-all text-xs">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 pb-2 border-b border-slate-200/40">
                      <div className="flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crop.color }} />
                        <span className="font-bold text-slate-900">{harvest.commodity}</span>
                        <span className="text-[10px] text-slate-400">• ID: {match.id}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          match.status === 'CONFIRMED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : match.status === 'PENDING'
                            ? 'bg-slate-100 text-slate-600'
                            : match.status === 'DISPUTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {match.status === 'PENDING' ? 'Saran' : match.status === 'CONFIRMED' ? 'Sepakat' : match.status}
                        </span>
                        
                        <span className="font-bold text-emerald-600">{match.score}% Cocok</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px] mb-3 text-slate-600">
                      <div>
                        <span className="text-slate-400 block">Sisi Petani (Hulu)</span>
                        <span className="font-bold text-slate-800 flex items-center gap-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {harvest.farmerName} ({harvest.region})
                        </span>
                        <span className="block text-slate-400 text-[10px]">{harvest.expectedVolume.toLocaleString('id-ID')} Kg @ Rp{harvest.askingPrice.toLocaleString('id-ID')}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block">Sisi Pembeli (Hilir)</span>
                        <span className="font-bold text-slate-800 flex items-center gap-0.5">
                          <User className="w-3 h-3 text-slate-400" />
                          {demand.buyerName} ({demand.region})
                        </span>
                        <span className="block text-slate-400 text-[10px]">{demand.requiredVolume.toLocaleString('id-ID')} Kg @ Rp{demand.offerPrice.toLocaleString('id-ID')}</span>
                      </div>

                      <div className="col-span-2 sm:col-span-1">
                        <span className="text-slate-400 block">Rincian Efisiensi</span>
                        <span className="font-bold text-slate-700 block">Jarak: {match.distanceKm} Km</span>
                        <span className="text-[10px] text-slate-400 font-semibold block">Potensi Sisa Terpotong</span>
                      </div>
                    </div>

                    {/* Admin Oversight Actions */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 text-[10px]">
                      <span className="text-slate-400 font-semibold">Tindakan Admin Platform:</span>
                      
                      <div className="flex space-x-1.5">
                        {match.status === 'DISPUTED' && (
                          <button
                            onClick={() => updateMatchStatus(match.id, 'CONFIRMED')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Selesaikan Sengketa (Sahkan)
                          </button>
                        )}
                        <button
                          onClick={() => {
                            updateMatchStatus(match.id, 'DISPUTED');
                          }}
                          className="bg-slate-100 hover:bg-slate-200 hover:text-red-600 text-slate-600 font-bold px-2.5 py-1 rounded text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer"
                          disabled={match.status === 'DISPUTED'}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Tandai Masalah Logistik
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 italic text-xs">
              Belum ada pencocokan logistik yang sedang diproses.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
