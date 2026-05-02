// ===================================================
// FILE: posts.js - Semua Fungsi Terkait Posts
// ===================================================

let currentPage = 1;
let totalPosts = 0;
let allPosts = [];
let filteredPosts = [];
let selectedPostId = null;

let isLoadingPosts = false;
let hasMorePosts = true;
const POSTS_PER_PAGE = window.POSTS_PER_PAGE || 5; // <-- HARUS DITAMBAHKAN!

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
      // Fallback untuk userLikes
      let isLiked = false;
      if (window.userLikes) {
        isLiked = window.userLikes.has(post.id);
      } else if (window.LikeSystem && window.LikeSystem.isLiked) {
        isLiked = window.LikeSystem.isLiked(post.id);
      }
      
      // Fallback untuk onlineStatus
      const isOnline = (window.onlineStatus && window.onlineStatus[post.user?.id]?.online) || false;
      
      // Get school color and name dari window
      const schoolColor = (window.getSchoolColor && window.getSchoolColor(post.user?.asalSekolah)) || 'bg-gray-100 text-gray-800';
      const schoolName = (window.getSchoolName && window.getSchoolName(post.user?.asalSekolah)) || post.user?.asalSekolah || '-';
      
      // Format date dengan fallback
      let formattedDate = '-';
      if (window.formatDate && post.createdAt) {
        formattedDate = window.formatDate(post.createdAt);
      } else if (post.createdAt) {
        formattedDate = new Date(post.createdAt).toLocaleDateString('id-ID');
      }
      
      let formattedTime = '-';
      if (window.formatTime && post.createdAt) {
        formattedTime = window.formatTime(post.createdAt);
      } else if (post.createdAt) {
        formattedTime = new Date(post.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
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
                <span class="online-status-dot w-2 h-2 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0 border-2 border-white"></span>
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
            <span class="text-xs text-gray-400"><i class="fas fa-clock mr-1"></i> ${formattedTime}</span>
          </div>
        </div>
      `;
    }).join("");
  }
}

// ========== RENDER PAGINATION ==========
function renderPagination() {
  const paginationContainer = document.getElementById("paginationContainer");
  if (!paginationContainer) {
    console.warn("Pagination container not found");
    return;
  }

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

  if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
    return;
  }

  currentPage = newPage;
  renderFilteredPosts();
  renderPagination();

  const postsList = document.getElementById("postsList");
  if (postsList) {
    postsList.scrollIntoView({ behavior: "smooth", block: "start" });
  }
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
    let allPostsData = [];
    let page = 1;
    let hasMore = true;
    const limit = 100;

    while (hasMore) {
      const url = `${API_BASE}/posts?page=${page}&limit=${limit}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const result = await response.json();

      let postsBatch = [];
      if (result.data && Array.isArray(result.data)) {
        postsBatch = result.data;
        hasMore = result.data.length === limit;
      } else if (Array.isArray(result)) {
        postsBatch = result;
        hasMore = result.length === limit;
      } else {
        hasMore = false;
      }

      allPostsData = [...allPostsData, ...postsBatch];
      page++;

      if (postsBatch.length === 0) {
        hasMore = false;
      }
      
      // Safety limit
      if (page > 10) {
        console.warn("Too many pages, stopping");
        hasMore = false;
      }
    }

    allPosts = allPostsData;
    totalPosts = allPosts.length;

    await loadAllUsers();
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading posts:", error);
    const postsList = document.getElementById("postsList");
    if (postsList) {
      postsList.innerHTML = `
        <div class="text-center py-12 bg-white rounded-xl">
          <i class="fas fa-exclamation-triangle text-4xl text-red-400 mb-3"></i>
          <p class="text-gray-500">Gagal memuat postingan</p>
          <button onclick="loadAllPosts()" class="mt-4 text-emerald-600 hover:text-emerald-800">Coba Lagi</button>
        </div>
      `;
    }
  }
}

// ========== SETUP SEARCH AND FILTERS ==========
function setupSearchAndFilters() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener(
      "input",
      debounce(function (e) {
        searchQuery = e.target.value;
        applyFiltersAndRender();
      }, 500),
    );
  }

  const userFilter = document.getElementById("userFilter");
  if (userFilter) {
    userFilter.addEventListener("change", function (e) {
      selectedUser = e.target.value;
      applyFiltersAndRender();
    });
  }

  const sortFilter = document.getElementById("sortFilter");
  if (sortFilter) {
    sortFilter.addEventListener("change", function (e) {
      selectedSort = e.target.value;
      applyFiltersAndRender();
    });
  }
}

// ========== DEBOUNCE ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
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

// ========== EXPORT FUNCTIONS ==========
window.loadAllPosts = loadAllPosts;
window.selectPost = selectPost;
window.filterPosts = filterPosts;
window.clearAllFilters = clearAllFilters;
window.changePage = changePage;
window.setupSearchAndFilters = setupSearchAndFilters;
window.renderFilteredPosts = renderFilteredPosts;
window.applyFiltersAndRender = applyFiltersAndRender;

console.log("✅ Posts.js loaded");