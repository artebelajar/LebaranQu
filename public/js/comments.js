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
    return { error: true, message: error.message, data: [] };
  }
}

// ========== LOAD COMMENTS DAN UPDATE UI ==========
async function loadAndRenderComments(postId, isDetailPage = false) {
  const comments = await loadComments(postId);
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  
  // Update comment count di berbagai tempat
  document.querySelectorAll(`.comment-count[data-post-id="${postId}"]`).forEach(el => {
    el.textContent = commentCount;
  });
  
  if (isDetailPage) {
    updateCommentsUI(comments);
  }
  
  return comments;
}

// ========== UPDATE COMMENTS UI ==========
function updateCommentsUI(comments) {
  const list = document.getElementById("commentsList");
  if (!list) return;
  
  if (!comments || comments.length === 0) {
    list.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>';
    return;
  }
  
  list.innerHTML = comments.map(comment => `
    <div class="flex gap-2 comment-item p-2 rounded-lg hover:bg-gray-50 active:bg-gray-100 transition">
      <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
           class="w-6 h-6 rounded-full object-cover cursor-pointer flex-shrink-0"
           onclick="goToProfile(${comment.user?.id})"
           onerror="this.src='/images/default-avatar.png'">
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="font-medium text-xs cursor-pointer hover:text-emerald-600"
                onclick="goToProfile(${comment.user?.id})">${escapeHtml(comment.user?.namaLengkap || "Unknown")}</span>
          <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
        </div>
        <p class="text-sm text-gray-700 break-words">${escapeHtml(comment.text)}</p>
      </div>
    </div>
  `).join('');
  
  // Update jumlah komentar
  const commentCountSpan = document.getElementById("commentCount");
  if (commentCountSpan) {
    commentCountSpan.textContent = `(${comments.length})`;
  }
}

// ========== RENDER POST DETAIL (UNTUK SIDEBAR DESKTOP) ==========
async function renderPostDetail(postId) {
  // Hanya untuk desktop (lebar > 768px)
  if (window.innerWidth < 768) return;
  if (typeof allPosts === 'undefined') return;
  
  const post = allPosts.find(p => p.id === postId);
  if (!post) return;

  // Gunakan LikeSystem jika ada, fallback ke userLikes
  let isLiked = false;
  if (window.LikeSystem && typeof window.LikeSystem.isLiked === 'function') {
    isLiked = window.LikeSystem.isLiked(post.id);
  } else if (window.userLikes) {
    isLiked = window.userLikes.has(post.id);
  }
  
  const comments = await loadComments(postId);
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  const isOnline = window.onlineStatus && window.onlineStatus[post.user?.id]?.online || false;

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
               onclick="goToProfile(${post.user?.id})"
               onerror="this.src='/images/default-avatar.png'">
          <span class="w-2 h-2 md:w-3 md:h-3 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0 border-2 border-white"></span>
        </div>
        <div class="flex-1">
          <h3 class="font-semibold text-gray-800 cursor-pointer hover:text-emerald-600" onclick="goToProfile(${post.user?.id})">
            ${escapeHtml(post.user?.namaLengkap || "Unknown")}
          </h3>
          <span class="text-xs ${isOnline ? "text-green-500" : "text-gray-400"}">${isOnline ? "Online" : "Offline"}</span>
        </div>
      </div>
      
      <h2 class="text-2xl font-bold text-gray-800">${escapeHtml(post.judul)}</h2>
      <div class="text-gray-700 whitespace-pre-line">${escapeHtml(post.konten)}</div>
      
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
          <img src="${window.currentUser?.fotoProfil || '/images/default-avatar.png'}" 
               class="w-8 h-8 rounded-full object-cover"
               onerror="this.src='/images/default-avatar.png'">
          <div class="flex-1 flex gap-2">
            <input type="text" id="newCommentInput" placeholder="Tulis komentar..." 
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
            <button onclick="addComment(${post.id})" class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
        
        <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto">
          ${commentCount === 0 ? '<p class="text-center text-gray-500 py-4">Belum ada komentar. Jadilah yang pertama!</p>' : ''}
        </div>
      </div>
    </div>
  `;

  // Load comments if any
  if (commentCount > 0) {
    updateCommentsUI(comments);
  }
}

// ========== ADD COMMENT ==========
async function addComment(postId) {
  const input = document.getElementById("commentInput") || document.getElementById("newCommentInput");
  
  if (!input) {
    if (typeof showToast === 'function') showToast("Terjadi kesalahan teknis", "error");
    return;
  }
  
  const text = input.value.trim();
  if (!text) {
    if (typeof showToast === 'function') showToast("Komentar tidak boleh kosong", "warning");
    return;
  }

  const commentKey = `comment_${postId}`;
  if (window.loadingStates && window.loadingStates[commentKey]) {
    if (typeof showToast === 'function') showToast("Komentar sedang diproses...", "info");
    return;
  }

  const submitButton = document.querySelector('button[onclick*="addComment"]');
  let loader = null;
  
  if (submitButton && window.ButtonLoader) {
    loader = new window.ButtonLoader(submitButton);
  }

  try {
    if (window.loadingStates) window.loadingStates[commentKey] = true;
    if (loader) loader.start("Mengirim...");

    const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: window.currentUser?.id, text: text }),
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
        // Di index (sidebar desktop)
        if (typeof renderPostDetail === 'function') {
          await renderPostDetail(postId);
        }
      }
      
      if (typeof showToast === 'function') showToast("Komentar berhasil ditambahkan", "success");
    } else {
      const errorData = await res.json();
      if (loader) loader.error(errorData.error || "Gagal");
      if (typeof showToast === 'function') showToast(errorData.error || "Gagal menambahkan komentar", "error");
    }
  } catch (error) {
    console.error("Error adding comment:", error);
    if (loader) loader.error("Error");
    if (typeof showToast === 'function') showToast("Terjadi kesalahan koneksi", "error");
  } finally {
    if (window.loadingStates) window.loadingStates[commentKey] = false;
  }
}

// ========== TOGGLE COMMENTS ==========
function toggleComments(postId) {
  commentsVisible[postId] = !commentsVisible[postId];
  renderPostDetail(postId);
}

// ========== HELPER FUNCTIONS ==========
function formatTime(date) {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    day: 'numeric',
    month: 'short'
  });
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ========== EXPORT FUNCTIONS KE WINDOW ==========
window.loadComments = loadComments;
window.renderPostDetail = renderPostDetail;
window.toggleComments = toggleComments;
window.addComment = addComment;
window.updateCommentsUI = updateCommentsUI;
window.formatTime = formatTime;
window.escapeHtml = escapeHtml;

console.log("✅ Comments.js loaded");