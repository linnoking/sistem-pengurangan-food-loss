/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  Database, 
  Cpu, 
  Clock, 
  User, 
  Layers, 
  ArrowRight, 
  FileCheck,
  CheckCircle,
  HelpCircle,
  QrCode,
  ExternalLink
} from 'lucide-react';
import { Harvest, COMMODITY_LIST } from '../types';

interface TraceModalProps {
  harvest: Harvest;
  isOpen: boolean;
  onClose: () => void;
}

export default function TraceModal({ harvest, isOpen, onClose }: TraceModalProps) {
  const { blockchain, matches, demands } = useApp();

  if (!isOpen) return null;

  const crop = COMMODITY_LIST[harvest.commodity] || {
    color: '#10b981',
    typicalYieldKgPerHectare: 10000,
    averagePricePerKg: 10000,
    shelfLifeDays: 14,
    typicalDurationDays: 90
  };

  // Find related blockchain transactions
  const relatedTransactions = (() => {
    const list: { blockHeight: number; timestamp: string; hash: string; type: string; payload: string }[] = [];
    
    // Sort blockchain blocks from oldest to newest to show chronological history
    const sortedBlocks = [...blockchain].reverse();

    sortedBlocks.forEach(block => {
      block.transactions.forEach(tx => {
        // Match by exact ID or containing farmer and commodity description
        const idMatch = tx.payload.includes(harvest.id);
        const textMatch = tx.payload.includes(harvest.farmerName) && tx.payload.includes(harvest.commodity);
        
        if (idMatch || textMatch) {
          list.push({
            blockHeight: block.height,
            timestamp: block.timestamp,
            hash: tx.txHash,
            type: tx.type,
            payload: tx.payload
          });
        }
      });
    });

    return list;
  })();

  // Also see if there's any active matches/contracts
  const associatedMatch = matches.find(m => m.harvestId === harvest.id);
  const associatedDemand = associatedMatch ? demands.find(d => d.id === associatedMatch.demandId) : null;

  // Form mock URL for QR Code redirection
  const qrValue = `https://sinergitani.id/trace/${harvest.id}?v=${harvest.expectedVolume}&lat=${harvest.latitude}&lng=${harvest.longitude}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden border border-slate-100 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:2rem] opacity-20" />
          <div className="relative z-10 flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded tracking-wide font-mono">
                  BLOCKCHAIN SECURED
                </span>
                <span className="text-slate-400 text-[10px] font-mono">#ID-{harvest.id}</span>
              </div>
              <h3 className="text-base font-black tracking-tight mt-0.5">Sertifikat Ketertelusuran Pangan</h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="relative z-10 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Passport Grid */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* QR Code Canvas Frame */}
            <div className="md:col-span-4 flex flex-col items-center justify-center text-center p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
              <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 relative">
                <QRCodeSVG 
                  value={qrValue} 
                  size={128}
                  level="H"
                  includeMargin={false}
                />
                {/* Overlay tiny sprout logo in the center of QR */}
                <div className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-md border border-slate-200">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: crop.color }} />
                </div>
              </div>

              <div className="mt-3 space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Scan QR Code</span>
                <p className="text-[11px] font-mono text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded inline-block">
                  {harvest.commodity.toUpperCase()}-{harvest.id.substring(harvest.id.length - 6).toUpperCase()}
                </p>
                <p className="text-[9px] text-slate-400 leading-normal max-w-[150px] mx-auto mt-1">
                  Scan untuk memverifikasi asal-usul digital via SinergiTani Ledger
                </p>
              </div>
            </div>

            {/* Product Identity Passport */}
            <div className="md:col-span-8 space-y-3.5">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Komoditas & Batch</h4>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2 mt-0.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: crop.color }} />
                    {harvest.commodity} 
                    <span className="text-sm font-bold text-slate-400">({harvest.landArea} Ha Lahan)</span>
                  </h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold block">Volume Terjamin</span>
                  <span className="text-lg font-black text-slate-800">{harvest.expectedVolume.toLocaleString('id-ID')} Kg</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3 h-3 text-slate-500" />
                    Produsen Utama (Petani)
                  </span>
                  <p className="text-xs font-extrabold text-slate-800">{harvest.farmerName}</p>
                  <p className="text-[10px] text-slate-500 font-medium">Kabupaten {harvest.region}, Jateng</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-slate-500" />
                    Koordinat Geospasial
                  </span>
                  <p className="text-xs font-mono font-bold text-slate-800">
                    {harvest.latitude}, {harvest.longitude}
                  </p>
                  <a 
                    href={`https://www.google.com/maps?q=${harvest.latitude},${harvest.longitude}`}
                    target="_blank" 
                    referrerPolicy="no-referrer"
                    className="text-[10px] text-emerald-600 font-bold hover:underline flex items-center gap-0.5"
                  >
                    Buka Peta Satelit <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    Tanggal Mulai Tanam
                  </span>
                  <p className="text-xs font-bold text-slate-800">{harvest.plantingDate}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-emerald-500" />
                    Estimasi Panen Sedia
                  </span>
                  <p className="text-xs font-bold text-slate-800">{harvest.expectedHarvestDate}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Audit History Timeline (Blockchain verification trail) */}
          <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-150">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-emerald-600" />
              Cryptographic Ledger Audit Trail (Riwayat Blockchain)
            </h4>

            {relatedTransactions.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-200">
                {relatedTransactions.map((tx, idx) => {
                  const isContract = tx.type === 'KONTRAK_SEPAKAT';
                  return (
                    <div key={idx} className="flex gap-4 items-start relative pl-8">
                      {/* Timeline dot */}
                      <div className={`absolute left-1.5 top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center z-10 ${
                        isContract ? 'border-amber-500' : 'border-emerald-500'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${isContract ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                      </div>

                      <div className="space-y-1 flex-1 bg-white border border-slate-200/80 p-3 rounded-xl text-xs shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] ${
                            tx.type === 'KONTRAK_SEPAKAT' 
                              ? 'bg-amber-100 text-amber-800'
                              : tx.type === 'RILIS_PANEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {tx.timestamp}
                          </span>
                        </div>

                        <p className="font-semibold text-slate-700 leading-relaxed text-[11px]">{tx.payload}</p>

                        <div className="flex justify-between items-center text-[9px] pt-1.5 border-t border-slate-100">
                          <span className="text-slate-400 font-medium">Blok Tersegel: <span className="font-bold text-slate-700 font-mono">#{tx.blockHeight}</span></span>
                          <span className="font-mono text-slate-400 max-w-[150px] truncate">Hash: {tx.hash}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4 bg-white border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-500 italic">Mencari block penunjang...</p>
                <p className="text-[10px] text-slate-400 max-w-sm mx-auto mt-1 leading-normal">
                  Data panen telah terenkripsi di SinergiTani Main Ledger. Blok registrasi terekam saat pertama kali dinonaktifkan / disimpan di database lokal.
                </p>
              </div>
            )}
          </div>

          {/* Escrow & Smart Contract section */}
          {associatedMatch && (
            <div className={`border rounded-2xl p-4 flex gap-3 text-xs ${
              associatedMatch.status === 'CONFIRMED'
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/50 border-amber-200 text-amber-950'
            }`}>
              <CheckCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
                associatedMatch.status === 'CONFIRMED' ? 'text-emerald-600' : 'text-amber-600'
              }`} />
              <div className="space-y-1">
                <p className="font-bold uppercase tracking-wider text-[10px]">
                  {associatedMatch.status === 'CONFIRMED' 
                    ? 'SMART CONTRACT SECURED & FULLY CONCLUDED' 
                    : 'SMART CONTRACT PRE-ORDER: PROPOSAL PENDING'
                  }
                </p>
                <p className="text-[11px] leading-relaxed">
                  {associatedMatch.status === 'CONFIRMED' ? (
                    <>
                      Koperasi <span className="font-bold">{associatedDemand?.buyerName}</span> menyerap batch panen ini dengan harga kesepakatan <span className="font-bold">Rp{(associatedDemand?.offerPrice || 0).toLocaleString('id-ID')}/Kg</span>. Dana jaminan aman terkunci di dalam blockchain Smart Contract escrow, melindunginya dari fluktuasi pasar dan broker nakal.
                    </>
                  ) : (
                    <>
                      Batch panen ini telah dikaitkan dengan proposal pre-order dari <span className="font-bold">{associatedDemand?.buyerName}</span>. Menunggu penyelesaian tanda tangan kedua belah pihak di jaringan validator SinergiTani.
                    </>
                  )}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          >
            Tutup Sertifikat
          </button>
        </div>

      </div>
    </div>
  );
}
