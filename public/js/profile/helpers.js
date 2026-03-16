// ===================================================
// FILE: profile/helpers.js - Helper Functions untuk Profile
// ===================================================

// ========== GET PROFILE ID ==========
function getProfileId() {
  const urlParams = new URLSearchParams(window.location.search);
  const id = urlParams.get("id");
  return id ? parseInt(id) : currentUser?.id;
}

// ========== CEK OWNERSHIP ==========
function checkOwnership() {
  const urlParams = new URLSearchParams(window.location.search);
  const profileId = urlParams.get("id");

  if (!currentUser) {
    console.error("currentUser not found");
    window.isOwnProfile = false;
    return false;
  }

  if (profileId) {
    window.isOwnProfile = parseInt(profileId) === currentUser.id;
  } else {
    window.isOwnProfile = true;
  }

  // console.log("Profile access:", {
  //   currentUserId: currentUser.id,
  //   profileId: profileId || "own",
  //   isOwnProfile: window.isOwnProfile,
  // });
  
  return window.isOwnProfile;
}

// ========== GET SCHOOL NAME ==========
function getSchoolName(sekolah) {
  if (!sekolah) return "-";
  
  const names = {
    sdit_sahabat: "SDIT Sahabat - Karanganyar",
    pptq_almadinah: "PPTQ Al-Madinah - Solo",
    ppqit_almahir: "PPQIT Al-Mahir - IT & Tahfidz",
  };
  return names[sekolah] || sekolah || "-";
}

// ========== FORMAT DATE ==========
function formatDate(date) {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ========== ESCAPE HTML ==========
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// Export ke window
window.getProfileId = getProfileId;
window.checkOwnership = checkOwnership;
window.getSchoolName = getSchoolName;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;