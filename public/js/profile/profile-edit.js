// ===================================================
// FILE: profile/profile-edit.js - Fungsi Edit Informasi Dasar
// ===================================================

let editMode = false;
let currentEditField = null;

// ========== ENABLE EDIT MODE ==========
function enableEditMode() {
  document.getElementById("infoViewMode").classList.add("hidden");
  document.getElementById("infoEditMode").classList.remove("hidden");
  document.getElementById("editInfoBtn").classList.add("hidden");
  document.getElementById("saveInfoBtn").classList.remove("hidden");
  document.getElementById("cancelInfoBtn").classList.remove("hidden");
  
  // Set nilai awal di form edit
  document.getElementById("editSekolah").value = profileUser.asalSekolah;
  document.getElementById("editEmail").value = profileUser.email;
  document.getElementById("editTelepon").value = profileUser.nomorTelepon || "";
  document.getElementById("editTitle").value = profileUser.title || "Alumni";
}

// ========== CANCEL EDIT ==========
function cancelEdit() {
  document.getElementById("infoViewMode").classList.remove("hidden");
  document.getElementById("infoEditMode").classList.add("hidden");
  document.getElementById("editInfoBtn").classList.remove("hidden");
  document.getElementById("saveInfoBtn").classList.add("hidden");
  document.getElementById("cancelInfoBtn").classList.add("hidden");
}

// ========== SAVE INFO ==========
async function saveInfo() {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah data orang lain", "error");
    return;
  }

  const updatedData = {
    asalSekolah: document.getElementById("editSekolah").value,
    email: document.getElementById("editEmail").value,
    nomorTelepon: document.getElementById("editTelepon").value,
    title: document.getElementById("editTitle").value
  };

  // Validasi email
  if (!updatedData.email || !updatedData.email.includes('@')) {
    showToast("Email tidak valid", "error");
    return;
  }

  const saveBtn = document.getElementById("saveInfoBtn");
  const originalText = saveBtn.innerHTML;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i>...';

  try {
    const res = await fetch(`${API_BASE}/users/${profileUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify(updatedData),
    });

    const data = await res.json();

    if (res.ok) {
      // Update data lokal
      profileUser = { ...profileUser, ...updatedData };
      
      // Update UI
      document.getElementById("profileSekolah").textContent = getSchoolName(updatedData.asalSekolah);
      document.getElementById("profileEmail").textContent = updatedData.email;
      document.getElementById("profileTelepon").textContent = updatedData.nomorTelepon || "-";
      document.getElementById("profileTitleText").textContent = updatedData.title;
      document.getElementById("profileTitleDisplay").textContent = updatedData.title;

      if (profileUser.id === currentUser.id) {
        currentUser = { ...currentUser, ...updatedData };
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
        document.getElementById("userNameDisplay").textContent = currentUser.namaLengkap;
      }

      showToast("Data berhasil diperbarui!");
      cancelEdit();
    } else {
      showToast(data.error || "Gagal update data", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  } finally {
    saveBtn.innerHTML = originalText;
  }
}

// ========== START EDIT FIELD ==========
function startEdit(field) {
  if (!isOwnProfile) return;
  currentEditField = field;
  enableEditMode();
}

// Export ke window
window.enableEditMode = enableEditMode;
window.cancelEdit = cancelEdit;
window.saveInfo = saveInfo;
window.startEdit = startEdit;