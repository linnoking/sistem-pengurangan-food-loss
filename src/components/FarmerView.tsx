/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  COMMODITY_LIST, 
  Komoditas, 
  Harvest, 
  Match 
} from '../types';
import { 
  Sprout, 
  Plus, 
  MapPin, 
  Calendar, 
  BadgeAlert, 
  BadgePercent, 
  CheckCircle, 
  TrendingUp,
  User,
  Activity,
  ChevronRight,
  Phone,
  ArrowRightLeft,
  QrCode,
  Camera,
  Upload,
  Star,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import TraceModal from './TraceModal';
import { gradeCropImage, GradingResult } from '../utils/cvGrading';

interface FarmerViewProps {
  mapLat?: number;
  mapLng?: number;
  mapRegion?: string;
  clearMapSelection?: () => void;
}

export default function FarmerView({ mapLat, mapLng, mapRegion, clearMapSelection }: FarmerViewProps) {
  const { 
    harvests, 
    demands, 
    matches, 
    addHarvest, 
    updateMatchStatus, 
    activeUser, 
    showNotification 
  } = useApp();

  const [selectedTraceHarvest, setSelectedTraceHarvest] = useState<Harvest | null>(null);

  // Form states
  const [commodity, setCommodity] = useState<Komoditas>('Bawang Merah');
  const [landArea, setLandArea] = useState<number>(1.0);
  const [expectedVolume, setExpectedVolume] = useState<number>(10000);
  const [askingPrice, setAskingPrice] = useState<number>(25000);
  const [plantingDate, setPlantingDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [latitude, setLatitude] = useState<number>(-6.871);
  const [longitude, setLongitude] = useState<number>(109.042);
  const [region, setRegion] = useState<string>('Brebes');
  const [notes, setNotes] = useState<string>('');

  // CV Quality Grading States
  const [gradingImage, setGradingImage] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [isGrading, setIsGrading] = useState<boolean>(false);

  // Simulated preset agricultural images for immediate testing
  const PRESET_GRADE_IMAGES = {
    'GRADE_A': 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=250', // Vibrant premium tomato/chili style
    'GRADE_C': 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=250'  // Slightly bruised organic/dry harvest style
  };

  const handleGradeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Url = reader.result as string;
      await runTensorFlowGrading(base64Url);
    };
    reader.readAsDataURL(file);
  };

  const runTensorFlowGrading = async (imageUrl: string) => {
    setGradingImage(imageUrl);
    setIsGrading(true);
    setGradingResult(null);

    try {
      const result = await gradeCropImage(imageUrl);
      setGradingResult(result);
      
      // Auto append grade into notes
      setNotes((prev) => {
        const base = prev ? prev.split(' (Grade AI:')[0] : '';
        return `${base} (Grade AI: ${result.grade}, Confidence: ${result.confidence}%)`.trim();
      });
      showNotification(`Foto berhasil dianalisis dengan TensorFlow.js! Terdeteksi Grade: ${result.grade}`, 'success');
    } catch (err) {
      showNotification('Gagal menganalisis gambar dengan TensorFlow.js.', 'warning');
    } finally {
      setIsGrading(false);
    }
  };

  // Auto update coordinates and region if selected on map
  useEffect(() => {
    if (mapLat && mapLng && mapRegion) {
      setLatitude(mapLat);
      setLongitude(mapLng);
      setRegion(mapRegion);
      showNotification(`Koordinat terpilih dari peta: ${mapLat}, ${mapLng} (${mapRegion})`, 'info');
    }
  }, [mapLat, mapLng, mapRegion]);

  // Handle land area changes to auto-calculate recommended yield
  const handleLandAreaChange = (val: number) => {
    setLandArea(val);
    const metadata = COMMODITY_LIST[commodity];
    if (metadata) {
      setExpectedVolume(Math.round(val * metadata.typicalYieldKgPerHectare));
    }
  };

  // Handle commodity change to auto-update typical price and recommended yield
  const handleCommodityChange = (crop: Komoditas) => {
    setCommodity(crop);
    const metadata = COMMODITY_LIST[crop];
    if (metadata) {
      setAskingPrice(metadata.averagePricePerKg);
      setExpectedVolume(Math.round(landArea * metadata.typicalYieldKgPerHectare));
    }
  };

  // Attempt current geolocation
  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = Math.round(position.coords.latitude * 1000) / 1000;
          const lng = Math.round(position.coords.longitude * 1000) / 1000;
          setLatitude(lat);
          setLongitude(lng);
          showNotification('Lokasi GPS Anda berhasil disinkronkan!', 'success');
        },
        (error) => {
          showNotification('Gagal mendapatkan lokasi GPS. Silakan tentukan manual atau klik pada peta.', 'warning');
        }
      );
    } else {
      showNotification('Fitur GPS tidak didukung di peramban ini.', 'warning');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto estimate harvest date based on typical duration
    const metadata = COMMODITY_LIST[commodity];
    const pDate = new Date(plantingDate);
    pDate.setDate(pDate.getDate() + metadata.typicalDurationDays);
    const expectedHarvestDate = pDate.toISOString().split('T')[0];

    addHarvest({
      commodity,
      landArea,
      expectedVolume,
      askingPrice,
      latitude,
      longitude,
      region,
      plantingDate,
      expectedHarvestDate,
      notes,
    });

    // Reset coordinates picker if any
    if (clearMapSelection) clearMapSelection();
    setNotes('');
  };

  // Farmer's own harvests
  const myHarvests = harvests.filter(h => h.farmerId === activeUser.PETANI.id);

  // Matches involving this farmer's harvests
  const myMatches = matches.filter(m => {
    const h = harvests.find(harv => harv.id === m.harvestId);
    return h?.farmerId === activeUser.PETANI.id;
  });

  return (
    <div className="space-y-6">
      {/* Farmer Profile Status Block */}
      <div className="bg-gradient-to-r from-nat-dark to-nat-green rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2 text-nat-sand text-xs font-bold mb-1">
            <User className="w-3.5 h-3.5" />
            <span>AKUN MITRA PETANI</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">Selamat Datang, {activeUser.PETANI.name}</h2>
          <p className="text-xs text-nat-light-cream mt-1">
            Wilayah Poktan: <span className="font-semibold text-white">{activeUser.PETANI.region}, Jawa Tengah</span> | ID Anggota: <span className="font-mono text-nat-sand">#F-0912</span>
          </p>
        </div>

        {/* Ambient loss reduction stats */}
        <div className="flex gap-4">
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] text-nat-light-cream uppercase tracking-wider font-semibold">Tanam Sedia</p>
            <p className="text-lg font-bold">{myHarvests.filter(h => h.status === 'ACTIVE').length} Lahan</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10">
            <p className="text-[10px] text-nat-light-cream uppercase tracking-wider font-semibold">Berhasil Sinergi</p>
            <p className="text-lg font-bold text-nat-sand">
              {myHarvests.filter(h => h.status === 'MATCHED').length} Transaksi
            </p>
          </div>
        </div>
      </div>

      {/* Weather & Market Alerts to avoid Food Loss */}
      <div className="bg-amber-50 border border-amber-200/60 rounded-xl p-4 flex gap-3 text-xs text-amber-900">
        <BadgeAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Peringatan Risiko Busuk (Weather Guard FLW):</p>
          <p className="mt-1 text-amber-800 leading-relaxed">
            Curah hujan tinggi diprediksi melanda wilayah <span className="font-semibold">Brebes</span> dalam 10 hari ke depan. Komoditas <span className="font-semibold">Bawang Merah</span> yang mendekati masa panen sangat berisiko terkena busuk umbi. Segera laporkan rencana panen Anda di form bawah untuk langsung dihubungkan dengan cold storage pembeli terdekat!
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Input Lahan */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
          <h3 className="text-sm font-bold text-nat-dark mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-nat-green" />
            Lapor Lahan & Tanggal Tanam
          </h3>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-nat-text mb-1">Komoditas</label>
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
                <label className="block text-xs font-bold text-nat-text mb-1">Luas Lahan (Ha)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="50"
                  value={landArea}
                  onChange={(e) => handleLandAreaChange(parseFloat(e.target.value) || 0.1)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Tanggal Tanam</label>
                <input
                  type="date"
                  value={plantingDate}
                  onChange={(e) => setPlantingDate(e.target.value)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>
            </div>

            <div className="bg-nat-light-cream rounded-lg p-2.5 text-[11px] text-nat-green border border-nat-border">
              <span className="font-bold">Estimasi Durasi: </span>
              {COMMODITY_LIST[commodity].typicalDurationDays} hari. Panen diestimasi pada:{' '}
              <span className="font-bold">
                {(() => {
                  try {
                    const d = new Date(plantingDate);
                    d.setDate(d.getDate() + COMMODITY_LIST[commodity].typicalDurationDays);
                    return d.toISOString().split('T')[0];
                  } catch {
                    return '-';
                  }
                })()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Estimasi Hasil (Kg)</label>
                <input
                  type="number"
                  min="50"
                  value={expectedVolume}
                  onChange={(e) => setExpectedVolume(parseInt(e.target.value) || 0)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green font-bold"
                />
                <span className="text-[10px] text-nat-sage font-medium">Saran: Rata-rata komoditas</span>
              </div>
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Harga Harapan (Rp/Kg)</label>
                <input
                  type="number"
                  step="500"
                  min="1000"
                  value={askingPrice}
                  onChange={(e) => setAskingPrice(parseInt(e.target.value) || 0)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green font-bold"
                />
                <span className="text-[10px] text-nat-sage font-medium">HPP Acuan: Rp{COMMODITY_LIST[commodity].averagePricePerKg.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* Coordinates / Map Selection Section */}
            <div className="bg-nat-light-cream rounded-xl p-3 border border-nat-border space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-nat-dark flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-nat-brown" />
                  Koordinat Lahan
                </span>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="text-[10px] text-nat-green font-bold hover:text-nat-green-hover cursor-pointer"
                >
                  Gunakan GPS HP
                </button>
              </div>

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

              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                <div>
                  <span className="text-nat-sage font-semibold block">Wilayah / Kabupaten</span>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full bg-white border border-nat-border rounded px-2 py-1 text-nat-dark font-bold focus:outline-none focus:ring-1 focus:ring-nat-green"
                  />
                </div>
                <div className="flex items-end">
                  <p className="text-[9px] text-nat-sage font-medium italic leading-snug">
                    *Atau pilih/klik pada peta sebaran di atas
                  </p>
                </div>
              </div>
            </div>

            {/* TensorFlow.js Computer Vision Grading Panel */}
            <div className="bg-nat-light-cream rounded-xl p-3.5 border border-nat-border space-y-3">
              <span className="text-xs font-bold text-nat-dark flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-nat-green" />
                Sertifikasi Kualitas AI (TensorFlow.js)
              </span>

              <p className="text-[10px] text-nat-sage leading-relaxed">
                Unggah foto contoh komoditas Anda untuk menguji grade kelayakan dengan model cerdas MobileNetV2 lokal.
              </p>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <label className="flex flex-col items-center justify-center border border-dashed border-nat-border bg-white rounded-lg p-2 hover:bg-slate-50 cursor-pointer text-center font-bold text-nat-dark">
                  <Upload className="w-4 h-4 text-nat-sage mb-1" />
                  <span>Ambil Foto</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleGradeImageUpload}
                    className="hidden"
                  />
                </label>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => runTensorFlowGrading(PRESET_GRADE_IMAGES.GRADE_A)}
                    className="w-full bg-white hover:bg-slate-50 border border-nat-border rounded-lg py-1 px-1.5 font-bold text-[9px] text-nat-green flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    <span>Sampel Grade A</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => runTensorFlowGrading(PRESET_GRADE_IMAGES.GRADE_C)}
                    className="w-full bg-white hover:bg-slate-50 border border-nat-border rounded-lg py-1 px-1.5 font-bold text-[9px] text-nat-brown flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    <span>Sampel Grade C</span>
                  </button>
                </div>
              </div>

              {/* Preview & Results */}
              {isGrading && (
                <div className="bg-white border border-nat-border rounded-lg p-3 text-center py-6 space-y-2">
                  <RefreshCw className="w-6 h-6 text-nat-green animate-spin mx-auto" />
                  <p className="text-[10px] text-nat-dark font-bold animate-pulse">Menjalankan Prediksi Tensor...</p>
                </div>
              )}

              {!isGrading && gradingImage && (
                <div className="bg-white border border-nat-border rounded-lg p-2.5 space-y-2.5">
                  <div className="relative aspect-video rounded-md overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200">
                    <img
                      src={gradingImage}
                      alt="Crop specimen"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-1 right-1 bg-slate-900/70 text-white font-mono text-[8px] px-1 py-0.5 rounded uppercase tracking-wider">
                      Specimen Analyzed
                    </div>
                  </div>

                  {gradingResult && (
                    <div className="space-y-2 text-[11px] pt-1 border-t border-slate-100">
                      <div className="flex justify-between items-center bg-nat-light-cream p-1.5 rounded border border-nat-border/50">
                        <span className="font-bold text-nat-dark uppercase">Grade Terdeteksi:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-wider ${
                          gradingResult.grade === 'A' 
                            ? 'bg-emerald-500 text-white' 
                            : gradingResult.grade === 'B' 
                            ? 'bg-amber-500 text-white' 
                            : 'bg-red-500 text-white'
                        }`}>
                          GRADE {gradingResult.grade} ({gradingResult.confidence}%)
                        </span>
                      </div>

                      {/* Diagnostic Sliders */}
                      <div className="space-y-1.5 text-[10px] text-nat-text">
                        <span className="font-bold text-nat-sage uppercase tracking-wider block">Metrik Diagnostik:</span>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>Intensitas Warna (Warna Matang)</span>
                            <span className="font-bold text-nat-dark">{gradingResult.features.colorScore}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${gradingResult.features.colorScore}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>Keseragaman Ukuran (Uniformity)</span>
                            <span className="font-bold text-nat-dark">{gradingResult.features.sizeUniformity}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: `${gradingResult.features.sizeUniformity}%` }} />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between font-semibold">
                            <span>Persentase Bebas Cacat/Bercak (Blemish Free)</span>
                            <span className="font-bold text-nat-dark">{gradingResult.features.blemishFreeScore}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-amber-500 h-full rounded-full" style={{ width: `${gradingResult.features.blemishFreeScore}%` }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-nat-text mb-1">Catatan Kondisi Lahan & Mutu</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Misal: Sudah diasuransikan, butuh penjemputan armada..."
                rows={2}
                className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
              />
            </div>

            <button
              type="submit"
              id="add-harvest-btn"
              className="w-full bg-nat-green hover:bg-nat-green-hover text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all shadow-md shadow-nat-green/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sprout className="w-4 h-4" />
              Laporkan Rencana Tanam
            </button>
          </form>
        </div>

        {/* Lahan Saya & Hasil Pencocokan */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lahan Saya */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
            <h3 className="text-sm font-bold text-nat-dark mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-nat-green" />
              Laporan Lahan Aktif Saya ({myHarvests.length})
            </h3>

            {myHarvests.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-nat-text">
                  <thead>
                    <tr className="border-b border-nat-border text-nat-sage font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-2">Komoditas</th>
                      <th className="py-2">Luas & Estimasi Yield</th>
                      <th className="py-2">Estimasi Panen</th>
                      <th className="py-2">Hrg Harapan</th>
                      <th className="py-2">Sertifikat QR</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myHarvests.map((h) => {
                      const crop = COMMODITY_LIST[h.commodity];
                      return (
                        <tr key={h.id} className="border-b border-nat-light-cream hover:bg-nat-light-cream/35 transition-colors">
                          <td className="py-3 font-bold text-nat-dark flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: crop.color }} />
                            {h.commodity}
                          </td>
                          <td className="py-3 text-nat-text">
                            <div>{h.landArea} Ha</div>
                            <div className="text-[10px] text-nat-sage font-semibold">{h.expectedVolume.toLocaleString('id-ID')} Kg</div>
                          </td>
                          <td className="py-3 text-nat-text">
                            <div className="font-semibold flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-nat-sage" />
                              {h.expectedHarvestDate}
                            </div>
                            <div className="text-[10px] text-nat-sage">Tanam: {h.plantingDate}</div>
                          </td>
                          <td className="py-3 font-bold text-nat-dark">
                            Rp{h.askingPrice.toLocaleString('id-ID')}/Kg
                          </td>
                          <td className="py-3">
                            <button
                              onClick={() => setSelectedTraceHarvest(h)}
                              className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-[10px] transition-all flex items-center gap-1 cursor-pointer"
                              title="Lihat QR Code & Sertifikat Blockchain"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              <span>QR Trace</span>
                            </button>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${
                              h.status === 'ACTIVE' 
                                ? 'bg-nat-light-cream text-nat-green border-nat-border' 
                                : h.status === 'MATCHED'
                                ? 'bg-nat-cream text-nat-brown border-nat-border'
                                : 'bg-nat-slate text-nat-text border-nat-border'
                            }`}>
                              {h.status === 'ACTIVE' ? 'Aktif' : h.status === 'MATCHED' ? 'Terhubung' : h.status}
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
                Belum ada laporan rencana tanam. Silakan gunakan form sebelah kiri untuk melapor.
              </div>
            )}
          </div>

          {/* Pencocokan Cerdas & Pre-Order */}
          <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-nat-light-cream">
              <h3 className="text-sm font-bold text-nat-dark flex items-center gap-1.5">
                <ArrowRightLeft className="w-4 h-4 text-nat-green" />
                Rekomendasi Pembeli Terdekat (Skor Match Cerdas)
              </h3>
              <span className="text-[10px] bg-nat-light-cream text-nat-green border border-nat-border font-bold px-2.5 py-0.5 rounded-full">
                {myMatches.length} Penawaran Cocok
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
                      id={`match-card-${match.id}`}
                    >
                      {/* Match header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: COMMODITY_LIST[harvest.commodity].color }} />
                          <h4 className="text-xs font-bold text-nat-dark">{demand.buyerName}</h4>
                          <span className="text-[10px] text-nat-sage font-medium">• Wilayah: {demand.region}</span>
                        </div>

                        {/* Matching Score Circle Badge */}
                        <div className="flex items-center space-x-1">
                          <BadgePercent className="w-3.5 h-3.5 text-nat-green" />
                          <span className="text-xs font-bold text-nat-sage">Kecocokan: </span>
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
                          <p className="text-nat-sage font-bold uppercase text-[9px]">Jarak Logistik</p>
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
                            {harvest.expectedVolume.toLocaleString('id-ID')} Kg / {demand.requiredVolume.toLocaleString('id-ID')} Kg
                          </p>
                          <div className="w-full bg-nat-cream h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-nat-green h-full rounded-full" style={{ width: `${match.scoreDetails.volumeScore}%` }} />
                          </div>
                          <span className="text-[9px] text-nat-sage font-medium">Skor: {match.scoreDetails.volumeScore}/100</span>
                        </div>

                        {/* 3. Kesesuaian Harga */}
                        <div>
                          <p className="text-nat-sage font-bold uppercase text-[9px]">Kesesuaian Harga</p>
                          <p className="font-bold text-nat-dark mt-0.5">
                            Rp{demand.offerPrice.toLocaleString('id-ID')} / Rp{harvest.askingPrice.toLocaleString('id-ID')}
                          </p>
                          <div className="w-full bg-nat-cream h-1 rounded-full mt-1 overflow-hidden">
                            <div className="bg-nat-green h-full rounded-full" style={{ width: `${match.scoreDetails.priceScore}%` }} />
                          </div>
                          <span className="text-[9px] text-nat-sage font-medium">Skor: {match.scoreDetails.priceScore}/100</span>
                        </div>
                      </div>

                      {demand.notes && (
                        <p className="text-[11px] text-nat-text italic mb-3 bg-nat-light-cream/50 p-2 rounded border border-nat-border">
                          "Catatan Buyer: {demand.notes}"
                        </p>
                      )}

                      {/* Matching action workflow */}
                      <div className="flex justify-between items-center pt-2 border-t border-nat-border">
                        <div className="text-[10px] text-nat-sage font-medium">
                          Batas Kebutuhan Buyer: <span className="font-semibold text-nat-text">{demand.dateRequired}</span>
                        </div>

                        <div className="flex space-x-2">
                          {match.status === 'PENDING' ? (
                            <button
                              id={`accept-btn-farmer-${match.id}`}
                              onClick={() => updateMatchStatus(match.id, 'ACCEPTED_BY_FARMER')}
                              className="bg-nat-green hover:bg-nat-green-hover text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <span>Ajukan Pre-Order</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : match.status === 'ACCEPTED_BY_FARMER' ? (
                            <div className="flex items-center space-x-1.5 text-nat-brown font-bold text-[11px] bg-nat-cream px-2.5 py-1 rounded-lg border border-nat-border">
                              <span className="w-1.5 h-1.5 rounded-full bg-nat-brown animate-pulse" />
                              <span>Menunggu Respon Pembeli</span>
                            </div>
                          ) : match.status === 'ACCEPTED_BY_BUYER' ? (
                            <button
                              id={`confirm-btn-farmer-${match.id}`}
                              onClick={() => updateMatchStatus(match.id, 'CONFIRMED')}
                              className="bg-nat-green hover:bg-nat-green-hover text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Konfirmasi Sepakat Transaksi</span>
                            </button>
                          ) : match.status === 'CONFIRMED' ? (
                            <div className="flex items-center space-x-1.5 text-nat-green font-bold text-[11px] bg-nat-light-cream px-2.5 py-1 rounded-lg border border-nat-border">
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Sinergi Terjalin (Dana Escrow Aman)</span>
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
                Belum ada komoditas panen aktif Anda yang cocok dengan kebutuhan pembeli saat ini.
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
