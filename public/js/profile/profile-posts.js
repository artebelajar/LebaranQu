// ===================================================
// FILE: profile/profile-posts.js - Fungsi Postingan User
// ===================================================

// ========== LOAD USER POSTS ==========
async function loadUserPosts(userId) {
  try {
    const postsRes = await fetch(`${API_BASE}/posts/user/${userId}`);
    if (!postsRes.ok) {
      console.error("Posts response not OK:", postsRes.status);
      throw new Error("Gagal memuat postingan");
    }

    const posts = await postsRes.json();
    console.log("User posts:", posts);

    // Hitung total likes
    const totalLikes = posts.reduce(
      (sum, post) => sum + (post.likeCount || 0),
      0,
    );

    // Update total posts dan likes
    document.getElementById("totalPosts").textContent = posts.length;
    document.getElementById("totalLikes").textContent = totalLikes;

    // Hitung peringkat
    await calculateUserRank(profileUser.asalSekolah, userId, totalLikes);

    // Tampilkan posts
    renderUserPosts(posts);
  } catch (error) {
    console.error("Error loading posts:", error);
    document.getElementById("userPosts").innerHTML = `
      <div class="text-center py-8 text-red-500">
        <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
        <p>Gagal memuat postingan</p>
        <p class="text-sm mt-2">${error.message}</p>
      </div>
    `;
  }
}

// ========== RENDER USER POSTS ==========
function renderUserPosts(posts) {
  const postsList = document.getElementById("userPosts");
  
  if (posts.length === 0) {
    postsList.innerHTML = `
      <div class="bg-gray-50 rounded-xl p-8 text-center">
        <i class="fas fa-newspaper text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-500">Belum ada postingan</p>
        ${
          isOwnProfile
            ? `
            <a href="/" class="inline-block mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg hover:bg-emerald-700 transition">
                Buat Postingan Pertama
            </a>
        `
            : ""
        }
      </div>
    `;
  } else {
    postsList.innerHTML = posts
      .slice(0, 5)
      .map(
        (post) => `
        <div class="bg-white rounded-xl shadow p-6 post-card">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-semibold text-lg">${escapeHtml(post.judul)}</h4>
            <span class="text-xs text-gray-500">${formatDate(post.createdAt)}</span>
          </div>
          <p class="text-gray-600 mb-4">${escapeHtml(post.konten.substring(0, 150))}${post.konten.length > 150 ? "..." : ""}</p>
          <div class="flex items-center justify-between">
            <div class="flex items-center text-sm text-gray-500">
              <i class="fas fa-heart text-red-500 mr-1"></i> ${post.likeCount || 0} likes
              <i class="fas fa-eye text-gray-500 ml-3 mr-1"></i> ${post.viewCount || 0}
            </div>
            ${
              isOwnProfile
                ? `
              <div class="flex space-x-2">
                <button onclick="showEditPostModal(${post.id})" class="text-blue-600 hover:text-blue-800 transition" title="Edit">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="showDeletePostModal(${post.id})" class="text-red-600 hover:text-red-800 transition" title="Hapus">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `
                : ""
            }
          </div>
        </div>
      `,
      )
      .join("");
  }
}