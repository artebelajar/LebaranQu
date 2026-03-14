// ===================================================
// FILE: create-post.js - Fungsi Create Post Modal
// ===================================================

// ========== CREATE POST MODAL ==========
function showCreatePostModal() {
  document.getElementById("createPostModal").classList.remove("hidden");
  document.getElementById("createPostModal").classList.add("flex");
}

function hideCreatePostModal() {
  document.getElementById("createPostModal").classList.add("hidden");
  document.getElementById("createPostModal").classList.remove("flex");
}

// ========== CREATE POST ==========
document
  .getElementById("createPostForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const postData = {
      judul: document.getElementById("postJudul").value,
      konten: document.getElementById("postKonten").value,
      userId: currentUser.id,
    };
    try {
      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify(postData),
      });
      if (res.ok) {
        hideCreatePostModal();
        document.getElementById("createPostForm").reset();
        await loadAllPosts();
        await loadLeaderboard();
      } else {
        alert("Gagal membuat postingan");
      }
    } catch (error) {
      alert("Error: " + error.message);
    }
  });