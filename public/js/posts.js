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
// const POSTS_PER_PAGE = 10;

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
  totalPosts = filteredPosts.length; // PASTIKAN INI TERUPDATE

  // console.log("Total posts after filter:", totalPosts); // Debug

  currentPage = 1; // Reset ke halaman 1
  renderFilteredPosts();
  renderPagination(); // PANGGIL PAGINATION!
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
      const isLiked = userLikes.has(post.id);
      const isOnline = onlineStatus[post.user?.id]?.online || false;

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
          <p class="text-gray-600 mt-2 line-clamp-3">${post.konten.substring(0, 200)}${post.konten.length > 200 ? "..." : ""}</p>
          ${post.gambar ? `<img src="${post.gambar}" class="mt-4 rounded-lg max-h-48 object-cover w-full">` : ""}
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
            <span class="text-xs text-gray-400">
              <i class="fas fa-clock mr-1"></i> ${formatTime(post.createdAt)}
            </span>
          </div>
        </div>
      `;
    }).join("");
  }
}

// ========== RENDER PAGINATION ==========
function renderPagination() {
  const paginationContainer = document.getElementById("paginationContainer");
  // console.log("Total posts:", totalPosts);
  // console.log("Posts per page:", POSTS_PER_PAGE);
  // console.log("Total pages:", Math.ceil(totalPosts / POSTS_PER_PAGE));
  // console.log(
  //   "Pagination container:",
  //   document.getElementById("paginationContainer"),
  // );

  // Jika container tidak ada, exit
  if (!paginationContainer) {
    console.warn("Pagination container not found");
    return;
  }

  const totalPages = Math.ceil(totalPosts / POSTS_PER_PAGE);
  // console.log(
  //   `Rendering pagination: totalPosts=${totalPosts}, POSTS_PER_PAGE=${POSTS_PER_PAGE}, totalPages=${totalPages}`,
  // );

  // Jika hanya 1 halaman atau tidak ada posts, sembunyikan pagination
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

  // Tampilkan halaman pertama jika currentPage > 3
  if (currentPage > 3) {
    paginationHTML += `
      <button onclick="window.changePage(1)" class="px-3 py-1 rounded-lg border hover:bg-gray-100">1</button>
      <span class="px-2">...</span>
    `;
  }

  // Tampilkan halaman di sekitar currentPage
  for (
    let i = Math.max(1, currentPage - 2);
    i <= Math.min(totalPages, currentPage + 2);
    i++
  ) {
    paginationHTML += `
      <button onclick="window.changePage(${i})" 
              class="px-3 py-1 rounded-lg border ${i === currentPage ? "bg-emerald-600 text-white" : "hover:bg-gray-100"}">
        ${i}
      </button>
    `;
  }

  // Tampilkan halaman terakhir jika currentPage < totalPages - 2
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

  // console.log(
  //   `Changing page from ${currentPage} to ${newPage}, totalPages: ${totalPages}`,
  // );

  // Validasi
  if (newPage < 1 || newPage > totalPages || newPage === currentPage) {
    // console.log("Page change cancelled - invalid or same page");
    return;
  }

  currentPage = newPage;

  // Render posts untuk halaman baru
  renderFilteredPosts();

  // Update pagination
  renderPagination();

  // Scroll ke atas posts list
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

// ========== FILTER POSTS (by sekolah) ==========
function filterPosts(sekolah) {
  // console.log("Filtering posts by sekolah:", sekolah);
  if (!isAdmin && sekolah !== currentUser?.asalSekolah) return;

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
    if (
      btn.textContent.includes(getSchoolName(sekolah)) ||
      (sekolah === "all" && btn.textContent.includes("Semua"))
    ) {
      btn.classList.remove("bg-gray-100", "text-gray-700");
      btn.classList.add("bg-emerald-600", "text-white");
      break;
    }
  }

  loadAllPosts();
}

// ========== LOAD ALL POSTS DENGAN MULTIPLE REQUESTS ==========
async function loadAllPosts() {
  try {
    let allPostsData = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const url = `${API_BASE}/posts?page=${page}&limit=100`;
      // console.log(`Loading page ${page}...`);

      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const result = await response.json();

      // Handle response
      let postsBatch = [];
      if (result.data && Array.isArray(result.data)) {
        postsBatch = result.data;
        hasMore = result.data.length === 100; // Jika limit tercapai, mungkin masih ada
      } else if (Array.isArray(result)) {
        postsBatch = result;
        hasMore = result.length === 100;
      } else {
        hasMore = false;
      }

      allPostsData = [...allPostsData, ...postsBatch];
      page++;

      // Hentikan jika batch kosong
      if (postsBatch.length === 0) {
        hasMore = false;
      }
    }

    allPosts = allPostsData;
    totalPosts = allPosts.length;

    // console.log("Total posts loaded:", totalPosts);

    await loadAllUsers();
    applyFiltersAndRender();
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

// ========== SELECT POST ==========
async function selectPost(postId) {
  // console.log(`Selecting post ${postId}`);

  // Deteksi apakah mobile (lebar layar < 768px)
  const isMobile = window.innerWidth < 768;

  if (isMobile) {
    // Di mobile: redirect ke halaman detail
    window.location.href = `/post-detail.html?id=${postId}`;
    return;
  }

  // Di desktop: tampilkan di sidebar
  selectedPostId = postId;

  if (typeof renderFilteredPosts === "function") {
    renderFilteredPosts();
  } else if (typeof renderPosts === "function") {
    renderPosts();
  }

  // Track view
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
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].viewCount = viewData.viewCount;
      }

      if (typeof renderFilteredPosts === "function") {
        renderFilteredPosts();
      } else if (typeof renderPosts === "function") {
        renderPosts();
      }
    }
  } catch (error) {
    console.error("Error tracking view:", error);
  }

  // Render post detail di sidebar (untuk desktop)
  if (typeof renderPostDetail === "function") {
    await renderPostDetail(postId);
  }
}

// ========== DEBOUNCE IMPROVED ==========
function debounce(func, wait) {
  let timeout;
  let lastArgs;

  return function executedFunction(...args) {
    lastArgs = args;

    const later = () => {
      timeout = null;
      if (!timeout) func.apply(this, lastArgs);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// ========== CACHE DATA DI LOCALSTORAGE ==========
const cache = {
  set(key, data, ttl = 300000) {
    // 5 menit default
    const item = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    localStorage.setItem(key, JSON.stringify(item));
  },

  get(key) {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const { data, timestamp, ttl } = JSON.parse(item);
    if (Date.now() - timestamp > ttl) {
      localStorage.removeItem(key);
      return null;
    }

    return data;
  },

  clear() {
    localStorage.clear();
  },
};

// Gunakan untuk data yang jarang berubah
async function loadSchoolInfo() {
  const cached = cache.get("schoolInfo");
  if (cached) {
    document.getElementById("schoolInfo").innerHTML = cached;
    return;
  }

  // Load from API
  const html = await generateSchoolInfo();
  cache.set("schoolInfo", html);
  document.getElementById("schoolInfo").innerHTML = html;
}

// Gunakan untuk search dengan 300ms delay
const debouncedSearch = debounce((query) => {
  searchPosts(query);
}, 300);

// Tambahkan event listener untuk resize window
window.addEventListener("resize", function () {
  // Jika resize dari mobile ke desktop, reload posts
  if (window.innerWidth >= 768 && selectedPostId) {
    // Refresh post list untuk menampilkan sidebar
    if (typeof renderFilteredPosts === "function") {
      renderFilteredPosts();
    }
  }
});

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

function initInfiniteScroll() {
  const observer = new IntersectionObserver(
    async (entries) => {
      const target = entries[0];
      if (target.isIntersecting && hasMorePosts && !isLoadingPosts) {
        await loadMorePosts();
      }
    },
    { threshold: 0.5 },
  );

  const sentinel = document.getElementById("scroll-sentinel");
  if (sentinel) observer.observe(sentinel);
}

async function loadMorePosts() {
  if (isLoadingPosts || !hasMorePosts) return;

  isLoadingPosts = true;
  currentPage++;

  try {
    const response = await fetch(
      `${API_BASE}/posts?page=${currentPage}&limit=${POSTS_PER_PAGE}`,
    );
    const data = await response.json();

    if (data.data.length === 0) {
      hasMorePosts = false;
      return;
    }

    appendPosts(data.data);
  } catch (error) {
    console.error("Error loading more posts:", error);
  } finally {
    isLoadingPosts = false;
  }
}

// ========== EXPORT FUNCTIONS ==========
window.loadAllPosts = loadAllPosts;
window.selectPost = selectPost;
window.filterPosts = filterPosts;
window.clearAllFilters = clearAllFilters;
window.changePage = changePage;
window.setupSearchAndFilters = setupSearchAndFilters;
window.renderFilteredPosts = renderFilteredPosts;
