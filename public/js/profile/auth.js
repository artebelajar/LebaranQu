// ===================================================
// FILE: profile/auth.js - Session Management
// ===================================================

let currentUser = null;
let profileUser = null;
let isOwnProfile = false;

// ========== CEK SESSION ==========
function checkSession() {
  try {
    currentUser = JSON.parse(localStorage.getItem("currentUser"));
  } catch (e) {
    window.location.href = "/login.html";
    throw e;
  }

  if (!currentUser) {
    window.location.href = "/login.html";
    throw new Error("No user");
  }
  
  return true;
}

// ========== CEK OWNERSHIP ==========
function checkOwnership() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");

  if (profileId) {
    isOwnProfile = parseInt(profileId) === currentUser.id;
  } else {
    isOwnProfile = true;
  }

  console.log("Profile access:", {
    currentUserId: currentUser.id,
    profileId: profileId || "own",
    isOwnProfile,
  });
  
  return isOwnProfile;
}

// ========== GET PROFILE ID ==========
function getProfileId() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id") ? parseInt(urlParams.get("id")) : currentUser.id;
}

// ========== LOGOUT ==========
function logout() {
  localStorage.removeItem("currentUser");
  localStorage.removeItem("userToken");
  window.location.href = "/login.html";
}

// Export ke window
window.logout = logout;
window.getProfileId = getProfileId;