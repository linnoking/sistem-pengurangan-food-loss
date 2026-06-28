# SinergiTani — Sistem Pengurangan Food Loss

Platform digital multi-peran untuk mengurangi kehilangan dan pemborosan pangan (*food loss & waste*) pada rantai pasok pertanian Indonesia, dengan memanfaatkan pencocokan pasokan-permintaan berbasis AI, analitik prediktif, dan transparansi blockchain.

---

## Daftar Isi

- [Latar Belakang](#latar-belakang)
- [Fitur Utama](#fitur-utama)
- [Arsitektur & Teknologi](#arsitektur--teknologi)
- [Struktur Proyek](#struktur-proyek)
- [Peran Pengguna](#peran-pengguna)
- [Algoritma & Model](#algoritma--model)
- [Instalasi & Menjalankan](#instalasi--menjalankan)
- [Variabel Lingkungan](#variabel-lingkungan)
- [Lisensi](#lisensi)

---

## Latar Belakang

Indonesia kehilangan jutaan ton hasil panen setiap tahun akibat ketidaksesuaian pasokan dan permintaan, infrastruktur logistik yang terbatas, serta minimnya informasi antar pelaku rantai pasok. SinergiTani hadir sebagai jembatan digital yang menghubungkan petani, pembeli, petugas dinas pertanian, dan administrator dalam satu ekosistem terintegrasi.

---

## Fitur Utama

| Fitur | Deskripsi |
|---|---|
| **Pencocokan Pasokan–Permintaan** | Algoritma skor tertimbang (lokasi 40%, volume 30%, harga 30%) untuk mencocokkan laporan panen petani dengan permintaan pembeli secara real-time |
| **Peta Interaktif** | Visualisasi geolokasi titik panen dan permintaan di seluruh Jawa menggunakan Leaflet.js; mendukung klik peta untuk mengisi form otomatis |
| **Grading Kualitas (CV + TensorFlow.js)** | Model neural network ringan berbasis TensorFlow.js yang menganalisis gambar hasil panen dan menghasilkan nilai kualitas Grade A/B/C beserta confidence score |
| **Prediksi Panen (Forecasting)** | Model *Holt's Double Exponential Smoothing* untuk memperkirakan volume panen 4 minggu ke depan per wilayah dan komoditas |
| **Optimasi Rute Logistik (VRP)** | Algoritma *Nearest Neighbor* dengan batasan kapasitas kendaraan untuk merencanakan rute pengumpulan hasil panen secara efisien |
| **Blockchain Ledger** | Setiap transaksi (rilis panen, rilis demand, kesepakatan kontrak) dicatat secara transparan dalam blok yang dapat diaudit |
| **Simulasi Real-Time** | Sistem secara otomatis menghasilkan laporan panen dan permintaan baru setiap 25 detik untuk mensimulasikan aktivitas pasar langsung |
| **Notifikasi Toast** | Umpan balik interaktif slide-in untuk setiap aksi pengguna maupun pembaruan data real-time |

---

## Arsitektur & Teknologi

### Frontend
- **React 19** + **TypeScript** — Kerangka utama aplikasi
- **Vite 6** — Build tool dan dev server
- **Tailwind CSS 4** — Styling berbasis utility
- **Framer Motion / Motion** — Animasi transisi antar tampilan
- **Leaflet.js** — Peta interaktif geolokasi
- **Lucide React** — Ikon SVG
- **QRCode.React** — Generator kode QR untuk smart contract

### AI & ML
- **TensorFlow.js** — Inferensi model neural network di browser untuk grading kualitas tanaman
- **@google/genai** — Integrasi Gemini API untuk fitur analitik berbasis AI

### State Management
- **React Context API** — `AppContext` sebagai state global terpusat
- **localStorage** — Persistensi data sesi (panen, permintaan, bobot, blockchain)

### Backend (Opsional)
- **Express.js** — Server ringan untuk kebutuhan server-side Gemini API

---

## Struktur Proyek

```
sistem-pengurangan-food-loss/
├── src/
│   ├── App.tsx                    # Root komponen, layout utama
│   ├── main.tsx                   # Entry point React
│   ├── index.css                  # Stylesheet global
│   ├── types.ts                   # Definisi tipe TypeScript global
│   ├── components/
│   │   ├── Navbar.tsx             # Navigasi & switcher peran
│   │   ├── InteractiveMap.tsx     # Peta Leaflet geolokasi
│   │   ├── FarmerView.tsx         # Dashboard Petani
│   │   ├── BuyerView.tsx          # Dashboard Pembeli
│   │   ├── DinasView.tsx          # Dashboard Dinas Pertanian
│   │   ├── AdminView.tsx          # Dashboard Administrator
│   │   ├── BlockchainView.tsx     # Visualisasi blockchain ledger
│   │   └── TraceModal.tsx         # Modal traceabilitas produk
│   ├── context/
│   │   └── AppContext.tsx         # Global state, matching engine, simulator
│   └── utils/
│       ├── cvGrading.ts           # Grading kualitas dengan TensorFlow.js
│       ├── forecasting.ts         # Prediksi panen Holt's Exponential Smoothing
│       └── routeOptimizer.ts      # Optimasi rute VRP Nearest Neighbor
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── metadata.json
└── .env.example
```

---

## Peran Pengguna

Aplikasi memiliki 5 peran yang dapat dipilih melalui Navbar:

| Peran | Deskripsi |
|---|---|
| **PETANI** | Mendaftarkan laporan tanam, mengunggah foto untuk grading kualitas, menyetujui/menolak penawaran dari pembeli |
| **PEMBELI** | Merilis kebutuhan pasokan komoditas, melihat pencocokan terbaik, mengajukan permintaan kontrak ke petani |
| **DINAS** | Memantau statistik wilayah, melihat forecasting panen per komoditas, dan laporan optimasi rute logistik |
| **ADMIN** | Mengatur bobot algoritma pencocokan (lokasi/volume/harga), reset data, manajemen sistem |
| **BLOCKCHAIN** | Melihat seluruh riwayat transaksi dalam bentuk blok rantai yang dapat diaudit |

---

## Algoritma & Model

### 1. Matching Engine (Skor Tertimbang)
Setiap pasangan panen–permintaan dihitung skornya berdasarkan tiga dimensi:
- **Skor Lokasi** — Dihitung menggunakan formula Haversine; skor 100 jika ≤5 km, turun linear hingga 0 di 150 km
- **Skor Volume** — Rasio antara volume yang tersedia dan yang dibutuhkan
- **Skor Harga** — Perbandingan harga penawaran pembeli terhadap harga harapan petani

```
Total Score = (wLocation × lokasi) + (wVolume × volume) + (wPrice × harga)
Default: 40% lokasi | 30% volume | 30% harga
```

### 2. Forecasting — Holt's Double Exponential Smoothing
Memperkirakan volume panen per wilayah dan komoditas untuk 4 minggu ke depan, dengan:
- Faktor musiman bulanan (kemarau/hujan)
- Confidence interval 95% yang melebar seiring jangkauan waktu

### 3. Grading Kualitas — TensorFlow.js MLP
Model MLP 2-lapisan yang dilatih di browser:
- **Input**: 3 fitur visual (skor warna, keseragaman ukuran, bebas cacat) diekstrak dari analisis piksel gambar
- **Output**: Probabilitas Grade A / B / C

### 4. Optimasi Rute — VRP Nearest Neighbor
Algoritma greedy berbasis kapasitas kendaraan:
- Mengurutkan titik pengambilan berdasarkan jadwal panen
- Memilih titik terdekat yang masih muat di kapasitas kendaraan
- Menghitung total jarak termasuk kembali ke depot

---

## Instalasi & Menjalankan

### Prasyarat
- Node.js ≥ 18
- npm ≥ 9

### Langkah Instalasi

```bash
# 1. Clone atau ekstrak proyek
cd sistem-pengurangan-food-loss

# 2. Install dependensi
npm install

# 3. Salin dan isi variabel lingkungan
copy .env.example .env

# 4. Jalankan dev server
npm run dev
```

Aplikasi akan berjalan di `http://localhost:3000`.

### Build Produksi

```bash
npm run build
npm run preview
```

---

## Variabel Lingkungan

Salin `.env.example` menjadi `.env` dan isi nilai yang dibutuhkan:

```env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

API Key Gemini digunakan untuk fitur analitik berbasis AI pada sisi server. Tanpa API key, fitur AI berbasis cloud tidak akan berfungsi, namun fitur utama (matching, forecasting, grading lokal, blockchain) tetap berjalan sepenuhnya di browser.

---

## Lisensi

Proyek ini dilisensikan di bawah **Apache License 2.0**.  
Lihat berkas header kode sumber untuk detail lengkap.
