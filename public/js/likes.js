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
    alert("Silakan login terlebih dahulu");
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

  // Optimistic update
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
      if (isCurrentlyLiked) {
        userLikes.add(postId);
        likeButton.classList.remove("text-gray-500", "hover:text-red-500");
        likeButton.classList.add("text-red-500");
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
      alert(responseData.error || "Gagal like postingan");
    } else {
      if (responseData.likeCount !== undefined) {
        likeCountSpan.textContent = responseData.likeCount;
      }
      const postIndex = allPosts.findIndex((p) => p.id === postId);
      if (postIndex !== -1) {
        allPosts[postIndex].likeCount = responseData.likeCount || newCount;
      }
      if (selectedPostId === postId) {
        renderPostDetail(postId);
      }
    }
  } catch (error) {
    console.error("Error in like request:", error);
    // Rollback
    if (isCurrentlyLiked) {
      userLikes.add(postId);
      likeButton.classList.remove("text-gray-500", "hover:text-red-500");
      likeButton.classList.add("text-red-500");
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
    alert("Terjadi kesalahan koneksi");
  }
  
  if (window.loadLeaderboard) {
    await window.loadLeaderboard();
  }
}