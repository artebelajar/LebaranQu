// ===================================================
// FILE: profile-posts.js - Fungsi Postingan User (UPDATED)
// ===================================================

// ========== LOAD USER POSTS ==========
async function loadUserPosts(userId) {
  try {
    console.log(`Loading all posts for user ${userId}...`);
    
    const postsRes = await fetch(`${API_BASE}/posts/user/${userId}`);
    if (!postsRes.ok) {
      console.error("Posts response not OK:", postsRes.status);
      throw new Error("Gagal memuat postingan");
    }

    const posts = await postsRes.json();
    console.log(`User posts loaded: ${posts.length} posts`);

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

    // Tampilkan SEMUA posts (tanpa slice)
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

// ========== RENDER USER POSTS (SEMUA POSTS) ==========
function renderUserPosts(posts) {
  const postsList = document.getElementById("userPosts");
  
  if (!postsList) return;
  
  if (posts.length === 0) {
    postsList.innerHTML = `
      <div class="bg-gray-50 rounded-xl p-8 text-center">
        <i class="fas fa-newspaper text-4xl text-gray-400 mb-3"></i>
        <p class="text-gray-500">Belum ada postingan</p>
        ${
          window.isOwnProfile
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
    // TAMPILKAN SEMUA POSTS (tidak di-slice)
    postsList.innerHTML = posts
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) // Urutkan dari terbaru
      .map((post) => {
        const postDate = formatDate(post.createdAt);
        const postContent = post.konten.substring(0, 200);
        const hasMore = post.konten.length > 200;
        
        return `
        <div class="bg-white rounded-xl shadow p-6 post-card hover:shadow-md transition" data-post-id="${post.id}">
          <div class="flex justify-between items-start mb-3">
            <h4 class="font-semibold text-lg text-gray-800">${escapeHtml(post.judul)}</h4>
            <span class="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">${postDate}</span>
          </div>
          
          <p class="text-gray-600 mb-4 leading-relaxed">
            ${escapeHtml(postContent)}${hasMore ? '...' : ''}
          </p>
          
          <div class="flex items-center justify-between border-t pt-4">
            <div class="flex items-center space-x-4 text-sm">
              <span class="flex items-center text-gray-600">
                <i class="fas fa-heart text-red-500 mr-1"></i> 
                ${post.likeCount || 0} likes
              </span>
              <span class="flex items-center text-gray-600">
                <i class="fas fa-eye text-gray-500 mr-1"></i> 
                ${post.viewCount || 0} views
              </span>
            </div>
            
            ${
              window.isOwnProfile
                ? `
              <div class="flex space-x-2">
                <button onclick="showEditPostModal(${post.id})" 
                        class="text-blue-600 hover:text-blue-800 transition p-2 hover:bg-blue-50 rounded-lg" 
                        title="Edit Postingan">
                  <i class="fas fa-edit"></i>
                </button>
                <button onclick="showDeletePostModal(${post.id})" 
                        class="text-red-600 hover:text-red-800 transition p-2 hover:bg-red-50 rounded-lg" 
                        title="Hapus Postingan">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `
                : ""
            }
          </div>
          
          <!-- Link ke detail post -->
          <div class="mt-3 text-right">
            <a href="/post-detail.html?id=${post.id}" 
               class="text-xs text-emerald-600 hover:text-emerald-800 inline-flex items-center gap-1">
              Baca selengkapnya <i class="fas fa-arrow-right text-xs"></i>
            </a>
          </div>
        </div>
      `;
      })
      .join("");
  }
}

// ========== FORMAT DATE HELPER ==========
function formatDate(dateString) {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ========== ESCAPE HTML HELPER ==========
function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}