// ===================================================
// FILE: public/js/auth.js
// ===================================================

// Deklarasi global dengan var (agar bisa diakses lintas file)
var currentUser = null;
var isAdmin = false;
var userLikes = new Set();
var userToken = null;

// ========== CEK SESSION ==========
function checkSession() {
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("userToken");

  console.log("🔍 Checking session...", { 
    hasSavedUser: !!savedUser, 
    hasToken: !!token 
  });

  if (!savedUser || !token) {
    console.log("❌ No session found, redirecting to login...");
    window.location.href = "/login.html";
    return false;
  }

  try {
    const user = JSON.parse(savedUser);
    
    // Set ke window dan variabel global
    window.currentUser = user;
    currentUser = user;
    userToken = token;
    isAdmin = user.role === "admin" || user.isAdmin === true;
    
    console.log("✅ User loaded:", user.namaLengkap, "ID:", user.id);
    console.log("✅ Role:", isAdmin ? "Admin" : "User");
    
    // INISIALISASI LIKESYSTEM (jika ada)
    if (window.LikeSystem && typeof window.LikeSystem.init === 'function') {
      window.LikeSystem.init(user.id);
      console.log("✅ LikeSystem initialized");
    } else {
      console.log("⚠️ LikeSystem not available, using fallback");
      loadUserLikes(); // Fallback ke localStorage biasa
    }
    
    return true;
  } catch (e) {
    console.error("❌ Error parsing user:", e);
    logout();
    return false;
  }
}

// ========== LOAD USER LIKES (FALLBACK) ==========
function loadUserLikes() {
  try {
    if (!currentUser) return;
    
    const savedLikes = localStorage.getItem(`userLikes_${currentUser.id}`);
    if (savedLikes) {
      userLikes = new Set(JSON.parse(savedLikes));
      console.log("📦 Loaded user likes from localStorage:", Array.from(userLikes).length);
    } else {
      userLikes = new Set();
    }
  } catch (e) {
    console.error("❌ Error loading user likes:", e);
    userLikes = new Set();
  }
}

// ========== SAVE USER LIKES ==========
function saveUserLikes() {
  if (!currentUser) return;
  
  try {
    localStorage.setItem(
      `userLikes_${currentUser.id}`,
      JSON.stringify(Array.from(userLikes))
    );
  } catch (e) {
    console.error("❌ Error saving user likes:", e);
  }
}

// ========== CHECK IF USER IS LOGGED IN ==========
function isLoggedIn() {
  return !!(localStorage.getItem("currentUser") && localStorage.getItem("userToken"));
}

// ========== GET CURRENT USER ==========
function getCurrentUser() {
  return window.currentUser || currentUser;
}

// ========== GET USER TOKEN ==========
function getUserToken() {
  return userToken || localStorage.getItem("userToken");
}

// ========== LOGOUT ==========
function logout() {
  console.log("🚪 Logging out...");
  
  // Tutup koneksi SSE jika ada
  if (window.closeSSE && typeof window.closeSSE === 'function') {
    window.closeSSE();
  }
  
  // Bersihkan localStorage
  if (currentUser) {
    localStorage.removeItem(`userLikes_${currentUser.id}`);
  }
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userToken");
  
  // Reset variabel global
  window.currentUser = null;
  currentUser = null;
  userToken = null;
  userLikes.clear();
  isAdmin = false;
  
  // Redirect ke halaman login
  window.location.href = "/login.html";
}

// ========== UPDATE USER DATA ==========
function updateUserData(updatedUser) {
  if (!updatedUser) return;
  
  // Update localStorage
  localStorage.setItem("currentUser", JSON.stringify(updatedUser));
  
  // Update global variables
  window.currentUser = updatedUser;
  currentUser = updatedUser;
  isAdmin = updatedUser.role === "admin" || updatedUser.isAdmin === true;
  
  console.log("🔄 User data updated:", updatedUser.namaLengkap);
}

// ========== EXPORT KE WINDOW ==========
window.logout = logout;
window.checkSession = checkSession;
window.loadUserLikes = loadUserLikes;
window.saveUserLikes = saveUserLikes;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
window.getUserToken = getUserToken;
window.updateUserData = updateUserData;

// Juga export variabel (agar bisa diakses dari file lain)
window.currentUser = currentUser;
window.isAdmin = isAdmin;
window.userLikes = userLikes;
window.userToken = userToken;

console.log("✅ Auth.js loaded");