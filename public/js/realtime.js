// ===================================================
// FILE: public/js/realtime.js
// ===================================================

let sseSource = null;
let reconnectAttempts = 0;

if (typeof window.REALTIME_LOADED === 'undefined') {
  window.REALTIME_LOADED = true;
  window.MAX_RECONNECT_ATTEMPTS = 5;

  function initSSE() {
    if (!window.currentUser) {
      console.log('⚠️ No user logged in, SSE not started');
      return;
    }
    console.log('📡 Initializing SSE for user:', window.currentUser.id);
    connectSSE();
  }

  function connectSSE() {
    if (!window.currentUser) return;

    if (sseSource) {
      sseSource.close();
    }

    const sseUrl = `/events?userId=${window.currentUser.id}`;
    console.log("📡 Connecting SSE to:", sseUrl);

    try {
      sseSource = new EventSource(sseUrl);

      sseSource.onopen = () => {
        console.log("✅ SSE connected");
        reconnectAttempts = 0;
      };

      sseSource.onmessage = (event) => {
        try {
          if (event.data && !event.data.startsWith(":")) {
            const data = JSON.parse(event.data);
            console.log("📡 SSE message:", data);
            handleRealtimeUpdate(data);
          }
        } catch (error) {
          console.error("SSE message error:", error);
        }
      };

      sseSource.onerror = (error) => {
        console.error("SSE error:", error);
        if (sseSource.readyState === EventSource.CLOSED) {
          console.log("📡 SSE connection closed");
          if (reconnectAttempts < window.MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`🔄 Reconnecting SSE in ${delay / 1000}s...`);
            setTimeout(connectSSE, delay);
          }
        }
      };
    } catch (error) {
      console.error("SSE connection error:", error);
    }
  }

  function closeSSE() {
    if (sseSource) {
      sseSource.close();
      sseSource = null;
    }
  }

  // ========== HANDLE ALL REAL-TIME UPDATES ==========
  function handleRealtimeUpdate(data) {
    console.log('🔄 Processing real-time update:', data);
    
    switch (data.type) {
      case 'connected':
        console.log('✅ Real-time connected');
        break;
        
      case 'user_online':
        handleUserOnline(data.userId, data.online);
        break;
        
      case 'new_post':
        handleNewPost(data.post);
        break;
        
      case 'update_likes':
        handleLikeUpdate(data.postId, data.likeCount, data.action, data.userId);
        break;
        
      case 'new_comment':
        handleNewComment(data.postId, data.comment);
        break;
        
      case 'new_notification':
        handleNewNotification(data.notification);
        break;
        
      default:
        console.log('Unknown event type:', data.type);
    }
  }

  // ========== HANDLE NEW NOTIFICATION ==========
  function handleNewNotification(notification) {
    console.log('🔔 New notification:', notification);
    
    // Update notifikasi di semua tempat
    if (typeof loadNotifications === 'function') {
      loadNotifications();
    }
    
    // Tampilkan toast
    if (typeof showToast === 'function') {
      let message = '';
      switch (notification.type) {
        case 'like':
          message = `${notification.fromUserName} menyukai postingan Anda`;
          break;
        case 'comment':
          message = `${notification.fromUserName} berkomentar di postingan Anda`;
          break;
        default:
          message = notification.message;
      }
      showToast(message, 'info');
    }
  }

  // ========== HANDLE USER ONLINE STATUS ==========
  function handleUserOnline(userId, online) {
    document.querySelectorAll(`[data-user-id="${userId}"]`).forEach(el => {
      const statusDot = el.querySelector('.online-status-dot');
      if (statusDot) {
        statusDot.className = `online-status-dot w-2 h-2 ${online ? 'bg-green-500' : 'bg-gray-400'} rounded-full absolute bottom-0 right-0`;
      }
    });
  }

  // ========== HANDLE NEW POST ==========
  function handleNewPost(post) {
    if (typeof allPosts !== 'undefined') {
      allPosts.unshift(post);
      if (typeof applyFiltersAndRender === 'function') {
        applyFiltersAndRender();
      }
    }
    if (typeof showToast === 'function') {
      showToast(`Cerita baru dari ${post.user?.namaLengkap || 'Alumni'}`, 'success');
    }
  }

  // ========== HANDLE LIKE UPDATE ==========
  function handleLikeUpdate(postId, likeCount, action, userId) {
    console.log(`❤️ Like update for post ${postId}: ${action}, count: ${likeCount}`);
    
    // 1. Update semua elemen di halaman (posts list)
    document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
      el.textContent = likeCount;
    });
    
    // 2. Update style untuk user yang melakukan like
    if (userId === window.currentUser?.id) {
      const isLiked = action === 'liked';
      document.querySelectorAll(`[data-post-id="${postId}"] .like-button`).forEach(btn => {
        if (isLiked) {
          btn.classList.remove('text-gray-500', 'hover:text-red-500');
          btn.classList.add('text-red-500');
          btn.querySelector('i')?.classList.add('text-red-500');
        } else {
          btn.classList.remove('text-red-500');
          btn.classList.add('text-gray-500', 'hover:text-red-500');
          btn.querySelector('i')?.classList.remove('text-red-500');
        }
      });
    }
    
    // 3. UPDATE POST DETAIL SIDEBAR jika sedang dibuka
    const detailContent = document.getElementById('postDetailContent');
    if (detailContent && !detailContent.classList.contains('hidden')) {
      // Cek apakah post detail yang sedang dibuka adalah post ini
      const detailPostId = detailContent.querySelector('[data-post-id]')?.dataset.postId;
      if (detailPostId == postId) {
        const likeCountSpan = document.getElementById('likeCount');
        if (likeCountSpan) {
          likeCountSpan.textContent = likeCount;
        }
        
        // Update like button di detail
        const likeButton = document.getElementById('likeButton');
        if (likeButton && userId === window.currentUser?.id) {
          const isLiked = action === 'liked';
          if (isLiked) {
            likeButton.classList.remove('text-gray-500');
            likeButton.classList.add('text-red-500');
            likeButton.querySelector('i')?.classList.add('text-red-500');
          } else {
            likeButton.classList.remove('text-red-500');
            likeButton.classList.add('text-gray-500');
            likeButton.querySelector('i')?.classList.remove('text-red-500');
          }
        }
      }
    }
    
    // 4. Update di array data
    if (typeof allPosts !== 'undefined') {
      const postIndex = allPosts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].likeCount = likeCount;
      }
    }
  }

  // ========== HANDLE NEW COMMENT ==========
  function handleNewComment(postId, comment) {
    // Update comment count di post list
    document.querySelectorAll(`[data-post-id="${postId}"] .comment-count`).forEach(el => {
      const currentCount = parseInt(el.textContent) || 0;
      el.textContent = currentCount + 1;
    });
    
    // Jika sedang melihat post ini, update comments list
    const isViewingThisPost = 
      (window.location.pathname.includes('post-detail.html') && 
       new URLSearchParams(window.location.search).get('id') == postId) ||
      (typeof selectedPostId !== 'undefined' && selectedPostId === postId);
    
    if (isViewingThisPost && typeof loadComments === 'function') {
      loadComments(postId).then(comments => {
        updateCommentsUI(comments);
      });
    }
    
    if (comment.user?.id !== window.currentUser?.id) {
      if (typeof showToast === 'function') {
        showToast(`${comment.user?.namaLengkap} berkomentar`, 'info');
      }
    }
  }

  // ========== UPDATE COMMENTS UI ==========
  function updateCommentsUI(comments) {
    const list = document.getElementById('commentsList');
    if (!list) return;
    
    if (comments.length === 0) {
      list.innerHTML = '<p class="text-center text-gray-500 py-4">Belum ada komentar</p>';
    } else {
      list.innerHTML = comments.map(c => `
        <div class="flex gap-2 comment-item p-2 rounded-lg hover:bg-gray-50">
          <img src="${c.user?.fotoProfil || '/images/default-avatar.png'}" 
               class="w-6 h-6 rounded-full object-cover cursor-pointer"
               onclick="goToProfile(${c.user?.id})">
          <div class="flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="font-medium text-xs cursor-pointer hover:text-emerald-600"
                    onclick="goToProfile(${c.user?.id})">${c.user?.namaLengkap || 'Unknown'}</span>
              <span class="text-xs text-gray-400">${formatTime(c.createdAt)}</span>
            </div>
            <p class="text-sm text-gray-700 break-words">${escapeHtml(c.text)}</p>
          </div>
        </div>
      `).join('');
    }
    
    const commentCountSpan = document.getElementById('commentCount');
    if (commentCountSpan) {
      commentCountSpan.textContent = `(${comments.length})`;
    }
  }

  // ========== HELPER FUNCTIONS ==========
  function formatTime(date) {
    return new Date(date).toLocaleDateString('id-ID', {
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

  // ========== EXPORT KE WINDOW ==========
  window.initSSE = initSSE;
  window.connectSSE = connectSSE;
  window.closeSSE = closeSSE;
  window.handleRealtimeUpdate = handleRealtimeUpdate;
  
  console.log('✅ Realtime.js loaded');
}