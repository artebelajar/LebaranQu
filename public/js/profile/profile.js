// ===================================================
// FILE: profile/profile.js - File Utama Profile
// ===================================================

// ========== INISIALISASI ==========
function initProfile() {
  console.log("Initializing profile page...");
  
  // Load profile data
  loadProfile();
}

// ========== CEK SESSION DAN MULAI ==========
if (checkSession()) {
  checkOwnership();
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProfile);
  } else {
    initProfile();
  }
}