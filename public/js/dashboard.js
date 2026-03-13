const API_BASE = "/api";
let currentUser = null;
let currentFilter = "all";
let isAdmin = false;
let userLikes = new Set();

// Pagination variables
let currentPage = 1;
let postsPerPage = 5;
let totalPosts = 0;
let allPosts = [];

// Selected post for detail view
let selectedPostId = null;
let viewingProfile = false;
let viewedUserId = null;
let commentsData = {};

// Comments visibility state
let commentsVisible = {};
let notifications = [];
let unreadCount = 0;
let notificationInterval = null;

let searchQuery = "";
let selectedUser = "";
let selectedSort = "newest";
let allUsers = []; // Untuk dropdown filter user
let filteredPosts = [];

// Cek session
(function checkSession() {
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("userToken");

  console.log("Checking session...", {
    savedUser: !!savedUser,
    token: !!token,
  });

  if (!savedUser || !token) {
    console.log("No session found, redirecting to auth...");
    window.location.href = "/login.html";
    return;
  }

  try {
    currentUser = JSON.parse(savedUser);
    isAdmin = currentUser.role === "admin" || currentUser.isAdmin === true;
    console.log("User loaded:", currentUser.namaLengkap, "isAdmin:", isAdmin);

    loadUserLikes();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDashboard);
    } else {
      initDashboard();
    }
  } catch (e) {
    console.error("Error parsing user:", e);
    logout();
  }
})();

// Load user's liked posts dari localStorage
function loadUserLikes() {
  try {
    const savedLikes = localStorage.getItem(`userLikes_${currentUser.id}`);
    if (savedLikes) {
      userLikes = new Set(JSON.parse(savedLikes));
      console.log("Loaded user likes:", Array.from(userLikes));
    }
  } catch (e) {
    console.error("Error loading user likes:", e);
    userLikes = new Set();
  }
}

// Save user's liked posts ke localStorage
function saveUserLikes() {
  try {
    localStorage.setItem(
      `userLikes_${currentUser.id}`,
      JSON.stringify(Array.from(userLikes)),
    );
  } catch (e) {
    console.error("Error saving user likes:", e);
  }
}

// Di initDashboard, comment dulu startHeartbeat()
function initDashboard() {
  console.log("Initializing dashboard...");

  document.getElementById("userNameDisplay").textContent =
    currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = currentUser.namaLengkap;

  setupSearchAndFilters();

  // NONAKTIFKAN DULU HEARTBEAT
  // startHeartbeat();

  Promise.all([
    loadSchoolInfo(),
    loadAllPosts(),
    loadLeaderboard(),
    loadNotifications(),
  ])
    .then(() => {
      document.getElementById("loadingState").classList.add("hidden");
      document.getElementById("mainContent").classList.remove("hidden");
      document.getElementById("userInfo").classList.remove("hidden");
      console.log("Dashboard ready");
    })
    .catch((error) => {
      console.error("Error loading dashboard:", error);
      showError("Gagal memuat data");
    });

  document
    .getElementById("leaderboardFilter")
    .addEventListener("change", loadLeaderboard);
}

// Show error state
function showError(message) {
  document.getElementById("loadingState").classList.add("hidden");
  document.getElementById("errorState").classList.remove("hidden");
  document.getElementById("errorMessage").textContent = message;
}

// Setup Filter UI berdasarkan role
function setupFilterUI() {
  const filterContainer = document.getElementById("filterContainer");
  if (!filterContainer) return;

  if (!isAdmin) {
    filterContainer.innerHTML = `
            <button onclick="filterPosts('${currentUser.asalSekolah}')" 
                    class="filter-btn px-4 py-2 bg-emerald-600 text-white rounded-lg">
                ${getSchoolName(currentUser.asalSekolah)}
            </button>
        `;

    const leaderboardFilter = document.getElementById("leaderboardFilter");
    if (leaderboardFilter) {
      leaderboardFilter.innerHTML = `
                <option value="${currentUser.asalSekolah}">${getSchoolName(currentUser.asalSekolah)}</option>
            `;
      leaderboardFilter.disabled = true;
    }
  }
}

// Load School Info
async function loadSchoolInfo() {
  const schoolInfo = document.getElementById("schoolInfo");
  const schools = {
    sdit_sahabat: {
      nama: "SDIT Sahabat",
      namaLengkap: "Sekolah Dasar Islam Terpadu Sahabat",
      lokasi: "Karanganyar, Jawa Tengah",
      tahun: "Didirikan 2005",
      siswa: "350+ Siswa",
      alumni: "500+ Alumni",
      desc: "Sekolah Dasar Islam Terpadu yang mencetak generasi qurani dan berprestasi. Berkomitmen mendidik anak-anak dengan nilai-nilai Islam dan ilmu pengetahuan modern.",
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
      desc: "Pondok Pesantren Tahfidz Quran yang berada di tengah sawah, fokus pada hafalan Al-Quran dan pembentukan karakter islami. Suasana asri dan kondusif untuk menghafal.",
      visi: "Mencetak generasi hafidz quran yang berakhlak karimah dan bermanfaat bagi umat.",
      misi: [
        "Tahfidz Quran 30 juz",
        "Pendalaman ilmu tajwid",
        "Pembinaan akhlak dan karakter",
        "Penguasaan bahasa Arab",
      ],
      fasilitas: [
        "Asrama Putra/Putri",
        "Masjid",
        "Ruang Tahfidz",
        "Perpustakaan Islam",
        "Lahan Pertanian",
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
      desc: "Perpaduan hafalan Quran dan kemampuan IT, mencetak developer muslim yang ahli dalam teknologi dan hafal Al-Quran. Program unggulan coding dan tahfidz.",
      visi: "Mencetak generasi muslim yang ahli teknologi dan hafal Al-Quran.",
      misi: [
        "Tahfidz Quran 15 juz minimal",
        "Pembelajaran programming (Web, Mobile)",
        "Pengembangan soft skill",
        "Kewirausahaan digital",
      ],
      fasilitas: [
        "Lab Komputer",
        "Studio Podcast",
        "Asrama",
        "Masjid",
        "Ruang Server",
      ],
      img: "/images/almahir.png",
      bgColor: "from-purple-600 to-purple-800",
      lightBg: "bg-purple-50",
      accentColor: "purple",
      icon: "💻",
    },
  };

  const sekolah = schools[currentUser?.asalSekolah] || schools.sdit_sahabat;

  schoolInfo.innerHTML = `
        <!-- Header dengan Background Gradient -->
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

        <!-- Main Content Grid - 2 Kolom -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Left Column - Deskripsi -->
            <div class="space-y-6">
                <!-- Deskripsi -->
                <div class="bg-white rounded-xl shadow-md p-6">
                    <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <i class="fas fa-info-circle text-${sekolah.accentColor}-500"></i>
                        Tentang ${sekolah.nama}
                    </h3>
                    <p class="text-gray-700 leading-relaxed">${sekolah.desc}</p>
                </div>

                <!-- Fasilitas -->
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

            <!-- Right Column - Visi Misi -->
            <div class="space-y-6">
                <!-- Visi Misi -->
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

                <!-- Info Komunitas Alumni -->
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
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">👨‍🎓</div>
                            <div class="text-xs">Pendidik</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">👨‍💻</div>
                            <div class="text-xs">Developer</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">👨‍⚕️</div>
                            <div class="text-xs">Dokter</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">👨‍🏫</div>
                            <div class="text-xs">Guru</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">👨‍💼</div>
                            <div class="text-xs">Wirausaha</div>
                        </div>
                        <div class="bg-white/10 rounded-lg p-2">
                            <div class="text-xl font-bold">➕</div>
                            <div class="text-xs">Lainnya</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Perbaiki fungsi loadAllPosts
async function loadAllPosts() {
  try {
    let filterParam = "";
    if (!isAdmin) {
      filterParam = `sekolah=${currentUser.asalSekolah}`;
    } else {
      filterParam = currentFilter !== "all" ? `sekolah=${currentFilter}` : "";
    }

    const url = filterParam
      ? `${API_BASE}/posts?${filterParam}&page=${currentPage}&limit=${postsPerPage}`
      : `${API_BASE}/posts?page=${currentPage}&limit=${postsPerPage}`;
    console.log("Loading posts from:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const result = await response.json();

    // PASTIKAN FORMATNYA BENAR
    if (result.data && Array.isArray(result.data)) {
      allPosts = result.data;
      totalPosts = result.pagination?.total || 0;
    } else if (Array.isArray(result)) {
      // Fallback jika response berupa array langsung
      allPosts = result;
      totalPosts = result.length;
    } else {
      console.error("Unexpected response format:", result);
      allPosts = [];
      totalPosts = 0;
    }

    console.log("Posts loaded:", allPosts.length, "posts");

    renderPosts();
    renderPagination();
  } catch (error) {
    console.error("Error loading posts:", error);
    document.getElementById("postsList").innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Gagal memuat postingan</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
  }
}

// Render posts for current page
function renderPosts() {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const currentPosts = allPosts.slice(startIndex, endIndex);

  const postsList = document.getElementById("postsList");

  if (currentPosts.length === 0) {
    postsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl">
                <i class="fas fa-newspaper text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">Belum ada cerita. Jadilah yang pertama!</p>
            </div>
        `;
  } else {
    postsList.innerHTML = currentPosts
      .map((post) => {
        const isLiked = userLikes.has(post.id);
        const isSelected = selectedPostId === post.id;

        return `
                <div class="bg-white rounded-xl shadow p-6 post-card ${isSelected ? "selected" : ""}" 
                     data-post-id="${post.id}" 
                     onclick="selectPost(${post.id})">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-3">
                            <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                                 class="w-10 h-10 rounded-full object-cover" 
                                 onerror="this.src='/images/default-avatar.png'">
                            <div>
                                <h3 class="font-semibold text-gray-800">${post.user?.namaLengkap || "Unknown"}</h3>
                                <p class="text-xs text-gray-500">${post.user?.title || "Alumni"} • ${formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                    </div>
                    <h4 class="font-bold text-xl mt-4">${post.judul}</h4>
                    <p class="text-gray-600 mt-2">${post.konten.substring(0, 150)}${post.konten.length > 150 ? "..." : ""}</p>
                    ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-64 object-cover">` : ""}
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <div class="flex items-center space-x-4">
                            <button onclick="event.stopPropagation(); handleLike(${post.id})" 
                                    class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}" 
                                    data-post-id="${post.id}">
                                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                                <span class="like-count">${post.likeCount || 0}</span>
                            </button>
                            <span class="flex items-center text-gray-500">
                                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// Render pagination
// ========== UPDATE PAGINATION ==========
function renderPagination() {
  const totalPages = Math.ceil(totalPosts / postsPerPage);
  const paginationContainer = document.getElementById("paginationContainer");

  if (totalPages <= 1) {
    paginationContainer.innerHTML = "";
    return;
  }

  let paginationHTML = `
        <button onclick="changePage(${currentPage - 1})" 
                class="px-3 py-1 rounded-lg border ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}"
                ${currentPage === 1 ? "disabled" : ""}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

  // Show first page
  if (currentPage > 3) {
    paginationHTML += `
            <button onclick="changePage(1)" class="px-3 py-1 rounded-lg border hover:bg-gray-100 pagination-item">1</button>
            <span class="px-2">...</span>
        `;
  }

  // Show pages around current page
  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    paginationHTML += `
            <button onclick="changePage(${i})" 
                    class="px-3 py-1 rounded-lg border pagination-item ${i === currentPage ? "active" : "hover:bg-gray-100"}">
                ${i}
            </button>
        `;
  }

  // Show last page
  if (currentPage < totalPages - 2) {
    paginationHTML += `
            <span class="px-2">...</span>
            <button onclick="changePage(${totalPages})" class="px-3 py-1 rounded-lg border hover:bg-gray-100 pagination-item">${totalPages}</button>
        `;
  }

  paginationHTML += `
        <button onclick="changePage(${currentPage + 1})" 
                class="px-3 py-1 rounded-lg border ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}"
                ${currentPage === totalPages ? "disabled" : ""}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

  paginationContainer.innerHTML = paginationHTML;
}

// ========== CHANGE PAGE ==========
function changePage(newPage) {
  const totalPages = Math.ceil(totalPosts / postsPerPage);

  if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
    return;
  }

  currentPage = newPage;
  renderFilteredPosts();
  renderPagination();
  window.scrollTo({
    top: document.getElementById("postsList").offsetTop - 100,
    behavior: "smooth",
  });
}

// Select post for detail view
// ========== SELECT POST ==========
async function selectPost(postId) {
  selectedPostId = postId;
  renderFilteredPosts(); // Re-render to update selected class

  // Track view untuk user ini
  try {
    const viewResponse = await fetch(`${API_BASE}/posts/${postId}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    if (viewResponse.ok) {
      const viewData = await viewResponse.json();

      // Update view count di allPosts
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].viewCount = viewData.viewCount;
      }

      // Render ulang posts list untuk update view count
      renderFilteredPosts();
    }
  } catch (error) {
    console.error("Error tracking view:", error);
  }

  // Render post detail
  await renderPostDetail(postId);
}

// Toggle comments visibility
function toggleComments(postId) {
  commentsVisible[postId] = !commentsVisible[postId];
  // Re-render post detail dengan status comments yang baru
  renderPostDetail(postId);
}

// Load comments for a post
async function loadComments(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`);
    if (!response.ok) throw new Error("Failed to load comments");

    return await response.json();
  } catch (error) {
    console.error("Error loading comments:", error);
    return [];
  }
}

// Add comment
async function addComment(postId) {
  const input = document.getElementById("newCommentInput");
  const commentText = input.value.trim();

  if (!commentText) return;

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({
        userId: currentUser.id,
        text: commentText,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Gagal menambahkan komentar");
      return;
    }

    // Clear input
    input.value = "";

    // Refresh comments
    await renderPostDetail(postId);
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Terjadi kesalahan");
  }
}

// Render post detail in sidebar (dengan komentar collapsible)
// ========== RENDER POST DETAIL ==========
async function renderPostDetail(postId) {
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;

  const isLiked = userLikes.has(post.id);
  const showComments = commentsVisible[postId] || false;

  // Load comments from database
  const comments = await loadComments(postId);
  const commentCount = comments.length;

  const detailContent = document.getElementById("postDetailContent");

  detailContent.innerHTML = `
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-start gap-3 pb-4 border-b">
                <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                     class="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                     onclick="goToProfile(${post.user?.id})"
                     onerror="this.src='/images/default-avatar.png'">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                        onclick="goToProfile(${post.user?.id})">
                        ${post.user?.namaLengkap || "Unknown"}
                    </h3>
                    <p class="text-xs text-gray-500">${post.user?.title || "Alumni"}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="px-2 py-0.5 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatDate(post.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Title -->
            <h2 class="text-xl font-bold text-gray-800">${post.judul}</h2>
            
            <!-- Full Content -->
            <div class="text-gray-700 leading-relaxed whitespace-pre-line">
                ${post.konten}
            </div>
            
            ${
              post.gambar
                ? `
                <div class="mt-4">
                    <img src="${post.gambar}" class="w-full rounded-lg max-h-96 object-cover">
                </div>
            `
                : ""
            }
            
            <!-- Stats bar -->
            <div class="flex items-center justify-between py-3 border-y">
                <div class="flex items-center space-x-4">
                    <button onclick="handleLike(${post.id})" 
                            class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
                        <i class="fas fa-heart text-xl ${isLiked ? "text-red-500" : ""}"></i>
                        <span class="font-semibold like-count">${post.likeCount || 0}</span>
                    </button>
                    
                    <span class="flex items-center text-gray-500">
                        <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                    </span>
                </div>
                
                <!-- Comments Toggle Button -->
                <button onclick="toggleComments(${post.id})" 
                        class="flex items-center space-x-2 text-gray-500 hover:text-emerald-600 transition">
                    <i class="fas fa-comments mr-1"></i>
                    <span>${commentCount} Komentar</span>
                    <i class="fas ${showComments ? "fa-chevron-up" : "fa-chevron-down"} ml-1"></i>
                </button>
            </div>
            
            <!-- Comment Section (Collapsible) -->
            ${
              showComments
                ? `
                <div class="space-y-4 mt-4">
                    <!-- Comment Input -->
                    <div class="flex gap-2">
                        <img src="${currentUser.fotoProfil || "/images/default-avatar.png"}" 
                             class="w-8 h-8 rounded-full object-cover flex-shrink-0">
                        <div class="flex-1 flex gap-2">
                            <input type="text" id="newCommentInput" 
                                   placeholder="Tulis komentar..." 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                            <button onclick="addComment(${post.id})" 
                                    class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Comments List -->
                    <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
                        ${
                          commentCount === 0
                            ? `
                            <p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>
                        `
                            : comments
                                .map(
                                  (comment) => `
                            <div class="flex gap-2 comment-item p-2 rounded-lg">
                                <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                                     onclick="goToProfile(${comment.user?.id})">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-sm cursor-pointer hover:text-emerald-600"
                                              onclick="goToProfile(${comment.user?.id})">
                                            ${comment.user?.namaLengkap || "Unknown"}
                                        </span>
                                        <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
                                    </div>
                                    <p class="text-sm text-gray-700">${comment.text}</p>
                                </div>
                            </div>
                        `,
                                )
                                .join("")
                        }
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

// Load Leaderboard
async function loadLeaderboard() {
  try {
    let filter = "all";
    if (!isAdmin) {
      filter = currentUser.asalSekolah;
    } else {
      filter = document.getElementById("leaderboardFilter")?.value || "all";
    }

    const response = await fetch(
      `${API_BASE}/users/leaderboard?sekolah=${filter}`,
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const users = await response.json();
    const leaderboardList = document.getElementById("leaderboardList");

    if (!users || users.length === 0) {
      leaderboardList.innerHTML =
        '<p class="text-gray-500 text-center py-4 col-span-5">Belum ada data</p>';
    } else {
      leaderboardList.innerHTML = users
        .slice(0, 10)
        .map((user, index) => {
          let medalIcon = "";
          let medalColor = "";

          if (index === 0) {
            medalIcon = "🥇";
            medalColor = "bg-yellow-100 border-yellow-500";
          } else if (index === 1) {
            medalIcon = "🥈";
            medalColor = "bg-gray-100 border-gray-400";
          } else if (index === 2) {
            medalIcon = "🥉";
            medalColor = "bg-amber-100 border-amber-600";
          } else {
            medalColor = "bg-gray-50 border-gray-200";
          }

          return `
                    <div class="leaderboard-item flex flex-col items-center p-3 ${medalColor} rounded-lg border-2 text-center">
                        <div class="text-2xl mb-1">${medalIcon || "#" + (index + 1)}</div>
                        <img src="${user.fotoProfil || "/images/default-avatar.png"}" 
                             class="w-12 h-12 rounded-full object-cover border-2 ${index === 0 ? "border-yellow-500" : index === 1 ? "border-gray-400" : index === 2 ? "border-amber-600" : "border-gray-200"}"
                             onerror="this.src='/images/default-avatar.png'">
                        <p class="font-medium text-sm mt-2 truncate max-w-full">${user.namaLengkap || "Unknown"}</p>
                        <p class="text-xs text-gray-500">${user.title || "Alumni"}</p>
                        <p class="font-bold text-sm mt-1 ${index < 3 ? "text-emerald-600" : "text-gray-600"}">
                            ${user.totalLikes || 0} <span class="text-[10px]">likes</span>
                        </p>
                    </div>
                `;
        })
        .join("");
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    document.getElementById("leaderboardList").innerHTML =
      '<p class="text-red-500 text-center py-4 col-span-5">Gagal memuat leaderboard</p>';
  }
}

// Filter Posts
function filterPosts(sekolah) {
  if (!isAdmin && sekolah !== currentUser.asalSekolah) return;

  currentFilter = sekolah;

  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("bg-emerald-600", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-700");
  });

  event.target.classList.remove("bg-gray-100", "text-gray-700");
  event.target.classList.add("bg-emerald-600", "text-white");

  loadAllPosts(); // Reload posts with new filter
}

// Fungsi helper untuk mencari elemen post
function findPostElements(postId) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`);
  if (!postElement) {
    console.warn(`Post element not found for ID: ${postId}`);
    return null;
  }

  const likeButton = postElement.querySelector(".like-button");
  const likeIcon = likeButton?.querySelector("i");
  const likeCountSpan = likeButton?.querySelector(".like-count");

  return { postElement, likeButton, likeIcon, likeCountSpan };
}

// Handle like with optimistic update
async function handleLike(postId) {
  if (!currentUser) {
    alert("Silakan login terlebih dahulu");
    return;
  }

  const elements = findPostElements(postId);
  if (!elements || !elements.likeButton) {
    console.error("Could not find like elements for post:", postId);
    return;
  }

  if (!likeButton) {
    console.error("Like button not found for post:", postId);
    return;
  }

  const { likeButton, likeIcon, likeCountSpan } = elements;

  // Optimistic update
  const isCurrentlyLiked = userLikes.has(postId);
  const currentCount = parseInt(likeCountSpan.textContent);
  const newCount = isCurrentlyLiked ? currentCount - 1 : currentCount + 1;

  console.log("Optimistic update:", {
    postId,
    isCurrentlyLiked,
    currentCount,
    newCount,
  });

  // Update UI langsung
  if (isCurrentlyLiked) {
    userLikes.delete(postId);
    likeButton.classList.remove("text-red-500");
    likeButton.classList.add("text-gray-500", "hover:text-red-500");
    if (likeIcon) likeIcon.classList.remove("text-red-500");
    likeCountSpan.textContent = newCount;
  } else {
    userLikes.add(postId);
    likeButton.classList.remove("text-gray-500", "hover:text-red-500");
    likeButton.classList.add("text-red-500");
    if (likeIcon) likeIcon.classList.add("text-red-500");
    likeCountSpan.textContent = newCount;
  }

  saveUserLikes();

  try {
    console.log("Sending like request to server...");

    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    const responseData = await res.json();
    console.log("Server response:", responseData);

    if (!res.ok) {
      // Rollback on error
      console.error("Server error:", responseData);

      if (isCurrentlyLiked) {
        userLikes.add(postId);
        likeButton.classList.remove("text-gray-500", "hover:text-red-500");
        likeButton.classList.add("text-red-500");
        if (likeIcon) likeIcon.classList.add("text-red-500");
        likeCountSpan.textContent = currentCount;
      } else {
        userLikes.delete(postId);
        likeButton.classList.remove("text-red-500");
        likeButton.classList.add("text-gray-500", "hover:text-red-500");
        if (likeIcon) likeIcon.classList.remove("text-red-500");
        likeCountSpan.textContent = currentCount;
      }
      saveUserLikes();

      alert(responseData.error || "Gagal like postingan");
    } else {
      // Update dengan data terbaru dari server
      if (responseData.likeCount !== undefined) {
        likeCountSpan.textContent = responseData.likeCount;
      }

      // Update post in allPosts array
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].likeCount = responseData.likeCount || newCount;
      }

      // If this post is currently selected, update detail view
      if (selectedPostId === postId) {
        const selectedPost = allPosts.find((p) => p.id === postId);
        if (selectedPost) {
          renderPostDetail(postId);
        }
      }

      console.log("Like successful:", responseData.action);
    }
  } catch (error) {
    console.error("Error in like request:", error);

    // Rollback
    if (isCurrentlyLiked) {
      userLikes.add(postId);
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      likeButton.classList.add("text-red-500");
      if (likeIcon) likeIcon.classList.add("text-red-500");
      likeCountSpan.textContent = currentCount;
    } else {
      userLikes.delete(postId);
      likeButton.classList.remove("text-red-500");
      likeButton.classList.add("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.remove("text-red-500");
      likeCountSpan.textContent = currentCount;
    }
    saveUserLikes();
    alert("Terjadi kesalahan koneksi");
  }

  // Refresh leaderboard
  await loadLeaderboard();
}

// Toggle between post detail and profile view
function showPostDetail(postId) {
  viewingProfile = false;
  viewedUserId = null;
  selectPost(postId);
}

function showUserProfile(userId) {
  window.location.href = `/profile.html?id=${userId}`;
}

// Update renderPosts function untuk navigasi ke profile
function renderPosts() {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const currentPosts = allPosts.slice(startIndex, endIndex);

  const postsList = document.getElementById("postsList");

  if (currentPosts.length === 0) {
    postsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl">
                <i class="fas fa-newspaper text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">Belum ada cerita. Jadilah yang pertama!</p>
            </div>
        `;
  } else {
    postsList.innerHTML = currentPosts
      .map((post) => {
        const isLiked = userLikes.has(post.id);
        const isSelected = selectedPostId === post.id;

        return `
                <div class="bg-white rounded-xl shadow p-6 post-card ${isSelected ? "selected" : ""}" 
                     data-post-id="${post.id}">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-3">
                            <!-- Profile image yang bisa diklik - pindah ke halaman profile -->
                            <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                                 class="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                                 onclick="event.stopPropagation(); goToProfile(${post.user?.id})"
                                 onerror="this.src='/images/default-avatar.png'">
                            <div>
                                <!-- Nama user yang bisa diklik - pindah ke halaman profile -->
                                <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                                    onclick="event.stopPropagation(); goToProfile(${post.user?.id})">
                                    ${post.user?.namaLengkap || "Unknown"}
                                </h3>
                                <p class="text-xs text-gray-500">${post.user?.title || "Alumni"} • ${formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                    </div>
                    <!-- Konten post (tetap bisa diklik untuk detail post) -->
                    <div onclick="selectPost(${post.id})">
                        <h4 class="font-bold text-xl mt-4">${post.judul}</h4>
                        <p class="text-gray-600 mt-2">${post.konten.substring(0, 150)}${post.konten.length > 150 ? "..." : ""}</p>
                        ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-64 object-cover">` : ""}
                    </div>
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <div class="flex items-center space-x-4">
                            <button onclick="event.stopPropagation(); handleLike(${post.id})" 
                                    class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}" 
                                    data-post-id="${post.id}">
                                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                                <span class="like-count">${post.likeCount || 0}</span>
                            </button>
                            <span class="flex items-center text-gray-500">
                                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// Update renderPostDetail untuk navigasi ke profile
async function renderPostDetail(postId) {
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;

  const isLiked = userLikes.has(post.id);
  const showComments = commentsVisible[postId] || false;

  // Load comments from database
  const comments = await loadComments(postId);
  const commentCount = comments.length;

  const detailContent = document.getElementById("postDetailContent");

  detailContent.innerHTML = `
        <div class="space-y-4">
            <!-- Header dengan profile yang bisa diklik - pindah ke halaman profile -->
            <div class="flex items-start gap-3 pb-4 border-b">
                <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                     class="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                     onclick="goToProfile(${post.user?.id})"
                     onerror="this.src='/images/default-avatar.png'">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                        onclick="goToProfile(${post.user?.id})">
                        ${post.user?.namaLengkap || "Unknown"}
                    </h3>
                    <p class="text-xs text-gray-500">${post.user?.title || "Alumni"}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="px-2 py-0.5 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatDate(post.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Title -->
            <h2 class="text-xl font-bold text-gray-800">${post.judul}</h2>
            
            <!-- Full Content -->
            <div class="text-gray-700 leading-relaxed whitespace-pre-line">
                ${post.konten}
            </div>
            
            ${
              post.gambar
                ? `
                <div class="mt-4">
                    <img src="${post.gambar}" class="w-full rounded-lg max-h-96 object-cover">
                </div>
            `
                : ""
            }
            
            <!-- Stats bar -->
            <div class="flex items-center justify-between py-3 border-y">
                <div class="flex items-center space-x-4">
                    <button onclick="handleLike(${post.id})" 
                            class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
                        <i class="fas fa-heart text-xl ${isLiked ? "text-red-500" : ""}"></i>
                        <span class="font-semibold like-count">${post.likeCount || 0}</span>
                    </button>
                    
                    <span class="flex items-center text-gray-500">
                        <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                    </span>
                </div>
                
                <!-- Comments Toggle Button -->
                <button onclick="toggleComments(${post.id})" 
                        class="flex items-center space-x-2 text-gray-500 hover:text-emerald-600 transition">
                    <i class="fas fa-comments mr-1"></i>
                    <span>${commentCount} Komentar</span>
                    <i class="fas ${showComments ? "fa-chevron-up" : "fa-chevron-down"} ml-1"></i>
                </button>
            </div>
            
            <!-- Comment Section (Collapsible) -->
            ${
              showComments
                ? `
                <div class="space-y-4 mt-4">
                    <!-- Comment Input -->
                    <div class="flex gap-2">
                        <img src="${currentUser.fotoProfil || "/images/default-avatar.png"}" 
                             class="w-8 h-8 rounded-full object-cover flex-shrink-0">
                        <div class="flex-1 flex gap-2">
                            <input type="text" id="newCommentInput" 
                                   placeholder="Tulis komentar..." 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                            <button onclick="addComment(${post.id})" 
                                    class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Comments List -->
                    <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
                        ${
                          commentCount === 0
                            ? `
                            <p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>
                        `
                            : comments
                                .map(
                                  (comment) => `
                            <div class="flex gap-2 comment-item p-2 rounded-lg">
                                <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                                     onclick="goToProfile(${comment.user?.id})">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-sm cursor-pointer hover:text-emerald-600"
                                              onclick="goToProfile(${comment.user?.id})">
                                            ${comment.user?.namaLengkap || "Unknown"}
                                        </span>
                                        <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
                                    </div>
                                    <p class="text-sm text-gray-700">${comment.text}</p>
                                </div>
                            </div>
                        `,
                                )
                                .join("")
                        }
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

// Update renderPosts function untuk menambahkan klik pada profil
function renderPosts() {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const currentPosts = allPosts.slice(startIndex, endIndex);

  const postsList = document.getElementById("postsList");

  if (currentPosts.length === 0) {
    postsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl">
                <i class="fas fa-newspaper text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">Belum ada cerita. Jadilah yang pertama!</p>
            </div>
        `;
  } else {
    postsList.innerHTML = currentPosts
      .map((post) => {
        const isLiked = userLikes.has(post.id);
        const isSelected = selectedPostId === post.id;

        return `
                <div class="bg-white rounded-xl shadow p-6 post-card ${isSelected ? "selected" : ""}" 
                     data-post-id="${post.id}">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-3">
                            <!-- Profile image yang bisa diklik -->
                            <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                                 class="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                                 onclick="event.stopPropagation(); showUserProfile(${post.user?.id})"
                                 onerror="this.src='/images/default-avatar.png'">
                            <div>
                                <!-- Nama user yang bisa diklik -->
                                <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                                    onclick="event.stopPropagation(); showUserProfile(${post.user?.id})">
                                    ${post.user?.namaLengkap || "Unknown"}
                                </h3>
                                <p class="text-xs text-gray-500">${post.user?.title || "Alumni"} • ${formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                    </div>
                    <!-- Konten post (tetap bisa diklik untuk detail post) -->
                    <div onclick="selectPost(${post.id})">
                        <h4 class="font-bold text-xl mt-4">${post.judul}</h4>
                        <p class="text-gray-600 mt-2">${post.konten.substring(0, 150)}${post.konten.length > 150 ? "..." : ""}</p>
                        ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-64 object-cover">` : ""}
                    </div>
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <div class="flex items-center space-x-4">
                            <button onclick="event.stopPropagation(); handleLike(${post.id})" 
                                    class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}" 
                                    data-post-id="${post.id}">
                                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                                <span class="like-count">${post.likeCount || 0}</span>
                            </button>
                            <span class="flex items-center text-gray-500">
                                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// Update renderPostDetail untuk menambahkan klik pada profil
async function renderPostDetail(postId) {
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;

  const isLiked = userLikes.has(post.id);
  const showComments = commentsVisible[postId] || false;

  // Load comments from database
  const comments = await loadComments(postId);
  const commentCount = comments.length;

  const detailContent = document.getElementById("postDetailContent");

  detailContent.innerHTML = `
        <div class="space-y-4">
            <!-- Header dengan profile yang bisa diklik -->
            <div class="flex items-start gap-3 pb-4 border-b">
                <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                     class="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                     onclick="showUserProfile(${post.user?.id})"
                     onerror="this.src='/images/default-avatar.png'">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                        onclick="showUserProfile(${post.user?.id})">
                        ${post.user?.namaLengkap || "Unknown"}
                    </h3>
                    <p class="text-xs text-gray-500">${post.user?.title || "Alumni"}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="px-2 py-0.5 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatDate(post.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Title -->
            <h2 class="text-xl font-bold text-gray-800">${post.judul}</h2>
            
            <!-- Full Content -->
            <div class="text-gray-700 leading-relaxed whitespace-pre-line">
                ${post.konten}
            </div>
            
            ${
              post.gambar
                ? `
                <div class="mt-4">
                    <img src="${post.gambar}" class="w-full rounded-lg max-h-96 object-cover">
                </div>
            `
                : ""
            }
            
            <!-- Stats bar -->
            <div class="flex items-center justify-between py-3 border-y">
                <div class="flex items-center space-x-4">
                    <button onclick="handleLike(${post.id})" 
                            class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
                        <i class="fas fa-heart text-xl ${isLiked ? "text-red-500" : ""}"></i>
                        <span class="font-semibold like-count">${post.likeCount || 0}</span>
                    </button>
                    
                    <span class="flex items-center text-gray-500">
                        <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                    </span>
                </div>
                
                <!-- Comments Toggle Button -->
                <button onclick="toggleComments(${post.id})" 
                        class="flex items-center space-x-2 text-gray-500 hover:text-emerald-600 transition">
                    <i class="fas fa-comments mr-1"></i>
                    <span>${commentCount} Komentar</span>
                    <i class="fas ${showComments ? "fa-chevron-up" : "fa-chevron-down"} ml-1"></i>
                </button>
            </div>
            
            <!-- Comment Section (Collapsible) -->
            ${
              showComments
                ? `
                <div class="space-y-4 mt-4">
                    <!-- Comment Input -->
                    <div class="flex gap-2">
                        <img src="${currentUser.fotoProfil || "/images/default-avatar.png"}" 
                             class="w-8 h-8 rounded-full object-cover flex-shrink-0">
                        <div class="flex-1 flex gap-2">
                            <input type="text" id="newCommentInput" 
                                   placeholder="Tulis komentar..." 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                            <button onclick="addComment(${post.id})" 
                                    class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Comments List -->
                    <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
                        ${
                          commentCount === 0
                            ? `
                            <p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>
                        `
                            : comments
                                .map(
                                  (comment) => `
                            <div class="flex gap-2 comment-item p-2 rounded-lg">
                                <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                                     onclick="showUserProfile(${comment.user?.id})">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-sm cursor-pointer hover:text-emerald-600"
                                              onclick="showUserProfile(${comment.user?.id})">
                                            ${comment.user?.namaLengkap || "Unknown"}
                                        </span>
                                        <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
                                    </div>
                                    <p class="text-sm text-gray-700">${comment.text}</p>
                                </div>
                            </div>
                        `,
                                )
                                .join("")
                        }
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

// Update selectPost function
async function selectPost(postId) {
  viewingProfile = false;
  viewedUserId = null;
  selectedPostId = postId;
  renderPosts(); // Re-render to update selected class

  // Track view untuk user ini
  try {
    const viewResponse = await fetch(`${API_BASE}/posts/${postId}/view`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    if (viewResponse.ok) {
      const viewData = await viewResponse.json();

      // Update view count di allPosts
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].viewCount = viewData.viewCount;
      }

      // Render ulang posts list untuk update view count
      renderPosts();
    }
  } catch (error) {
    console.error("Error tracking view:", error);
  }

  // Render post detail
  await renderPostDetail(postId);
}

// Create Post Modal
function showCreatePostModal() {
  document.getElementById("createPostModal").classList.remove("hidden");
  document.getElementById("createPostModal").classList.add("flex");
}

function hideCreatePostModal() {
  document.getElementById("createPostModal").classList.add("hidden");
  document.getElementById("createPostModal").classList.remove("flex");
}

// Create Post
document
  .getElementById("createPostForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const postData = {
      judul: document.getElementById("postJudul").value,
      konten: document.getElementById("postKonten").value,
      userId: currentUser.id,
    };

    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        hideCreatePostModal();
        document.getElementById("createPostForm").reset();
        await loadAllPosts(); // Reload posts
        await loadLeaderboard();
      } else {
        alert("Gagal membuat postingan");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  });

// Helper Functions
function formatDate(date) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date) {
  return new Date(date).toLocaleDateString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
}

function getSchoolColor(sekolah) {
  const colors = {
    sdit_sahabat: "bg-blue-100 text-blue-800",
    pptq_almadinah: "bg-green-100 text-green-800",
    ppqit_almahir: "bg-purple-100 text-purple-800",
  };
  return colors[sekolah] || "bg-gray-100 text-gray-800";
}

function getSchoolName(sekolah) {
  const names = {
    sdit_sahabat: "SDIT Sahabat",
    pptq_almadinah: "PPTQ Al-Madinah",
    ppqit_almahir: "PPQIT Al-Mahir",
  };
  return names[sekolah] || sekolah;
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function loadNotifications() {
  try {
    const response = await fetch(
      `${API_BASE}/notifications?userId=${currentUser.id}&limit=20`,
    );
    if (!response.ok) throw new Error("Gagal memuat notifikasi");

    const data = await response.json();
    notifications = data.notifications;
    unreadCount = data.unreadCount;

    renderNotifications();
    updateNotificationBadge();
  } catch (error) {
    console.error("Error loading notifications:", error);
  }
}

// Render notifikasi di dropdown
function renderNotifications() {
  const notificationList = document.getElementById("notificationList");

  if (!notificationList) return;

  if (notifications.length === 0) {
    notificationList.innerHTML = `
            <div class="p-8 text-center text-gray-500">
                <i class="fas fa-bell-slash text-4xl mb-3 text-gray-300"></i>
                <p class="text-sm">Belum ada notifikasi</p>
            </div>
        `;
    return;
  }

  notificationList.innerHTML = notifications
    .map((notif) => {
      const isUnread = !notif.isRead;
      const timeAgo = getTimeAgo(notif.createdAt);
      let icon = getNotificationIcon(notif.type);

      return `
            <div class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${isUnread ? "bg-emerald-50" : ""}"
                 onclick="handleNotificationClick(${notif.id}, '${notif.type}', ${notif.postId || "null"})">
                <div class="flex gap-3">
                    <div class="flex-shrink-0 w-8 h-8 rounded-full bg-${icon.bgColor} flex items-center justify-center">
                        <i class="fas ${icon.icon} text-${icon.color}"></i>
                    </div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start">
                            <p class="text-sm text-gray-800">${notif.message}</p>
                            ${!isUnread ? "" : '<span class="w-2 h-2 bg-emerald-500 rounded-full ml-1 flex-shrink-0"></span>'}
                        </div>
                        <div class="flex items-center gap-2 mt-1">
                            ${
                              notif.fromUser
                                ? `
                                <img src="${notif.fromUser.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-4 h-4 rounded-full object-cover">
                                <span class="text-xs text-gray-500">${notif.fromUser.namaLengkap}</span>
                            `
                                : ""
                            }
                            <span class="text-xs text-gray-400">${timeAgo}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    })
    .join("");
}

// Dapatkan icon berdasarkan tipe notifikasi
function getNotificationIcon(type) {
  switch (type) {
    case "like":
      return { icon: "fa-heart", color: "text-red-500", bgColor: "red-100" };
    case "comment":
      return {
        icon: "fa-comment",
        color: "text-blue-500",
        bgColor: "blue-100",
      };
    case "rank_up":
      return {
        icon: "fa-arrow-up",
        color: "text-emerald-500",
        bgColor: "emerald-100",
      };
    case "rank_down":
      return {
        icon: "fa-arrow-down",
        color: "text-yellow-500",
        bgColor: "yellow-100",
      };
    case "event":
      return {
        icon: "fa-calendar-alt",
        color: "text-purple-500",
        bgColor: "purple-100",
      };
    case "achievement":
      return {
        icon: "fa-trophy",
        color: "text-amber-500",
        bgColor: "amber-100",
      };
    default:
      return { icon: "fa-bell", color: "text-gray-500", bgColor: "gray-100" };
  }
}

// Format waktu (time ago)
function getTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}

// Update badge notifikasi
function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

// Toggle dropdown notifikasi
function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) {
      loadNotifications(); // Refresh saat dibuka
    }
  }
}

// Handle klik notifikasi
async function handleNotificationClick(notificationId, type, postId) {
  // Tandai sebagai dibaca
  await markNotificationRead([notificationId]);

  // Aksi berdasarkan tipe
  if (postId) {
    // Jika terkait post, buka post tersebut
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      selectPost(postId);
      // Tutup dropdown
      document.getElementById("notificationDropdown")?.classList.add("hidden");
      // Scroll ke post
      document
        .getElementById(`post-${postId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

// Tandai notifikasi sebagai dibaca
async function markNotificationRead(notificationIds = []) {
  try {
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({
        userId: currentUser.id,
        notificationIds: notificationIds,
      }),
    });

    if (response.ok) {
      if (notificationIds.length === 0) {
        // Tandai semua sebagai dibaca
        notifications.forEach((n) => (n.isRead = true));
        unreadCount = 0;
      } else {
        // Tandai notifikasi tertentu
        notifications.forEach((n) => {
          if (notificationIds.includes(n.id)) {
            n.isRead = true;
            unreadCount = Math.max(0, unreadCount - 1);
          }
        });
      }
      renderNotifications();
      updateNotificationBadge();
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
  }
}

// Tandai semua notifikasi sebagai dibaca
async function markAllNotificationsRead() {
  await markNotificationRead();
}

// View all notifications (bisa redirect ke halaman khusus)
function viewAllNotifications() {
  window.location.href = "/notifications.html";
}

// Tambahkan di initDashboard untuk memulai polling notifikasi
function initDashboard() {
  console.log("Initializing dashboard...");

  document.getElementById("userNameDisplay").textContent =
    currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = currentUser.namaLengkap;

  if (!isAdmin) {
    currentFilter = currentUser.asalSekolah;
  }

  setupFilterUI();

  Promise.all([
    loadSchoolInfo(),
    loadAllPosts(),
    loadLeaderboard(),
    loadNotifications(), // Tambahkan ini
  ])
    .then(() => {
      document.getElementById("loadingState").classList.add("hidden");
      document.getElementById("mainContent").classList.remove("hidden");
      document.getElementById("userInfo").classList.remove("hidden");
      console.log("Dashboard ready");

      // Mulai polling notifikasi setiap 30 detik
      if (notificationInterval) clearInterval(notificationInterval);
      notificationInterval = setInterval(() => {
        loadNotifications();
      }, 30000);
    })
    .catch((error) => {
      console.error("Error loading dashboard:", error);
      showError("Gagal memuat data");
    });

  document
    .getElementById("leaderboardFilter")
    .addEventListener("change", loadLeaderboard);

  // Tutup dropdown saat klik di luar
  document.addEventListener("click", function (event) {
    const container = document.getElementById("notificationContainer");
    const dropdown = document.getElementById("notificationDropdown");
    if (container && dropdown && !container.contains(event.target)) {
      dropdown.classList.add("hidden");
    }
  });
}

// Update fungsi like untuk menangani notifikasi real-time
async function handleLike(postId) {
  // ... kode like yang sudah ada ...

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    if (res.ok) {
      const updatedPost = await res.json();
      likeCountSpan.textContent = updatedPost.likeCount;

      // Update post in allPosts array
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].likeCount = updatedPost.likeCount;
      }

      // If this post is currently selected, update detail view
      if (selectedPostId === postId) {
        renderPostDetail(postId);
      }

      // Jika like, pemilik post akan mendapat notifikasi (dari backend)
      // Tidak perlu refresh notifikasi di sini karena akan ke-update via polling
    }
  } catch (error) {
    // ... rollback error ...
  }

  await loadLeaderboard();
}

// Update fungsi addComment untuk notifikasi
async function addComment(postId) {
  const input = document.getElementById("newCommentInput");
  const commentText = input.value.trim();

  if (!commentText) return;

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({
        userId: currentUser.id,
        text: commentText,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Gagal menambahkan komentar");
      return;
    }

    // Clear input
    input.value = "";

    // Refresh comments
    await renderPostDetail(postId);

    // Komentar akan memicu notifikasi dari backend
    // Tidak perlu refresh manual
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Terjadi kesalahan");
  }
}

// Jangan lupa bersihkan interval saat logout
function logout() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userToken");
  localStorage.removeItem(`userLikes_${currentUser?.id}`);
  window.location.href = "/login.html";
}
async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error("Gagal memuat data user");

    allUsers = await response.json();

    // Populate user filter dropdown
    const userFilter = document.getElementById("userFilter");
    if (userFilter) {
      let options = '<option value="">Semua Penulis</option>';

      // Sort users by name
      const sortedUsers = [...allUsers].sort((a, b) =>
        a.namaLengkap.localeCompare(b.namaLengkap),
      );

      sortedUsers.forEach((user) => {
        options += `<option value="${user.id}">${user.namaLengkap}</option>`;
      });

      userFilter.innerHTML = options;
    }
  } catch (error) {
    console.error("Error loading users:", error);
  }
}

// ========== FILTER POSTS BY SEARCH ==========
function filterPostsBySearch() {
  if (!allPosts || allPosts.length === 0) return [];

  return allPosts.filter((post) => {
    // Filter by search query
    const matchesSearch =
      searchQuery === "" ||
      post.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.konten.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.user?.namaLengkap &&
        post.user.namaLengkap
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

    // Filter by user
    const matchesUser =
      selectedUser === "" ||
      (post.user && post.user.id === parseInt(selectedUser));

    return matchesSearch && matchesUser;
  });
}

// ========== SORT POSTS ==========
function sortPosts(posts) {
  const sorted = [...posts];

  switch (selectedSort) {
    case "newest":
      sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      break;
    case "oldest":
      sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case "popular":
      sorted.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
      break;
  }

  return sorted;
}

// ========== UPDATE ACTIVE FILTERS DISPLAY ==========
function updateActiveFilters() {
  const container = document.getElementById("activeFilters");
  if (!container) return;

  let filters = [];

  if (searchQuery) {
    filters.push(
      `<span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs">Pencarian: "${searchQuery}"</span>`,
    );
  }

  if (selectedUser) {
    const user = allUsers.find((u) => u.id === parseInt(selectedUser));
    if (user) {
      filters.push(
        `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Penulis: ${user.namaLengkap}</span>`,
      );
    }
  }

  if (filters.length > 0) {
    container.innerHTML = `
            <span class="text-gray-600">Filter aktif:</span>
            ${filters.join(" ")}
            <button onclick="clearAllFilters()" class="text-red-500 hover:text-red-700 text-xs ml-2">
                <i class="fas fa-times mr-1"></i>Hapus semua
            </button>
        `;
    container.classList.remove("hidden");
  } else {
    container.classList.add("hidden");
  }
}

// ========== CLEAR ALL FILTERS ==========
function clearAllFilters() {
  searchQuery = "";
  selectedUser = "";
  selectedSort = "newest";

  document.getElementById("searchInput").value = "";
  document.getElementById("userFilter").value = "";
  document.getElementById("sortFilter").value = "newest";

  applyFiltersAndRender();
}

// ========== APPLY FILTERS AND RENDER ==========
function applyFiltersAndRender() {
  const filtered = filterPostsBySearch();
  filteredPosts = sortPosts(filtered);

  // Update total posts count
  totalPosts = filteredPosts.length;

  // Reset to first page
  currentPage = 1;

  // Render posts and pagination
  renderFilteredPosts();
  renderPagination();
  updateActiveFilters();
}

// ========== RENDER FILTERED POSTS ==========
function renderFilteredPosts() {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  const postsList = document.getElementById("postsList");

  if (currentPosts.length === 0) {
    postsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl">
                <i class="fas fa-search text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">Tidak ada postingan yang cocok dengan filter</p>
                <button onclick="clearAllFilters()" class="mt-4 text-emerald-600 hover:text-emerald-800">
                    <i class="fas fa-times mr-1"></i>Hapus filter
                </button>
            </div>
        `;
  } else {
    postsList.innerHTML = currentPosts
      .map((post) => {
        const isLiked = userLikes.has(post.id);
        const isSelected = selectedPostId === post.id;

        return `
                <div class="bg-white rounded-xl shadow p-6 post-card ${isSelected ? "selected" : ""}" 
                     data-post-id="${post.id}" 
                     onclick="selectPost(${post.id})">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-3">
                            <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                                 class="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                                 onclick="event.stopPropagation(); goToProfile(${post.user?.id})"
                                 onerror="this.src='/images/default-avatar.png'">
                            <div>
                                <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                                    onclick="event.stopPropagation(); goToProfile(${post.user?.id})">
                                    ${post.user?.namaLengkap || "Unknown"}
                                </h3>
                                <p class="text-xs text-gray-500">${post.user?.title || "Alumni"} • ${formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                    </div>
                    <h4 class="font-bold text-xl mt-4">${post.judul}</h4>
                    <p class="text-gray-600 mt-2">${post.konten.substring(0, 150)}${post.konten.length > 150 ? "..." : ""}</p>
                    ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-64 object-cover">` : ""}
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <div class="flex items-center space-x-4">
                            <button onclick="event.stopPropagation(); handleLike(${post.id})" 
                                    class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}" 
                                    data-post-id="${post.id}">
                                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                                <span class="like-count">${post.likeCount || 0}</span>
                            </button>
                            <span class="flex items-center text-gray-500">
                                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// ========== UPDATE LOAD ALL POSTS ==========
async function loadAllPosts() {
  try {
    // HAPUS filterParam untuk sekolah
    const url = `${API_BASE}/posts`;
    console.log("Loading posts from:", url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const result = await response.json();

    // Handle response format
    if (result.data && Array.isArray(result.data)) {
      allPosts = result.data;
    } else if (Array.isArray(result)) {
      allPosts = result;
    } else {
      allPosts = [];
    }

    console.log("Posts loaded:", allPosts.length);

    // Load all users for filter
    await loadAllUsers();

    // Apply initial filters
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading posts:", error);
    document.getElementById("postsList").innerHTML = `
            <div class="text-center py-8 text-red-500">
                <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
                <p>Gagal memuat postingan</p>
                <p class="text-sm">${error.message}</p>
            </div>
        `;
  }
}

// ========== SETUP SEARCH AND FILTERS ==========
function setupSearchAndFilters() {
  // Search input with debounce
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", function (e) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchQuery = e.target.value;
        applyFiltersAndRender();
      }, 500); // Debounce 500ms
    });
  }

  // User filter
  const userFilter = document.getElementById("userFilter");
  if (userFilter) {
    userFilter.addEventListener("change", function (e) {
      selectedUser = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Sort filter
  const sortFilter = document.getElementById("sortFilter");
  if (sortFilter) {
    sortFilter.addEventListener("change", function (e) {
      selectedSort = e.target.value;
      applyFiltersAndRender();
    });
  }
}

// ========== INIT DASHBOARD ==========
function initDashboard() {
  console.log("Initializing dashboard...");

  document.getElementById("userNameDisplay").textContent =
    currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = currentUser.namaLengkap;

  setupSearchAndFilters(); // Tambahkan ini

  Promise.all([
    loadSchoolInfo(),
    loadAllPosts(),
    loadLeaderboard(),
    loadNotifications(),
  ])
    .then(() => {
      document.getElementById("loadingState").classList.add("hidden");
      document.getElementById("mainContent").classList.remove("hidden");
      document.getElementById("userInfo").classList.remove("hidden");
      console.log("Dashboard ready");
    })
    .catch((error) => {
      console.error("Error loading dashboard:", error);
      showError("Gagal memuat data");
    });

  document
    .getElementById("leaderboardFilter")
    .addEventListener("change", loadLeaderboard);
}

// ========== LOAD ONLINE STATUS ==========
let onlineStatus = {};

async function loadOnlineStatus(userIds) {
  if (!userIds || userIds.length === 0) return;

  try {
    const response = await fetch(`${API_BASE}/users/online-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userIds }),
    });

    if (response.ok) {
      onlineStatus = await response.json();

      // Update UI untuk status online
      updateOnlineStatusUI();
    }
  } catch (error) {
    console.error("Error loading online status:", error);
  }
}

// Update status online di UI
function updateOnlineStatusUI() {
  // Update di post list
  document.querySelectorAll("[data-user-id]").forEach((el) => {
    const userId = parseInt(el.dataset.userId);
    const status = onlineStatus[userId];

    if (status) {
      const statusDot = el.querySelector(".online-status-dot");
      if (statusDot) {
        if (status.online) {
          statusDot.className =
            "online-status-dot w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0";
        } else {
          statusDot.className =
            "online-status-dot w-2 h-2 bg-gray-400 rounded-full absolute bottom-0 right-0";
        }
      }
    }
  });
}

// Update renderFilteredPosts untuk menambahkan status online
function renderFilteredPosts() {
  const startIndex = (currentPage - 1) * postsPerPage;
  const endIndex = Math.min(startIndex + postsPerPage, totalPosts);
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  // Kumpulkan user IDs untuk cek status online
  const userIds = [
    ...new Set(currentPosts.map((p) => p.user?.id).filter((id) => id)),
  ];
  if (userIds.length > 0) {
    loadOnlineStatus(userIds);
  }

  const postsList = document.getElementById("postsList");

  if (currentPosts.length === 0) {
    postsList.innerHTML = `
            <div class="text-center py-12 bg-white rounded-xl">
                <i class="fas fa-search text-4xl text-gray-400 mb-3"></i>
                <p class="text-gray-500">Tidak ada postingan yang cocok dengan filter</p>
                <button onclick="clearAllFilters()" class="mt-4 text-emerald-600 hover:text-emerald-800">
                    <i class="fas fa-times mr-1"></i>Hapus filter
                </button>
            </div>
        `;
  } else {
    postsList.innerHTML = currentPosts
      .map((post) => {
        const isLiked = userLikes.has(post.id);
        const isSelected = selectedPostId === post.id;

        return `
                <div class="bg-white rounded-xl shadow p-6 post-card ${isSelected ? "selected" : ""}" 
                     data-post-id="${post.id}" 
                     onclick="selectPost(${post.id})">
                    <div class="flex items-start justify-between">
                        <div class="flex items-center space-x-3 relative">
                            <div class="relative" data-user-id="${post.user?.id}">
                                <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                                     onclick="event.stopPropagation(); goToProfile(${post.user?.id})"
                                     onerror="this.src='/images/default-avatar.png'">
                                <span class="online-status-dot w-2 h-2 bg-gray-400 rounded-full absolute bottom-0 right-0"></span>
                            </div>
                            <div>
                                <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                                    onclick="event.stopPropagation(); goToProfile(${post.user?.id})">
                                    ${post.user?.namaLengkap || "Unknown"}
                                </h3>
                                <p class="text-xs text-gray-500">${post.user?.title || "Alumni"} • ${formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-1 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                    </div>
                    <h4 class="font-bold text-xl mt-4">${post.judul}</h4>
                    <p class="text-gray-600 mt-2">${post.konten.substring(0, 150)}${post.konten.length > 150 ? "..." : ""}</p>
                    ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-64 object-cover">` : ""}
                    <div class="flex items-center justify-between mt-4 pt-4 border-t">
                        <div class="flex items-center space-x-4">
                            <button onclick="event.stopPropagation(); handleLike(${post.id})" 
                                    class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}" 
                                    data-post-id="${post.id}">
                                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                                <span class="like-count">${post.likeCount || 0}</span>
                            </button>
                            <span class="flex items-center text-gray-500">
                                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                            </span>
                        </div>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
                        </span>
                    </div>
                </div>
            `;
      })
      .join("");
  }
}

// Update renderPostDetail untuk menambahkan status online dan share buttons
async function renderPostDetail(postId) {
  const post = allPosts.find((p) => p.id === postId);
  if (!post) return;

  const isLiked = userLikes.has(post.id);
  const showComments = commentsVisible[postId] || false;

  // Load comments from database
  const comments = await loadComments(postId);
  const commentCount = comments.length;

  // Load online status for post author
  if (post.user?.id) {
    loadOnlineStatus([post.user.id]);
  }

  const detailContent = document.getElementById("postDetailContent");
  const isOnline = onlineStatus[post.user?.id]?.online || false;

  detailContent.innerHTML = `
        <div class="space-y-4">
            <!-- Header -->
            <div class="flex items-start gap-3 pb-4 border-b">
                <div class="relative">
                    <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                         class="w-12 h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                         onclick="goToProfile(${post.user?.id})"
                         onerror="this.src='/images/default-avatar.png'">
                    <span class="w-3 h-3 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0 border-2 border-white"></span>
                </div>
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600 transition"
                            onclick="goToProfile(${post.user?.id})">
                            ${post.user?.namaLengkap || "Unknown"}
                        </h3>
                        <span class="text-xs ${isOnline ? "text-green-500" : "text-gray-400"}">
                            ${isOnline ? "● Online" : "● Offline"}
                        </span>
                    </div>
                    <p class="text-xs text-gray-500">${post.user?.title || "Alumni"}</p>
                    <div class="flex items-center gap-2 mt-1">
                        <span class="px-2 py-0.5 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
                            ${getSchoolName(post.user?.asalSekolah)}
                        </span>
                        <span class="text-xs text-gray-400">
                            <i class="fas fa-clock mr-1"></i> ${formatDate(post.createdAt)}
                        </span>
                    </div>
                </div>
            </div>
            
            <!-- Title -->
            <h2 class="text-xl font-bold text-gray-800">${post.judul}</h2>
            
            <!-- Full Content -->
            <div class="text-gray-700 leading-relaxed whitespace-pre-line">
                ${post.konten}
            </div>
            
            ${
              post.gambar
                ? `
                <div class="mt-4">
                    <img src="${post.gambar}" class="w-full rounded-lg max-h-96 object-cover">
                </div>
            `
                : ""
            }
            
            <!-- Stats bar -->
            <div class="flex items-center justify-between py-3 border-y">
                <div class="flex items-center space-x-4">
                    <button onclick="handleLike(${post.id})" 
                            class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
                        <i class="fas fa-heart text-xl ${isLiked ? "text-red-500" : ""}"></i>
                        <span class="font-semibold like-count">${post.likeCount || 0}</span>
                    </button>
                    
                    <span class="flex items-center text-gray-500">
                        <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
                    </span>
                </div>
                
                <!-- Share Buttons -->
                <div class="flex items-center space-x-2">
<button onclick="shareToWhatsApp(${JSON.stringify(post).replace(/"/g, "&quot;")})" 
        class="text-green-600 hover:text-green-700 transition" title="Share ke WhatsApp">
    <i class="fab fa-whatsapp text-xl"></i>
</button>
<button onclick="shareToFacebook(${JSON.stringify(post).replace(/"/g, "&quot;")})" 
        class="text-blue-600 hover:text-blue-700 transition" title="Share ke Facebook">
    <i class="fab fa-facebook text-xl"></i>
</button>
<button onclick="shareToTwitter(${JSON.stringify(post).replace(/"/g, "&quot;")})" 
        class="text-sky-500 hover:text-sky-600 transition" title="Share ke Twitter">
    <i class="fab fa-twitter text-xl"></i>
</button>
<button onclick="shareToInstagram(${JSON.stringify(post).replace(/"/g, "&quot;")})" 
        class="text-pink-600 hover:text-pink-700 transition" title="Copy link untuk Instagram">
    <i class="fab fa-instagram text-xl"></i>
</button>
                </div>
            </div>
            
            <!-- Comments Toggle Button -->
            <div class="flex justify-end">
                <button onclick="toggleComments(${post.id})" 
                        class="flex items-center space-x-2 text-gray-500 hover:text-emerald-600 transition">
                    <i class="fas fa-comments mr-1"></i>
                    <span>${commentCount} Komentar</span>
                    <i class="fas ${showComments ? "fa-chevron-up" : "fa-chevron-down"} ml-1"></i>
                </button>
            </div>
            
            <!-- Comment Section (Collapsible) -->
            ${
              showComments
                ? `
                <div class="space-y-4 mt-4">
                    <!-- Comment Input -->
                    <div class="flex gap-2">
                        <img src="${currentUser.fotoProfil || "/images/default-avatar.png"}" 
                             class="w-8 h-8 rounded-full object-cover flex-shrink-0">
                        <div class="flex-1 flex gap-2">
                            <input type="text" id="newCommentInput" 
                                   placeholder="Tulis komentar..." 
                                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                            <button onclick="addComment(${post.id})" 
                                    class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                    
                    <!-- Comments List -->
                    <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
                        ${
                          commentCount === 0
                            ? `
                            <p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>
                        `
                            : comments
                                .map(
                                  (comment) => `
                            <div class="flex gap-2 comment-item p-2 rounded-lg">
                                <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
                                     class="w-6 h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                                     onclick="goToProfile(${comment.user?.id})">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2">
                                        <span class="font-medium text-sm cursor-pointer hover:text-emerald-600"
                                              onclick="goToProfile(${comment.user?.id})">
                                            ${comment.user?.namaLengkap || "Unknown"}
                                        </span>
                                        <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
                                    </div>
                                    <p class="text-sm text-gray-700">${comment.text}</p>
                                </div>
                            </div>
                        `,
                                )
                                .join("")
                        }
                    </div>
                </div>
            `
                : ""
            }
        </div>
    `;
}

// ========== HEARTBEAT FUNCTION ==========
function startHeartbeat() {
  if (!currentUser) return;

  console.log("Starting heartbeat for user:", currentUser.id);

  // Kirim heartbeat setiap 2 menit
  setInterval(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/users/${currentUser.id}/heartbeat`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("userToken")}`,
          },
        },
      );

      if (response.ok) {
        console.log("Heartbeat sent");
      }
    } catch (error) {
      console.error("Heartbeat error:", error);
    }
  }, 120000); // 2 menit

  // Kirim heartbeat pertama
  fetch(`${API_BASE}/users/${currentUser.id}/heartbeat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("userToken")}`,
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log("Initial heartbeat sent");
      }
    })
    .catch((error) => console.error("Initial heartbeat error:", error));
}

// Update initDashboard untuk memulai heartbeat
function initDashboard() {
  console.log("Initializing dashboard...");

  document.getElementById("userNameDisplay").textContent =
    currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = currentUser.namaLengkap;

  setupSearchAndFilters();

  // Mulai heartbeat untuk status online
  startHeartbeat();

  Promise.all([
    loadSchoolInfo(),
    loadAllPosts(),
    loadLeaderboard(),
    loadNotifications(),
  ])
    .then(() => {
      document.getElementById("loadingState").classList.add("hidden");
      document.getElementById("mainContent").classList.remove("hidden");
      document.getElementById("userInfo").classList.remove("hidden");
      console.log("Dashboard ready");
    })
    .catch((error) => {
      console.error("Error loading dashboard:", error);
      showError("Gagal memuat data");
    });

  document
    .getElementById("leaderboardFilter")
    .addEventListener("change", loadLeaderboard);
}

// ========== FUNGSI SHARE GLOBAL ==========
window.shareToWhatsApp = function (post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}\n\n${postData.konten.substring(0, 100)}...\n\nDibaca selengkapnya di LebaranQu`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}%20${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("WhatsApp share error:", error);
    if (typeof showToast === "function") {
      showToast("Gagal membagikan ke WhatsApp", "error");
    }
  }
};

window.shareToFacebook = function (post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}&quote=${encodeURIComponent(postData.judul)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Facebook share error:", error);
    if (typeof showToast === "function") {
      showToast("Gagal membagikan ke Facebook", "error");
    }
  }
};

window.shareToTwitter = function (post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.origin + "/?post=" + postData.id)}`;
    window.open(url, "_blank");
  } catch (error) {
    console.error("Twitter share error:", error);
    if (typeof showToast === "function") {
      showToast("Gagal membagikan ke Twitter", "error");
    }
  }
};

window.shareToInstagram = function (post) {
  try {
    const postData = typeof post === "string" ? JSON.parse(post) : post;
    const text = `${postData.judul}\n\n${window.location.origin}/?post=${postData.id}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        if (typeof showToast === "function") {
          showToast(
            "Link berhasil disalin! Silakan paste di Instagram",
            "success",
          );
        }
      })
      .catch(() => {
        if (typeof showToast === "function") {
          showToast("Gagal menyalin link", "error");
        }
      });
  } catch (error) {
    console.error("Instagram share error:", error);
    if (typeof showToast === "function") {
      showToast("Gagal memproses link Instagram", "error");
    }
  }
};
