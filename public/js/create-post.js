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
    
    // CEK DOUBLE SUBMIT
    if (window.loadingStates.createPost) {
      console.log("⏳ Post already being created, ignoring duplicate click");
      showToast("Post sedang diproses, harap tunggu...", "info");
      return;
    }

    const submitButton = e.target.querySelector('button[type="submit"]');
    const loader = new ButtonLoader(submitButton);
    
    // Validasi input
    const judul = document.getElementById("postJudul").value.trim();
    const konten = document.getElementById("postKonten").value.trim();
    
    if (!judul || !konten) {
      showToast("Judul dan konten harus diisi", "error");
      return;
    }

    if (!currentUser) {
      showToast("Silakan login terlebih dahulu", "error");
      window.location.href = "/login.html";
      return;
    }

    const postData = {
      judul: judul,
      konten: konten,
      userId: currentUser.id,
    };

    try {
      // SET LOADING STATE
      window.loadingStates.createPost = true;
      loader.start("Memposting...");

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
        body: JSON.stringify(postData),
      });

      if (res.ok) {
        loader.success("Berhasil diposting!");
        hideCreatePostModal();
        document.getElementById("createPostForm").reset();
        
        // Refresh posts
        await loadAllPosts();
        await loadLeaderboard();
        
        showToast("Cerita berhasil diposting!", "success");
      } else {
        const errorData = await res.json();
        loader.error(errorData.error || "Gagal memposting");
        showToast(errorData.error || "Gagal memposting", "error");
      }
    } catch (error) {
      console.error("Create post error:", error);
      loader.error("Error: " + error.message);
      showToast("Error: " + error.message, "error");
    } finally {
      // RESET LOADING STATE
      window.loadingStates.createPost = false;
    }
  });