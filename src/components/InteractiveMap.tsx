/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { MapPin, Info, Tag, Calendar, User, Eye, EyeOff, Navigation, RefreshCw } from 'lucide-react';
import { Harvest, Demand, COMMODITY_LIST, Komoditas } from '../types';
import L from 'leaflet';

interface InteractiveMapProps {
  onSelectCoords?: (lat: number, lng: number, region: string) => void;
  selectedLat?: number;
  selectedLng?: number;
}

export default function InteractiveMap({ onSelectCoords, selectedLat, selectedLng }: InteractiveMapProps) {
  const { harvests, demands, matches } = useApp();
  const [showHarvests, setShowHarvests] = useState(true);
  const [showDemands, setShowDemands] = useState(true);
  const [showMatches, setShowMatches] = useState(true);
  const [selectedCommodity, setSelectedCommodity] = useState<Komoditas | 'ALL'>('ALL');
  
  // Selected point details on sidebar (from Leaflet interactions)
  const [selectedPoint, setSelectedPoint] = useState<{
    type: 'HARVEST' | 'DEMAND';
    data: any;
  } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const clickMarkerRef = useRef<L.Marker | null>(null);

  // Approximate region based on coordinates
  const getRegionFromLatLng = (lat: number, lng: number): string => {
    if (lng < 108.2) {
      if (lat < -7.1) return 'Garut';
      return 'Cianjur';
    } else if (lng < 111.0) {
      return 'Brebes';
    } else {
      return 'Malang';
    }
  };

  // Filter lists based on selection
  const filteredHarvests = useMemo(() => {
    return harvests.filter(h => {
      if (h.status === 'EXPIRED') return false;
      if (selectedCommodity !== 'ALL' && h.commodity !== selectedCommodity) return false;
      return true;
    });
  }, [harvests, selectedCommodity]);

  const filteredDemands = useMemo(() => {
    return demands.filter(d => {
      if (d.status === 'CANCELLED') return false;
      if (selectedCommodity !== 'ALL' && d.commodity !== selectedCommodity) return false;
      return true;
    });
  }, [demands, selectedCommodity]);

  // Compute active matched lines
  const activeMatchesForMap = useMemo(() => {
    if (!showMatches) return [];
    
    return matches.filter(m => {
      const h = harvests.find(harv => harv.id === m.harvestId);
      const d = demands.find(dem => dem.id === m.demandId);
      if (!h || !d) return false;
      if (selectedCommodity !== 'ALL' && h.commodity !== selectedCommodity) return false;
      return m.score > 40 || m.status !== 'PENDING';
    });
  }, [matches, harvests, demands, showMatches, selectedCommodity]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Center map roughly around Central Java
    const map = L.map(mapContainerRef.current, {
      center: [-7.25, 110.1],
      zoom: 7,
      zoomControl: true,
      scrollWheelZoom: true,
      minZoom: 6,
      maxZoom: 12
    });

    // Add CartoDB Positron elegant light map tiles
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // Force map size refresh
    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    // Register click handler for selection
    if (onSelectCoords) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        const roundedLat = Math.round(lat * 1000) / 1000;
        const roundedLng = Math.round(lng * 1000) / 1000;
        const region = getRegionFromLatLng(roundedLat, roundedLng);

        onSelectCoords(roundedLat, roundedLng, region);

        setSelectedPoint({
          type: 'HARVEST',
          data: {
            id: 'new-pin',
            farmerName: 'Lokasi Pilihan Anda',
            commodity: 'Cabai Merah',
            latitude: roundedLat,
            longitude: roundedLng,
            region,
            expectedVolume: 0,
            askingPrice: 0,
            status: 'ACTIVE',
            plantingDate: '-',
            expectedHarvestDate: '-'
          }
        });
      });
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onSelectCoords]);

  // Update dynamic coordinates pin marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (clickMarkerRef.current) {
      map.removeLayer(clickMarkerRef.current);
      clickMarkerRef.current = null;
    }

    if (selectedLat && selectedLng) {
      const clickIcon = L.divIcon({
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 rounded-full bg-nat-green/30 animate-ping"></div>
            <div class="w-7 h-7 rounded-full bg-nat-green text-white flex items-center justify-center border-2 border-white shadow-xl">
              <span class="w-2.5 h-2.5 rounded-full bg-white"></span>
            </div>
          </div>
        `,
        className: 'click-select-marker',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      clickMarkerRef.current = L.marker([selectedLat, selectedLng], { icon: clickIcon })
        .addTo(map)
        .bindPopup(`<div class="font-bold text-xs">Lokasi Pilihan Anda<br/><span class="text-[10px] font-normal text-nat-sage">Lat: ${selectedLat}, Lng: ${selectedLng}</span></div>`)
        .openPopup();
    }
  }, [selectedLat, selectedLng]);

  // Draw harvests, demands, and matched lines on data changes
  useEffect(() => {
    const map = mapRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    // Clear previous markers & polylines
    layer.clearLayers();

    // 1. Draw connecting polyline matches
    activeMatchesForMap.forEach(match => {
      const harvest = harvests.find(h => h.id === match.harvestId);
      const demand = demands.find(d => d.id === match.demandId);
      if (!harvest || !demand) return;

      const crop = COMMODITY_LIST[harvest.commodity as Komoditas];
      const color = crop ? crop.color : '#5F7444';

      const polyline = L.polyline(
        [[harvest.latitude, harvest.longitude], [demand.latitude, demand.longitude]],
        {
          color,
          weight: 2,
          dashArray: '5, 5',
          opacity: 0.65
        }
      ).addTo(layer);

      // Popup on hovering or clicking matching path
      polyline.bindPopup(`
        <div class="p-1.5 space-y-1 font-sans">
          <div class="text-[10px] uppercase font-bold text-nat-green">Jalur Sinergi Komoditas</div>
          <div class="font-bold text-nat-dark">${harvest.commodity}</div>
          <div class="text-xs text-nat-text">
            Petani: <span class="font-bold">${harvest.farmerName}</span><br/>
            Koperasi: <span class="font-bold">${demand.buyerName}</span><br/>
            Skor Sinergi: <span class="text-nat-green font-bold text-xs">${match.score}%</span><br/>
            Jarak Distribusi: <span class="font-semibold">${match.distanceKm} Km</span>
          </div>
        </div>
      `);
    });

    // 2. Draw Harvests (Farmers)
    if (showHarvests) {
      filteredHarvests.forEach(harvest => {
        const crop = COMMODITY_LIST[harvest.commodity as Komoditas];
        const color = crop ? crop.color : '#5F7444';
        const isSelected = selectedPoint?.type === 'HARVEST' && selectedPoint.data.id === harvest.id;

        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="absolute w-8 h-8 rounded-full opacity-35 animate-pulse" style="background-color: ${color}"></div>
              <div class="w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md transition-all hover:scale-125" style="background-color: ${color}">
                <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
              </div>
            </div>
          `,
          className: 'custom-harvest-marker',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const marker = L.marker([harvest.latitude, harvest.longitude], { icon })
          .addTo(layer)
          .on('click', () => {
            setSelectedPoint({ type: 'HARVEST', data: harvest });
          });

        marker.bindPopup(`
          <div class="font-sans text-xs space-y-1.5 p-1">
            <div class="flex justify-between items-center gap-2">
              <span class="text-[9px] bg-nat-green text-white px-2 py-0.5 rounded-full font-bold">LAHAN PETANI</span>
              <span class="font-mono text-nat-sage text-[10px]">#${harvest.id}</span>
            </div>
            <div class="font-bold text-sm text-nat-dark">${harvest.farmerName}</div>
            <div class="border-t border-nat-border/50 pt-1 text-nat-text space-y-0.5">
              <div>Komoditas: <span class="font-bold">${harvest.commodity}</span></div>
              <div>Luas Lahan: <span class="font-semibold">${harvest.landArea} Ha</span></div>
              <div>Estimasi Hasil: <span class="font-bold">${harvest.expectedVolume.toLocaleString('id-ID')} Kg</span></div>
              <div>Harga Harapan: <span class="font-bold">Rp${harvest.askingPrice.toLocaleString('id-ID')}/Kg</span></div>
              <div>Estimasi Panen: <span class="font-semibold">${harvest.expectedHarvestDate}</span></div>
              <div class="text-[10px] text-nat-sage italic mt-1">"${harvest.notes}"</div>
            </div>
          </div>
        `);
      });
    }

    // 3. Draw Demands (Buyers)
    if (showDemands) {
      filteredDemands.forEach(demand => {
        const crop = COMMODITY_LIST[demand.commodity as Komoditas];
        const color = crop ? crop.color : '#A67C52';
        const isSelected = selectedPoint?.type === 'DEMAND' && selectedPoint.data.id === demand.id;

        const icon = L.divIcon({
          html: `
            <div class="relative flex items-center justify-center">
              <div class="w-5 h-5 bg-nat-brown flex items-center justify-center rounded border-2 border-white shadow-md transition-all hover:scale-125">
                <div class="w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></div>
              </div>
            </div>
          `,
          className: 'custom-demand-marker',
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });

        const marker = L.marker([demand.latitude, demand.longitude], { icon })
          .addTo(layer)
          .on('click', () => {
            setSelectedPoint({ type: 'DEMAND', data: demand });
          });

        marker.bindPopup(`
          <div class="font-sans text-xs space-y-1.5 p-1">
            <div class="flex justify-between items-center gap-2">
              <span class="text-[9px] bg-nat-brown text-white px-2 py-0.5 rounded-full font-bold">GUDANG PEMBELI</span>
              <span class="font-mono text-nat-sage text-[10px]">#${demand.id}</span>
            </div>
            <div class="font-bold text-sm text-nat-dark">${demand.buyerName}</div>
            <div class="border-t border-nat-border/50 pt-1 text-nat-text space-y-0.5">
              <div>Komoditas: <span class="font-bold">${demand.commodity}</span></div>
              <div>Volume Diminta: <span class="font-bold">${demand.requiredVolume.toLocaleString('id-ID')} Kg</span></div>
              <div>Harga Penawaran: <span class="font-bold">Rp${demand.offerPrice.toLocaleString('id-ID')}/Kg</span></div>
              <div>Paling Lambat: <span class="font-semibold">${demand.dateRequired}</span></div>
              <div class="text-[10px] text-nat-sage italic mt-1">"${demand.notes}"</div>
            </div>
          </div>
        `);
      });
    }
  }, [filteredHarvests, filteredDemands, activeMatchesForMap, showHarvests, showDemands, selectedPoint]);

  // Map controls center focus action
  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.setView([-7.25, 110.1], 7);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-nat-border p-5 shadow-sm">
      <style>{`
        /* Stylized overrides for Leaflet Popups to match Natural theme */
        .leaflet-popup-content-wrapper {
          background-color: #F8F7F2 !important;
          color: #3D402B !important;
          border-radius: 12px !important;
          border: 1px solid #E5E2D8 !important;
          box-shadow: 0 4px 14px rgba(45, 48, 30, 0.08) !important;
        }
        .leaflet-popup-tip {
          background-color: #F8F7F2 !important;
          border: 1px solid #E5E2D8 !important;
        }
        .leaflet-container {
          font-family: "Inter", sans-serif !important;
        }
      `}</style>

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-nat-dark tracking-tight flex items-center gap-2">
            <Navigation className="w-4 h-4 text-nat-green rotate-45" />
            Peta Sebaran Spasial & Logistik Real-Time
          </h2>
          <p className="text-xs text-nat-sage">
            {onSelectCoords 
              ? 'Klik di mana saja pada peta untuk mengambil koordinat GPS lahan/depo baru Anda secara instan.' 
              : 'Visualisasi geografis ketersediaan panen hulu dan sisa sedia serap pasar secara real-time.'}
          </p>
        </div>

        {/* Commodity filter pills */}
        <div className="flex flex-wrap gap-1.5 max-w-full">
          <button
            onClick={() => setSelectedCommodity('ALL')}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
              selectedCommodity === 'ALL'
                ? 'bg-nat-green text-white shadow-sm'
                : 'bg-nat-light-cream text-nat-text border border-nat-border hover:bg-nat-cream'
            }`}
          >
            Semua Komoditas
          </button>
          {Object.keys(COMMODITY_LIST).map((key) => {
            const crop = COMMODITY_LIST[key as Komoditas];
            const isSelected = selectedCommodity === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedCommodity(key as Komoditas)}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? 'text-white border-transparent'
                    : 'bg-nat-light-cream text-nat-text border-nat-border hover:bg-nat-cream'
                }`}
                style={{ backgroundColor: isSelected ? crop.color : undefined }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" style={{ display: isSelected ? 'none' : 'inline-block', backgroundColor: crop.color }} />
                <span>{key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Control Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-nat-light-cream text-xs text-nat-text">
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => setShowHarvests(!showHarvests)}
            className={`flex items-center space-x-1.5 transition-all cursor-pointer ${showHarvests ? 'text-nat-green font-bold' : 'text-nat-sage/80'}`}
          >
            {showHarvests ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="w-2.5 h-2.5 rounded-full bg-nat-green border border-white shadow-sm inline-block shrink-0" />
            <span>Lahan Petani ({filteredHarvests.length})</span>
          </button>

          <button
            onClick={() => setShowDemands(!showDemands)}
            className={`flex items-center space-x-1.5 transition-all cursor-pointer ${showDemands ? 'text-nat-brown font-bold' : 'text-nat-sage/80'}`}
          >
            {showDemands ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="w-2.5 h-2.5 rounded bg-nat-brown border border-white shadow-sm inline-block shrink-0" />
            <span>Kebutuhan Pembeli ({filteredDemands.length})</span>
          </button>

          <button
            onClick={() => setShowMatches(!showMatches)}
            className={`flex items-center space-x-1.5 transition-all cursor-pointer ${showMatches ? 'text-nat-dark font-bold' : 'text-nat-sage/80'}`}
          >
            {showMatches ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="h-0.5 w-4 border-t-2 border-dashed border-nat-green inline-block shrink-0" />
            <span>Jalur Sinergi Kontrak ({activeMatchesForMap.length})</span>
          </button>
        </div>

        <button
          onClick={handleRecenter}
          className="flex items-center gap-1 px-2.5 py-1 text-[11px] bg-nat-light-cream border border-nat-border text-nat-dark hover:bg-nat-cream rounded-lg transition-all font-bold cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          Pusatkan Peta
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Leaflet Canvas Map */}
        <div className="lg:col-span-3 bg-nat-slate border border-nat-border rounded-xl overflow-hidden relative min-h-[380px] z-10 shadow-inner">
          <div 
            ref={mapContainerRef} 
            id="leaflet-map-canvas" 
            className="w-full h-[380px]"
          />
          
          {/* Quick instructions indicator inside map */}
          {onSelectCoords && (
            <div className="absolute top-3 left-3 bg-nat-dark/95 text-nat-bg text-[10px] px-2.5 py-1.5 rounded-md flex items-center gap-1.5 shadow-md font-bold border border-nat-border z-[1000]">
              <span className="w-2 h-2 rounded-full bg-nat-green animate-ping shrink-0" />
              <span>Gunakan Peta: Klik di mana saja untuk menentukan lokasi GPS</span>
            </div>
          )}

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-sm px-3 py-2 rounded-lg border border-nat-border shadow-sm flex items-center gap-4 text-[10px] text-nat-dark font-bold z-[1000]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-nat-green inline-block border border-white" />
              <span>Panen (Hulu)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-nat-brown inline-block border border-white" />
              <span>Daya Serap (Hilir)</span>
            </div>
          </div>
        </div>

        {/* Selected Point Info Sidebar Panel */}
        <div className="lg:col-span-1 bg-nat-light-cream rounded-xl p-4 flex flex-col justify-between border border-nat-border min-h-[320px]">
          {selectedPoint ? (
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider text-white ${
                    selectedPoint.type === 'HARVEST' 
                      ? 'bg-nat-green' 
                      : 'bg-nat-brown'
                  }`}>
                    {selectedPoint.type === 'HARVEST' ? 'Hasil Panen' : 'Permintaan Pasar'}
                  </span>
                  <button
                    onClick={() => setSelectedPoint(null)}
                    className="text-nat-sage hover:text-nat-dark text-xs font-bold p-1 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>

                <h3 className="text-sm font-bold text-nat-dark leading-tight flex items-center gap-1 mt-1">
                  <User className="w-3.5 h-3.5 text-nat-sage" />
                  {selectedPoint.type === 'HARVEST' 
                    ? (selectedPoint.data as Harvest).farmerName 
                    : (selectedPoint.data as Demand).buyerName}
                </h3>

                <div className="mt-3 space-y-2 text-xs text-nat-text">
                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      <Tag className="w-3 h-3" /> Komoditas:
                    </span>
                    <span className="font-bold text-nat-dark">{(selectedPoint.data).commodity}</span>
                  </p>

                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Volume:
                    </span>
                    <span className="font-bold text-nat-dark">
                      {selectedPoint.type === 'HARVEST'
                        ? `${(selectedPoint.data as Harvest).expectedVolume.toLocaleString('id-ID')} Kg`
                        : `${(selectedPoint.data as Demand).requiredVolume.toLocaleString('id-ID')} Kg`}
                    </span>
                  </p>

                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      Rp Harga:
                    </span>
                    <span className="font-bold text-nat-dark">
                      Rp{selectedPoint.type === 'HARVEST'
                        ? `${(selectedPoint.data as Harvest).askingPrice.toLocaleString('id-ID')}/Kg`
                        : `${(selectedPoint.data as Demand).offerPrice.toLocaleString('id-ID')}/Kg`}
                    </span>
                  </p>

                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Koordinat:
                    </span>
                    <span className="font-bold text-nat-dark text-[10px]">
                      {(selectedPoint.data).latitude}, {(selectedPoint.data).longitude}
                    </span>
                  </p>

                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Wilayah:
                    </span>
                    <span className="font-bold text-nat-dark">{(selectedPoint.data).region}</span>
                  </p>

                  <p className="flex justify-between border-b border-nat-border/50 pb-1.5">
                    <span className="text-nat-sage font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Tanggal:
                    </span>
                    <span className="font-bold text-nat-dark text-[10px]">
                      {selectedPoint.type === 'HARVEST'
                        ? `Panen: ${(selectedPoint.data as Harvest).expectedHarvestDate}`
                        : `Batas: ${(selectedPoint.data as Demand).dateRequired}`}
                    </span>
                  </p>
                </div>

                {selectedPoint.data.notes && (
                  <div className="mt-3 bg-white border border-nat-border rounded-lg p-2 text-[11px] text-nat-sage italic">
                    "{selectedPoint.data.notes}"
                  </div>
                )}
              </div>

              {selectedPoint.data.id !== 'new-pin' && (
                <div className="mt-4 bg-nat-dark rounded-lg p-3 text-[10px] text-nat-light-cream">
                  <div className="flex items-center gap-1.5 font-bold text-white mb-1">
                    <Info className="w-3.5 h-3.5 text-nat-sand" />
                    <span>Rute Distribusi Logistik</span>
                  </div>
                  <span>Gunakan GPS di atas untuk mengoordinasikan armada pengiriman langsung dari depo ke petani mitra.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
              <MapPin className="w-10 h-10 text-nat-sage mb-2 animate-bounce" />
              <p className="text-xs font-bold text-nat-dark">Peta Interaktif Aktif</p>
              <p className="text-[11px] text-nat-sage mt-1">
                Gunakan kursor atau sentuhan untuk menggeser, melakukan zoom, atau mengklik marker untuk info komoditas.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
