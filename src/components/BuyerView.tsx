/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  COMMODITY_LIST, 
  Komoditas, 
  Demand, 
  Match 
} from '../types';
import { 
  ShoppingBag, 
  Plus, 
  MapPin, 
  Calendar, 
  BadgePercent, 
  CheckCircle, 
  Activity, 
  ChevronRight,
  TrendingDown,
  Info,
  DollarSign,
  ArrowRightLeft,
  QrCode,
  Scan,
  Camera,
  RefreshCw
} from 'lucide-react';
import TraceModal from './TraceModal';
import { Harvest } from '../types';

interface BuyerViewProps {
  mapLat?: number;
  mapLng?: number;
  mapRegion?: string;
  clearMapSelection?: () => void;
}

export default function BuyerView({ mapLat, mapLng, mapRegion, clearMapSelection }: BuyerViewProps) {
  const { 
    harvests, 
    demands, 
    matches, 
    addDemand, 
    updateMatchStatus, 
    activeUser, 
    showNotification 
  } = useApp();

  // Form states
  const [commodity, setCommodity] = useState<Komoditas>('Bawang Merah');
  const [requiredVolume, setRequiredVolume] = useState<number>(10000);
  const [offerPrice, setOfferPrice] = useState<number>(27000);
  const [dateRequired, setDateRequired] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 20); // typical requirement in 20 days
    return d.toISOString().split('T')[0];
  });
  const [latitude, setLatitude] = useState<number>(-6.865);
  const [longitude, setLongitude] = useState<number>(109.035);
  const [region, setRegion] = useState<string>('Brebes');
  const [notes, setNotes] = useState<string>('');

  // Traceability & Scanner states
  const [selectedTraceHarvest, setSelectedTraceHarvest] = useState<Harvest | null>(null);
  const [scannerBatchId, setScannerBatchId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanSuccess, setScanSuccess] = useState<boolean>(false);

  // Initialize selected batch id for scanner if harvests are available
  useEffect(() => {
    if (harvests.length > 0 && !scannerBatchId) {
      setScannerBatchId(harvests[0].id);
    }
  }, [harvests, scannerBatchId]);

  const handleSimulatedScan = () => {
    if (!scannerBatchId) return;
    setIsScanning(true);
    setScanSuccess(false);

    // After 1.2s target lock, trigger trace modal open
    setTimeout(() => {
      setIsScanning(false);
      setScanSuccess(true);
      const matchedHarvest = harvests.find(h => h.id === scannerBatchId);
      if (matchedHarvest) {
        showNotification(`SCAN BERHASIL: Batch ${matchedHarvest.commodity} #${matchedHarvest.id} terverifikasi asli di Blockchain!`, 'success');
        setSelectedTraceHarvest(matchedHarvest);
      } else {
        showNotification('Gagal memverifikasi batch. Kode hash tidak cocok.', 'warning');
      }
    }, 1200);
  };

  // Auto update coordinates and region if selected on map
  useEffect(() => {
    if (mapLat && mapLng && mapRegion) {
      setLatitude(mapLat);
      setLongitude(mapLng);
      setRegion(mapRegion);
      showNotification(`Koordinat pembeli terpilih dari peta: ${mapLat}, ${mapLng} (${mapRegion})`, 'info');
    }
  }, [mapLat, mapLng, mapRegion]);

  const handleCommodityChange = (crop: Komoditas) => {
    setCommodity(crop);
    const metadata = COMMODITY_LIST[crop];
    if (metadata) {
      // Set to slightly higher than typical to stimulate good matching out of box
      setOfferPrice(Math.round(metadata.averagePricePerKg * 1.05));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    addDemand({
      commodity,
      requiredVolume,
      offerPrice,
      latitude,
      longitude,
      region,
      dateRequired,
      notes,
    });

    if (clearMapSelection) clearMapSelection();
    setNotes('');
  };

  // Buyer's own demands
  const myDemands = demands.filter(d => d.buyerId === activeUser.PEMBELI.id);

  // Matches involving this buyer's demands
  const myMatches = matches.filter(m => {
    const d = demands.find(dem => dem.id === m.demandId);
    return d?.buyerId === activeUser.PEMBELI.id;
  });

  return (
    <div className="space-y-6">
      {/* Buyer Profile Status Block */}
      <div className="bg-gradient-to-r from-nat-brown to-nat-dark rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-nat-sand text-xs font-bold mb-1">
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>AKUN KOPERASI / HUB PEMBELI</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Selamat Datang, {activeUser.PEMBELI.name}</h2>
          <p className="text-xs text-nat-light-cream mt-1">
            Gudang Utama: <span className="font-semibold text-white">{activeUser.PEMBELI.region}, Jawa Tengah</span> | Kode Depo: <span className="font-mono text-nat-sand">#B-KOP-JAYA</span>
          </p>
        </div>

        {/* Aggregate demand stats */}
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] text-nat-light-cream uppercase tracking-wider font-semibold">Kebutuhan Sedia</p>
            <p className="text-lg font-bold">{myDemands.filter(d => d.status === 'ACTIVE').length} Rilis</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] text-nat-light-cream uppercase tracking-wider font-semibold">Sinergi Sukses</p>
            <p className="text-lg font-bold text-nat-sand">
              {myDemands.filter(d => d.status === 'FULFILLED').length} Panen Diserap
            </p>
          </div>
        </div>
      </div>

      {/* Market intelligence info */}
      <div className="bg-nat-light-cream border border-nat-border rounded-xl p-4 flex gap-3 text-xs text-nat-dark">
        <Info className="w-5 h-5 text-nat-green shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Informasi Ketersediaan Pasokan (Market Intel FLW):</p>
          <p className="mt-1 text-nat-text leading-relaxed">
            Data Dinas Pertanian mendeteksi adanya penumpukan surplus komoditas <span className="font-semibold">Tomat</span> di daerah <span className="font-semibold">Malang</span> minggu ini. Harga pasar cenderung tertekan. Koperasi disarankan merilis demand dengan harga wajar untuk penyerapan cepat agar hasil panen tidak membusuk di lahan tani!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form & QR Scanner Simulator */}
        <div className="lg:col-span-1 space-y-6">
          {/* Form Input Demand */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-nat-dark mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-nat-green" />
              Rilis Kebutuhan Pasokan Baru
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Pilih Komoditas</label>
                <select
                  value={commodity}
                  onChange={(e) => handleCommodityChange(e.target.value as Komoditas)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                >
                  {Object.keys(COMMODITY_LIST).map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-nat-text mb-1">Volume Dibutuhkan (Kg)</label>
                  <input
                    type="number"
                    min="50"
                    step="500"
                    value={requiredVolume}
                    onChange={(e) => setRequiredVolume(parseInt(e.target.value) || 1000)}
                    className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-nat-text mb-1">Harga Penawaran (Rp/Kg)</label>
                  <input
                    type="number"
                    step="500"
                    min="1000"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(parseInt(e.target.value) || 1000)}
                    className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Dibutuhkan Paling Lambat</label>
                <input
                  type="date"
                  value={dateRequired}
                  onChange={(e) => setDateRequired(e.target.value)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>

              {/* Coordinates Section */}
              <div className="bg-nat-light-cream rounded-xl p-3 border border-nat-border space-y-3">
                <span className="text-xs font-bold text-nat-dark flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-nat-brown" />
                  Lokasi Penerimaan Gudang
                </span>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-nat-sage font-semibold block">Latitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-nat-border rounded px-2 py-1 text-nat-dark font-mono focus:outline-none focus:ring-1 focus:ring-nat-green"
                    />
                  </div>
                  <div>
                    <span className="text-nat-sage font-semibold block">Longitude</span>
                    <input
                      type="number"
                      step="0.001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-nat-border rounded px-2 py-1 text-nat-dark font-mono focus:outline-none focus:ring-1 focus:ring-nat-green"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-nat-sage font-semibold block">Nama Wilayah</span>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full bg-white border border-nat-border rounded px-2 py-1 text-nat-dark font-bold focus:outline-none focus:ring-1 focus:ring-nat-green"
                    />
                  </div>
                  <div className="flex items-end">
                    <p className="text-[9px] text-nat-sage font-medium italic leading-tight">
                      *Klik peta sebaran di atas untuk menyinkronkan lokasi
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Syarat / Catatan Mutu</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Misal: Kadar air maksimal 14%, kemasan karung rami tebal..."
                  rows={2}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>

              <button
                type="submit"
                id="add-demand-btn"
                className="w-full bg-nat-green hover:bg-nat-green-hover text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-nat-green/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                Publikasikan Demand Pasok
              </button>
            </form>
          </div>

          {/* QR Scanner Simulator Card */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-nat-dark flex items-center gap-1.5">
                <Scan className="w-4 h-4 text-nat-green" />
                Lacak Batch (Scanner QR)
              </h3>
              <p className="text-[11px] text-nat-sage mt-1 font-medium">
                Pindai QR Code fisik komoditas panen untuk membaca akreditasi digital di SinergiTani Blockchain.
              </p>
            </div>

            {harvests.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold text-nat-text uppercase tracking-wider mb-1">
                    Pilih Batch Panen Tani
                  </label>
                  <select
                    value={scannerBatchId}
                    onChange={(e) => setScannerBatchId(e.target.value)}
                    className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                  >
                    {harvests.map(h => (
                      <option key={h.id} value={h.id}>
                        {h.id.toUpperCase()} - {h.farmerName} ({h.commodity})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Simulated Camera Scanner Viewport */}
                <div className="relative w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-700 flex flex-col items-center justify-center text-center">
                  {/* Neon Grid Corners */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-emerald-500" />
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-emerald-500" />
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-emerald-500" />
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-emerald-500" />

                  {isScanning ? (
                    <div className="space-y-2 text-center animate-pulse z-10 px-4">
                      {/* Pulsing Target Ring */}
                      <div className="w-10 h-10 rounded-full border-2 border-emerald-500 border-dashed animate-spin mx-auto flex items-center justify-center">
                        <Camera className="w-4 h-4 text-emerald-400" />
                      </div>
                      <p className="text-[10px] text-emerald-400 font-mono tracking-widest uppercase font-bold">
                        Targeting Blockchain Code...
                      </p>
                      {/* Laser Scrolling Line */}
                      <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent shadow-lg shadow-emerald-500/50 animate-bounce" />
                    </div>
                  ) : (
                    <div className="space-y-1.5 z-10 p-4">
                      <QrCode className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Kamera Siap Dipasangkan
                      </p>
                      <p className="text-[9px] text-slate-500">
                        Klik tombol di bawah untuk melakukan simulasi scan laser 
                      </p>
                    </div>
                  )}
                  {/* Subtle scan camera overlay lines */}
                  <div className="absolute inset-0 bg-slate-900/10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.65))] " />
                </div>

                <button
                  onClick={handleSimulatedScan}
                  disabled={isScanning}
                  className={`w-full py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isScanning 
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                  }`}
                >
                  {isScanning ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Menganalisis Kunci Hash...</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-4 h-4 text-emerald-400" />
                      <span>Simulasikan Scan QR Code</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="text-center py-4 text-nat-sage italic text-xs">
                Belum ada batch panen terdaftar untuk dilacak.
              </div>
            )}
          </div>
        </div>

        {/* Lahan Petani Tercocokkan & Demand Aktif */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rilis Kebutuhan Saya */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-nat-dark mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-nat-green" />
              Daftar Permintaan Aktif Koperasi ({myDemands.length})
            </h3>

            {myDemands.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-nat-text">
                  <thead>
                    <tr className="border-b border-nat-border text-nat-sage font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2">Komoditas</th>
                      <th className="py-2">Volume Diminta</th>
                      <th className="py-2">Batas Tanggal</th>
                      <th className="py-2">Harga Tawaran</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myDemands.map((d) => {
                      const crop = COMMODITY_LIST[d.commodity];
                      return (
                        <tr key={d.id} className="border-b border-nat-light-cream hover:bg-nat-light-cream/35 transition-colors">
                          <td className="py-3 font-bold text-nat-dark flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: crop.color }} />
                            {d.commodity}
                          </td>
                          <td className="py-3 font-bold text-nat-dark">
                            {d.requiredVolume.toLocaleString('id-ID')} Kg
                          </td>
                          <td className="py-3">
                            <div className="font-semibold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-nat-sage" />
                              {d.dateRequired}
                            </div>
                          </td>
                          <td className="py-3 font-bold text-nat-dark">
                            Rp{d.offerPrice.toLocaleString('id-ID')}/Kg
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              d.status === 'ACTIVE' 
                                ? 'bg-nat-light-cream text-nat-green border-nat-border' 
                                : 'bg-nat-cream text-nat-brown border-nat-border'
                            }`}>
                              {d.status === 'ACTIVE' ? 'Mencari' : 'Terpenuhi'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-nat-sage italic">
                Belum ada rilis kebutuhan pasokan. Silakan isi form di samping untuk mengaktifkan demand.
              </div>
            )}
          </div>

          {/* Pencocokan Petani Terdekat */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-nat-light-cream">
              <h3 className="text-sm font-bold text-nat-dark flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-nat-green" />
                Peta Potensi Panen Tani Tercocokkan (Pre-Order Engine)
              </h3>
              <span className="text-[10px] bg-nat-light-cream text-nat-green border border-nat-border font-bold px-2.5 py-0.5 rounded-full">
                {myMatches.length} Lahan Sesuai
              </span>
            </div>

            {myMatches.length > 0 ? (
              <div className="space-y-4">
                {myMatches.map((match) => {
                  const harvest = harvests.find(h => h.id === match.harvestId)!;
                  const demand = demands.find(d => d.id === match.demandId)!;
                  if (!harvest || !demand) return null;

                  return (
                    <div 
                      key={match.id} 
                      className={`border rounded-xl p-4 transition-all ${
                        match.status !== 'PENDING'
                          ? 'border-nat-border bg-nat-light-cream/40'
                          : 'border-nat-border hover:border-nat-sage/50 bg-white hover:shadow-sm'
                      }`}
                      id={`match-card-buyer-${match.id}`}
                    >
                      {/* Match header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMMODITY_LIST[harvest.commodity].color }} />
                          <h4 className="text-xs font-bold text-nat-dark">{harvest.farmerName}</h4>
                          <span className="text-[10px] text-nat-sage font-medium">• Wilayah Tani: {harvest.region}</span>
                        </div>

                        {/* Matching Score Circle Badge */}
                        <div className="flex items-center space-x-1">
                          <BadgePercent className="w-3.5 h-3.5 text-nat-green" />
                          <span className="text-xs font-bold text-nat-sage">Skor Sinergi: </span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                            match.score >= 80 
                              ? 'bg-nat-green text-white border-transparent' 
                              : match.score >= 60
                              ? 'bg-nat-cream text-nat-brown border-nat-border'
                              : 'bg-nat-slate text-nat-text border-nat-border'
                          }`}>
                            {match.score}%
                          </span>
                        </div>
                      </div>

                      {/* Matching breakdown criteria */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-nat-light-cream p-2.5 rounded-lg text-[11px] mb-3 text-nat-text border border-nat-border">
                        {/* 1. Jarak */}
                        <div>
                          <p className="text-nat-sage font-bold uppercase text-[9px]">Jarak Antar Gudang</p>
                          <p className="font-bold text-nat-dark mt-0.5">{match.distanceKm} Km</p>
                          <div className="w-full bg-nat-cream h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-nat-green h-full rounded-full" style={{ width: `${match.scoreDetails.distanceScore}%` }} />
                          </div>
                          <span className="text-[9px] text-nat-sage font-medium">Skor: {match.scoreDetails.distanceScore}/100</span>
                        </div>

                        {/* 2. Kesesuaian Volume */}
                        <div>
                          <p className="text-nat-sage font-bold uppercase text-[9px]">Kesesuaian Volume</p>
                          <p className="font-bold text-nat-dark mt-0.5">
                            {demand.requiredVolume.toLocaleString('id-ID')} Kg / {harvest.expectedVolume.toLocaleString('id-ID')} Kg
                          </p>
                          <div className="w-full bg-nat-cream h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-nat-green h-full rounded-full" style={{ width: `${match.scoreDetails.volumeScore}%` }} />
                          </div>
                          <span className="text-[9px] text-nat-sage font-medium">Skor: {match.scoreDetails.volumeScore}/100</span>
                        </div>

                        {/* 3. Kesesuaian Harga */}
                        <div>
                          <p className="text-nat-sage font-bold uppercase text-[9px]">Tawaran vs Harapan</p>
                          <p className="font-bold text-nat-dark mt-0.5">
                            Rp{demand.offerPrice.toLocaleString('id-ID')} / Rp{harvest.askingPrice.toLocaleString('id-ID')}
                          </p>
                          <div className="w-full bg-nat-cream h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-nat-green h-full rounded-full" style={{ width: `${match.scoreDetails.priceScore}%` }} />
                          </div>
                          <span className="text-[9px] text-nat-sage font-medium">Skor: {match.scoreDetails.priceScore}/100</span>
                        </div>
                      </div>

                      {harvest.notes && (
                        <p className="text-[11px] text-nat-text italic mb-3 bg-nat-light-cream/50 p-2 rounded border border-nat-border">
                          "Catatan Tani: {harvest.notes}"
                        </p>
                      )}

                      {/* Matching action workflow */}
                      <div className="flex justify-between items-center pt-2 border-t border-nat-border">
                        <div className="text-[10px] text-nat-sage font-medium">
                          Estimasi Panen Tani: <span className="font-semibold text-nat-text">{harvest.expectedHarvestDate}</span>
                        </div>

                        <div className="flex space-x-2">
                          <button
                            onClick={() => setSelectedTraceHarvest(harvest)}
                            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Lacak Sertifikat & QR Code Blockchain"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                            <span>Lacak QR</span>
                          </button>

                          {match.status === 'PENDING' ? (
                            <button
                              id={`accept-btn-buyer-${match.id}`}
                              onClick={() => updateMatchStatus(match.id, 'ACCEPTED_BY_BUYER')}
                              className="bg-nat-green hover:bg-nat-green-hover text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <span>Ajukan Kerja Sama</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : match.status === 'ACCEPTED_BY_BUYER' ? (
                            <div className="flex items-center space-x-1.5 text-nat-brown font-bold text-[11px] bg-nat-cream px-2.5 py-1 rounded-lg border border-nat-border">
                              <span className="w-1.5 h-1.5 rounded-full bg-nat-brown animate-pulse" />
                              <span>Menunggu Persetujuan Petani</span>
                            </div>
                          ) : match.status === 'ACCEPTED_BY_FARMER' ? (
                            <button
                              id={`confirm-btn-buyer-${match.id}`}
                              onClick={() => updateMatchStatus(match.id, 'CONFIRMED')}
                              className="bg-nat-green hover:bg-nat-green-hover text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Setujui Pre-Order Kontrak</span>
                            </button>
                          ) : match.status === 'CONFIRMED' ? (
                            <div className="flex items-center space-x-1.5 text-nat-green font-bold text-[11px] bg-nat-light-cream px-2.5 py-1 rounded-lg border border-nat-border">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Kontrak Sepakat (Panen Teraman)</span>
                            </div>
                          ) : (
                            <span className="text-nat-sage text-xs font-semibold">{match.status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-nat-sage italic text-xs">
                Belum ada ketersediaan panen aktif petani yang cocok dengan kebutuhan pasokan Anda.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTraceHarvest && (
        <TraceModal
          harvest={selectedTraceHarvest}
          isOpen={!!selectedTraceHarvest}
          onClose={() => setSelectedTraceHarvest(null)}
        />
      )}
    </div>
  );
}
