// ===================================================
// FILE: config.js - Konfigurasi Global
// ===================================================

// Gunakan var untuk variabel global
var API_BASE = "/api";
var POSTS_PER_PAGE = 5;
var MAX_RECONNECT_ATTEMPTS = 5;
var HEARTBEAT_INTERVAL = 120000; // 2 menit
var TYPING_TIMEOUT = 3000; // 3 detik

// Warna untuk badge sekolah
var SCHOOL_COLORS = {
  sdit_sahabat: "bg-blue-100 text-blue-800",
  pptq_almadinah: "bg-green-100 text-green-800",
  ppqit_almahir: "bg-purple-100 text-purple-800"
};

// Nama sekolah
var SCHOOL_NAMES = {
  sdit_sahabat: "SDIT Sahabat",
  pptq_almadinah: "PPTQ Al-Madinah",
  ppqit_almahir: "PPQIT Al-Mahir"
};

// Data sekolah lengkap untuk info
const SCHOOLS_DATA = {
  sdit_sahabat: {
    nama: "SDIT Sahabat",
    namaLengkap: "Sekolah Dasar Islam Terpadu Sahabat",
    lokasi: "Karanganyar, Jawa Tengah",
    tahun: "Didirikan 2005",
    siswa: "350+ Siswa",
    alumni: "500+ Alumni",
    desc: "Sekolah Dasar Islam Terpadu yang mencetak generasi qurani dan berprestasi.",
    visi: "Mencetak generasi islami yang berakhlak mulia, cerdas, dan berprestasi.",
    misi: [
      "Mendidik dengan pendekatan islami",
      "Mengembangkan potensi akademik dan non-akademik",
      "Membiasakan ibadah dan akhlak mulia",
    ],
    fasilitas: [
      "Lab Komputer",
      "Perpustakaan",
      "Lapangan Olahraga",
      "Mushola",
      "Kelas Ber-AC",
    ],
    img: "/images/sahabat.png",
    bgColor: "from-blue-500 to-blue-700",
    lightBg: "bg-blue-50",
    accentColor: "blue",
    icon: "🏫",
  },
  pptq_almadinah: {
    nama: "PPTQ Al-Madinah",
    namaLengkap: "Pondok Pesantren Tahfidz Quran Al-Madinah",
    lokasi: "Solo (Tengah Sawah), Jawa Tengah",
    tahun: "Didirikan 2010",
    siswa: "200+ Santri",
    alumni: "300+ Hafidz",
    desc: "Pondok Pesantren Tahfidz Quran di tengah sawah.",
    visi: "Mencetak generasi hafidz quran yang berakhlak karimah.",
    misi: [
      "Tahfidz Quran 30 juz",
      "Pendalaman ilmu tajwid",
      "Pembinaan akhlak",
    ],
    fasilitas: [
      "Asrama Putra/Putri",
      "Masjid",
      "Ruang Tahfidz",
      "Perpustakaan Islam",
    ],
    img: "/images/almadinah.png",
    bgColor: "from-green-600 to-green-800",
    lightBg: "bg-green-50",
    accentColor: "green",
    icon: "🕌",
  },
  ppqit_almahir: {
    nama: "PPQIT Al-Mahir",
    namaLengkap: "Pondok Pesantren Quran dan IT Al-Mahir",
    lokasi: "Pondok Quran & IT, Jawa Tengah",
    tahun: "Didirikan 2018",
    siswa: "150+ Santri",
    alumni: "100+ Developer",
    desc: "Perpaduan hafalan Quran dan kemampuan IT.",
    visi: "Mencetak generasi muslim yang ahli teknologi dan hafal Al-Quran.",
    misi: [
      "Tahfidz Quran",
      "Pembelajaran programming",
      "Kewirausahaan digital",
    ],
    fasilitas: ["Lab Komputer", "Studio Podcast", "Asrama", "Masjid"],
    img: "/images/almahir.png",
    bgColor: "from-purple-600 to-purple-800",
    lightBg: "bg-purple-50",
    accentColor: "purple",
    icon: "💻",
  },
};

// Export ke window
window.API_BASE = API_BASE;
window.POSTS_PER_PAGE = POSTS_PER_PAGE;
window.SCHOOL_COLORS = SCHOOL_COLORS;
window.SCHOOL_NAMES = SCHOOL_NAMES;