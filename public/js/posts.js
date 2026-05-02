// ===================================================
// FILE: public/js/posts.js - UI Frontend
// ===================================================

// HAPUS deklarasi POSTS_PER_PAGE di sini, gunakan dari config.js
// Jangan tulis: const POSTS_PER_PAGE = 10;
// Gunakan yang sudah ada di config.js

let currentPage = 1;
let totalPosts = 0;
let allPosts = [];
let filteredPosts = [];
let selectedPostId = null;

let isLoadingPosts = false;
let hasMorePosts = true;

let searchQuery = "";
let selectedUser = "";
let selectedSort = "newest";
let allUsers = [];

// ========== LOAD ALL USERS ==========
async function loadAllUsers() {
  try {
    const response = await fetch(`${API_BASE}/users`);
    if (!response.ok) throw new Error("Gagal memuat data user");

    allUsers = await response.json();

    const userFilter = document.getElementById("userFilter");
    if (userFilter) {
      let options = '<option value="">Semua Penulis</option>';
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
    const matchesSearch =
      searchQuery === "" ||
      post.judul.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.konten.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (post.user?.namaLengkap &&
        post.user.namaLengkap
          .toLowerCase()
          .includes(searchQuery.toLowerCase()));

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

// ========== UPDATE ACTIVE FILTERS ==========
function updateActiveFilters() {
  const container = document.getElementById("activeFilters");
  if (!container) return;

  let filters = [];
  if (searchQuery) {
    filters.push(
      `<span class="bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full text-xs">Pencarian: "${escapeHtml(searchQuery)}"</span>`,
    );
  }
  if (selectedUser) {
    const user = allUsers.find((u) => u.id === parseInt(selectedUser));
    if (user) {
      filters.push(
        `<span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">Penulis: ${escapeHtml(user.namaLengkap)}</span>`,
      );
    }
  }
  if (filters.length > 0) {
    container.innerHTML = `
      <span class="text-gray-600">Filter aktif:</span>
      ${filters.join(" ")}
      <button onclick="window.clearAllFilters()" class="text-red-500 hover:text-red-700 text-xs ml-2">
        <i class="fas fa-times mr-1"></i>Hapus semua
      </button>
    `;
    container.classList.remove("hidden");
  } else {
    container.classList.add("hidden");
  }
}

// ========== APPLY FILTERS AND RENDER ==========
function applyFiltersAndRender() {
  const filtered = filterPostsBySearch();
  filteredPosts = sortPosts(filtered);
  totalPosts = filteredPosts.length;

  currentPage = 1;
  renderFilteredPosts();
  renderPagination();
  updateActiveFilters();
}

// ========== FILTER POSTS BY SCHOOL ==========
function filterPosts(sekolah) {
  console.log("Filtering posts by sekolah:", sekolah);
  
  // Update currentFilter jika ada
  if (typeof currentFilter !== "undefined") {
    currentFilter = sekolah;
  }
  
  // Update active button
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.classList.remove("bg-emerald-600", "text-white");
    btn.classList.add("bg-gray-100", "text-gray-700");
  });
  
  // Find and update the clicked button
  const buttons = document.querySelectorAll(".filter-btn");
  for (let btn of buttons) {
    if (btn.textContent.includes(getSchoolName(sekolah)) ||
        (sekolah === "all" && btn.textContent.includes("Semua"))) {
      btn.classList.remove("bg-gray-100", "text-gray-700");
      btn.classList.add("bg-emerald-600", "text-white");
      break;
    }
  }
  
  loadAllPosts();
}

// ========== RENDER FILTERED POSTS ==========
function renderFilteredPosts() {
  const postsList = document.getElementById("postsList");
  if (!postsList) return;

  const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
  const endIndex = Math.min(startIndex + POSTS_PER_PAGE, totalPosts);
  const currentPosts = filteredPosts.slice(startIndex, endIndex);

  if (currentPosts.length === 0) {
    postsList.innerHTML = `<div class="text-center py-12 bg-white rounded-xl">
      <i class="fas fa-search text-4xl text-gray-400 mb-3"></i>
      <p class="text-gray-500">Tidak ada postingan</p>
    </div>`;
  } else {
    postsList.innerHTML = currentPosts.map((post) => {
      let isLiked = false;
      if (window.userLikes) {
        isLiked = window.userLikes.has(post.id);
      } else if (window.LikeSystem && window.LikeSystem.isLiked) {
        isLiked = window.LikeSystem.isLiked(post.id);
      }
      
      const isOnline = (window.onlineStatus && window.onlineStatus[post.user?.id]?.online) || false;
      const schoolColor = (window.getSchoolColor && window.getSchoolColor(post.user?.asalSekolah)) || 'bg-gray-100 text-gray-800';
      const schoolName = (window.getSchoolName && window.getSchoolName(post.user?.asalSekolah)) || post.user?.asalSekolah || '-';
      
      let formattedDate = '-';
      if (window.formatDate && post.createdAt) {
        formattedDate = window.formatDate(post.createdAt);
      } else if (post.createdAt) {
        formattedDate = new Date(post.createdAt).toLocaleDateString('id-ID');
      }
      
      return `
        <div class="bg-white rounded-xl shadow p-6 post-card cursor-pointer hover:shadow-lg transition-all duration-300" 
             data-post-id="${post.id}"
             onclick="window.location.href='/post-detail.html?id=${post.id}'">
          <div class="flex items-start justify-between">
            <div class="flex items-center space-x-3 relative">
              <div class="relative" data-user-id="${post.user?.id || ""}">
                <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
                     class="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                     onclick="event.stopPropagation(); window.goToProfile(${post.user?.id})"
                     onerror="this.src='/images/default-avatar.png'">
                <span class="online-status-dot w-2 h-2 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0"></span>
              </div>
              <div>
                <h3 class="font-semibold text-gray-800"
                    onclick="event.stopPropagation(); window.goToProfile(${post.user?.id})">
                  ${escapeHtml(post.user?.namaLengkap || "Unknown")}
                </h3>
                <p class="text-xs text-gray-500">${escapeHtml(post.user?.title || "Alumni")} • ${formattedDate}</p>
              </div>
            </div>
            <span class="px-2 py-1 text-xs rounded-full ${schoolColor}">
              ${escapeHtml(schoolName)}
            </span>
          </div>
          <h4 class="font-bold text-xl mt-4">${escapeHtml(post.judul)}</h4>
          <p class="text-gray-600 mt-2 line-clamp-3">${escapeHtml(post.konten.substring(0, 200))}${post.konten.length > 200 ? "..." : ""}</p>
          ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-48 object-cover w-full" onerror="this.style.display='none'">` : ""}
          <div class="flex items-center justify-between mt-4 pt-4 border-t">
            <div class="flex items-center space-x-4">
              <button onclick="event.stopPropagation(); window.handleLike(${post.id})" 
                      class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
                <i class="fas fa-heart ${isLiked ? "text-red-500" : ""}"></i>
                <span class="like-count">${post.likeCount || 0}</span>
              </button>
              <span class="flex items-center text-gray-500">
                <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
              </span>
              <span class="flex items-center text-gray-500">
                <i class="fas fa-comment mr-1"></i> ${post.commentCount || 0}
              </span>
            </div>
            <span class="text-xs text-gray-400"><i class="fas fa-clock mr-1"></i> ${window.formatTime ? window.formatTime(post.createdAt) : ''}</span>
          </div>
        </div>
      `;
    }).join("");
  }
}

// ========== RENDER PAGINATION ==========
function renderPagination() {
  const paginationContainer = document.getElementById("paginationContainer");
  if (!paginationContainer) return;

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);

  if (totalPages <= 1 || totalPosts === 0) {
    paginationContainer.innerHTML = "";
    return;
  }

  let paginationHTML = `
    <button onclick="window.changePage(${currentPage - 1})" 
            class="px-3 py-1 rounded-lg border ${currentPage === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}"
            ${currentPage === 1 ? "disabled" : ""}>
      <i class="fas fa-chevron-left"></i>
    </button>
  `;

  if (currentPage > 3) {
    paginationHTML += `
      <button onclick="window.changePage(1)" class="px-3 py-1 rounded-lg border hover:bg-gray-100">1</button>
      <span class="px-2">...</span>
    `;
  }

  for (let i = Math.max(1, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
    paginationHTML += `
      <button onclick="window.changePage(${i})" 
              class="px-3 py-1 rounded-lg border ${i === currentPage ? "bg-emerald-600 text-white" : "hover:bg-gray-100"}">
        ${i}
      </button>
    `;
  }

  if (currentPage < totalPages - 2) {
    paginationHTML += `
      <span class="px-2">...</span>
      <button onclick="window.changePage(${totalPages})" class="px-3 py-1 rounded-lg border hover:bg-gray-100">${totalPages}</button>
    `;
  }

  paginationHTML += `
    <button onclick="window.changePage(${currentPage + 1})" 
            class="px-3 py-1 rounded-lg border ${currentPage === totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"}"
            ${currentPage === totalPages ? "disabled" : ""}>
      <i class="fas fa-chevron-right"></i>
    </button>
  `;

  paginationContainer.innerHTML = paginationHTML;
}

// ========== CHANGE PAGE ==========
function changePage(newPage) {
  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
  currentPage = newPage;
  renderFilteredPosts();
  renderPagination();
  const postsList = document.getElementById("postsList");
  if (postsList) postsList.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ========== CLEAR ALL FILTERS ==========
function clearAllFilters() {
  searchQuery = "";
  selectedUser = "";
  selectedSort = "newest";
  const searchInput = document.getElementById("searchInput");
  const userFilter = document.getElementById("userFilter");
  const sortFilter = document.getElementById("sortFilter");
  if (searchInput) searchInput.value = "";
  if (userFilter) userFilter.value = "";
  if (sortFilter) sortFilter.value = "newest";
  applyFiltersAndRender();
}

// ========== LOAD ALL POSTS ==========
async function loadAllPosts() {
  try {
    const response = await fetch(`${API_BASE}/posts?page=1&limit=100`);
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const result = await response.json();
    
    if (result.data && Array.isArray(result.data)) {
      allPosts = result.data;
    } else if (Array.isArray(result)) {
      allPosts = result;
    } else {
      allPosts = [];
    }
    
    totalPosts = allPosts.length;
    await loadAllUsers();
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading posts:", error);
    const postsList = document.getElementById("postsList");
    if (postsList) {
      postsList.innerHTML = `<div class="text-center py-12 bg-white rounded-xl">
        <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
        <p class="text-gray-500">Gagal memuat postingan</p>
        <button onclick="loadAllPosts()" class="mt-4 text-emerald-600">Coba Lagi</button>
      </div>`;
    }
  }
}

// ========== SETUP SEARCH AND FILTERS ==========
function setupSearchAndFilters() {
  console.log("🔍 Setting up search and filters...");
  
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", debounce(function(e) {
      searchQuery = e.target.value;
      applyFiltersAndRender();
    }, 500));
  }

  const userFilter = document.getElementById("userFilter");
  if (userFilter) {
    userFilter.addEventListener("change", function(e) {
      selectedUser = e.target.value;
      applyFiltersAndRender();
    });
  }

  const sortFilter = document.getElementById("sortFilter");
  if (sortFilter) {
    sortFilter.addEventListener("change", function(e) {
      selectedSort = e.target.value;
      applyFiltersAndRender();
    });
  }
}

// ========== DEBOUNCE ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== ESCAPE HTML ==========
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== EXPORT KE WINDOW ==========
window.loadAllPosts = loadAllPosts;
window.selectPost = (postId) => { window.location.href = `/post-detail.html?id=${postId}`; };
window.filterPosts = filterPosts;
window.clearAllFilters = clearAllFilters;
window.changePage = changePage;
window.setupSearchAndFilters = setupSearchAndFilters;
window.renderFilteredPosts = renderFilteredPosts;
window.applyFiltersAndRender = applyFiltersAndRender;

console.log("✅ Posts.js loaded");