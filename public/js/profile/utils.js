// ===================================================
// FILE: profile/utils.js - Fungsi Helper
// ===================================================

// ========== GET SCHOOL NAME ==========
function getSchoolName(sekolah) {
  return SCHOOL_NAMES[sekolah] || sekolah || "-";
}

// ========== FORMAT DATE ==========
function formatDate(date) {
  return new Date(date).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ========== ESCAPE HTML ==========
function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ========== SHOW TOAST ==========
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");
  const toastIcon = document.getElementById("toastIcon");

  toastMessage.textContent = message;

  if (type === "success") {
    toast.classList.remove("border-red-500");
    toast.classList.add("border-emerald-500");
    toastIcon.innerHTML =
      '<i class="fas fa-check-circle text-emerald-500 text-xl"></i>';
  } else {
    toast.classList.remove("border-emerald-500");
    toast.classList.add("border-red-500");
    toastIcon.innerHTML =
      '<i class="fas fa-exclamation-circle text-red-500 text-xl"></i>';
  }

  toast.classList.remove("hidden");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

// Export ke window
window.getSchoolName = getSchoolName;
window.formatDate = formatDate;
window.escapeHtml = escapeHtml;
window.showToast = showToast;