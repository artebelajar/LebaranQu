// ===================================================
// FILE: profile.js - File Utama Profile
// ===================================================

// ========== INISIALISASI ==========
function initProfile() {
  console.log("Initializing profile page...");
  
  // Cek session dulu
  if (typeof checkSession === 'function') {
    checkSession();
  } else {
    console.error("checkSession function not found");
  }
  
  // Cek ownership
  if (typeof checkOwnership === 'function') {
    checkOwnership();
  } else {
    console.error("checkOwnership function not found");
    // Fallback: coba dari URL
    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get("id");
    window.isOwnProfile = profileId ? parseInt(profileId) === currentUser?.id : true;
  }
  
  // Load profile data
  if (typeof loadProfile === 'function') {
    loadProfile();
  } else {
    console.error("loadProfile function not found");
    document.getElementById("loadingState").classList.add("hidden");
    document.getElementById("errorState").classList.remove("hidden");
    document.getElementById("errorMessage").textContent = "Fungsi loadProfile tidak ditemukan";
  }
}

// ========== CEK SESSION DAN MULAI ==========
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initProfile);
} else {
  initProfile();
}