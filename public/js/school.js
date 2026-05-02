// ===================================================
// FILE: school.js - Fungsi Terkait Info Sekolah
// ===================================================

// ========== LOAD SCHOOL INFO ==========
async function loadSchoolInfo() {
  const schoolInfo = document.getElementById("schoolInfo");
  if (!schoolInfo) return;
  
  const sekolah = SCHOOLS_DATA[currentUser?.asalSekolah] || SCHOOLS_DATA.sdit_sahabat;

  schoolInfo.innerHTML = `
    <!-- Header -->
    <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r ${sekolah.bgColor} text-white p-8 mb-6">
      <div class="absolute inset-0 opacity-10" style="background-image: url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M30 5L55 30L30 55L5 30L30 5z\' fill=\'%23ffffff\' fill-opacity=\'0.1\'/%3E%3C/svg%3E');"></div>
      <div class="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full"></div>
      <div class="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full"></div>
      
      <div class="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div class="w-32 h-32 bg-white/10 backdrop-blur-lg rounded-2xl flex items-center justify-center border-2 border-white/20">
          <span class="text-5xl">${sekolah.icon}</span>
        </div>
        <div class="text-center md:text-left">
          <h2 class="text-3xl md:text-4xl font-bold mb-2">${sekolah.nama}</h2>
          <p class="text-xl text-white/90 mb-1">${sekolah.namaLengkap}</p>
          <p class="text-white/80 flex items-center justify-center md:justify-start gap-2">
            <i class="fas fa-map-marker-alt"></i>
            <span>${sekolah.lokasi}</span>
          </p>
        </div>
      </div>
    </div>

    <!-- Statistik Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      <div class="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 border-l-4 border-${sekolah.accentColor}-500">
        <div class="w-12 h-12 ${sekolah.lightBg} rounded-full flex items-center justify-center">
          <i class="fas fa-calendar-alt text-${sekolah.accentColor}-600 text-xl"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Tahun Berdiri</p>
          <p class="font-bold text-gray-800">${sekolah.tahun}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 border-l-4 border-${sekolah.accentColor}-500">
        <div class="w-12 h-12 ${sekolah.lightBg} rounded-full flex items-center justify-center">
          <i class="fas fa-users text-${sekolah.accentColor}-600 text-xl"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Siswa/Santri</p>
          <p class="font-bold text-gray-800">${sekolah.siswa}</p>
        </div>
      </div>
      <div class="bg-white rounded-xl shadow-md p-4 flex items-center gap-4 border-l-4 border-${sekolah.accentColor}-500">
        <div class="w-12 h-12 ${sekolah.lightBg} rounded-full flex items-center justify-center">
          <i class="fas fa-graduation-cap text-${sekolah.accentColor}-600 text-xl"></i>
        </div>
        <div>
          <p class="text-sm text-gray-500">Alumni</p>
          <p class="font-bold text-gray-800">${sekolah.alumni}</p>
        </div>
      </div>
    </div>

    <!-- Main Content -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Left Column -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-info-circle text-${sekolah.accentColor}-500"></i>
            Tentang ${sekolah.nama}
          </h3>
          <p class="text-gray-700 leading-relaxed">${sekolah.desc}</p>
        </div>
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-building text-${sekolah.accentColor}-500"></i>
            Fasilitas
          </h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${sekolah.fasilitas
              .map(
                (f) => `
              <div class="flex items-center gap-3 p-2 ${sekolah.lightBg} rounded-lg">
                <div class="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <i class="fas fa-check text-${sekolah.accentColor}-500 text-sm"></i>
                </div>
                <span class="text-gray-700">${f}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </div>

      <!-- Right Column -->
      <div class="space-y-6">
        <div class="bg-white rounded-xl shadow-md p-6">
          <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <i class="fas fa-eye text-${sekolah.accentColor}-500"></i>
            Visi & Misi
          </h3>
          <div class="mb-6 p-4 bg-gradient-to-r ${sekolah.bgColor} text-white rounded-xl">
            <p class="font-semibold mb-2">✨ Visi:</p>
            <p class="italic">"${sekolah.visi}"</p>
          </div>
          <div>
            <p class="font-semibold text-${sekolah.accentColor}-600 mb-3">📋 Misi:</p>
            <ul class="space-y-3">
              ${sekolah.misi
                .map(
                  (m, index) => `
                <li class="flex items-start gap-3 p-2 ${sekolah.lightBg} rounded-lg">
                  <span class="w-6 h-6 bg-${sekolah.accentColor}-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                    ${index + 1}
                  </span>
                  <span class="text-gray-700">${m}</span>
                </li>
              `,
                )
                .join("")}
            </ul>
          </div>
        </div>
        <div class="bg-gradient-to-r ${sekolah.bgColor} rounded-xl shadow-md p-6 text-white">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <i class="fas fa-star text-2xl"></i>
            </div>
            <div>
              <h3 class="text-xl font-bold">Komunitas Alumni</h3>
              <p class="text-white/80">${sekolah.alumni} tersebar di berbagai bidang</p>
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">👨‍🎓</div><div class="text-xs">Pendidik</div></div>
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">👨‍💻</div><div class="text-xs">Developer</div></div>
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">👨‍⚕️</div><div class="text-xs">Dokter</div></div>
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">👨‍🏫</div><div class="text-xs">Guru</div></div>
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">👨‍💼</div><div class="text-xs">Wirausaha</div></div>
            <div class="bg-white/10 rounded-lg p-2"><div class="text-xl font-bold">➕</div><div class="text-xs">Lainnya</div></div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ========== SETUP FILTER UI ==========
function setupFilterUI() {
  const filterContainer = document.getElementById("filterContainer");
  if (!filterContainer) return;

  // Tampilkan semua filter untuk semua user (jangan batasi hanya admin)
  filterContainer.innerHTML = `
    <button onclick="window.filterPosts('all')" 
            class="filter-btn px-4 py-2 bg-emerald-600 text-white rounded-lg">
        Semua
    </button>
    <button onclick="window.filterPosts('sdit_sahabat')" 
            class="filter-btn px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
        SDIT Sahabat
    </button>
    <button onclick="window.filterPosts('pptq_almadinah')" 
            class="filter-btn px-4 py-2 bg-green-100 text-green-800 rounded-lg">
        PPTQ Al-Madinah
    </button>
    <button onclick="window.filterPosts('ppqit_almahir')" 
            class="filter-btn px-4 py-2 bg-purple-100 text-purple-800 rounded-lg">
        PPQIT Al-Mahir
    </button>
  `;
}

// Export functions
window.loadSchoolInfo = loadSchoolInfo;
window.setupFilterUI = setupFilterUI;