#  SinergiTani — Sistem Pengurangan Food Loss & Waste

<div align="center">

![SinergiTani](https://img.shields.io/badge/SinergiTani-Food%20Loss%20Mitigation-16a34a?style=for-the-badge&logo=leaf&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?style=flat-square&logo=typescript)
![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-4.22-ff6f00?style=flat-square&logo=tensorflow)
![License](https://img.shields.io/badge/License-Apache%202.0-green?style=flat-square)

**Platform digital multi-peran untuk mengurangi kehilangan dan pemborosan pangan pada rantai pasok pertanian Indonesia.**

*Menghubungkan petani, pembeli, dinas pertanian, dan administrator dalam satu ekosistem cerdas berbasis AI, prediksi time-series, dan transparansi blockchain.*

</div>

---

## 📋 Daftar Isi

- [Latar Belakang Masalah](#-latar-belakang-masalah)
- [Demo & Screenshot](#-demo--screenshot)
- [Fitur Lengkap](#-fitur-lengkap)
- [Arsitektur Sistem](#-arsitektur-sistem)
- [Teknologi yang Digunakan](#-teknologi-yang-digunakan)
- [Struktur Proyek](#-struktur-proyek)
- [Peran Pengguna (Roles)](#-peran-pengguna-roles)
- [Alur Kerja Sistem](#-alur-kerja-sistem)
- [Algoritma & Model AI/ML](#-algoritma--model-aiml)
- [Komoditas yang Didukung](#-komoditas-yang-didukung)
- [Data & State Management](#-data--state-management)
- [Blockchain Ledger](#-blockchain-ledger)
- [Instalasi & Setup](#-instalasi--setup)
- [Variabel Lingkungan](#-variabel-lingkungan)
- [Skrip yang Tersedia](#-skrip-yang-tersedia)
- [Catatan Pengembangan Produksi](#-catatan-pengembangan-produksi)
- [Lisensi](#-lisensi)

---

##  Latar Belakang Masalah

Indonesia kehilangan jutaan ton hasil panen setiap tahun akibat:

- **Ketidakcocokan pasokan dan permintaan** — petani memanen tanpa kepastian pembeli, sementara pembeli tidak memiliki visibilitas stok yang akan datang
- **Infrastruktur logistik yang terbatas** — rute pengiriman tidak efisien menyebabkan panen membusuk di perjalanan
- **Minimnya informasi antar pelaku rantai pasok** — petani, pembeli, dan dinas pertanian beroperasi secara terpisah tanpa sinkronisasi data
- **Tidak adanya traceability produk** — keaslian, asal-usul, dan kualitas produk tidak dapat diverifikasi, membuka peluang manipulasi tengkulak

**SinergiTani** hadir sebagai jembatan digital yang menjawab semua tantangan ini sekaligus, dengan memanfaatkan kecerdasan buatan, analitik prediktif, dan teknologi blockchain dalam satu platform terintegrasi.

---

##  Demo & Screenshot

> Aplikasi berjalan sepenuhnya di browser — tidak memerlukan instalasi backend khusus untuk fitur inti.

**Cara mengakses semua fitur:**
1. Jalankan `npm run dev`
2. Buka `http://localhost:3000`
3. Gunakan switcher peran di Navbar untuk berpindah antar perspektif (Petani / Pembeli / Dinas / Admin / Blockchain)

---

##  Fitur Lengkap

### Peta Interaktif (InteractiveMap)
- Visualisasi titik panen aktif (hijau) dan permintaan pembeli (coklat) secara real-time di peta Jawa
- Dibangun dengan **Leaflet.js** dengan tile OpenStreetMap
- Klik pada titik di peta untuk **mengisi koordinat form secara otomatis** (petani & pembeli)
- Popup informatif menampilkan nama petani/koperasi, komoditas, volume, dan harga saat hover

###  Dashboard Petani (FarmerView)
- **Form laporan rencana tanam** lengkap dengan:
  - Pemilihan komoditas dengan *auto-kalkulasi* estimasi yield berdasarkan luas lahan dan rata-rata produktivitas
  - *Auto-estimasi* tanggal panen berdasarkan durasi tanam khas komoditas
  - *Auto-isi* harga acuan berdasarkan HPP rata-rata komoditas
  - Sinkronisasi koordinat GPS dari perangkat atau klik peta
- **Peringatan cuaca** berbasis wilayah untuk komoditas berisiko busuk tinggi
- **Grading kualitas dengan TensorFlow.js** — unggah foto panen untuk mendapat Grade A/B/C beserta:
  - Skor intensitas warna (kematangan)
  - Skor keseragaman ukuran (uniformity)
  - Skor bebas cacat/bercak (blemish free)
  - Confidence score dari model neural network
  - Sampel preset gambar Grade A dan Grade C untuk pengujian cepat
- **Tabel laporan lahan aktif** dengan status real-time
- **Sertifikat QR Trace** per lahan — menghasilkan QR code blockchain untuk verifikasi keaslian produk
- **Rekomendasi pembeli terdekat** dengan skor pencocokan cerdas (0–100%)
- Alur kerja persetujuan: Petani dapat menerima atau menolak tawaran pembeli


###  Dashboard Pembeli / Koperasi (BuyerView)
- **Form rilis kebutuhan pasokan** dengan harga penawaran, volume, batas tanggal, dan lokasi gudang
- *Auto-isi* harga penawaran berdasarkan rata-rata pasar komoditas (+5% untuk merangsang matching)
- **Market intelligence** — info ketersediaan surplus regional dari data Dinas Pertanian
- **Tabel daftar permintaan aktif** koperasi
- **Pre-order matching engine** — daftar lahan petani tercocokkan dengan breakdown skor:
  - Jarak antar lokasi (km)
  - Kesesuaian volume (Kg)
  - Kesesuaian harga (Rp/Kg)
- Tombol **"Ajukan Kerja Sama"** untuk memulai alur negosiasi kontrak
- **QR Scanner Simulator** — simulasi scan QR code fisik pada kemasan produk untuk:
  - Verifikasi keaslian batch panen di blockchain
  - Membuka sertifikat traceabilitas digital
  - Animasi laser scanner dengan efek neon corners

### 📊 Dashboard Dinas Pertanian (DinasView)
Panel tiga tab terintegrasi untuk pengawasan nasional:

**Tab 1 — Indeks Pengawasan Nasional (Monitoring):**
- 4 kartu KPI: Total Volume Tanam, Total Permintaan Pasar, Food Loss Terselamatkan (Kg + estimasi CO₂ diredam), Kesehatan Alur Distribusi (%)
- **Custom SVG bar chart** perbandingan produksi vs daya serap per komoditas (tanpa library chart eksternal)
- **Indeks Risiko Food Loss per wilayah** (Brebes, Garut, Malang, Cianjur) dengan:
  - Surplus tidak terserap (Kg)
  - Persentase risiko pembusukan berdasarkan perishability factor komoditas
  - Badge status: RENDAH / SEDANG (SIAGA) / TINGGI (AWAS)
  - Rekomendasi kebijakan intervensi armada cold chain

**Tab 2 — Peramalan Time-Series (Forecasting):**
- Pilihan wilayah dan komoditas secara dinamis
- **Grafik kurva SVG** proyeksi hasil panen 4 minggu ke depan dengan *shaded confidence band* 95%
- Garis prediksi solid + batas atas/bawah confidence interval bertitik (dashed)
- Tabel angka prediksi mingguan (volume, CI lower, CI upper)
- Indikator tren: UP / DOWN / STABLE + persentase growth rate

**Tab 3 — Optimasi Rute Kolektor (Routing):**
- Konfigurasi depot (wilayah), kapasitas kendaraan (Kg), dan jumlah armada
- Tombol jalankan optimasi rute VRP
- Kartu ringkasan per kendaraan: nama armada, total volume, total jarak, persentase utilisasi
- Tabel daftar titik berhenti per rute dengan urutan pengambilan optimal
- Rekap total: semua armada, total titik, total volume, total jarak

### ⚙️ Panel Admin (AdminView)
- **Kalibrasi bobot algoritma pencocokan** secara real-time via slider:
  - `w1` Kedekatan Lokasi (default 40%)
  - `w2` Kesesuaian Volume (default 30%)
  - `w3` Kesesuaian Harga (default 30%)
- Validasi otomatis — total bobot harus = 1.00, jika tidak sistem melakukan normalisasi proporsional
- Tombol reset ke bobot bawaan
- **Buku besar transaksi platform** — tabel semua pencocokan aktif beserta:
  - Detail sisi hulu (petani) dan hilir (pembeli)
  - Skor match dan jarak
  - Status transaksi (Saran / Sepakat / Sengketa)
  - Aksi admin: tandai masalah logistik atau selesaikan sengketa

### 🔗 Blockchain Ledger (BlockchainView)
- Header info jaringan: Tinggi Block terkini, jumlah Smart Contract aktif
- Tipe consensus: **Proof of Authority**
- Integritas: **SHA-256 Merkle Hash**
- Node validator: Dinas, Koperasi, Gapoktan
- **Daftar semua block** dengan klik untuk inspeksi detail:
  - Merkle Hash block dan prevHash (chain integrity)
  - Nonce dan timestamp
  - List semua transaksi tersegel beserta payload dan cryptographic hash
- **Manual Mining Tool** — Dinas Pertanian dapat menambahkan blok validasi baru
- **Global Ledger Explorer** — pencarian transaksi by ID, nama, hash, atau kata kunci payload
- 5 tipe transaksi: `RILIS_PANEN`, `RILIS_DEMAND`, `MUTASI_KONTRAK`, `KONTRAK_SEPAKAT`, `BLOCK_REWARD`

### 🔍 Sertifikat Traceabilitas (TraceModal)
- Modal blockchain certificate yang dapat dibuka dari lahan petani atau hasil scan pembeli
- **QR Code dinamis** berisi URL traceability unik per batch panen
- Passport produk: nama petani, wilayah, koordinat geospasial, tanggal tanam, estimasi panen, volume
- Link langsung ke **Google Maps Satelit** berdasarkan koordinat lahan
- **Timeline audit riwayat blockchain** — semua transaksi terkait batch ini secara kronologis
- Status Smart Contract escrow jika batch sudah memiliki kontrak terkait

### 🔄 Simulasi Real-Time
- Setiap **25 detik** sistem secara otomatis membuat:
  - 55% kemungkinan: laporan tanam baru dari petani simulasi
  - 45% kemungkinan: rilis demand baru dari koperasi simulasi
- Mencakup 4 wilayah (Brebes, Garut, Malang, Cianjur) × 7 komoditas
- Setiap event real-time sekaligus melakukan mining blok baru ke blockchain
- Notifikasi toast muncul setiap ada aktivitas baru

### 🔔 Sistem Notifikasi Toast
- Slide-in dari bawah layar dengan animasi Framer Motion
- 3 tipe: `success` (hijau), `warning` (kuning), `info` (biru)
- Ikon kontekstual (CheckCircle / AlertCircle / Info)
- Dapat di-dismiss manual atau auto-dimiss

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    SinergiTani Platform                  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │  Petani  │  │ Pembeli  │  │  Dinas   │  │ Admin  │  │
│  │  View    │  │  View    │  │  View    │  │  View  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────┘  │
│       │              │              │             │      │
│  ┌────▼──────────────▼──────────────▼─────────────▼───┐ │
│  │              AppContext (Global State)              │ │
│  │  harvests | demands | matches | blockchain          │ │
│  │  weights | activeRole | notifications               │ │
│  └───────────────────┬─────────────────────────────────┘ │
│                      │                                   │
│  ┌───────────────────▼─────────────────────────────────┐ │
│  │                 Core Engines                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────┐  │ │
│  │  │ Match Engine │  │  Blockchain  │  │ RT Sim.  │  │ │
│  │  │ (Haversine + │  │  Ledger      │  │ (25s     │  │ │
│  │  │  Weighted    │  │  (PoA)       │  │  Timer)  │  │ │
│  │  │  Scoring)    │  └──────────────┘  └──────────┘  │ │
│  │  └──────────────┘                                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                         │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ TF.js MLP   │  │ Holt's       │  │ VRP Nearest   │  │
│  │ CV Grading  │  │ Exponential  │  │ Neighbor      │  │
│  │ (Browser)   │  │ Smoothing    │  │ Route Optim.  │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                         │
│  ┌─────────────────────────────────────────────────────┐ │
│  │            Persistence: localStorage               │ │
│  │  flw_harvests | flw_demands | flw_weights          │ │
│  │  flw_blockchain | flw_active_role                  │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```


---

## 🛠️ Teknologi yang Digunakan

### Frontend Core
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **React** | 19.0.1 | Framework UI utama |
| **TypeScript** | ~5.8.2 | Type safety di seluruh codebase |
| **Vite** | 6.2.3 | Build tool & dev server (port 3000) |
| **Tailwind CSS** | 4.1.14 | Utility-first styling via `@tailwindcss/vite` |

### AI & Machine Learning
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **TensorFlow.js** | 4.22.0 | Model MLP grading kualitas tanaman (inferensi di browser) |
| **@google/genai** | 2.4.0 | Gemini API untuk fitur AI server-side |

### UI & Visualisasi
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **Leaflet.js** | 1.9.4 | Peta interaktif geolokasi |
| **Motion (Framer Motion)** | 12.23.24 | Animasi transisi antar view dan toast |
| **Lucide React** | 0.546.0 | Ikon SVG konsisten |
| **QRCode.React** | 4.2.0 | Generate QR Code sertifikat blockchain |

### Backend (Opsional)
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **Express.js** | 4.21.2 | Server untuk proxy Gemini API server-side |
| **dotenv** | 17.2.3 | Manajemen variabel lingkungan |

### Dev Tools
| Teknologi | Versi | Kegunaan |
|---|---|---|
| **tsx** | 4.21.0 | Run TypeScript langsung untuk server Express |
| **esbuild** | 0.25.0 | Bundling server-side |
| **autoprefixer** | 10.4.21 | PostCSS compatibility |

---

## 📁 Struktur Proyek

```
sistem-pengurangan-food-loss/
│
├── 📄 index.html                    # HTML entry point
├── 📄 package.json                  # Dependencies & scripts
├── 📄 vite.config.ts                # Konfigurasi Vite
├── 📄 tsconfig.json                 # Konfigurasi TypeScript
├── 📄 metadata.json                 # Metadata aplikasi & permissions
├── 📄 .env.example                  # Template variabel lingkungan
├── 📄 .gitignore
│
└── 📁 src/
    ├── 📄 main.tsx                  # Entry point React (mount ke #root)
    ├── 📄 App.tsx                   # Root component, layout utama, toast manager
    ├── 📄 index.css                 # Stylesheet global + custom CSS tokens
    ├── 📄 types.ts                  # Semua TypeScript type & interface global
    │
    ├── 📁 context/
    │   └── 📄 AppContext.tsx        # Global state (React Context)
    │                                # • Seed data awal (7 panen, 5 demand)
    │                                # • Matching engine (scoreMatch)
    │                                # • Haversine distance calculator
    │                                # • Blockchain miner (mineBlockWithTransaction)
    │                                # • Real-time simulator (interval 25s)
    │                                # • localStorage persistence
    │
    ├── 📁 components/
    │   ├── 📄 Navbar.tsx            # Header sticky + role switcher + reset data
    │   ├── 📄 InteractiveMap.tsx    # Peta Leaflet dengan marker panen & demand
    │   ├── 📄 FarmerView.tsx        # Dashboard petani (form, grading, matches)
    │   ├── 📄 BuyerView.tsx         # Dashboard pembeli (form, scanner, matches)
    │   ├── 📄 DinasView.tsx         # Dashboard dinas (3 tab: monitor/forecast/route)
    │   ├── 📄 AdminView.tsx         # Panel admin (weight tuning, transaction log)
    │   ├── 📄 BlockchainView.tsx    # Blockchain explorer + manual miner
    │   └── 📄 TraceModal.tsx        # Modal sertifikat & QR code traceability
    │
    └── 📁 utils/
        ├── 📄 cvGrading.ts          # TensorFlow.js MLP grading kualitas
        ├── 📄 forecasting.ts        # Holt's Exponential Smoothing engine
        └── 📄 routeOptimizer.ts     # VRP Nearest Neighbor route optimizer
```

