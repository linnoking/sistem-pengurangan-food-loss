/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  Role, 
  Harvest, 
  Demand, 
  Match, 
  MatchWeights, 
  Komoditas, 
  COMMODITY_LIST,
  RegionStats,
  Block,
  BlockchainTransaction
} from '../types';

// Haversine distance helper
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

// Single match engine scorer
export function scoreMatch(harvest: Harvest, demand: Demand, weights: MatchWeights): Match {
  const distanceKm = calculateDistance(
    harvest.latitude,
    harvest.longitude,
    demand.latitude,
    demand.longitude
  );

  // 1. Distance Score: 100 if within 5km, scales to 0 at 150km
  let distanceScore = 0;
  if (distanceKm <= 5) {
    distanceScore = 100;
  } else if (distanceKm >= 150) {
    distanceScore = 0;
  } else {
    distanceScore = Math.round(100 * (1 - (distanceKm - 5) / 145));
  }

  // 2. Volume Score: Closer ratio is better
  const minVol = Math.min(harvest.expectedVolume, demand.requiredVolume);
  const maxVol = Math.max(harvest.expectedVolume, demand.requiredVolume);
  const volumeScore = maxVol > 0 ? Math.round((minVol / maxVol) * 100) : 0;

  // 3. Price Score: High offer compared to asking price is better
  let priceScore = 0;
  if (demand.offerPrice >= harvest.askingPrice) {
    priceScore = 100; // Fully covers or exceeds asking
  } else {
    const ratio = demand.offerPrice / harvest.askingPrice;
    if (ratio >= 0.6) {
      // Linear scaling down to 60% of asking price
      priceScore = Math.round(((ratio - 0.6) / 0.4) * 100);
    } else {
      priceScore = 0;
    }
  }

  // Total weighted score
  const totalScore = Math.round(
    weights.wLocation * distanceScore +
    weights.wVolume * volumeScore +
    weights.wPrice * priceScore
  );

  return {
    id: `match-${harvest.id}-${demand.id}`,
    harvestId: harvest.id,
    demandId: demand.id,
    score: totalScore,
    distanceKm,
    scoreDetails: {
      distanceScore,
      volumeScore,
      priceScore,
      totalScore,
      distanceKm,
    },
    status: 'PENDING',
    createdAt: new Date().toISOString().split('T')[0],
  };
}

interface AppContextProps {
  harvests: Harvest[];
  demands: Demand[];
  matches: Match[];
  weights: MatchWeights;
  activeRole: Role;
  activeUser: {
    PETANI: { id: string; name: string; region: string };
    PEMBELI: { id: string; name: string; region: string };
  };
  notification: { message: string; type: 'success' | 'warning' | 'info' } | null;
  blockchain: Block[];
  addHarvest: (harvest: Omit<Harvest, 'id' | 'farmerId' | 'farmerName' | 'status'>) => void;
  addDemand: (demand: Omit<Demand, 'id' | 'buyerId' | 'buyerName' | 'status'>) => void;
  updateMatchStatus: (matchId: string, status: Match['status']) => void;
  updateWeights: (newWeights: MatchWeights) => void;
  setRole: (role: Role) => void;
  showNotification: (message: string, type: 'success' | 'warning' | 'info') => void;
  dismissNotification: () => void;
  resetAllData: () => void;
  mineBlockWithTransaction: (type: BlockchainTransaction['type'], sender: string, recipient: string, payload: string) => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

const SEED_HARVESTS: Harvest[] = [
  {
    id: 'h-1',
    farmerId: 'f-1',
    farmerName: 'Pak Joko',
    commodity: 'Bawang Merah',
    landArea: 1.2,
    expectedVolume: 11000,
    askingPrice: 26000,
    latitude: -6.871,
    longitude: 109.042,
    region: 'Brebes',
    plantingDate: '2026-05-10',
    expectedHarvestDate: '2026-07-19',
    status: 'ACTIVE',
    notes: 'Kualitas bawang Brebes asli, bebas hama ulat daun gawang.',
  },
  {
    id: 'h-2',
    farmerId: 'f-2',
    farmerName: 'Ibu Siti',
    commodity: 'Cabai Merah',
    landArea: 0.8,
    expectedVolume: 6200,
    askingPrice: 34000,
    latitude: -7.215,
    longitude: 107.901,
    region: 'Garut',
    plantingDate: '2026-04-15',
    expectedHarvestDate: '2026-07-14',
    status: 'ACTIVE',
    notes: 'Cabai keriting merah segar, siap panen serentak pertengahan bulan.',
  },
  {
    id: 'h-3',
    farmerId: 'f-3',
    farmerName: 'Pak Wayan',
    commodity: 'Tomat',
    landArea: 1.5,
    expectedVolume: 22000,
    askingPrice: 11500,
    latitude: -7.978,
    longitude: 112.632,
    region: 'Malang',
    plantingDate: '2026-04-28',
    expectedHarvestDate: '2026-07-18',
    status: 'ACTIVE',
    notes: 'Tomat jenis servo tebal, tahan simpan lama pascapanen.',
  },
  {
    id: 'h-4',
    farmerId: 'f-4',
    farmerName: 'Pak Ahmad',
    commodity: 'Padi',
    landArea: 2.0,
    expectedVolume: 12000,
    askingPrice: 7200,
    latitude: -6.824,
    longitude: 107.139,
    region: 'Cianjur',
    plantingDate: '2026-03-01',
    expectedHarvestDate: '2026-07-15',
    status: 'ACTIVE',
    notes: 'Padi Ciherang organik premium, bulir penuh pengairan teratur.',
  },
  {
    id: 'h-5',
    farmerId: 'f-5',
    farmerName: 'Ibu Ketut',
    commodity: 'Kentang',
    landArea: 1.0,
    expectedVolume: 17500,
    askingPrice: 14000,
    latitude: -7.942,
    longitude: 112.605,
    region: 'Malang',
    plantingDate: '2026-03-10',
    expectedHarvestDate: '2026-06-28',
    status: 'ACTIVE',
    notes: 'Kentang Granola ukuran sedang-besar, cocok untuk katering industri.',
  },
  {
    id: 'h-6',
    farmerId: 'f-1',
    farmerName: 'Pak Joko',
    commodity: 'Cabai Merah',
    landArea: 0.5,
    expectedVolume: 3800,
    askingPrice: 36000,
    latitude: -6.892,
    longitude: 109.012,
    region: 'Brebes',
    plantingDate: '2026-04-05',
    expectedHarvestDate: '2026-07-04',
    status: 'ACTIVE',
    notes: 'Cabai merah besar, tingkat kematangan rata-rata 85%.',
  },
  {
    id: 'h-7',
    farmerId: 'f-6',
    farmerName: 'Ibu Maimunah',
    commodity: 'Kubis',
    landArea: 0.7,
    expectedVolume: 14000,
    askingPrice: 7500,
    latitude: -7.235,
    longitude: 107.882,
    region: 'Garut',
    plantingDate: '2026-04-10',
    expectedHarvestDate: '2026-07-05',
    status: 'ACTIVE',
    notes: 'Kubis putih padat bulat, panen melimpah tanpa pestisida kimia berlebih.',
  }
];

const SEED_DEMANDS: Demand[] = [
  {
    id: 'd-1',
    buyerId: 'b-1',
    buyerName: 'Koperasi Jaya Tani',
    commodity: 'Bawang Merah',
    requiredVolume: 10000,
    offerPrice: 27000,
    latitude: -6.865,
    longitude: 109.035,
    region: 'Brebes',
    dateRequired: '2026-07-25',
    status: 'ACTIVE',
    notes: 'Mencari pasokan stabil untuk dikirim ke pasar induk Kramat Jati.',
  },
  {
    id: 'd-2',
    buyerId: 'b-2',
    buyerName: 'PT Sambal Lestari',
    commodity: 'Cabai Merah',
    requiredVolume: 5000,
    offerPrice: 35000,
    latitude: -7.202,
    longitude: 107.895,
    region: 'Garut',
    dateRequired: '2026-07-16',
    status: 'ACTIVE',
    notes: 'Butuh cabai segar harian untuk mesin produksi sambal botol kami.',
  },
  {
    id: 'd-3',
    buyerId: 'b-3',
    buyerName: 'Prima Fresh Mart Malang',
    commodity: 'Tomat',
    requiredVolume: 20000,
    offerPrice: 12000,
    latitude: -7.962,
    longitude: 112.622,
    region: 'Malang',
    dateRequired: '2026-07-20',
    status: 'ACTIVE',
    notes: 'Menampung tomat servo grade A-B, pengiriman langsung ke depo pusat.',
  },
  {
    id: 'd-4',
    buyerId: 'b-4',
    buyerName: 'BULOG Sub-Divre Cianjur',
    commodity: 'Padi',
    requiredVolume: 15000,
    offerPrice: 7400,
    latitude: -6.812,
    longitude: 107.142,
    region: 'Cianjur',
    dateRequired: '2026-07-18',
    status: 'ACTIVE',
    notes: 'Penyerapan gabah kering giling (GKG) sesuai standar HPP pemerintah.',
  },
  {
    id: 'd-5',
    buyerId: 'b-5',
    buyerName: 'Indofood Industri Malang',
    commodity: 'Kentang',
    requiredVolume: 15000,
    offerPrice: 14500,
    latitude: -7.989,
    longitude: 112.648,
    region: 'Malang',
    dateRequired: '2026-07-02',
    status: 'ACTIVE',
    notes: 'Spesifikasi kentang untuk keripik industri, kadar air rendah.',
  }
];

const DEFAULT_WEIGHTS: MatchWeights = {
  wLocation: 0.4, // 40%
  wVolume: 0.3,   // 30%
  wPrice: 0.3,    // 30%
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeRole, setActiveRole] = useState<Role>(() => {
    const stored = localStorage.getItem('flw_active_role');
    return (stored as Role) || 'PETANI';
  });

  const [weights, setWeights] = useState<MatchWeights>(() => {
    const stored = localStorage.getItem('flw_weights');
    return stored ? JSON.parse(stored) : DEFAULT_WEIGHTS;
  });

  const [harvests, setHarvests] = useState<Harvest[]>(() => {
    const stored = localStorage.getItem('flw_harvests');
    return stored ? JSON.parse(stored) : SEED_HARVESTS;
  });

  const [demands, setDemands] = useState<Demand[]>(() => {
    const stored = localStorage.getItem('flw_demands');
    return stored ? JSON.parse(stored) : SEED_DEMANDS;
  });

  const [matches, setMatches] = useState<Match[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info' } | null>(null);

  const [blockchain, setBlockchain] = useState<Block[]>(() => {
    const stored = localStorage.getItem('flw_blockchain');
    if (stored) return JSON.parse(stored);

    // Initial blocks
    const tx1: BlockchainTransaction = {
      id: 'tx-gen-1',
      timestamp: '2026-06-25 10:00:00',
      type: 'BLOCK_REWARD',
      sender: 'Sistem SinergiTani',
      recipient: 'Validator Utama',
      payload: 'Genesis Block Reward - 50 SGT Token untuk inisiasi sistem mitigasi',
      txHash: '0000a12e34f5c6b7e8d9'
    };

    const genesisBlock: Block = {
      height: 0,
      timestamp: '2026-06-25 10:00:00',
      nonce: 49204,
      prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
      hash: '00004f2c9e7a8b6c5d4e3f21a0f9e8d7c6b5a493',
      transactions: [tx1],
      validator: 'Dinas Pertanian RI'
    };

    const tx2: BlockchainTransaction = {
      id: 'tx-1-1',
      timestamp: '2026-06-26 14:32:00',
      type: 'RILIS_PANEN',
      sender: 'Pak Joko (Petani Brebes)',
      recipient: 'SinergiTani Ledger',
      payload: 'Mendaftarkan Laporan Tanam Bawang Merah, Estimasi Volume: 11.000 Kg, Harga Harapan: Rp26.000/Kg',
      txHash: '0000f4e3c2b1a0f9e8d7'
    };

    const tx3: BlockchainTransaction = {
      id: 'tx-1-2',
      timestamp: '2026-06-26 15:10:00',
      type: 'RILIS_DEMAND',
      sender: 'Koperasi Jaya Tani',
      recipient: 'SinergiTani Ledger',
      payload: 'Mendaftarkan Kebutuhan Pasokan Bawang Merah, Volume: 10.000 Kg, Harga Penawaran: Rp27.000/Kg',
      txHash: '0000a2b3c4d5e6f7a8b9'
    };

    const block1: Block = {
      height: 1,
      timestamp: '2026-06-26 16:00:00',
      nonce: 103942,
      prevHash: genesisBlock.hash,
      hash: '00008d7c6b5a49321f0e9d8c7b6a594837261504',
      transactions: [tx2, tx3],
      validator: 'Node-Brebes-01'
    };

    const tx4: BlockchainTransaction = {
      id: 'tx-2-1',
      timestamp: '2026-06-27 09:15:00',
      type: 'KONTRAK_SEPAKAT',
      sender: 'Pak Joko',
      recipient: 'Koperasi Jaya Tani',
      payload: 'Kesepakatan Pre-Order Kontrak Bawang Merah Brebes (Volume Terjamin: 11.000 Kg, Harga Sepakat: Rp27.000/Kg). Terkunci di Smart Contract SinergiTani #SC-10932',
      txHash: '0000c1d2e3f4a5b6c7d8'
    };

    const block2: Block = {
      height: 2,
      timestamp: '2026-06-27 10:00:00',
      nonce: 84920,
      prevHash: block1.hash,
      hash: '0000a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5',
      transactions: [tx4],
      validator: 'Dinas Pertanian Jawa Tengah'
    };

    return [block2, block1, genesisBlock];
  });

  useEffect(() => {
    localStorage.setItem('flw_blockchain', JSON.stringify(blockchain));
  }, [blockchain]);

  const generateSimpleHash = (data: string): string => {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).padStart(8, '0');
    return '0000' + hex + Math.floor(Math.random() * 1000).toString().padStart(4, '0');
  };

  const mineBlockWithTransaction = (
    type: BlockchainTransaction['type'],
    sender: string,
    recipient: string,
    payload: string
  ) => {
    setBlockchain(prev => {
      const latestBlock = prev[0];
      const nextHeight = latestBlock ? latestBlock.height + 1 : 0;
      const prevHash = latestBlock ? latestBlock.hash : '0000000000000000000000000000000000000000000000000000000000000000';
      
      const now = new Date();
      const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
      
      const txId = `tx-live-${Date.now()}`;
      const dataToHash = `${txId}-${sender}-${recipient}-${payload}-${timestamp}`;
      const txHash = generateSimpleHash(dataToHash);
      
      const transaction: BlockchainTransaction = {
        id: txId,
        timestamp,
        type,
        sender,
        recipient,
        payload,
        txHash
      };

      const nonce = Math.floor(Math.random() * 500000) + 10000;
      const blockHash = generateSimpleHash(`${nextHeight}-${prevHash}-${nonce}-${timestamp}-${JSON.stringify(transaction)}`);

      const newBlock: Block = {
        height: nextHeight,
        timestamp,
        nonce,
        prevHash,
        hash: blockHash,
        transactions: [transaction],
        validator: 'SinergiTani Validator Node'
      };

      return [newBlock, ...prev];
    });
  };

  // Active User simulated values based on roles
  const [activeUser] = useState({
    PETANI: { id: 'f-1', name: 'Pak Joko', region: 'Brebes' },
    PEMBELI: { id: 'b-1', name: 'Koperasi Jaya Tani', region: 'Brebes' }
  });

  // Calculate matches dynamically whenever harvests, demands, or weights change
  useEffect(() => {
    const newMatches: Match[] = [];
    
    // Cross-match active harvest with active buyer demand for matching commodities
    harvests.forEach(harvest => {
      if (harvest.status === 'EXPIRED') return;
      
      demands.forEach(demand => {
        if (demand.status === 'CANCELLED') return;
        
        // Match only same commodity
        if (harvest.commodity === demand.commodity) {
          const m = scoreMatch(harvest, demand, weights);
          
          // Check if there is already an action/status for this pair in the previous matches
          const existingMatch = matches.find(prev => prev.id === m.id);
          if (existingMatch) {
            m.status = existingMatch.status; // Preserve user-updated status
          }
          
          newMatches.push(m);
        }
      });
    });

    // Sort matches by highest score
    newMatches.sort((a, b) => b.score - a.score);
    setMatches(newMatches);
  }, [harvests, demands, weights]);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('flw_active_role', activeRole);
  }, [activeRole]);

  useEffect(() => {
    localStorage.setItem('flw_weights', JSON.stringify(weights));
  }, [weights]);

  useEffect(() => {
    localStorage.setItem('flw_harvests', JSON.stringify(harvests));
  }, [harvests]);

  useEffect(() => {
    localStorage.setItem('flw_demands', JSON.stringify(demands));
  }, [demands]);

  // Real-time dynamic simulator interval to feed live reporting streams
  useEffect(() => {
    const interval = setInterval(() => {
      const isHarvest = Math.random() > 0.45; // 55% chance of farmer, 45% buyer demand
      const commodities: Komoditas[] = ['Bawang Merah', 'Cabai Merah', 'Tomat', 'Padi', 'Kentang', 'Kubis'];
      const commodity = commodities[Math.floor(Math.random() * commodities.length)];
      
      const regions = [
        { name: 'Brebes', lat: -6.87, lng: 109.04 },
        { name: 'Garut', lat: -7.21, lng: 107.90 },
        { name: 'Malang', lat: -7.98, lng: 112.63 },
        { name: 'Cianjur', lat: -6.82, lng: 107.14 }
      ];
      const region = regions[Math.floor(Math.random() * regions.length)];
      
      // Random coordinates offset inside Java region limits
      const latOffset = (Math.random() - 0.5) * 0.12;
      const lngOffset = (Math.random() - 0.5) * 0.12;
      const latitude = Math.round((region.lat + latOffset) * 1000) / 1000;
      const longitude = Math.round((region.lng + lngOffset) * 1000) / 1000;

      if (isHarvest) {
        const firstNames = ['Pak', 'Ibu'];
        const lastNames = ['Budi', 'Retno', 'Slamet', 'Hartono', 'Wati', 'Agus', 'Mulyono', 'Tri', 'Sri', 'Subagyo'];
        const farmerName = `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
        
        const baseCrop = COMMODITY_LIST[commodity];
        const expectedVolume = Math.round((2000 + Math.random() * 12000) / 100) * 100;
        const askingPrice = Math.round((baseCrop.averagePricePerKg * (0.85 + Math.random() * 0.3)) / 500) * 500;
        
        const nextMonth = new Date();
        nextMonth.setDate(nextMonth.getDate() + 15 + Math.floor(Math.random() * 30));
        const expectedHarvestDate = nextMonth.toISOString().split('T')[0];

        const newHarvest: Harvest = {
          id: `h-live-${Date.now()}`,
          farmerId: `f-live-${Math.floor(Math.random() * 100)}`,
          farmerName,
          commodity,
          landArea: Math.round((0.3 + Math.random() * 1.5) * 10) / 10,
          expectedVolume,
          askingPrice,
          latitude,
          longitude,
          region: region.name,
          plantingDate: new Date().toISOString().split('T')[0],
          expectedHarvestDate,
          status: 'ACTIVE',
          notes: `Melaporkan kesiapan panen serentak ${commodity} terverifikasi.`
        };

        setHarvests(prev => [newHarvest, ...prev.slice(0, 18)]);
        showNotification(`🔄 LAPORAN TANAM BARU (REAL-TIME): ${farmerName} mendaftarkan komoditas ${commodity} (${expectedVolume.toLocaleString('id-ID')} Kg) di Kabupaten ${region.name}!`, 'info');
        mineBlockWithTransaction(
          'RILIS_PANEN',
          farmerName,
          'SinergiTani Ledger',
          `[BATCH: ${newHarvest.id}] Mendaftarkan Laporan Tanam ${commodity} di ${region.name}, Luas Lahan: ${newHarvest.landArea} Ha, Estimasi Volume: ${expectedVolume.toLocaleString('id-ID')} Kg`
        );
      } else {
        const buyerNames = [
          'Koperasi Tani Makmur', 
          'Koperasi Agro Niaga', 
          'Koperasi Serba Usaha Pangan', 
          'UD Sembako Berkah', 
          'Koperasi Mitra Tani Sejahtera',
          'Koperasi Unit Desa Mandiri'
        ];
        const buyerName = buyerNames[Math.floor(Math.random() * buyerNames.length)];
        
        const baseCrop = COMMODITY_LIST[commodity];
        const requiredVolume = Math.round((3000 + Math.random() * 15000) / 100) * 100;
        const offerPrice = Math.round((baseCrop.averagePricePerKg * (0.9 + Math.random() * 0.25)) / 500) * 500;

        const limitDate = new Date();
        limitDate.setDate(limitDate.getDate() + 10 + Math.floor(Math.random() * 20));
        const dateRequired = limitDate.toISOString().split('T')[0];

        const newDemand: Demand = {
          id: `d-live-${Date.now()}`,
          buyerId: `b-live-${Math.floor(Math.random() * 100)}`,
          buyerName,
          commodity,
          requiredVolume,
          offerPrice,
          latitude,
          longitude,
          region: region.name,
          dateRequired,
          status: 'ACTIVE',
          notes: `Kebutuhan pasok sedia serap gudang logistik daerah.`
        };

        setDemands(prev => [newDemand, ...prev.slice(0, 15)]);
        showNotification(`🔄 DEMAND PASOK BARU (REAL-TIME): ${buyerName} merilis kebutuhan ${commodity} (${requiredVolume.toLocaleString('id-ID')} Kg) dengan harga penawaran Rp${offerPrice.toLocaleString('id-ID')}/Kg di ${region.name}!`, 'success');
        mineBlockWithTransaction(
          'RILIS_DEMAND',
          buyerName,
          'SinergiTani Ledger',
          `Mendaftarkan Kebutuhan Pasokan ${commodity} di ${region.name}, Volume Diminta: ${requiredVolume.toLocaleString('id-ID')} Kg, Harga Penawaran: Rp${offerPrice.toLocaleString('id-ID')}/Kg`
        );
      }
    }, 25000);

    return () => clearInterval(interval);
  }, [harvests, demands, mineBlockWithTransaction]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'info') => {
    setNotification({ message, type });
  };

  const dismissNotification = () => {
    setNotification(null);
  };

  const addHarvest = (harvestData: Omit<Harvest, 'id' | 'farmerId' | 'farmerName' | 'status'>) => {
    const newHarvest: Harvest = {
      ...harvestData,
      id: `h-${Date.now()}`,
      farmerId: activeUser.PETANI.id,
      farmerName: activeUser.PETANI.name,
      status: 'ACTIVE',
    };
    
    setHarvests(prev => [newHarvest, ...prev]);
    showNotification(`Laporan tanam ${harvestData.commodity} berhasil ditambahkan!`, 'success');

    // Mine a transaction block
    mineBlockWithTransaction(
      'RILIS_PANEN',
      activeUser.PETANI.name,
      'SinergiTani Ledger',
      `[BATCH: ${newHarvest.id}] Mendaftarkan Laporan Tanam ${harvestData.commodity} di ${harvestData.region}, Luas Lahan: ${harvestData.landArea} Ha, Estimasi Volume: ${harvestData.expectedVolume.toLocaleString('id-ID')} Kg, Harga Harapan: Rp${harvestData.askingPrice.toLocaleString('id-ID')}/Kg`
    );
  };

  const addDemand = (demandData: Omit<Demand, 'id' | 'buyerId' | 'buyerName' | 'status'>) => {
    const newDemand: Demand = {
      ...demandData,
      id: `d-${Date.now()}`,
      buyerId: activeUser.PEMBELI.id,
      buyerName: activeUser.PEMBELI.name,
      status: 'ACTIVE',
    };

    setDemands(prev => [newDemand, ...prev]);
    showNotification(`Permintaan demand untuk ${demandData.commodity} berhasil dipublikasi!`, 'success');

    // Mine a transaction block
    mineBlockWithTransaction(
      'RILIS_DEMAND',
      activeUser.PEMBELI.name,
      'SinergiTani Ledger',
      `Mendaftarkan Kebutuhan Pasokan ${demandData.commodity} di ${demandData.region}, Volume Diminta: ${demandData.requiredVolume.toLocaleString('id-ID')} Kg, Harga Penawaran: Rp${demandData.offerPrice.toLocaleString('id-ID')}/Kg`
    );
  };

  const updateMatchStatus = (matchId: string, status: Match['status']) => {
    setMatches(prev => 
      prev.map(m => {
        if (m.id === matchId) {
          const h = harvests.find(harv => harv.id === m.harvestId);
          const d = demands.find(dem => dem.id === m.demandId);
          const farmer = h ? h.farmerName : 'Petani';
          const buyer = d ? d.buyerName : 'Pembeli';
          const commodity = h ? h.commodity : 'Komoditas';

          // If transaction is fully confirmed, mark the harvest and demand as matched/fulfilled
          if (status === 'CONFIRMED') {
            setHarvests(hs => hs.map(h => h.id === m.harvestId ? { ...h, status: 'MATCHED' } : h));
            setDemands(ds => ds.map(d => d.id === m.demandId ? { ...d, status: 'FULFILLED' } : d));
            showNotification('Transaksi Berhasil Dikonfirmasi! Hasil panen terselamatkan dari potensi susut.', 'success');

            mineBlockWithTransaction(
              'KONTRAK_SEPAKAT',
              farmer,
              buyer,
              `SMART CONTRACT SIGNED: Kesepakatan Kontrak Pre-Order ${commodity} sebesar ${h?.expectedVolume?.toLocaleString('id-ID')} Kg seharga Rp${d?.offerPrice?.toLocaleString('id-ID')}/Kg ditandatangani secara digital oleh kedua belah pihak.`
            );
          } else if (status === 'ACCEPTED_BY_FARMER') {
            showNotification('Penawaran disetujui oleh Petani. Menunggu konfirmasi Pembeli.', 'info');
            mineBlockWithTransaction(
              'MUTASI_KONTRAK',
              farmer,
              buyer,
              `Kontrak Pre-Order ${commodity}: Disetujui oleh Petani (${farmer}). Menunggu tanda tangan pembeli.`
            );
          } else if (status === 'ACCEPTED_BY_BUYER') {
            showNotification('Permintaan pencocokan diajukan ke Petani.', 'info');
            mineBlockWithTransaction(
              'MUTASI_KONTRAK',
              buyer,
              farmer,
              `Kontrak Pre-Order ${commodity}: Diajukan oleh Pembeli (${buyer}). Menunggu tanda tangan petani.`
            );
          } else if (status === 'DISPUTED') {
            showNotification('Pencocokan dilaporkan mengalami kendala logistik.', 'warning');
            mineBlockWithTransaction(
              'MUTASI_KONTRAK',
              farmer,
              buyer,
              `DISPUTE WARNING: Kontrak Pre-Order ${commodity} dilaporkan bermasalah atau mengalami kendala pengiriman.`
            );
          }
          return { ...m, status };
        }
        return m;
      })
    );
  };

  const updateWeights = (newWeights: MatchWeights) => {
    setWeights(newWeights);
    showNotification('Parameter bobot algoritma pencocokan berhasil diperbarui!', 'success');
  };

  const setRole = (role: Role) => {
    setActiveRole(role);
    showNotification(`Beralih peran menjadi: ${role}`, 'info');
  };

  const resetAllData = () => {
    setHarvests(SEED_HARVESTS);
    setDemands(SEED_DEMANDS);
    setWeights(DEFAULT_WEIGHTS);
    localStorage.removeItem('flw_harvests');
    localStorage.removeItem('flw_demands');
    localStorage.removeItem('flw_weights');
    localStorage.removeItem('flw_blockchain');
    window.location.reload();
  };

  return (
    <AppContext.Provider
      value={{
        harvests,
        demands,
        matches,
        weights,
        activeRole,
        activeUser,
        notification,
        blockchain,
        addHarvest,
        addDemand,
        updateMatchStatus,
        updateWeights,
        setRole,
        showNotification,
        dismissNotification,
        resetAllData,
        mineBlockWithTransaction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
