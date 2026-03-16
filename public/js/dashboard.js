// ===================================================
// FILE: dashboard.js - File Utama yang Menginisialisasi Semua
// ===================================================

// ========== SHOW ERROR STATE ==========
function showError(message) {
  const loadingState = document.getElementById("loadingState");
  const errorState = document.getElementById("errorState");
  const errorMessage = document.getElementById("errorMessage");
  
  if (loadingState) loadingState.classList.add("hidden");
  if (errorState) errorState.classList.remove("hidden");
  if (errorMessage) errorMessage.textContent = message;
}

// ========== GO TO PROFILE ==========
function goToProfile(userId) {
  window.location.href = `/profile.html?id=${userId}`;
}

// ========== CLEANUP ==========
function cleanup() {
  if (window.heartbeatInterval) clearInterval(window.heartbeatInterval);
  if (window.notificationInterval) clearInterval(window.notificationInterval);
  if (window.closeConnections) window.closeConnections();
}

// ========== INIT DASHBOARD ==========
function initDashboard() {
  // console.log("Initializing dashboard...");

  // Cek elemen penting
  const postDetailSidebar = document.getElementById("postDetailSidebar");
  if (!postDetailSidebar) {
    console.warn("postDetailSidebar element not found");
  }

  const postDetailContent = document.getElementById("postDetailContent");
  if (!postDetailContent) {
    console.warn("postDetailContent element not found");
  }

  document.getElementById("userNameDisplay").textContent = currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = currentUser.namaLengkap;

  if (typeof setupSearchAndFilters === 'function') setupSearchAndFilters();
  if (typeof setupFilterUI === 'function') setupFilterUI();
  
  // Render category buttons
  if (typeof renderCategoryButtons === 'function') {
    renderCategoryButtons();
  } else if (window.LeaderboardModule) {
    window.LeaderboardModule.renderButtons();
  }
  
  // Try WebSocket first
  try {
    if (typeof connectWebSocket === 'function') connectWebSocket();
  } catch (error) {
    console.error('WebSocket connection failed, falling back to SSE:', error);
    if (typeof connectSSE === 'function') connectSSE();
  }

  Promise.all([
    typeof loadSchoolInfo === 'function' ? loadSchoolInfo() : Promise.resolve(),
    typeof loadAllPosts === 'function' ? loadAllPosts() : Promise.resolve(),
    typeof loadLeaderboard === 'function' ? loadLeaderboard('badge') : 
      (window.LeaderboardModule ? window.LeaderboardModule.load('badge') : Promise.resolve()),
    typeof loadNotifications === 'function' ? loadNotifications() : Promise.resolve(),
  ])
    .then(() => {
      const loadingState = document.getElementById("loadingState");
      const mainContent = document.getElementById("mainContent");
      const userInfo = document.getElementById("userInfo");
      
      if (loadingState) loadingState.classList.add("hidden");
      if (mainContent) mainContent.classList.remove("hidden");
      if (userInfo) userInfo.classList.remove("hidden");
      // console.log("Dashboard ready");
      
      if (typeof initLeaderboardFilters === 'function') {
        initLeaderboardFilters();
      } else if (window.LeaderboardModule) {
        window.LeaderboardModule.initFilters();
      }
    })
    .catch((error) => {
      console.error("Error loading dashboard:", error);
      showError("Gagal memuat data");
    });

  const leaderboardFilter = document.getElementById("leaderboardFilter");
  if (leaderboardFilter) {
    leaderboardFilter.addEventListener("change", () => {
      if (typeof loadLeaderboard === 'function') {
        loadLeaderboard(currentLeaderboardCategory || 'badge');
      } else if (window.LeaderboardModule) {
        window.LeaderboardModule.load(window.LeaderboardModule.currentCategory || 'badge');
      }
    });
  }

  loadNotifications();
  
  // Start heartbeat
  if (typeof startHeartbeat === 'function') startHeartbeat();
}

// ========== SCROLL TO TOP ==========
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ========== EXPORT FUNCTIONS KE WINDOW OBJECT ==========
// Fungsi-fungsi yang akan dipanggil dari HTML
window.initDashboard = initDashboard;
window.logout = logout;
window.scrollToTop = scrollToTop;
window.goToProfile = goToProfile;
window.showError = showError;
window.cleanup = cleanup;

// ========== INITIALIZE ==========
if (typeof checkSession === 'function' && checkSession()) {
  // Mulai jika DOM sudah siap
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDashboard);
  } else {
    initDashboard();
  }
} else {
  console.error("Session check failed");
}