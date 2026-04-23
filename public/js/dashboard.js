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
  console.log("Initializing dashboard...");

  document.getElementById("userNameDisplay").textContent = window.currentUser.namaLengkap;
  document.getElementById("ucapanNama").textContent = window.currentUser.namaLengkap;

  if (typeof setupSearchAndFilters === 'function') setupSearchAndFilters();
  if (typeof setupFilterUI === 'function') setupFilterUI();
  
  // INISIALISASI SSE
  if (typeof initSSE === 'function') {
    initSSE();
  }

  Promise.all([
    typeof loadSchoolInfo === 'function' ? loadSchoolInfo() : Promise.resolve(),
    typeof loadAllPosts === 'function' ? loadAllPosts() : Promise.resolve(),
    typeof loadLeaderboard === 'function' ? loadLeaderboard('badge') : Promise.resolve(),
    typeof loadNotifications === 'function' ? loadNotifications() : Promise.resolve(),
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