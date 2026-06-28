/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Role = 'PETANI' | 'PEMBELI' | 'DINAS' | 'ADMIN' | 'BLOCKCHAIN';

export interface BlockchainTransaction {
  id: string;
  timestamp: string;
  type: 'RILIS_PANEN' | 'RILIS_DEMAND' | 'MUTASI_KONTRAK' | 'KONTRAK_SEPAKAT' | 'BLOCK_REWARD';
  sender: string;
  recipient: string;
  payload: string;
  txHash: string;
}

export interface Block {
  height: number;
  timestamp: string;
  nonce: number;
  prevHash: string;
  hash: string;
  transactions: BlockchainTransaction[];
  validator: string;
}

export type Komoditas = 
  | 'Cabai Merah' 
  | 'Bawang Merah' 
  | 'Tomat' 
  | 'Kentang' 
  | 'Kubis' 
  | 'Padi' 
  | 'Jagung';

export interface CommodityMetadata {
  name: Komoditas;
  typicalDurationDays: number; // days from planting to harvest
  typicalYieldKgPerHectare: number;
  shelfLifeDays: number; // days before spoiling/loss post-harvest
  averagePricePerKg: number; // in IDR
  color: string; // for UI charts
}

export const COMMODITY_LIST: Record<Komoditas, CommodityMetadata> = {
  'Cabai Merah': {
    name: 'Cabai Merah',
    typicalDurationDays: 90,
    typicalYieldKgPerHectare: 8000,
    shelfLifeDays: 7,
    averagePricePerKg: 35000,
    color: '#ef4444', // Red
  },
  'Bawang Merah': {
    name: 'Bawang Merah',
    typicalDurationDays: 70,
    typicalYieldKgPerHectare: 10000,
    shelfLifeDays: 30,
    averagePricePerKg: 28000,
    color: '#ec4899', // Pinkish Red
  },
  'Tomat': {
    name: 'Tomat',
    typicalDurationDays: 80,
    typicalYieldKgPerHectare: 15000,
    shelfLifeDays: 8,
    averagePricePerKg: 12000,
    color: '#f97316', // Orange
  },
  'Kentang': {
    name: 'Kentang',
    typicalDurationDays: 110,
    typicalYieldKgPerHectare: 18000,
    shelfLifeDays: 45,
    averagePricePerKg: 15000,
    color: '#b45309', // Amber
  },
  'Kubis': {
    name: 'Kubis',
    typicalDurationDays: 85,
    typicalYieldKgPerHectare: 20000,
    shelfLifeDays: 12,
    averagePricePerKg: 8000,
    color: '#10b981', // Emerald
  },
  'Padi': {
    name: 'Padi',
    typicalDurationDays: 120,
    typicalYieldKgPerHectare: 6000,
    shelfLifeDays: 180, // Rice grains last a long time if dried
    averagePricePerKg: 7500,
    color: '#f59e0b', // Yellow-amber
  },
  'Jagung': {
    name: 'Jagung',
    typicalDurationDays: 100,
    typicalYieldKgPerHectare: 7000,
    shelfLifeDays: 90,
    averagePricePerKg: 6000,
    color: '#eab308', // Yellow
  },
};

export interface Harvest {
  id: string;
  farmerId: string;
  farmerName: string;
  commodity: Komoditas;
  landArea: number; // in hectares
  expectedVolume: number; // in Kg
  askingPrice: number; // in IDR per Kg
  latitude: number;
  longitude: number;
  region: string; // e.g., 'Brebes', 'Garut', 'Malang'
  plantingDate: string; // YYYY-MM-DD
  expectedHarvestDate: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'MATCHED' | 'HARVESTED' | 'EXPIRED';
  notes?: string;
}

export interface Demand {
  id: string;
  buyerId: string;
  buyerName: string;
  commodity: Komoditas;
  requiredVolume: number; // in Kg
  offerPrice: number; // in IDR per Kg
  latitude: number;
  longitude: number;
  region: string;
  dateRequired: string; // YYYY-MM-DD
  status: 'ACTIVE' | 'FULFILLED' | 'CANCELLED';
  notes?: string;
}

export interface MatchScoreDetails {
  distanceScore: number; // 0 - 100
  volumeScore: number; // 0 - 100
  priceScore: number; // 0 - 100
  totalScore: number; // 0 - 100
  distanceKm: number;
}

export interface Match {
  id: string;
  harvestId: string;
  demandId: string;
  score: number; // Overall Score 0 - 100
  distanceKm: number;
  scoreDetails: MatchScoreDetails;
  status: 'PENDING' | 'ACCEPTED_BY_FARMER' | 'ACCEPTED_BY_BUYER' | 'CONFIRMED' | 'DISPUTED';
  createdAt: string;
}

export interface MatchWeights {
  wLocation: number; // e.g., 0.4
  wVolume: number;   // e.g., 0.3
  wPrice: number;    // e.g., 0.3
}

export interface RegionStats {
  regionName: string;
  totalHarvestKg: number;
  totalDemandKg: number;
  activeFarmers: number;
  activeBuyers: number;
  surplusRiskIndex: number; // 0 to 100, showing risk of waste
  unmatchedSurplusKg: number;
}
