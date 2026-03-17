// ===================================================
// FILE: public/js/auth.js
// ===================================================

// Deklarasi global dengan var
var currentUser = null;
var isAdmin = false;
var userLikes = new Set();

// ========== CEK SESSION ==========
function checkSession() {
  const savedUser = localStorage.getItem("currentUser");
  const token = localStorage.getItem("userToken");

  if (!savedUser || !token) {
    window.location.href = "/login.html";
    return false;
  }

  try {
    const user = JSON.parse(savedUser);
    // PASTIKAN INI ADA!
    window.currentUser = user;
    currentUser = user;
    isAdmin = user.role === "admin" || user.isAdmin === true;
    
    console.log("✅ User loaded:", user.namaLengkap, "ID:", user.id);
    console.log("✅ window.currentUser set:", window.currentUser);
    
    loadUserLikes();
    return true;
  } catch (e) {
    console.error("❌ Error parsing user:", e);
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
      console.log("Loaded user likes:", Array.from(userLikes));
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
  if (window.closeSSE) window.closeSSE();
  
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