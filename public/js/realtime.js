// ===================================================
// FILE: realtime.js - Handler Real-time Updates
// ===================================================

// ========== HANDLE REAL-TIME UPDATES ==========
function handleRealtimeUpdate(data) {
  if (data.type === 'pong') {
    // console.log('🏓 Pong received');
    return;
  }
  
  switch (data.type) {
    case 'new_post':
      handleNewPost(data.post);
      break;
      
    case 'update_likes':
      handleLikeUpdate(data.postId, data.likeCount, data.action, data.userId);
      break;
      
    case 'new_comment':
      handleNewComment(data.postId, data.comment);
      break;
      
    case 'new_like':
      showToast(`${data.userName} menyukai postingan Anda`, 'info');
      break;
      
    case 'new_comment_notification':
      showToast(`Komentar baru di postingan Anda`, 'info');
      break;
      
    case 'user_online':
      updateOnlineStatus(data.userId, data.online);
      break;
      
    case 'typing':
      handleTypingStatus(data.postId, data.userId, data.isTyping);
      break;
      
    case 'connected':
      // console.log('✅ SSE Connected');
      break;
      
    default:
      console.log('Unknown event type:', data.type);
  }
}

// ========== HANDLE NEW POST ==========
function handleNewPost(post) {
  allPosts.unshift(post);
  totalPosts++;
  applyFiltersAndRender();
  showToast(`Cerita baru dari ${post.user?.namaLengkap || 'Alumni'}`, 'success');
}

// ========== HANDLE LIKE UPDATE ==========
function handleLikeUpdate(postId, likeCount, action, userId) {
  const postIndex = allPosts.findIndex((p) => p.id === postId);
  if (postIndex !== -1) {
    allPosts[postIndex].likeCount = likeCount;

    if (userId === currentUser.id) {
      if (action === "liked") {
        userLikes.add(postId);
      } else {
        userLikes.delete(postId);
      }
      saveUserLikes();
    }
  }

  const filteredIndex = filteredPosts.findIndex((p) => p.id === postId);
  if (filteredIndex !== -1) {
    filteredPosts[filteredIndex].likeCount = likeCount;
  }

  updateLikeButton(postId, likeCount, action === "liked" && userId === currentUser.id);

  if (selectedPostId === postId) {
    renderPostDetail(postId);
  }
}

// ========== UPDATE LIKE BUTTON ==========
function updateLikeButton(postId, likeCount, isLiked) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`);
  if (!postElement) return;

  const likeButton = postElement.querySelector(".like-button");
  const likeCountSpan = likeButton?.querySelector(".like-count");
  const likeIcon = likeButton?.querySelector("i");

  if (likeCountSpan) likeCountSpan.textContent = likeCount;

  if (likeButton) {
    if (isLiked) {
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      likeButton.classList.add("text-red-500");
      if (likeIcon) likeIcon.classList.add("text-red-500");
    } else {
      likeButton.classList.remove("text-red-500");
      likeButton.classList.add("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.remove("text-red-500");
    }
  }
}

// ========== HANDLE NEW COMMENT ==========
function handleNewComment(postId, comment) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`);
  if (postElement) {
    const commentCountEl = postElement.querySelector(".comment-count");
    if (commentCountEl) {
      const currentCount = parseInt(commentCountEl.textContent) || 0;
      commentCountEl.textContent = currentCount + 1;
    }
  }

  if (selectedPostId === postId) {
    renderPostDetail(postId);
  }

  if (comment.user.id !== currentUser.id) {
    showToast(`${comment.user.namaLengkap} berkomentar`, "info");
  }
}

window.handleRealtimeUpdate = handleRealtimeUpdate;