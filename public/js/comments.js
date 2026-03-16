// ===================================================
// FILE: comments.js - Fungsi Terkait Comments
// ===================================================

let commentsVisible = {};

// ========== LOAD COMMENTS ==========
async function loadComments(postId) {
  try {
    // console.log(`📝 Loading comments for post ${postId}`);
    
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Comments response:', response.status, response.statusText, errorText);
      
      // Coba parse error message
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
    
    // Return empty array with error indicator
    return { 
      error: true, 
      message: error.message,
      data: [] 
    };
  }
}

// ========== RENDER POST DETAIL DENGAN ERROR HANDLING ==========
async function renderPostDetail(postId) {
  // Hanya render jika bukan mobile
  if (window.innerWidth < 768) {
    // console.log("Mobile detected, skipping sidebar render");
    return;
  }
  
  // Cek apakah allPosts tersedia
  if (typeof allPosts === 'undefined') {
    console.error("allPosts is not defined");
    return;
  }
  
  const post = allPosts.find((p) => p.id === postId);
  if (!post) {
    console.error(`Post with id ${postId} not found`);
    return;
  }

  const isLiked = userLikes ? userLikes.has(post.id) : false;
  const comments = await loadComments(postId);
  const commentCount = Array.isArray(comments) ? comments.length : 0;
  const isOnline = onlineStatus && onlineStatus[post.user?.id] ? onlineStatus[post.user.id].online : false;

  const detailContent = document.getElementById("postDetailContent");
  if (!detailContent) {
    console.error("Element #postDetailContent not found in DOM");
    return;
  }

  // Escape post untuk JSON di atribut onclick
  const postJSON = JSON.stringify(post).replace(/"/g, '&quot;');

  // Tampilkan error jika comments gagal dimuat
  const commentsHtml = comments.error 
    ? `<div class="text-center py-4 text-red-500">
        <i class="fas fa-exclamation-circle mr-1"></i>
        Gagal memuat komentar: ${comments.message}
       </div>`
    : commentCount === 0 
      ? '<p class="text-center text-gray-500 py-4 text-sm">Belum ada komentar. Jadilah yang pertama!</p>'
      : comments.map(comment => `
          <div class="flex gap-2 comment-item p-2 rounded-lg">
            <img src="${comment.user?.fotoProfil || '/images/default-avatar.png'}" 
                 class="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                 onclick="goToProfile(${comment.user?.id})"
                 onerror="this.src='/images/default-avatar.png'">
            <div class="flex-1">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-medium text-xs md:text-sm cursor-pointer hover:text-emerald-600"
                      onclick="goToProfile(${comment.user?.id})">${comment.user?.namaLengkap || "Unknown"}</span>
                <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
              </div>
              <p class="text-xs md:text-sm text-gray-700">${escapeHtml(comment.text)}</p>
            </div>
          </div>
        `).join('');

  detailContent.innerHTML = `
    <div class="space-y-4">
      <!-- Header, konten post, dll (sama seperti sebelumnya) -->
      <!-- ... -->
      
      <!-- Comments Section -->
      <div class="space-y-4 mt-4">
        <div class="flex gap-2">
          <img src="${currentUser?.fotoProfil || '/images/default-avatar.png'}" 
               class="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0">
          <div class="flex-1 flex gap-2">
            <input type="text" id="newCommentInput" 
                   placeholder="Tulis komentar..." 
                   class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm">
            <button onclick="addComment(${post.id})" 
                    class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm whitespace-nowrap">
              <i class="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
        <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
          ${commentsHtml}
        </div>
      </div>
    </div>
  `;
}

// ========== ADD COMMENT ==========
async function addComment(postId) {
  const input = document.getElementById("newCommentInput");
  if (!input) {
    console.error("Comment input not found");
    return;
  }
  
  const commentText = input.value.trim();
  if (!commentText) return;

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id, text: commentText }),
    });

    if (!response.ok) {
      const error = await response.json();
      alert(error.error || "Gagal menambahkan komentar");
      return;
    }

    input.value = "";
    await renderPostDetail(postId);
  } catch (error) {
    console.error("Error adding comment:", error);
    alert("Terjadi kesalahan");
  }
}

// ========== TOGGLE COMMENTS ==========
function toggleComments(postId) {
  commentsVisible[postId] = !commentsVisible[postId];
  renderPostDetail(postId);
}

// ========== RENDER POST DETAIL ==========
async function renderPostDetail(postId) {
  // Hanya render jika bukan mobile
  if (window.innerWidth < 768) {
    // console.log("Mobile detected, skipping sidebar render");
    return;
  }
  // Cek apakah allPosts tersedia
  if (typeof allPosts === 'undefined') {
    console.error("allPosts is not defined");
    return;
  }
  
  const post = allPosts.find((p) => p.id === postId);
  if (!post) {
    console.error(`Post with id ${postId} not found`);
    return;
  }

  const isLiked = userLikes ? userLikes.has(post.id) : false;
  const showComments = commentsVisible[postId] || false;
  const comments = await loadComments(postId);
  const commentCount = comments.length;
  const isOnline = onlineStatus && onlineStatus[post.user?.id] ? onlineStatus[post.user.id].online : false;

  // Cek apakah elemen detailContent ada
  const detailContent = document.getElementById("postDetailContent");
  if (!detailContent) {
    console.error("Element #postDetailContent not found in DOM");
    return;
  }

  // Escape post untuk JSON di atribut onclick
  const postJSON = JSON.stringify(post).replace(/"/g, '&quot;');

  detailContent.innerHTML = `
    <div class="space-y-4">
      <!-- Header -->
      <div class="flex items-start gap-3 pb-4 border-b">
        <div class="relative">
          <img src="${post.user?.fotoProfil || "/images/default-avatar.png"}" 
               class="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
               onclick="goToProfile(${post.user?.id})"
               onerror="this.src='/images/default-avatar.png'">
          <span class="w-2 h-2 md:w-3 md:h-3 ${isOnline ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0 border-2 border-white"></span>
        </div>
        <div class="flex-1">
          <div class="flex flex-col md:flex-row md:items-center gap-1 md:gap-2">
            <h3 class="font-semibold text-gray-800 text-sm md:text-base cursor-pointer hover:text-emerald-600 transition"
                onclick="goToProfile(${post.user?.id})">
              ${post.user?.namaLengkap || "Unknown"}
            </h3>
            <span class="text-xs ${isOnline ? "text-green-500" : "text-gray-400"}">
              ${isOnline ? "● Online" : "● Offline"}
            </span>
          </div>
          <p class="text-xs text-gray-500">${post.user?.title || "Alumni"}</p>
          <div class="flex flex-wrap items-center gap-2 mt-1">
            <span class="px-2 py-0.5 text-xs rounded-full ${getSchoolColor(post.user?.asalSekolah)}">
              ${getSchoolName(post.user?.asalSekolah)}
            </span>
            <span class="text-xs text-gray-400"><i class="fas fa-clock mr-1"></i> ${formatDate(post.createdAt)}</span>
          </div>
        </div>
      </div>
      
      <h2 class="text-lg md:text-xl font-bold text-gray-800">${post.judul}</h2>
      <div class="text-sm md:text-base text-gray-700 leading-relaxed whitespace-pre-line">${post.konten}</div>
      ${post.gambar ? `<div class="mt-4"><img src="${post.gambar}" class="w-full rounded-lg max-h-96 object-cover"></div>` : ""}
      
      <!-- Stats bar -->
      <div class="flex flex-col md:flex-row items-start md:items-center justify-between py-3 border-y gap-3">
        <div class="flex items-center space-x-4">
          <button onclick="handleLike(${post.id})" 
                  class="flex items-center space-x-2 transition like-button ${isLiked ? "text-red-500" : "text-gray-500 hover:text-red-500"}">
            <i class="fas fa-heart text-lg md:text-xl ${isLiked ? "text-red-500" : ""}"></i>
            <span class="font-semibold like-count">${post.likeCount || 0}</span>
          </button>
          <span class="flex items-center text-gray-500 text-sm md:text-base">
            <i class="fas fa-eye mr-1"></i> ${post.viewCount || 0}
          </span>
        </div>
        
        <!-- Share Buttons -->
        <div class="flex items-center space-x-3">
          <button onclick="shareToWhatsApp('${postJSON}')" 
                  class="text-green-600 hover:text-green-700 transition text-lg md:text-xl" title="Share ke WhatsApp">
            <i class="fab fa-whatsapp"></i>
          </button>
          <button onclick="shareToFacebook('${postJSON}')" 
                  class="text-blue-600 hover:text-blue-700 transition text-lg md:text-xl" title="Share ke Facebook">
            <i class="fab fa-facebook"></i>
          </button>
          <button onclick="shareToTwitter('${postJSON}')" 
                  class="text-sky-500 hover:text-sky-600 transition text-lg md:text-xl" title="Share ke Twitter">
            <i class="fab fa-twitter"></i>
          </button>
          <button onclick="shareToInstagram('${postJSON}')" 
                  class="text-pink-600 hover:text-pink-700 transition text-lg md:text-xl" title="Copy link">
            <i class="fab fa-instagram"></i>
          </button>
        </div>
      </div>
      
      <!-- Typing Indicator -->
      <div id="typingIndicator" class="hidden text-sm text-gray-500 italic">
        <i class="fas fa-pencil-alt mr-1"></i> Seseorang sedang mengetik...
      </div>
      
      <!-- Comments Toggle -->
      <div class="flex justify-end">
        <button onclick="toggleComments(${post.id})" 
                class="flex items-center space-x-2 text-gray-500 hover:text-emerald-600 transition text-sm">
          <i class="fas fa-comments mr-1"></i>
          <span>${commentCount} Komentar</span>
          <i class="fas ${showComments ? "fa-chevron-up" : "fa-chevron-down"} ml-1"></i>
        </button>
      </div>
      
      ${showComments ? `
        <div class="space-y-4 mt-4">
          <div class="flex gap-2">
            <img src="${currentUser?.fotoProfil || "/images/default-avatar.png"}" 
                 class="w-6 h-6 md:w-8 md:h-8 rounded-full object-cover flex-shrink-0">
            <div class="flex-1 flex gap-2">
              <input type="text" id="newCommentInput" 
                     placeholder="Tulis komentar..." 
                     class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 text-sm"
                     onkeyup="if(this.value.trim()) sendTypingStatus(${post.id}, true)"
                     onblur="sendTypingStatus(${post.id}, false)">
              <button onclick="addComment(${post.id})" 
                      class="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm whitespace-nowrap">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
          </div>
          <div id="commentsList" class="space-y-3 max-h-60 overflow-y-auto pr-1">
            ${commentCount === 0 
              ? '<p class="text-center text-gray-500 py-4 text-sm">Belum ada komentar. Jadilah yang pertama!</p>'
              : comments.map(comment => `
                <div class="flex gap-2 comment-item p-2 rounded-lg">
                  <img src="${comment.user?.fotoProfil || "/images/default-avatar.png"}" 
                       class="w-5 h-5 md:w-6 md:h-6 rounded-full object-cover flex-shrink-0 cursor-pointer hover:opacity-80"
                       onclick="goToProfile(${comment.user?.id})">
                  <div class="flex-1">
                    <div class="flex items-center gap-2 flex-wrap">
                      <span class="font-medium text-xs md:text-sm cursor-pointer hover:text-emerald-600"
                            onclick="goToProfile(${comment.user?.id})">${comment.user?.namaLengkap || "Unknown"}</span>
                      <span class="text-xs text-gray-400">${formatTime(comment.createdAt)}</span>
                    </div>
                    <p class="text-xs md:text-sm text-gray-700">${comment.text}</p>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Export fungsi ke window
window.renderPostDetail = renderPostDetail;
window.toggleComments = toggleComments;
window.addComment = addComment;