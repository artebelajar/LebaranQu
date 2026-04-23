// ===================================================
// FILE: public/js/likes.js
// ===================================================

// ========== FIND POST ELEMENTS ==========
function findPostElements(postId) {
  const postElement = document.querySelector(`[data-post-id="${postId}"]`);
  if (!postElement) return null;
  const likeButton = postElement.querySelector(".like-button");
  const likeIcon = likeButton?.querySelector("i");
  const likeCountSpan = likeButton?.querySelector(".like-count");
  return { postElement, likeButton, likeIcon, likeCountSpan };
}

// ========== HANDLE LIKE ==========
async function handleLike(postId) {
  if (!window.currentUser) {
    showToast("Silakan login terlebih dahulu", "error");
    setTimeout(() => window.location.href = "/login.html", 1500);
    return;
  }

  const likeKey = `like_${postId}`;
  if (window.loadingStates && window.loadingStates[likeKey]) {
    return;
  }

  const elements = findPostElements(postId);
  if (!elements || !elements.likeButton) {
    console.error("Could not find like elements for post:", postId);
    return;
  }

  const { likeButton, likeIcon, likeCountSpan } = elements;
  const isCurrentlyLiked = window.userLikes ? window.userLikes.has(postId) : false;
  const currentCount = parseInt(likeCountSpan.textContent);

  // SET LOADING STATE
  if (window.loadingStates) window.loadingStates[likeKey] = true;
  
  // Disable button selama proses
  likeButton.style.pointerEvents = 'none';
  likeButton.style.opacity = '0.7';

  // Optimistic update (langsung ubah UI)
  if (isCurrentlyLiked) {
    if (window.userLikes) window.userLikes.delete(postId);
    likeButton.classList.remove("text-red-500");
    likeButton.classList.add("text-gray-500", "hover:text-red-500");
    if (likeIcon) likeIcon.classList.remove("text-red-500");
    likeCountSpan.textContent = currentCount - 1;
  } else {
    if (window.userLikes) window.userLikes.add(postId);
    likeButton.classList.remove("text-gray-500", "hover:text-red-500");
    likeButton.classList.add("text-red-500");
    if (likeIcon) likeIcon.classList.add("text-red-500");
    likeCountSpan.textContent = currentCount + 1;
  }
  
  if (window.userLikes) saveUserLikes();

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: window.currentUser.id }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      // Rollback on error
      throw new Error(responseData.error || "Gagal like postingan");
    }
    
    console.log('Like success:', responseData);
    
    // ========== RELOAD DATA SEPERTI KOMENTAR ==========
    // 1. Reload post dari API untuk mendapatkan data terbaru
    await reloadPostData(postId);
    
    // 2. Jika di halaman post-detail, render ulang
    if (window.location.pathname.includes('post-detail.html')) {
      if (typeof loadPostDetail === 'function') {
        await loadPostDetail();
      }
    } 
    // 3. Jika di index dan sidebar terbuka, render ulang sidebar
    else if (typeof selectedPostId !== 'undefined' && selectedPostId === postId) {
      if (typeof renderPostDetail === 'function') {
        await renderPostDetail(postId);
      }
    }
    
  } catch (error) {
    console.error("Error in like request:", error);
    
    // Rollback UI
    if (isCurrentlyLiked) {
      if (window.userLikes) window.userLikes.add(postId);
      likeButton.classList.add("text-red-500");
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.add("text-red-500");
      likeCountSpan.textContent = currentCount;
    } else {
      if (window.userLikes) window.userLikes.delete(postId);
      likeButton.classList.remove("text-red-500");
      likeButton.classList.add("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.remove("text-red-500");
      likeCountSpan.textContent = currentCount;
    }
    if (window.userLikes) saveUserLikes();
    
    showToast(error.message || "Terjadi kesalahan", "error");
  } finally {
    // RESET LOADING STATE
    if (window.loadingStates) window.loadingStates[likeKey] = false;
    likeButton.style.pointerEvents = '';
    likeButton.style.opacity = '1';
  }
}

// ========== RELOAD POST DATA ==========
async function reloadPostData(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`);
    if (!response.ok) throw new Error('Failed to reload post');
    
    const post = await response.json();
    console.log('Reloaded post data:', post);
    
    // Update di allPosts
    if (typeof allPosts !== 'undefined') {
      const index = allPosts.findIndex(p => p.id === postId);
      if (index !== -1) {
        allPosts[index].likeCount = post.likeCount;
      }
    }
    
    // Update di filteredPosts
    if (typeof filteredPosts !== 'undefined') {
      const index = filteredPosts.findIndex(p => p.id === postId);
      if (index !== -1) {
        filteredPosts[index].likeCount = post.likeCount;
      }
    }
    
    // Update semua elemen dengan postId ini
    document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
      el.textContent = post.likeCount;
    });
    
    return post;
  } catch (error) {
    console.error('Error reloading post:', error);
  }
}

// ========== SAVE USER LIKES ==========
function saveUserLikes() {
  if (!window.currentUser || !window.userLikes) return;
  try {
    localStorage.setItem(
      `userLikes_${window.currentUser.id}`,
      JSON.stringify(Array.from(window.userLikes)),
    );
  } catch (e) {
    console.error("Error saving user likes:", e);
  }
}

// ========== EXPORT ==========
window.handleLike = handleLike;
window.findPostElements = findPostElements;
window.saveUserLikes = saveUserLikes;
window.reloadPostData = reloadPostData;