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
  
  console.error("Dashboard error:", message);
}

// ========== GO TO PROFILE ==========
function goToProfile(userId) {
  // Jika userId diberikan, langsung ke profile dengan ID tersebut
  if (userId) {
    window.location.href = `/profile.html?id=${userId}`;
    return;
  }
  
  // Jika tidak ada userId, gunakan currentUser
  if (window.currentUser && window.currentUser.id) {
    window.location.href = `/profile.html?id=${window.currentUser.id}`;
  } else {
    // Fallback ke profile tanpa ID (akan redirect ke login jika perlu)
    window.location.href = '/profile.html';
  }
}

// ========== CLEANUP ==========
function cleanup() {
  console.log("🧹 Cleaning up...");
  
  if (window.heartbeatInterval) {
    clearInterval(window.heartbeatInterval);
    window.heartbeatInterval = null;
  }
  
  if (window.notificationInterval) {
    clearInterval(window.notificationInterval);
    window.notificationInterval = null;
  }
  
  if (window.closeSSE && typeof window.closeSSE === 'function') {
    window.closeSSE();
  }
  
  if (window.closeConnections && typeof window.closeConnections === 'function') {
    window.closeConnections();
  }
}

// ========== CHECK DEPENDENCIES ==========
function checkDependencies() {
  const requiredFunctions = [
    'setupSearchAndFilters',
    'setupFilterUI',
    'initSSE',
    'loadSchoolInfo',
    'loadAllPosts',
    'loadLeaderboard',
    'loadNotifications',
    'startHeartbeat'
  ];
  
  const missing = [];
  
  for (const fn of requiredFunctions) {
    if (typeof window[fn] !== 'function') {
      missing.push(fn);
    }
  }
  
  if (missing.length > 0) {
    console.warn("⚠️ Missing functions:", missing);
    
    // Coba cek di global scope juga
    for (const fn of missing) {
      if (typeof eval(fn) === 'function') {
        window[fn] = eval(fn);
        console.log(`✅ Fixed: ${fn} moved to window`);
      }
    }
  }
  
  return missing.length === 0;
}

// ========== INIT DASHBOARD ==========
async function initDashboard() {
  console.log("🚀 Initializing dashboard...");
  
  // Cek apakah currentUser tersedia
  if (!window.currentUser) {
    console.error("❌ No currentUser found, redirecting to login...");
    window.location.href = "/login.html";
    return;
  }

  // Update UI dengan data user
  const userNameSpan = document.getElementById("userNameDisplay");
  const ucapanNamaSpan = document.getElementById("ucapanNama");
  
  if (userNameSpan) userNameSpan.textContent = window.currentUser.namaLengkap;
  if (ucapanNamaSpan) ucapanNamaSpan.textContent = window.currentUser.namaLengkap;
  
  // Cek dependency
  if (!checkDependencies()) {
    console.warn("⚠️ Some dependencies are missing, but continuing...");
  }

  // Setup search & filter
  if (typeof setupSearchAndFilters === 'function') {
    setupSearchAndFilters();
  } else {
    console.warn("⚠️ setupSearchAndFilters not available");
  }
  
  if (typeof setupFilterUI === 'function') {
    setupFilterUI();
  } else {
    console.warn("⚠️ setupFilterUI not available");
  }
  
  // INISIALISASI SSE
  if (typeof initSSE === 'function') {
    initSSE();
  } else {
    console.warn("⚠️ initSSE not available, real-time features disabled");
  }

  try {
    // Load semua data secara paralel
    const results = await Promise.allSettled([
      typeof loadSchoolInfo === 'function' ? loadSchoolInfo() : Promise.resolve(),
      typeof loadAllPosts === 'function' ? loadAllPosts() : Promise.resolve(),
      typeof loadLeaderboard === 'function' ? loadLeaderboard('badge') : Promise.resolve(),
      typeof loadNotifications === 'function' ? loadNotifications() : Promise.resolve(),
    ]);
    
    // Log hasil loading
    results.forEach((result, index) => {
      const tasks = ['SchoolInfo', 'Posts', 'Leaderboard', 'Notifications'];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${tasks[index]} loaded successfully`);
      } else {
        console.error(`❌ Failed to load ${tasks[index]}:`, result.reason);
      }
    });
    
    // Tampilkan konten utama (meskipun ada yang gagal)
    const loadingState = document.getElementById("loadingState");
    const mainContent = document.getElementById("mainContent");
    const userInfo = document.getElementById("userInfo");
    
    if (loadingState) loadingState.classList.add("hidden");
    if (mainContent) mainContent.classList.remove("hidden");
    if (userInfo) userInfo.classList.remove("hidden");
    
    console.log("✅ Dashboard ready");
    
  } catch (error) {
    console.error("❌ Error loading dashboard:", error);
    showError("Gagal memuat data. Silakan refresh halaman.");
  }

  // Start heartbeat
  if (typeof startHeartbeat === 'function') {
    startHeartbeat();
  } else if (typeof window.startHeartbeat === 'function') {
    window.startHeartbeat();
  } else {
    console.warn("⚠️ Heartbeat not started - function not available");
  }
}

// ========== SCROLL TO TOP ==========
function scrollToTop() {
  window.scrollTo({ 
    top: 0, 
    behavior: "smooth" 
  });
}

// ========== HANDLE PAGE BEFORE UNLOAD ==========
function handleBeforeUnload() {
  cleanup();
}

// ========== EXPORT FUNCTIONS KE WINDOW OBJECT ==========
window.initDashboard = initDashboard;
window.logout = logout;
window.scrollToTop = scrollToTop;
window.goToProfile = goToProfile;
window.showError = showError;
window.cleanup = cleanup;
window.checkDependencies = checkDependencies;

// ========== REGISTER EVENT LISTENERS ==========
window.addEventListener('beforeunload', handleBeforeUnload);

// ========== INITIALIZE ==========
// Cek apakah fungsi checkSession tersedia
if (typeof checkSession === 'function') {
  const sessionValid = checkSession();
  if (sessionValid) {
    // Mulai jika DOM sudah siap
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initDashboard);
    } else {
      initDashboard();
    }
  } else {
    console.error("❌ Session check failed");
  }
} else {
  console.error("❌ checkSession function not found!");
  // Fallback: cek localStorage langsung
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("userToken");
  
  if (savedUser && token) {
    try {
      window.currentUser = JSON.parse(savedUser);
      console.log("✅ Fallback: User loaded from localStorage");
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initDashboard);
      } else {
        initDashboard();
      }
    } catch (e) {
      console.error("❌ Fallback failed:", e);
      window.location.href = "/login.html";
    }
  } else {
    window.location.href = "/login.html";
  }
}

console.log("✅ Dashboard.js loaded");