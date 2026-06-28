/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Database, 
  Cpu, 
  Layers, 
  Lock, 
  ShieldCheck, 
  Link as LinkIcon, 
  FileCode, 
  Terminal, 
  Fingerprint, 
  Activity, 
  CheckCircle, 
  Clock,
  ArrowRight,
  Server,
  RefreshCw,
  Search,
  Key
} from 'lucide-react';
import { Block, BlockchainTransaction } from '../types';

export default function BlockchainView() {
  const { blockchain, mineBlockWithTransaction, harvests, demands, matches } = useApp();
  const [selectedBlockHeight, setSelectedBlockHeight] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [miningPayload, setMiningPayload] = useState('Verifikasi mandiri data distribusi pangan oleh dinas');
  const [isMining, setIsMining] = useState(false);

  // Stats
  const stats = useMemo(() => {
    let totalContracts = 0;
    let totalHarvestTxs = 0;
    let totalDemandTxs = 0;

    blockchain.forEach(block => {
      block.transactions.forEach(tx => {
        if (tx.type === 'KONTRAK_SEPAKAT') totalContracts++;
        if (tx.type === 'RILIS_PANEN') totalHarvestTxs++;
        if (tx.type === 'RILIS_DEMAND') totalDemandTxs++;
      });
    });

    const activeContractCount = matches.filter(m => m.status === 'CONFIRMED').length;

    return {
      blockHeight: blockchain.length > 0 ? blockchain[0].height : 0,
      totalContracts: totalContracts + activeContractCount,
      totalHarvestTxs,
      totalDemandTxs,
      gasSavedGwei: blockchain.length * 21000 // fun stat
    };
  }, [blockchain, matches]);

  const selectedBlock = useMemo(() => {
    if (selectedBlockHeight === null) return blockchain[0];
    return blockchain.find(b => b.height === selectedBlockHeight) || blockchain[0];
  }, [blockchain, selectedBlockHeight]);

  const handleManualMine = () => {
    setIsMining(true);
    setTimeout(() => {
      mineBlockWithTransaction(
        'BLOCK_REWARD',
        'Validator Node Dinas Pertanian',
        'Node Petani Utama',
        `VALIDASI DATA DISTRIBUSI LOGISTIK: ${miningPayload}`
      );
      setIsMining(false);
      setMiningPayload('');
    }, 1200);
  };

  // Filter transactions
  const filteredTxs = useMemo(() => {
    const list: { tx: BlockchainTransaction; blockHeight: number }[] = [];
    blockchain.forEach(block => {
      block.transactions.forEach(tx => {
        if (searchQuery) {
          const query = searchQuery.toLowerCase();
          const matchesQuery = 
            tx.id.toLowerCase().includes(query) ||
            tx.sender.toLowerCase().includes(query) ||
            tx.recipient.toLowerCase().includes(query) ||
            tx.payload.toLowerCase().includes(query) ||
            tx.txHash.toLowerCase().includes(query);
          if (!matchesQuery) return;
        }
        list.push({ tx, blockHeight: block.height });
      });
    });
    return list;
  }, [blockchain, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Blockchain Header Info Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden border border-slate-800 shadow-lg">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-35" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 font-bold tracking-widest uppercase animate-pulse flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Ledger Live
              </span>
              <span className="text-slate-500 text-xs font-mono">ID: a7a7cfc1-blockchain</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-6 h-6 text-emerald-400 shrink-0" />
              SinergiTani Cryptographic Ledger
            </h1>
            <p className="text-slate-400 text-sm max-w-2xl">
              Teknologi blockchain transparan & akuntabel. Setiap laporan panen hulu, kesepakatan harga, dan realisasi kontrak pre-order dicatat secara permanen untuk mengeliminasi manipulasi tengkulak.
            </p>
          </div>

          <div className="flex gap-2">
            <div className="bg-slate-800/85 border border-slate-700/60 p-3 rounded-xl min-w-[120px] text-center backdrop-blur-md">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tinggi Block</div>
              <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-0.5">#{stats.blockHeight}</div>
            </div>
            <div className="bg-slate-800/85 border border-slate-700/60 p-3 rounded-xl min-w-[120px] text-center backdrop-blur-md">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Smart Contract</div>
              <div className="text-2xl font-extrabold text-amber-400 font-mono mt-0.5">{stats.totalContracts}</div>
            </div>
          </div>
        </div>

        {/* Info badges stat list */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Tipe Consensus</div>
              <div className="text-xs font-extrabold text-slate-200">Proof of Authority</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Integritas Keamanan</div>
              <div className="text-xs font-extrabold text-slate-200">SHA-256 Merkle Hash</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 shrink-0">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Node Validator</div>
              <div className="text-xs font-extrabold text-slate-200">Dinas, Koperasi, Gapoktan</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 text-indigo-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Waktu Rata-Rata Block</div>
              <div className="text-xs font-extrabold text-slate-200">Real-Time Event Driven</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Blocks Column */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800 tracking-tight uppercase flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-500" />
              Daftar Block Terverifikasi
            </h2>
            <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-bold font-mono">
              {blockchain.length} Blocks
            </span>
          </div>

          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {blockchain.map((block) => {
              const isSelected = selectedBlock.height === block.height;
              return (
                <div
                  key={block.height}
                  onClick={() => setSelectedBlockHeight(block.height)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden ${
                    isSelected
                      ? 'bg-emerald-50/50 border-emerald-400 shadow-md ring-1 ring-emerald-400'
                      : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/40'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />
                      <span className="font-mono font-bold text-sm text-slate-800">Block #{block.height}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">{block.timestamp}</span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600">
                    <p className="flex justify-between">
                      <span className="text-slate-400">Validator:</span>
                      <span className="font-semibold text-slate-700 truncate max-w-[150px]">{block.validator}</span>
                    </p>
                    <p className="flex justify-between font-mono text-[10px]">
                      <span className="text-slate-400">Hash:</span>
                      <span className="font-bold text-slate-800">{block.hash.substring(0, 16)}...</span>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-400">Transaksi:</span>
                      <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                        {block.transactions.length} TX
                      </span>
                    </p>
                  </div>

                  {/* Connect link line graphic */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    <LinkIcon className="w-4 h-4 opacity-50" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Block Details & Transactions Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Block details view */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                  INFORMASI BLOK AKTIF
                </span>
                <h3 className="text-base font-bold text-slate-800 mt-1 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-500" />
                  Inspeksi Block #{selectedBlock.height}
                </h3>
              </div>
              <div className="font-mono text-[10px] text-slate-400">
                NONCE: <span className="font-bold text-slate-800">{selectedBlock.nonce}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-slate-400 font-medium">Merkle Hash Blok ini:</p>
                <p className="font-mono text-[11px] font-bold text-slate-800 break-all bg-white p-2 rounded border border-slate-200">
                  {selectedBlock.hash}
                </p>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-slate-400 font-medium">Hash Blok Sebelumnya (Prev):</p>
                <p className="font-mono text-[11px] font-bold text-slate-500 break-all bg-white p-2 rounded border border-slate-200">
                  {selectedBlock.prevHash}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                Transaksi Tersegel dalam Blok ({selectedBlock.transactions.length})
              </h4>

              <div className="space-y-3">
                {selectedBlock.transactions.map((tx) => (
                  <div key={tx.id} className="bg-slate-50/50 border border-slate-200 rounded-xl p-4 text-xs space-y-3 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          tx.type === 'KONTRAK_SEPAKAT' 
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : tx.type === 'RILIS_PANEN'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : tx.type === 'RILIS_DEMAND'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : tx.type === 'MUTASI_KONTRAK'
                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {tx.type.replace('_', ' ')}
                        </span>
                        <span className="font-mono font-bold text-slate-500 text-[10px]">{tx.id}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {tx.timestamp}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">Pengirim (Signature):</span>
                        <span className="font-bold text-slate-800 flex items-center gap-1">
                          <Key className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {tx.sender}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">Penerima (Contract):</span>
                        <span className="font-bold text-slate-800">
                          {tx.recipient}
                        </span>
                      </div>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg p-2.5">
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">Payload Data Pre-Order:</span>
                      <p className="font-semibold text-slate-700 leading-relaxed text-[11px]">{tx.payload}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-mono block mb-1">Cryptographic Hash Tx:</span>
                      <p className="font-mono text-[10px] text-emerald-600 font-bold break-all bg-emerald-50/50 p-2 rounded border border-emerald-100/60">
                        {tx.txHash}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Manual miner block */}
          <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-4 shadow-inner">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-500" />
                Dinas Pertanian - Alat Mining / Validasi Blok Mandiri
              </h3>
              <p className="text-xs text-slate-500">
                Sebagai regulator atau dinas pertanian, Anda memegang kunci verifikasi consensus. Ketik kesimpulan verifikasi data lapangan untuk dimasukkan ke blok baru.
              </p>
            </div>

            <div className="flex gap-2.5 max-w-full">
              <input
                type="text"
                placeholder="Misal: 'Hasil panen Cabai Merah di Garut terverifikasi 100% bebas hama sawah...'"
                value={miningPayload}
                onChange={(e) => setMiningPayload(e.target.value)}
                className="flex-1 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 font-semibold focus:outline-none focus:border-slate-400 placeholder:text-slate-400"
              />
              <button
                onClick={handleManualMine}
                disabled={isMining || !miningPayload.trim()}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold transition-all hover:bg-slate-800 flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isMining ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mengecor Block...</span>
                  </>
                ) : (
                  <>
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Mine Block Baru</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Interactive Block Search Stream */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                Pencarian Transaksi Global (Global Ledger Explorer)
              </h3>
              <div className="relative max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kata kunci, hash, nama..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                    <th className="py-2.5">TX ID</th>
                    <th className="py-2.5">Tipe</th>
                    <th className="py-2.5">Pengirim / Penerima</th>
                    <th className="py-2.5">Blok</th>
                    <th className="py-2.5">Data ringkas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredTxs.length > 0 ? (
                    filteredTxs.map(({ tx, blockHeight }) => (
                      <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-mono text-[10px] text-slate-400">{tx.id}</td>
                        <td className="py-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            tx.type === 'KONTRAK_SEPAKAT' 
                              ? 'bg-amber-100 text-amber-800'
                              : tx.type === 'RILIS_PANEN'
                              ? 'bg-emerald-100 text-emerald-800'
                              : tx.type === 'RILIS_DEMAND'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-800'
                          }`}>
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 text-[11px]">
                          <span className="font-bold">{tx.sender}</span>
                          <span className="text-slate-400 font-normal"> to </span>
                          <span className="text-slate-500">{tx.recipient}</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-500">#{blockHeight}</td>
                        <td className="py-3 text-[11px] max-w-[200px] truncate text-slate-500">{tx.payload}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Tidak ada transaksi yang sesuai dengan pencarian Anda.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
