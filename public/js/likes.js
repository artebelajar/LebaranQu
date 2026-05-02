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

// ========== HANDLE LIKE (DENGAN INTEGRASI LIKESYSTEM) ==========
async function handleLike(postId) {
  // Validasi user login
  if (!window.currentUser) {
    if (typeof showToast === 'function') {
      showToast("Silakan login terlebih dahulu", "error");
    } else {
      alert("Silakan login terlebih dahulu");
    }
    setTimeout(() => window.location.href = "/login.html", 1500);
    return;
  }

  // Cek double submit
  const likeKey = `like_${postId}`;
  if (window.loadingStates && window.loadingStates[likeKey]) {
    console.log("Like already in progress");
    return;
  }

  // Cari elemen post
  const elements = findPostElements(postId);
  if (!elements || !elements.likeButton) {
    console.error("Could not find like elements for post:", postId);
    return;
  }

  const { likeButton, likeIcon, likeCountSpan } = elements;
  
  // Gunakan LikeSystem jika tersedia, fallback ke userLikes
  let isCurrentlyLiked;
  if (window.LikeSystem && window.LikeSystem.isInitialized) {
    isCurrentlyLiked = window.LikeSystem.isLiked(postId);
  } else if (window.userLikes) {
    isCurrentlyLiked = window.userLikes.has(postId);
  } else {
    isCurrentlyLiked = false;
  }
  
  const currentCount = parseInt(likeCountSpan.textContent) || 0;

  // SET LOADING STATE
  if (!window.loadingStates) window.loadingStates = {};
  window.loadingStates[likeKey] = true;
  
  // Disable button selama proses
  likeButton.style.pointerEvents = 'none';
  likeButton.style.opacity = '0.7';

  // Optimistic update (langsung ubah UI)
  const newCount = isCurrentlyLiked ? currentCount - 1 : currentCount + 1;
  const newLikedState = !isCurrentlyLiked;
  
  // Update UI
  if (newLikedState) {
    likeButton.classList.remove("text-gray-500", "hover:text-red-500");
    likeButton.classList.add("text-red-500");
    if (likeIcon) likeIcon.classList.add("text-red-500");
    likeCountSpan.textContent = newCount;
  } else {
    likeButton.classList.remove("text-red-500");
    likeButton.classList.add("text-gray-500", "hover:text-red-500");
    if (likeIcon) likeIcon.classList.remove("text-red-500");
    likeCountSpan.textContent = newCount;
  }
  
  // Update LikeSystem atau userLikes
  if (window.LikeSystem && window.LikeSystem.isInitialized) {
    window.LikeSystem.setLiked(postId, newLikedState);
  } else if (window.userLikes) {
    if (newLikedState) {
      window.userLikes.add(postId);
    } else {
      window.userLikes.delete(postId);
    }
    if (typeof saveUserLikes === 'function') saveUserLikes();
  }

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
      throw new Error(responseData.error || "Gagal like postingan");
    }
    
    console.log('✅ Like success:', responseData);
    
    // Update dengan data terbaru dari server
    const finalLikeCount = responseData.likeCount;
    if (finalLikeCount !== undefined) {
      likeCountSpan.textContent = finalLikeCount;
      
      // Update di LikeSystem jika ada
      if (window.LikeSystem && window.LikeSystem.updateUI) {
        window.LikeSystem.updateUI(postId, finalLikeCount);
      }
    }
    
    // Update data di allPosts dan filteredPosts
    if (typeof allPosts !== 'undefined') {
      const postIndex = allPosts.findIndex(p => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].likeCount = finalLikeCount;
      }
    }
    
    if (typeof filteredPosts !== 'undefined') {
      const filteredIndex = filteredPosts.findIndex(p => p.id === postId);
      if (filteredIndex !== -1) {
        filteredPosts[filteredIndex].likeCount = finalLikeCount;
      }
    }
    
  } catch (error) {
    console.error("❌ Error in like request:", error);
    
    // Rollback UI
    if (isCurrentlyLiked) {
      likeButton.classList.add("text-red-500");
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.add("text-red-500");
      likeCountSpan.textContent = currentCount;
    } else {
      likeButton.classList.remove("text-red-500");
      likeButton.classList.add("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.remove("text-red-500");
      likeCountSpan.textContent = currentCount;
    }
    
    // Rollback LikeSystem atau userLikes
    if (window.LikeSystem && window.LikeSystem.isInitialized) {
      window.LikeSystem.setLiked(postId, isCurrentlyLiked);
    } else if (window.userLikes) {
      if (isCurrentlyLiked) {
        window.userLikes.add(postId);
      } else {
        window.userLikes.delete(postId);
      }
      if (typeof saveUserLikes === 'function') saveUserLikes();
    }
    
    const errorMessage = error.message || "Terjadi kesalahan";
    if (typeof showToast === 'function') {
      showToast(errorMessage, "error");
    } else {
      console.error(errorMessage);
    }
  } finally {
    // RESET LOADING STATE
    window.loadingStates[likeKey] = false;
    likeButton.style.pointerEvents = '';
    likeButton.style.opacity = '1';
  }
}

// ========== RELOAD POST DATA ==========
async function reloadPostData(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const post = await response.json();
    console.log('🔄 Reloaded post data:', post);
    
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
    
    // Update UI semua elemen dengan postId ini
    document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
      el.textContent = post.likeCount;
    });
    
    // Update LikeSystem UI jika ada
    if (window.LikeSystem && window.LikeSystem.updateUI) {
      window.LikeSystem.updateUI(postId, post.likeCount);
    }
    
    return post;
  } catch (error) {
    console.error('❌ Error reloading post:', error);
    return null;
  }
}

// ========== SAVE USER LIKES (LEGACY/FALLBACK) ==========
function saveUserLikes() {
  if (!window.currentUser || !window.userLikes) return;
  try {
    localStorage.setItem(
      `userLikes_${window.currentUser.id}`,
      JSON.stringify(Array.from(window.userLikes))
    );
  } catch (e) {
    console.error("❌ Error saving user likes:", e);
  }
}

// ========== BULK UPDATE LIKES FROM SSE ==========
function updateLikesFromSSE(postId, likeCount, action, userId) {
  console.log(`📡 SSE Like update: post ${postId}, count: ${likeCount}, action: ${action}`);
  
  // Update UI semua elemen
  document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
    el.textContent = likeCount;
  });
  
  // Update LikeSystem jika ada
  if (window.LikeSystem && window.LikeSystem.updateUI) {
    window.LikeSystem.updateUI(postId, likeCount);
  }
  
  // Update untuk user yang melakukan like (sync status)
  if (userId === window.currentUser?.id) {
    const isLiked = action === 'liked';
    if (window.LikeSystem && window.LikeSystem.isInitialized) {
      window.LikeSystem.setLiked(postId, isLiked);
    } else if (window.userLikes) {
      if (isLiked) {
        window.userLikes.add(postId);
      } else {
        window.userLikes.delete(postId);
      }
      saveUserLikes();
    }
    
    // Update button style
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
}

// ========== EXPORT ==========
window.handleLike = handleLike;
window.findPostElements = findPostElements;
window.saveUserLikes = saveUserLikes;
window.reloadPostData = reloadPostData;
window.updateLikesFromSSE = updateLikesFromSSE;

console.log("✅ Likes.js loaded");