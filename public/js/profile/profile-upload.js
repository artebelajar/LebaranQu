// ===================================================
// FILE: profile/profile-upload.js - Fungsi Upload Foto
// ===================================================

let selectedFile = null;

// ========== SHOW UPLOAD MODAL ==========
function showUploadModal() {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah foto profil orang lain", "error");
    return;
  }
  document.getElementById("uploadModal").classList.remove("hidden");
  document.getElementById("uploadModal").classList.add("flex");
  document.getElementById("uploadPreview").classList.add("hidden");
  document.getElementById("uploadPlaceholder").classList.remove("hidden");
  selectedFile = null;
}

// ========== HIDE UPLOAD MODAL ==========
function hideUploadModal() {
  document.getElementById("uploadModal").classList.add("hidden");
  document.getElementById("uploadModal").classList.remove("flex");
}

// ========== PREVIEW IMAGE ==========
function previewImage(input) {
  if (input.files && input.files[0]) {
    selectedFile = input.files[0];

    if (selectedFile.size > 2 * 1024 * 1024) {
      showToast("File terlalu besar! Maksimal 2MB", "error");
      return;
    }

    if (!selectedFile.type.match("image.*")) {
      showToast("Hanya file gambar yang diperbolehkan", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      document.getElementById("uploadPreview").src = e.target.result;
      document.getElementById("uploadPreview").classList.remove("hidden");
      document
        .getElementById("uploadPlaceholder")
        .classList.add("hidden");
    };
    reader.readAsDataURL(selectedFile);
  }
}

// ========== UPLOAD PHOTO ==========
async function uploadPhoto() {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah foto profil orang lain", "error");
    return;
  }

  if (!selectedFile) {
    showToast("Pilih file terlebih dahulu", "error");
    return;
  }

  const uploadBtn = document.getElementById("uploadBtn");
  const originalText = uploadBtn.innerHTML;
  uploadBtn.disabled = true;
  uploadBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Uploading...';

  const formData = new FormData();
  formData.append("foto", selectedFile);

  try {
    const res = await fetch(
      `${API_BASE}/users/${profileUser.id}/upload-photo`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: formData,
      },
    );

    const data = await res.json();

    if (res.ok) {
      document.getElementById("profileFoto").src =
        data.user.fotoProfil + "?t=" + Date.now();

      if (profileUser.id === currentUser.id) {
        currentUser.fotoProfil = data.user.fotoProfil;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      }

      showToast("Foto profil berhasil diupload!");
      hideUploadModal();
    } else {
      showToast(data.error || "Gagal upload foto", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = originalText;
  }
}

// Export ke window
window.showUploadModal = showUploadModal;
window.hideUploadModal = hideUploadModal;
window.previewImage = previewImage;
window.uploadPhoto = uploadPhoto;