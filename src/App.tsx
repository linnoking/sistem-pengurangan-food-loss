/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import InteractiveMap from './components/InteractiveMap';
import FarmerView from './components/FarmerView';
import BuyerView from './components/BuyerView';
import DinasView from './components/DinasView';
import AdminView from './components/AdminView';
import BlockchainView from './components/BlockchainView';
import { motion, AnimatePresence } from 'motion/react';
import { Info, X, CheckCircle, AlertCircle } from 'lucide-react';

function AppContent() {
  const { activeRole, notification, dismissNotification } = useApp();

  // Coordinate selection states from map click (to auto-fill forms)
  const [mapLat, setMapLat] = useState<number | undefined>(undefined);
  const [mapLng, setMapLng] = useState<number | undefined>(undefined);
  const [mapRegion, setMapRegion] = useState<string | undefined>(undefined);

  const handleSelectCoords = (lat: number, lng: number, region: string) => {
    setMapLat(lat);
    setMapLng(lng);
    setMapRegion(region);
  };

  const handleClearCoords = () => {
    setMapLat(undefined);
    setMapLng(undefined);
    setMapRegion(undefined);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Dynamic Interactive map - displayed on all views except BLOCKCHAIN for visual context */}
        {activeRole !== 'BLOCKCHAIN' && (
          <InteractiveMap 
            onSelectCoords={activeRole === 'PETANI' || activeRole === 'PEMBELI' ? handleSelectCoords : undefined}
            selectedLat={mapLat}
            selectedLng={mapLng}
          />
        )}

        {/* Dynamic role rendering */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRole}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18 }}
          >
            {activeRole === 'PETANI' && (
              <FarmerView 
                mapLat={mapLat} 
                mapLng={mapLng} 
                mapRegion={mapRegion} 
                clearMapSelection={handleClearCoords}
              />
            )}
            {activeRole === 'PEMBELI' && (
              <BuyerView 
                mapLat={mapLat} 
                mapLng={mapLng} 
                mapRegion={mapRegion} 
                clearMapSelection={handleClearCoords}
              />
            )}
            {activeRole === 'DINAS' && <DinasView />}
            {activeRole === 'ADMIN' && <AdminView />}
            {activeRole === 'BLOCKCHAIN' && <BlockchainView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Slide-in feedback notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-3 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-lg border border-slate-800 text-xs font-semibold select-none min-w-[320px] max-w-md"
          >
            {notification.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            {notification.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0" />}
            
            <span className="flex-1 text-slate-100">{notification.message}</span>
            
            <button 
              onClick={dismissNotification}
              className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
