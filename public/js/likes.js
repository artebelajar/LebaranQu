// ===================================================
// FILE: likes.js - Fungsi Terkait Likes
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
  if (!currentUser) {
    showToast("Silakan login terlebih dahulu", "error");
    setTimeout(() => window.location.href = "/login.html", 1500);
    return;
  }

  // CEK DOUBLE LIKE
  const likeKey = `like_${postId}`;
  if (window.loadingStates[likeKey]) {
    console.log("⏳ Like already being processed");
    return;
  }

  const elements = findPostElements(postId);
  if (!elements || !elements.likeButton) {
    console.error("Could not find like elements for post:", postId);
    return;
  }

  const { likeButton, likeIcon, likeCountSpan } = elements;
  const isCurrentlyLiked = userLikes.has(postId);
  const currentCount = parseInt(likeCountSpan.textContent);
  const newCount = isCurrentlyLiked ? currentCount - 1 : currentCount + 1;

  // SET LOADING STATE
  window.loadingStates[likeKey] = true;
  
  // Disable button selama proses
  likeButton.style.pointerEvents = 'none';
  likeButton.style.opacity = '0.7';

  // Optimistic update (UI langsung berubah)
  if (isCurrentlyLiked) {
    userLikes.delete(postId);
    likeButton.classList.remove("text-red-500");
    likeButton.classList.add("text-gray-500", "hover:text-red-500");
    if (likeIcon) likeIcon.classList.remove("text-red-500");
    likeCountSpan.textContent = newCount;
  } else {
    userLikes.add(postId);
    likeButton.classList.remove("text-gray-500", "hover:text-red-500");
    likeButton.classList.add("text-red-500");
    if (likeIcon) likeIcon.classList.add("text-red-500");
    likeCountSpan.textContent = newCount;
  }
  saveUserLikes();

  try {
    const res = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id }),
    });

    const responseData = await res.json();

    if (!res.ok) {
      // Rollback on error
      throw new Error(responseData.error || "Gagal like postingan");
    }
    
    // Update dengan data dari server
    if (responseData.likeCount !== undefined) {
      likeCountSpan.textContent = responseData.likeCount;
    }
    
  } catch (error) {
    console.error("Error in like request:", error);
    
    // Rollback UI
    if (isCurrentlyLiked) {
      userLikes.add(postId);
      likeButton.classList.add("text-red-500");
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.add("text-red-500");
      likeCountSpan.textContent = currentCount;
    } else {
      userLikes.delete(postId);
      likeButton.classList.remove("text-red-500");
      likeButton.classList.add("text-gray-500", "hover:text-red-500");
      if (likeIcon) likeIcon.classList.remove("text-red-500");
      likeCountSpan.textContent = currentCount;
    }
    saveUserLikes();
    
    showToast(error.message || "Terjadi kesalahan", "error");
  } finally {
    // RESET LOADING STATE
    window.loadingStates[likeKey] = false;
    likeButton.style.pointerEvents = '';
    likeButton.style.opacity = '1';
  }
}