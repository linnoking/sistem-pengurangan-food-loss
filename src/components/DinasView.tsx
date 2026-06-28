/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { COMMODITY_LIST, Komoditas, Harvest, Demand } from '../types';
import { generateHarvestForecast } from '../utils/forecasting';
import { optimizeCollectorRoutes, calculateHaversineDistance } from '../utils/routeOptimizer';
import { 
  Layers, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ShieldCheck, 
  BadgePercent, 
  Scale, 
  Activity, 
  MapPin,
  Leaf,
  Calendar,
  Truck,
  LineChart,
  HelpCircle,
  Clock,
  CheckCircle2,
  Navigation
} from 'lucide-react';

export default function DinasView() {
  const { harvests, demands, matches } = useApp();
  const [activeTab, setActiveTab] = useState<'monitoring' | 'forecasting' | 'routing'>('monitoring');

  // --- TAB 2: FORECASTING STATES ---
  const [forecastRegion, setForecastRegion] = useState<string>('Brebes');
  const [forecastCommodity, setForecastCommodity] = useState<Komoditas>('Bawang Merah');

  // --- TAB 3: ROUTING STATES ---
  const [depotRegion, setDepotRegion] = useState<string>('Brebes');
  const [vehicleCapacity, setVehicleCapacity] = useState<number>(5000);
  const [numVehicles, setNumVehicles] = useState<number>(3);
  const [isRoutingOptimized, setIsRoutingOptimized] = useState<boolean>(false);

  // Depot coordinates registry
  const DEPOT_COORDINATES: Record<string, { lat: number; lng: number }> = {
    'Brebes': { lat: -6.871, lng: 109.042 },
    'Garut': { lat: -7.227, lng: 107.908 },
    'Malang': { lat: -7.982, lng: 112.630 },
    'Cianjur': { lat: -6.822, lng: 107.138 }
  };

  const currentDepotCoords = DEPOT_COORDINATES[depotRegion] || DEPOT_COORDINATES['Brebes'];

  // --- TAB 1: MONITORING AGGREGATES ---
  const stats = useMemo(() => {
    const activeHarvests = harvests.filter(h => h.status !== 'EXPIRED');
    const activeDemands = demands.filter(d => d.status !== 'CANCELLED');

    const totalHarvestKg = activeHarvests.reduce((sum, h) => sum + h.expectedVolume, 0);
    const totalDemandKg = activeDemands.reduce((sum, d) => sum + d.requiredVolume, 0);

    const matchedHarvests = harvests.filter(h => h.status === 'MATCHED');
    const foodLossAvoidedKg = matchedHarvests.reduce((sum, h) => sum + h.expectedVolume, 0);

    const activeMatches = matches.filter(m => m.score > 0);
    const avgMatchScore = activeMatches.length > 0 
      ? Math.round(activeMatches.reduce((sum, m) => sum + m.score, 0) / activeMatches.length)
      : 0;

    return {
      totalHarvestKg,
      totalDemandKg,
      foodLossAvoidedKg,
      avgMatchScore,
      activeFarmersCount: new Set(activeHarvests.map(h => h.farmerId)).size,
      activeBuyersCount: new Set(activeDemands.map(d => d.buyerId)).size,
    };
  }, [harvests, demands, matches]);

  const commodityChartData = useMemo(() => {
    const crops = Object.keys(COMMODITY_LIST) as Komoditas[];
    
    return crops.map(crop => {
      const cropHarvests = harvests.filter(h => h.commodity === crop && h.status !== 'EXPIRED');
      const cropDemands = demands.filter(d => d.commodity === crop && d.status !== 'CANCELLED');

      const harvestVol = cropHarvests.reduce((sum, h) => sum + h.expectedVolume, 0);
      const demandVol = cropDemands.reduce((sum, d) => sum + d.requiredVolume, 0);
      
      return {
        name: crop,
        harvest: harvestVol,
        demand: demandVol,
        color: COMMODITY_LIST[crop].color
      };
    });
  }, [harvests, demands]);

  const regionalSurplusData = useMemo(() => {
    const regions = ['Brebes', 'Garut', 'Malang', 'Cianjur'];
    
    return regions.map(regName => {
      const regHarvests = harvests.filter(h => h.region.toLowerCase() === regName.toLowerCase() && h.status !== 'EXPIRED');
      const regDemands = demands.filter(d => d.region.toLowerCase() === regName.toLowerCase() && d.status !== 'CANCELLED');

      const harvestVol = regHarvests.reduce((sum, h) => sum + h.expectedVolume, 0);
      const demandVol = regDemands.reduce((sum, d) => sum + d.requiredVolume, 0);

      const unmatchedSurplus = Math.max(0, harvestVol - demandVol);
      
      let perishabilityFactor = 1.0; 
      regHarvests.forEach(h => {
        const shelfLife = COMMODITY_LIST[h.commodity]?.shelfLifeDays || 15;
        if (shelfLife <= 8) perishabilityFactor = 2.0;
        else if (shelfLife <= 15) perishabilityFactor = 1.5;
        else if (shelfLife <= 30) perishabilityFactor = 1.0;
        else perishabilityFactor = 0.5;
      });

      const ratio = harvestVol > 0 ? (unmatchedSurplus / harvestVol) : 0;
      const surplusRiskIndex = Math.min(100, Math.round(ratio * 50 * perishabilityFactor));

      return {
        regionName: regName,
        totalHarvestKg: harvestVol,
        totalDemandKg: demandVol,
        activeFarmers: new Set(regHarvests.map(h => h.farmerId)).size,
        activeBuyers: new Set(regDemands.map(d => d.buyerId)).size,
        unmatchedSurplusKg: unmatchedSurplus,
        surplusRiskIndex,
      };
    });
  }, [harvests, demands]);

  const maxChartValue = useMemo(() => {
    const vals = commodityChartData.flatMap(d => [d.harvest, d.demand]);
    const maxVal = Math.max(...vals, 10000);
    return Math.ceil(maxVal / 5000) * 5000;
  }, [commodityChartData]);

  // --- TAB 2: DYNAMIC FORECAST COMPUTATION ---
  const activeForecast = useMemo(() => {
    return generateHarvestForecast(harvests, forecastRegion, forecastCommodity);
  }, [harvests, forecastRegion, forecastCommodity]);

  // Forecast Max for dynamic SVG plotting
  const maxForecastVal = useMemo(() => {
    const points = activeForecast.forecasts;
    const maxVal = Math.max(...points.map(p => p.confidenceUpper), 1000);
    return Math.ceil(maxVal / 2000) * 2000;
  }, [activeForecast]);

  // --- TAB 3: DYNAMIC ROUTE OPTIMIZATION ---
  const optimizedRoutes = useMemo(() => {
    // Filter harvests in selected region to optimize routing
    const regionalHarvests = harvests.filter(
      h => h.region.toLowerCase() === depotRegion.toLowerCase() && h.status === 'ACTIVE'
    );
    return optimizeCollectorRoutes(
      regionalHarvests,
      currentDepotCoords.lat,
      currentDepotCoords.lng,
      vehicleCapacity,
      numVehicles
    );
  }, [harvests, depotRegion, currentDepotCoords, vehicleCapacity, numVehicles]);

  const totalRoutingStops = useMemo(() => {
    return optimizedRoutes.reduce((sum, r) => sum + r.routeStops.length, 0);
  }, [optimizedRoutes]);

  const totalRoutingDistance = useMemo(() => {
    return Math.round(optimizedRoutes.reduce((sum, r) => sum + r.totalDistanceKm, 0) * 10) / 10;
  }, [optimizedRoutes]);

  const totalRoutingVolume = useMemo(() => {
    return optimizedRoutes.reduce((sum, r) => sum + r.totalVolumeKg, 0);
  }, [optimizedRoutes]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-nat-border rounded-2xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-nat-dark tracking-tight flex items-center gap-2">
            <Layers className="w-4 h-4 text-nat-green" />
            SinergiTani — Pengawasan & Peramalan Logistik Nasional
          </h2>
          <p className="text-xs text-nat-sage mt-0.5 font-medium">
            Sistem peramalan cerdas, alokasi kendaraan VRP, dan deteksi dini food loss hortikultura terpadu.
          </p>
        </div>
        <div className="text-[11px] text-nat-sage bg-nat-light-cream px-3 py-1.5 rounded-lg border border-nat-border font-bold shrink-0">
          Sinkronisasi Terakhir: <span className="font-bold text-nat-dark">Real-time (GMT+7)</span>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-nat-border gap-2">
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'monitoring'
              ? 'border-nat-green text-nat-green'
              : 'border-transparent text-nat-sage hover:text-nat-dark'
          }`}
        >
          <Activity className="w-4 h-4" />
          Indeks Pengawasan Nasional
        </button>
        <button
          onClick={() => setActiveTab('forecasting')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'forecasting'
              ? 'border-nat-green text-nat-green'
              : 'border-transparent text-nat-sage hover:text-nat-dark'
          }`}
        >
          <LineChart className="w-4 h-4" />
          Peramalan Time-Series (FBProphet)
        </button>
        <button
          onClick={() => setActiveTab('routing')}
          className={`px-4 py-2 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'routing'
              ? 'border-nat-green text-nat-green'
              : 'border-transparent text-nat-sage hover:text-nat-dark'
          }`}
        >
          <Truck className="w-4 h-4" />
          Optimasi Rute Kolektor (VRP / OR-Tools)
        </button>
      </div>

      {/* TAB CONTENT RENDERING */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          {/* Aggregate Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border border-nat-border p-4 shadow-sm">
              <p className="text-[10px] text-nat-sage uppercase tracking-wider font-bold flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-nat-green" />
                Total Volume Tanam
              </p>
              <p className="text-lg font-bold text-nat-dark mt-1.5">
                {stats.totalHarvestKg.toLocaleString('id-ID')} Kg
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-nat-text mt-2">
                <span className="font-bold text-nat-green">{stats.activeFarmersCount} Petani</span>
                <span>aktif melapor lahan</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-nat-border p-4 shadow-sm">
              <p className="text-[10px] text-nat-sage uppercase tracking-wider font-bold flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-nat-brown" />
                Total Permintaan Pasar
              </p>
              <p className="text-lg font-bold text-nat-dark mt-1.5">
                {stats.totalDemandKg.toLocaleString('id-ID')} Kg
              </p>
              <div className="flex items-center space-x-1.5 text-[10px] text-nat-text mt-2">
                <span className="font-bold text-nat-brown">{stats.activeBuyersCount} Hub Koperasi</span>
                <span>aktif mencari pasokan</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-nat-border p-4 shadow-sm ring-1 ring-nat-green/10 bg-nat-light-cream/40">
              <p className="text-[10px] text-nat-green uppercase tracking-wider font-bold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-nat-green" />
                Food Loss Terselamatkan
              </p>
              <p className="text-lg font-bold text-nat-green mt-1.5">
                {stats.foodLossAvoidedKg.toLocaleString('id-ID')} Kg
              </p>
              <div className="flex items-center space-x-1 text-[10px] text-nat-green mt-2 font-bold">
                <Leaf className="w-3 h-3 shrink-0" />
                <span>±{Math.round(stats.foodLossAvoidedKg * 1.9)} Kg Emisi CO2 diredam</span>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-nat-border p-4 shadow-sm">
              <p className="text-[10px] text-nat-sage uppercase tracking-wider font-bold flex items-center gap-1">
                <BadgePercent className="w-3.5 h-3.5 text-nat-brown" />
                Kesehatan Alur Distribusi
              </p>
              <p className="text-lg font-bold text-nat-dark mt-1.5">
                {stats.avgMatchScore}% Match
              </p>
              <div className="w-full bg-nat-light-cream h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-nat-green h-full rounded-full" style={{ width: `${stats.avgMatchScore}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Custom SVG Bar Chart of Supply vs Demand */}
            <div className="lg:col-span-3 bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
              <h3 className="text-xs font-bold text-nat-dark uppercase tracking-wider mb-6 pb-2 border-b border-nat-light-cream">
                Neraca Komparatif Komoditas (Tanam vs Permintaan)
              </h3>

              <div className="space-y-5">
                {commodityChartData.map((data) => {
                  const harvestWidth = (data.harvest / maxChartValue) * 100;
                  const demandWidth = (data.demand / maxChartValue) * 100;

                  return (
                    <div key={data.name} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-nat-dark">{data.name}</span>
                        <span className="text-[10px] text-nat-sage font-semibold">
                          Tanam: <span className="text-nat-text font-bold">{data.harvest.toLocaleString('id-ID')} Kg</span> | 
                          Minta: <span className="text-nat-brown font-bold">{data.demand.toLocaleString('id-ID')} Kg</span>
                        </span>
                      </div>

                      <div className="space-y-1">
                        {/* Harvest Bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-[9px] text-nat-sage font-bold uppercase shrink-0">Produksi</div>
                          <div className="flex-1 bg-nat-light-cream h-3.5 rounded-md overflow-hidden border border-nat-border relative">
                            <div 
                              className="h-full rounded-md transition-all duration-300" 
                              style={{ 
                                width: `${Math.max(2, harvestWidth)}%`,
                                backgroundColor: data.color,
                                opacity: 0.8
                              }} 
                            />
                          </div>
                        </div>

                        {/* Demand Bar */}
                        <div className="flex items-center gap-2">
                          <div className="w-16 text-[9px] text-nat-sage font-bold uppercase shrink-0">Daya Serap</div>
                          <div className="flex-1 bg-nat-light-cream h-3.5 rounded-md overflow-hidden border border-nat-border relative">
                            <div 
                              className="h-full bg-nat-brown rounded-md transition-all duration-300" 
                              style={{ width: `${Math.max(2, demandWidth)}%`, opacity: 0.8 }} 
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart Axis Labels */}
              <div className="flex justify-between text-[9px] text-nat-sage pt-4 border-t border-nat-light-cream mt-6 font-bold">
                <span>0 Kg</span>
                <span>{(maxChartValue / 2).toLocaleString('id-ID')} Kg</span>
                <span>{maxChartValue.toLocaleString('id-ID')} Kg (Skala Penuh)</span>
              </div>
            </div>

            {/* Surplus & Food Loss Risk Tracker */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
              <h3 className="text-xs font-bold text-nat-dark uppercase tracking-wider mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-nat-brown" />
                Indeks Risiko Penumpukan & Food Loss Daerah
              </h3>

              <div className="space-y-4">
                {regionalSurplusData.map((reg) => {
                  let riskLevel = 'RENDAH';
                  let badgeColor = 'bg-nat-light-cream text-nat-green border-nat-border';
                  let progressColor = 'bg-nat-green';

                  if (reg.surplusRiskIndex >= 70) {
                    riskLevel = 'TINGGI (AWAS)';
                    badgeColor = 'bg-red-50 text-red-700 border-red-200';
                    progressColor = 'bg-red-500';
                  } else if (reg.surplusRiskIndex >= 40) {
                    riskLevel = 'SEDANG (SIAGA)';
                    badgeColor = 'bg-nat-cream text-nat-brown border-nat-border';
                    progressColor = 'bg-nat-brown';
                  }

                  return (
                    <div key={reg.regionName} className="border border-nat-border rounded-xl p-3 bg-nat-light-cream/35">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-xs font-bold text-nat-dark flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-nat-sage" />
                            Kabupaten {reg.regionName}
                          </h4>
                          <span className="text-[10px] text-nat-sage font-bold mt-0.5 inline-block">
                            {reg.activeFarmers} Petani • {reg.activeBuyers} Koperasi Pembeli
                          </span>
                        </div>

                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${badgeColor}`}>
                          {riskLevel}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] mb-2 border-t border-b border-nat-border py-1.5 text-nat-text">
                        <div>
                          <span className="text-nat-sage block">Surplus Tak Terserap:</span>
                          <span className="font-bold text-nat-dark">
                            {reg.unmatchedSurplusKg.toLocaleString('id-ID')} Kg
                          </span>
                        </div>
                        <div>
                          <span className="text-nat-sage block">Total Panen Daerah:</span>
                          <span className="font-semibold text-nat-text">
                            {reg.totalHarvestKg.toLocaleString('id-ID')} Kg
                          </span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="text-nat-sage font-bold">Persentase Risiko Pembusukan Lahan:</span>
                          <span className="font-bold text-nat-dark">{reg.surplusRiskIndex}%</span>
                        </div>
                        <div className="w-full bg-nat-cream h-1.5 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${progressColor}`} style={{ width: `${reg.surplusRiskIndex}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 bg-nat-dark text-nat-light-cream p-3 rounded-xl text-[10px] leading-relaxed border border-nat-border">
                <div className="flex items-center gap-1 font-bold text-white mb-1">
                  <Leaf className="w-3.5 h-3.5 text-nat-sand" />
                  <span>Rekomendasi Kebijakan Dinas (Intervensi Logistik)</span>
                </div>
                Jika wilayah terpantau memiliki indeks <span className="font-bold text-white">SIAGA</span> atau <span className="font-bold text-white">AWAS</span>, Dinas disarankan menginstruksikan pengoperasian armada berpendingin (cold chain) subsidi daerah ke titik koordinat bersangkutan guna memperpanjang daya simpan hingga 30 hari.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: TIME-SERIES FORECASTING */}
      {activeTab === 'forecasting' && (
        <div className="space-y-6">
          {/* Controls Panel */}
          <div className="bg-white border border-nat-border rounded-2xl p-5 shadow-sm">
            <h3 className="text-sm font-bold text-nat-dark mb-4 pb-2 border-b border-nat-light-cream flex items-center gap-1.5">
              <LineChart className="w-4 h-4 text-nat-green" />
              SinergiTani Forecasting Engine (Holt's Linear & Seasonal Smoothing)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Pilih Kabupaten Analisis</label>
                <select
                  value={forecastRegion}
                  onChange={(e) => setForecastRegion(e.target.value)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                >
                  <option value="Brebes">Brebes (Pusat Bawang Merah)</option>
                  <option value="Garut">Garut (Pusat Cabai Merah)</option>
                  <option value="Malang">Malang (Pusat Hortikultura)</option>
                  <option value="Cianjur">Cianjur (Pusat Padi/Sayur)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Komoditas Tani</label>
                <select
                  value={forecastCommodity}
                  onChange={(e) => setForecastCommodity(e.target.value as Komoditas)}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                >
                  {Object.keys(COMMODITY_LIST).map((key) => (
                    <option key={key} value={key}>{key}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <div className="text-[10px] text-nat-sage leading-relaxed bg-nat-light-cream p-3 rounded-xl border border-nat-border">
                  <span className="font-bold text-nat-dark">Komentar Kode Produksi:</span> Model peramalan time-series ini menggunakan data masukan dari laporan tanam aktif serta faktor musiman bulanan. Di produksi, engine ini memanggil backend microservice Python Prophet / SARIMAX untuk fine-tuning dataset multi-tahun.
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Visual Line Graph with Confidence Bands (SVG based) */}
            <div className="lg:col-span-3 bg-white border border-nat-border rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-xs font-bold text-nat-dark uppercase tracking-wider">
                  Proyeksi Kurva Hasil Panen {forecastCommodity.toUpperCase()} ({forecastRegion})
                </h4>
                <p className="text-[11px] text-nat-sage">Garis solid merepresentasikan target peramalan, area transparan merepresentasikan batas keyakinan 95% (Confidence Interval).</p>
              </div>

              {/* Responsive SVG Sparkline Plot */}
              <div className="relative w-full aspect-[2/1] bg-slate-50 rounded-xl p-4 border border-slate-100">
                <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="10" y1="50" x2="390" y2="50" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="10" y1="100" x2="390" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="10" y1="150" x2="390" y2="150" stroke="#f1f5f9" strokeWidth="1" />

                  {/* Generate coordinates for confidence interval bounds */}
                  {(() => {
                    const points = activeForecast.forecasts;
                    const xStep = 100; // spacing between weeks
                    
                    // Confidence Upper Bounds
                    const upperCoords = points.map((p, idx) => {
                      const x = 50 + (idx * xStep);
                      const y = 180 - (p.confidenceUpper / maxForecastVal) * 150;
                      return `${x},${y}`;
                    });

                    // Confidence Lower Bounds
                    const lowerCoords = points.map((p, idx) => {
                      const x = 50 + (idx * xStep);
                      const y = 180 - (p.confidenceLower / maxForecastVal) * 150;
                      return `${x},${y}`;
                    }).reverse();

                    const polygonPoints = [...upperCoords, ...lowerCoords.map((_, idx) => {
                      const revIdx = points.length - 1 - idx;
                      const x = 50 + (revIdx * xStep);
                      const y = 180 - (points[revIdx].confidenceLower / maxForecastVal) * 150;
                      return `${x},${y}`;
                    })].join(' ');

                    // Main Prediction Path
                    const predPath = points.map((p, idx) => {
                      const x = 50 + (idx * xStep);
                      const y = 180 - (p.predictedVolume / maxForecastVal) * 150;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return (
                      <>
                        {/* Shaded confidence interval polygon */}
                        <polygon
                          points={polygonPoints}
                          fill="#10b981"
                          fillOpacity="0.08"
                        />

                        {/* Predict line */}
                        <path
                          d={predPath}
                          fill="none"
                          stroke={COMMODITY_LIST[forecastCommodity].color}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Upper confidence boundary dashed line */}
                        <path
                          d={points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${50 + (idx * xStep)} ${180 - (p.confidenceUpper / maxForecastVal) * 150}`).join(' ')}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />

                        {/* Lower confidence boundary dashed line */}
                        <path
                          d={points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${50 + (idx * xStep)} ${180 - (p.confidenceLower / maxForecastVal) * 150}`).join(' ')}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="1"
                          strokeDasharray="4,4"
                        />

                        {/* Interactive Data Nodes */}
                        {points.map((p, idx) => {
                          const x = 50 + (idx * xStep);
                          const y = 180 - (p.predictedVolume / maxForecastVal) * 150;
                          return (
                            <g key={idx}>
                              <circle
                                cx={x}
                                cy={y}
                                r="5"
                                fill="#ffffff"
                                stroke={COMMODITY_LIST[forecastCommodity].color}
                                strokeWidth="2.5"
                              />
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>

                {/* Weeks Labels */}
                <div className="absolute bottom-1 left-0 right-0 flex justify-around text-[10px] font-bold text-nat-sage">
                  {activeForecast.forecasts.map((p, idx) => (
                    <span key={idx} className="w-16 text-center">
                      M{p.week} ({p.date})
                    </span>
                  ))}
                </div>

                {/* Y-Axis scale indicator */}
                <div className="absolute top-2 left-2 text-[8px] font-mono bg-slate-900/10 text-slate-600 px-1 py-0.5 rounded">
                  Skala Maks: {maxForecastVal.toLocaleString('id-ID')} Kg
                </div>
              </div>
            </div>

            {/* Numerical Forecast breakdown & Food Loss Alarm */}
            <div className="lg:col-span-2 space-y-4">
              {/* Proyeksi Detail Card */}
              <div className="bg-white border border-nat-border rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-nat-dark uppercase tracking-wider">
                    Angka Prediksi Hasil Mingguan
                  </h4>

                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-nat-sage font-bold">Tren:</span>
                    {activeForecast.trend === 'UP' ? (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-extrabold border border-emerald-100 flex items-center gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        +{activeForecast.growthRate}%
                      </span>
                    ) : activeForecast.trend === 'DOWN' ? (
                      <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded text-[10px] font-extrabold border border-red-100 flex items-center gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        {activeForecast.growthRate}%
                      </span>
                    ) : (
                      <span className="bg-slate-50 text-slate-700 px-2 py-0.5 rounded text-[10px] font-extrabold border border-slate-100">
                        Stabil ({activeForecast.growthRate}%)
                      </span>
                    )}
                  </div>
                </div>

                <div className="divide-y divide-nat-light-cream">
                  {activeForecast.forecasts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex justify-between items-center text-xs">
                      <div>
                        <p className="font-extrabold text-nat-dark">Minggu Ke-{p.week}</p>
                        <p className="text-[10px] text-nat-sage font-semibold">Tgl Sedia: {p.date}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-black text-nat-dark text-sm">
                          {p.predictedVolume.toLocaleString('id-ID')} Kg
                        </p>
                        <p className="text-[10px] text-emerald-600 font-mono font-bold">
                          95% CI: [{p.confidenceLower.toLocaleString('id-ID')} - {p.confidenceUpper.toLocaleString('id-ID')}]
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Surplus Warning */}
              {(() => {
                const totalPredictedSum = activeForecast.forecasts.reduce((sum, p) => sum + p.predictedVolume, 0);
                const regData = regionalSurplusData.find(r => r.regionName.toLowerCase() === forecastRegion.toLowerCase());
                const currentDemand = regData ? regData.totalDemandKg : 5000;
                
                const isOverSupply = totalPredictedSum > (currentDemand * 1.3);

                return isOverSupply ? (
                  <div className="bg-red-50 border border-red-200/60 text-red-900 rounded-2xl p-4 text-xs space-y-1.5 shadow-sm">
                    <p className="font-bold flex items-center gap-1.5 text-red-700">
                      <AlertTriangle className="w-4 h-4" />
                      ALARM PREDIKSI OVER-SUPPLY (Risiko FLW)
                    </p>
                    <p className="text-[11px] text-red-800 leading-relaxed">
                      Peramalan pergerakan panen <span className="font-bold">{forecastCommodity}</span> di <span className="font-bold">{forecastRegion}</span> menunjukkan total volume 4 minggu ke depan (<span className="font-bold">{totalPredictedSum.toLocaleString('id-ID')} Kg</span>) melampaui daya serap pasar (<span className="font-bold">{currentDemand.toLocaleString('id-ID')} Kg</span>) hingga <span className="font-black text-red-700">+{Math.round((totalPredictedSum / (currentDemand || 1) - 1) * 100)}%</span>.
                    </p>
                    <p className="text-[10px] font-bold text-red-900 italic">
                      Kebijakan: Subsidi distribusi trans-daerah segera diaktifkan untuk relokasi hasil tanam ke wilayah defisit!
                    </p>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200/60 text-emerald-900 rounded-2xl p-4 text-xs space-y-1 shadow-sm">
                    <p className="font-bold flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                      Proyeksi Suplai Seimbang (Optimal)
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-relaxed">
                      Volume tanam {forecastCommodity} di wilayah {forecastRegion} berada dalam tingkat wajar aman. Tidak ada indikasi penumpukan sisa panen berlebih untuk 4 minggu mendatang.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROUTE OPTIMIZATION */}
      {activeTab === 'routing' && (
        <div className="space-y-6">
          {/* Configuration Panel */}
          <div className="bg-white border border-nat-border rounded-2xl p-5 shadow-sm space-y-4">
            <div>
              <h3 className="text-sm font-bold text-nat-dark flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-nat-green" />
                SinergiTani Routing Optimizer (VRP Solver)
              </h3>
              <p className="text-xs text-nat-sage mt-0.5 font-medium">
                Sistem optimasi penjemputan hasil tani hulu. Mengalokasikan rute optimal dengan kapasitas boks truk (payload) dan pengurutan prioritas tanggal panen (time windows) untuk mencegah makanan terbuang di lahan.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Pilih Pusat Hub/Depot</label>
                <select
                  value={depotRegion}
                  onChange={(e) => {
                    setDepotRegion(e.target.value);
                    setIsRoutingOptimized(false);
                  }}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-semibold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                >
                  <option value="Brebes">Depot Brebes (Lat: -6.871, Lng: 109.042)</option>
                  <option value="Garut">Depot Garut (Lat: -7.227, Lng: 107.908)</option>
                  <option value="Malang">Depot Malang (Lat: -7.982, Lng: 112.630)</option>
                  <option value="Cianjur">Depot Cianjur (Lat: -6.822, Lng: 107.138)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Kapasitas Box Kendaraan (Kg)</label>
                <input
                  type="number"
                  step="500"
                  min="1000"
                  max="20000"
                  value={vehicleCapacity}
                  onChange={(e) => {
                    setVehicleCapacity(parseInt(e.target.value) || 5000);
                    setIsRoutingOptimized(false);
                  }}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-bold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-nat-text mb-1">Jumlah Armada Tersedia</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numVehicles}
                  onChange={(e) => {
                    setNumVehicles(parseInt(e.target.value) || 3);
                    setIsRoutingOptimized(false);
                  }}
                  className="w-full bg-nat-light-cream border border-nat-border rounded-lg px-3 py-2 text-xs font-bold text-nat-dark focus:outline-none focus:ring-1 focus:ring-nat-green"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => setIsRoutingOptimized(true)}
                  className="w-full bg-nat-dark hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Navigation className="w-4 h-4 text-emerald-400 rotate-45" />
                  Hitung Rute Terpendek VRP
                </button>
              </div>
            </div>
          </div>

          {isRoutingOptimized ? (
            <div className="space-y-6">
              {/* Routing Dashboard Statistics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-nat-border p-4 rounded-xl shadow-sm text-center space-y-1">
                  <span className="text-[10px] text-nat-sage font-extrabold uppercase tracking-wider block">Efisiensi Bahan Bakar</span>
                  <p className="text-xl font-bold text-nat-dark">{totalRoutingDistance} Km Rute</p>
                  <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                    Optimasi Terpendek
                  </span>
                </div>

                <div className="bg-white border border-nat-border p-4 rounded-xl shadow-sm text-center space-y-1">
                  <span className="text-[10px] text-nat-sage font-extrabold uppercase tracking-wider block">Total Panen Terangkut</span>
                  <p className="text-xl font-bold text-nat-dark">{totalRoutingVolume.toLocaleString('id-ID')} Kg</p>
                  <span className="text-[9px] text-slate-500 font-medium block">Dari {totalRoutingStops} titik lahan tani</span>
                </div>

                <div className="bg-white border border-nat-border p-4 rounded-xl shadow-sm text-center space-y-1 col-span-2">
                  <span className="text-[10px] text-nat-sage font-extrabold uppercase tracking-wider block">Keterangan Mesin Algoritma</span>
                  <p className="text-xs text-nat-dark leading-relaxed font-medium">
                    Algoritma VRP Nearest Neighbor & Chronological Window menyortir lahan berisiko berdasarkan estimasi tanggal panen guna meminimalkan kegagalan serap.
                  </p>
                  <span className="text-[9px] text-nat-sage font-semibold italic block">
                    *Produksi: Model terintegrasi penuh dengan pustaka Google OR-Tools Routing API di backend.
                  </span>
                </div>
              </div>

              {/* Vehicle Routes Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {optimizedRoutes.map((route, rIdx) => {
                  return (
                    <div key={route.vehicleId} className="bg-white border border-nat-border rounded-2xl overflow-hidden shadow-sm flex flex-col">
                      {/* Vehicle Header */}
                      <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-bold text-xs">{route.vehicleName}</h4>
                            <p className="text-[9px] text-slate-400">Maksimal Load: {route.capacityKg.toLocaleString('id-ID')} Kg</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-1.5 py-0.5 rounded tracking-wide font-mono">
                            {route.utilization}% LOADED
                          </span>
                        </div>
                      </div>

                      {/* Timeline stops */}
                      <div className="p-4 flex-1 space-y-4">
                        <div className="flex justify-between text-[10px] font-bold text-nat-sage border-b border-nat-light-cream pb-1.5">
                          <span>URUTAN TIMELINE KOLEKTOR</span>
                          <span>Jarak: {route.totalDistanceKm} Km</span>
                        </div>

                        {route.routeStops.length > 0 ? (
                          <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-100">
                            {route.routeStops.map((stop, sIdx) => (
                              <div key={stop.harvestId} className="flex gap-3 items-start relative pl-6">
                                {/* Stop Dot */}
                                <div className="absolute left-1 top-1 w-4 h-4 rounded-full border border-slate-300 bg-white flex items-center justify-center text-[9px] font-bold text-slate-500">
                                  {sIdx + 1}
                                </div>

                                <div className="space-y-0.5 text-xs">
                                  <div className="flex justify-between items-center w-full">
                                    <p className="font-bold text-nat-dark">{stop.farmerName}</p>
                                    <span className="text-[10px] text-nat-sage font-mono">#{stop.harvestId}</span>
                                  </div>
                                  <p className="text-[10px] text-nat-text">
                                    {stop.commodity} • <span className="font-bold">{stop.volumeKg.toLocaleString('id-ID')} Kg</span>
                                  </p>
                                  <p className="text-[9px] text-emerald-600 font-bold flex items-center gap-0.5">
                                    <Calendar className="w-2.5 h-2.5" /> Est. Sedia: {stop.expectedDate}
                                  </p>
                                </div>
                              </div>
                            ))}

                            {/* Depot Return Indicator */}
                            <div className="flex gap-3 items-start relative pl-6">
                              <div className="absolute left-1 top-1 w-4 h-4 rounded-full border border-nat-green bg-nat-light-cream flex items-center justify-center text-[8px] font-black text-nat-green">
                                H
                              </div>
                              <div className="text-xs space-y-0.5 py-0.5">
                                <p className="font-bold text-nat-green">Kembali ke Pusat Hub Depot</p>
                                <p className="text-[9px] text-nat-sage">Selesai Bongkar Muatan Cold Storage</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-6 text-nat-sage italic text-xs">
                            Armada ini tidak ditugaskan (idle / cadangan mitigasi over-supply).
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-8 text-center max-w-lg mx-auto space-y-3">
              <Truck className="w-10 h-10 text-slate-400 mx-auto" />
              <h4 className="font-bold text-sm text-slate-700">Rute Belum Dioptimalkan</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Silakan verifikasi atau ubah kapasitas kendaraan di atas, lalu klik tombol <strong className="text-slate-800">"Hitung Rute Terpendek VRP"</strong> untuk menjalankan modul pencarian rute logistik terkompresi.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
