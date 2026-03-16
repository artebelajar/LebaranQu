// ===================================================
// FILE: auth.js - Session Management (GLOBAL)
// ===================================================

// Deklarasi global dengan var agar bisa diakses lintas file
if (typeof currentUser === 'undefined') {
  var currentUser = null;
  var isAdmin = false;
  var userLikes = new Set();
}

// ========== CEK SESSION ==========
function checkSession() {
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("userToken");

  console.log("Checking session...", {
    savedUser: !!savedUser,
    token: !!token,
  });

  if (!savedUser || !token) {
    console.log("No session found, redirecting to auth...");
    window.location.href = "/login.html";
    return false;
  }

  try {
    // Parse user dan simpan ke window
    const user = JSON.parse(savedUser);
    window.currentUser = user;  // PASTIKAN INI ADA
    currentUser = user;         // Untuk kompatibilitas
    isAdmin = user.role === "admin" || user.isAdmin === true;
    
    console.log("User loaded:", user.namaLengkap, "ID:", user.id);
    
    loadUserLikes();
    return true;
  } catch (e) {
    console.error("Error parsing user:", e);
    logout();
    return false;
  }
}

// ========== LOAD USER LIKES ==========
function loadUserLikes() {
  try {
    const savedLikes = localStorage.getItem(`userLikes_${currentUser.id}`);
    if (savedLikes) {
      userLikes = new Set(JSON.parse(savedLikes));
      // console.log("Loaded user likes:", Array.from(userLikes));
    }
  } catch (e) {
    console.error("Error loading user likes:", e);
    userLikes = new Set();
  }
}

// ========== SAVE USER LIKES ==========
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

// ========== LOGOUT ==========
function logout() {
  // Cleanup akan ditambahkan dari file lain
  if (window.cleanup) window.cleanup();
  
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userToken");
  localStorage.removeItem(`userLikes_${currentUser?.id}`);
  window.location.href = "/login.html";
}

// Export ke window
window.logout = logout;
window.checkSession = checkSession;
window.currentUser = currentUser;
window.isAdmin = isAdmin;
window.userLikes = userLikes;