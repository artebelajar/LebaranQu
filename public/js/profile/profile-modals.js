// ===================================================
// FILE: profile/profile-modals.js - Fungsi Modal (Bio, Post)
// ===================================================

let currentEditPost = null;

// ========== SHOW EDIT BIO MODAL ==========
function showEditBioModal() {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah bio orang lain", "error");
    return;
  }
  document.getElementById("editBioText").value =
    profileUser.bioSingkat || "";
  document.getElementById("editBioModal").classList.remove("hidden");
  document.getElementById("editBioModal").classList.add("flex");
}

// ========== HIDE EDIT BIO MODAL ==========
function hideEditBioModal() {
  document.getElementById("editBioModal").classList.add("hidden");
  document.getElementById("editBioModal").classList.remove("flex");
}

// ========== SAVE BIO ==========
async function saveBio() {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah bio orang lain", "error");
    return;
  }

  const newBio = document.getElementById("editBioText").value.trim();

  if (newBio === profileUser.bioSingkat) {
    hideEditBioModal();
    return;
  }

  const saveBtn = document.getElementById("saveBioBtn");
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';

  try {
    const res = await fetch(`${API_BASE}/users/${profileUser.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ bioSingkat: newBio }),
    });

    const data = await res.json();

    if (res.ok) {
      profileUser.bioSingkat = newBio;
      document.getElementById("profileBio").textContent =
        newBio || "Belum ada bio";

      if (profileUser.id === currentUser.id) {
        currentUser.bioSingkat = newBio;
        localStorage.setItem("currentUser", JSON.stringify(currentUser));
      }

      showToast("Bio berhasil diperbarui!");
      hideEditBioModal();
    } else {
      showToast(data.error || "Gagal update bio", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// ========== SHOW EDIT POST MODAL ==========
function showEditPostModal(postId) {
  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah postingan orang lain", "error");
    return;
  }

  fetch(`${API_BASE}/posts/${postId}`)
    .then((res) => res.json())
    .then((post) => {
      document.getElementById("editPostId").value = post.id;
      document.getElementById("editPostJudul").value = post.judul;
      document.getElementById("editPostKonten").value = post.konten;
      document.getElementById("editPostModal").classList.remove("hidden");
      document.getElementById("editPostModal").classList.add("flex");
    })
    .catch((error) => {
      console.error("Error loading post:", error);
      showToast("Gagal memuat data postingan", "error");
    });
}

// ========== HIDE EDIT POST MODAL ==========
function hideEditPostModal() {
  document.getElementById("editPostModal").classList.add("hidden");
  document.getElementById("editPostModal").classList.remove("flex");
  document.getElementById("editPostForm").reset();
}

// ========== HANDLE EDIT POST ==========
async function handleEditPost(e) {
  e.preventDefault();

  if (!isOwnProfile) {
    showToast("Tidak dapat mengubah postingan orang lain", "error");
    hideEditPostModal();
    return;
  }

  const postId = document.getElementById("editPostId").value;
  const judul = document.getElementById("editPostJudul").value;
  const konten = document.getElementById("editPostKonten").value;

  const saveBtn = e.target.querySelector('button[type="submit"]');
  const originalText = saveBtn.innerHTML;
  saveBtn.disabled = true;
  saveBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Menyimpan...';

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ judul, konten }),
    });

    if (res.ok) {
      showToast("Cerita berhasil diperbarui!");
      hideEditPostModal();
      await loadUserPosts(profileUser.id);
      await refreshRank();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal memperbarui cerita", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;
  }
}

// ========== SHOW DELETE POST MODAL ==========
function showDeletePostModal(postId) {
  if (!isOwnProfile) {
    showToast("Tidak dapat menghapus postingan orang lain", "error");
    return;
  }
  document.getElementById("deletePostId").value = postId;
  document.getElementById("deletePostModal").classList.remove("hidden");
  document.getElementById("deletePostModal").classList.add("flex");
}

// ========== HIDE DELETE POST MODAL ==========
function hideDeletePostModal() {
  document.getElementById("deletePostModal").classList.add("hidden");
  document.getElementById("deletePostModal").classList.remove("flex");
  document.getElementById("deletePostId").value = "";
}

// ========== CONFIRM DELETE POST ==========
async function confirmDeletePost() {
  if (!isOwnProfile) {
    showToast("Tidak dapat menghapus postingan orang lain", "error");
    hideDeletePostModal();
    return;
  }

  const postId = document.getElementById("deletePostId").value;
  const deleteBtn = document.querySelector(
    "#deletePostModal button.bg-red-600",
  );
  const originalText = deleteBtn.innerHTML;
  deleteBtn.disabled = true;
  deleteBtn.innerHTML =
    '<i class="fas fa-spinner fa-spin mr-2"></i>Menghapus...';

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
    });

    if (res.ok) {
      showToast("Cerita berhasil dihapus!");
      hideDeletePostModal();
      await loadUserPosts(profileUser.id);
      await refreshRank();
    } else {
      const data = await res.json();
      showToast(data.error || "Gagal menghapus cerita", "error");
    }
  } catch (error) {
    showToast("Error: " + error.message, "error");
  } finally {
    deleteBtn.disabled = false;
    deleteBtn.innerHTML = originalText;
  }
}

// Export ke window
window.showEditBioModal = showEditBioModal;
window.hideEditBioModal = hideEditBioModal;
window.saveBio = saveBio;
window.showEditPostModal = showEditPostModal;
window.hideEditPostModal = hideEditPostModal;
window.showDeletePostModal = showDeletePostModal;
window.hideDeletePostModal = hideDeletePostModal;
window.confirmDeletePost = confirmDeletePost;

// Setup event listener
document.getElementById("editPostForm")?.addEventListener("submit", handleEditPost);