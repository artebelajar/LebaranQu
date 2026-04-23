// ===================================================
// FILE: comments.js - Fungsi Terkait Comments
// ===================================================

let commentsVisible = {};

// ========== LOAD COMMENTS ==========
async function loadComments(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Comments response:', response.status, response.statusText, errorText);
      
      let errorMessage = `Failed to load comments: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        // Ignore parse error
      }
      
      throw new Error(errorMessage);
    }

    const comments = await response.json();
    console.log(`💬 Loaded ${comments.length} comments`);
    return comments;
    
  } catch (error) {
    console.error("Error loading comments:", error);
    
    return { 
      error: true, 
      message: error.message,
      data: [] 
    };
  }
}

// ========== RENDER POST DETAIL ==========
async function renderPostDetail(postId) {
  if (window.innerWidth < 768) return;
  if (typeof allPosts === 'undefined') return;
  
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  const isLiked = LikeSystem.isLiked(post.id); // PAKAI LikeSystem
  const comments = await loadComments(postId);
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  const isOnline = onlineStatus && onlineStatus[post.user?.id]?.online || false;

  const detailContent = document.getElementById("postDetailContent");
  if (!detailContent) return;

  const postJSON = JSON.stringify(post).replace(/"/g, '&quot;');

  detailContent.innerHTML = `
    <div class="space-y-4">
      <!-- Author info -->
      <div class="flex items-start gap-3 pb-4 border-b">
        <div class="relative">
          <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
               class="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
               onclick="goToProfile(${post.user?.id})">
          <span class="w-2 h-2 md:w-3 md:h-3 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0 border-2 border-white"></span>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600" onclick="goToProfile(${post.user?.id})">
            ${post.user?.namaLengkap || "Unknown"}
          </h3>
          <span class="text-xs ${isOnline ? "text-green-500" : "text-gray-400"}">${isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>
      
      <h2 class="text-2xl font-bold text-gray-800">${post.judul}</h2>
      <div class="text-gray-700">${post.konten}</div>
      
      <!-- Stats -->
      <div class="flex items-center gap-4 mt-6 py-4 border-y">
        <button onclick="handleLike(${post.id})" 
                class="flex items-center gap-2 text-gray-500 active:scale-95 transition like-button ${isLiked ? "text-red-500" : ""}">
          <i class="fas fa-heart text-2xl ${isLiked ? "text-red-500" : ""}"></i>
          <span class="like-count font-semibold">${post.likeCount || 0}</span>
        </button>
        <span class="flex items-center gap-2 text-gray-500">
          <i class="fas fa-eye text-2xl"></i>
          <span class="font-semibold">${post.viewCount || 0}</span>
        </span>
      </div>
      
      <!-- Comments -->
      <div class="mt-6">
        <h3 class="font-semibold text-gray-700 mb-3">Komentar <span class="text-gray-500">(${commentCount})</span></h3>
        
        <div class="flex gap-2 mb-4">
          <img src="${currentUser?.fotoProfil || '/images/default-avatar.png'}" class="w-8 h-8 rounded-full object-cover">
          <div class="flex-1 flex gap-2">
            <input type="text" id="commentInput" placeholder="Tulis komentar..." 
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
            <button onclick="addComment(${post.id})" class="bg-emerald-600 text-white px-4 py-2 rounded-lg">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
        
        <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto">
          ${commentCount === 0 ? '<p class="text-center text-gray-500">Belum ada komentar</p>' : ''}
        </div>
      </div>
    </div>
  `;

  // Load comments
  if (commentCount > 0) {
    const list = document.getElementById("commentsList");
    list.innerHTML = comments.map(comment => `
      <div class="flex gap-2 comment-item p-2 rounded-lg">
        <img src="${comment.user?.fotoProfil || '/images/default-avatar.png'}" class="w-6 h-6 rounded-full object-cover cursor-pointer" onclick="goToProfile(${comment.user?.id})">
        <div class="flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-xs cursor-pointer hover:text-emerald-600" onclick="goToProfile(${comment.user?.id})">${comment.user?.namaLengkap}</span>
            <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
          </div>
          <p class="text-sm text-gray-700">${escapeHtml(comment.text)}</p>
        </div>
      </div>
    `).join('');
  }
}

// ========== ADD COMMENT ==========
async function addComment(postId) {
  const input = document.getElementById("commentInput") || document.getElementById("newCommentInput");
  
  if (!input) {
    showToast("Terjadi kesalahan teknis", "error");
    return;
  }
  
  const text = input.value.trim();
  if (!text) {
    showToast("Komentar tidak boleh kosong", "warning");
    return;
  }

  const commentKey = `comment_${postId}`;
  if (window.loadingStates?.[commentKey]) {
    showToast("Komentar sedang diproses...", "info");
    return;
  }

  const submitButton = document.querySelector('button[onclick*="addComment"]');
  const loader = submitButton ? new window.ButtonLoader(submitButton) : null;

  try {
    if (window.loadingStates) window.loadingStates[commentKey] = true;
    if (loader) loader.start("Mengirim...");

    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: window.currentUser.id, text: text }),
    });

    if (res.ok) {
      input.value = "";
      if (loader) loader.success("Terkirim!");
      
      // Reload komentar
      const comments = await loadComments(postId);
      
      // Update UI berdasarkan konteks
      if (window.location.pathname.includes('post-detail.html')) {
        // Di halaman post-detail
        updateCommentsUI(comments);
      } else {
        // Di index (sidebar)
        if (typeof renderPostDetail === 'function') {
          await renderPostDetail(postId);
        }
      }
      
      showToast("Komentar berhasil ditambahkan", "success");
    } else {
      const errorData = await res.json();
      if (loader) loader.error(errorData.error || "Gagal");
      showToast(errorData.error || "Gagal menambahkan komentar", "error");
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    if (loader) loader.error("Error");
    showToast("Terjadi kesalahan koneksi", "error");
  } finally {
    if (window.loadingStates) window.loadingStates[commentKey] = false;
  }
}

// ========== UPDATE COMMENTS UI ==========
async function updateCommentsUI(postId, comments) {
  // Cek apakah di halaman post-detail atau di sidebar
  const isPostDetailPage = window.location.pathname.includes('post-detail.html');
  
  if (isPostDetailPage) {
    // Di halaman post-detail.html
    const list = document.getElementById("commentsList");
    if (!list) return;
    
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada komentar</p>';
    } else {
      list.innerHTML = comments.map(comment => `
        <div class="flex gap-2 comment-item p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition">
          <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
               class="w-6 h-6 rounded-full object-cover cursor-pointer flex-shrink-0"
               onclick="goToProfile(${comment.user?.id})">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-xs cursor-pointer hover:text-emerald-600"
                    onclick="goToProfile(${comment.user?.id})">${comment.user?.namaLengkap || "Unknown"}</span>
              <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
            </div>
            <p class="text-sm text-gray-700 break-words">${escapeHtml(comment.text)}</p>
          </div>
        </div>
      `).join('');
    }
    
    // Update jumlah komentar
    const commentCountSpan = document.getElementById("commentCount");
    if (commentCountSpan) {
      commentCountSpan.textContent = `(${comments.length})`;
    }
    
  } else {
    // Di sidebar index.html
    if (typeof renderPostDetail === 'function') {
      await renderPostDetail(postId);
    }
  }
}

// ========== TOGGLE COMMENTS ==========
function toggleComments(postId) {
  commentsVisible[postId] = !commentsVisible[postId];
  renderPostDetail(postId);
}

// Export fungsi ke window
window.renderPostDetail = renderPostDetail;
window.toggleComments = toggleComments;
window.addComment = addComment;