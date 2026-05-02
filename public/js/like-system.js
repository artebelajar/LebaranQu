// ===================================================
// FILE: public/js/like-system.js
// ===================================================

// Sistem like terpusat
window.LikeSystem = {
  likes: new Map(),
  listeners: new Map(),
  isInitialized: false,
  
  // ========== INITIALIZE ==========
  init(userId) {
    if (!userId) {
      console.warn('⚠️ LikeSystem.init: No userId provided');
      return false;
    }
    
    try {
      const saved = localStorage.getItem(`userLikes_${userId}`);
      if (saved) {
        const likesArray = JSON.parse(saved);
        this.likes = new Map(likesArray.map(id => [id, true]));
        console.log(`✅ LikeSystem initialized: ${this.likes.size} likes loaded`);
      } else {
        this.likes.clear();
        console.log('✅ LikeSystem initialized (no saved likes)');
      }
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('❌ LikeSystem.init error:', error);
      this.likes.clear();
      this.isInitialized = false;
      return false;
    }
  },
  
  // ========== CHECK IF LIKED ==========
  isLiked(postId) {
    if (!this.isInitialized) {
      console.warn('⚠️ LikeSystem not initialized yet');
      return false;
    }
    return this.likes.has(postId);
  },
  
  // ========== SET LIKED STATUS ==========
  setLiked(postId, liked) {
    if (!this.isInitialized) {
      console.warn('⚠️ LikeSystem not initialized yet');
      return false;
    }
    
    if (liked) {
      this.likes.set(postId, true);
    } else {
      this.likes.delete(postId);
    }
    this.save();
    this.notifyListeners(postId, liked);
    return true;
  },
  
  // ========== TOGGLE LIKE ==========
  toggleLike(postId) {
    const newState = !this.isLiked(postId);
    this.setLiked(postId, newState);
    return newState;
  },
  
  // ========== GET TOTAL LIKES COUNT ==========
  getTotalLikes() {
    return this.likes.size;
  },
  
  // ========== GET ALL LIKED POSTS ==========
  getLikedPosts() {
    return Array.from(this.likes.keys());
  },
  
  // ========== SAVE TO LOCALSTORAGE ==========
  save() {
    if (!window.currentUser) {
      console.warn('⚠️ Cannot save likes: no currentUser');
      return;
    }
    
    try {
      localStorage.setItem(
        `userLikes_${window.currentUser.id}`,
        JSON.stringify(Array.from(this.likes.keys()))
      );
    } catch (error) {
      console.error('❌ Error saving likes:', error);
    }
  },
  
  // ========== CLEAR ALL LIKES ==========
  clear() {
    this.likes.clear();
    if (window.currentUser) {
      localStorage.removeItem(`userLikes_${window.currentUser.id}`);
    }
    console.log('🧹 All likes cleared');
  },
  
  // ========== ADD LISTENER ==========
  addListener(postId, callback) {
    if (typeof callback !== 'function') {
      console.error('❌ addListener: callback must be a function');
      return;
    }
    
    if (!this.listeners.has(postId)) {
      this.listeners.set(postId, new Set());
    }
    this.listeners.get(postId).add(callback);
  },
  
  // ========== REMOVE LISTENER ==========
  removeListener(postId, callback) {
    if (this.listeners.has(postId)) {
      this.listeners.get(postId).delete(callback);
      
      // Clean up empty Sets
      if (this.listeners.get(postId).size === 0) {
        this.listeners.delete(postId);
      }
    }
  },
  
  // ========== NOTIFY LISTENERS ==========
  notifyListeners(postId, liked) {
    if (this.listeners.has(postId)) {
      this.listeners.get(postId).forEach(callback => {
        try {
          callback(postId, liked);
        } catch (error) {
          console.error(`❌ Error in listener for post ${postId}:`, error);
        }
      });
    }
  },
  
  // ========== RELOAD POST FROM SERVER ==========
  async reloadPost(postId) {
    try {
      const response = await fetch(`${API_BASE}/posts/${postId}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const post = await response.json();
      
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
      
      // Update UI
      this.updateUI(postId, post.likeCount);
      
      return post;
    } catch (error) {
      console.error(`❌ Error reloading post ${postId}:`, error);
      return null;
    }
  },
  
  // ========== UPDATE UI ==========
  updateUI(postId, likeCount) {
    // Update semua like count di posts list
    document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
      el.textContent = likeCount;
    });
    
    // Update di post detail sidebar (desktop index)
    if (typeof selectedPostId !== 'undefined' && selectedPostId === postId) {
      const likeCountSpan = document.getElementById('likeCount');
      if (likeCountSpan) {
        likeCountSpan.textContent = likeCount;
      }
    }
    
    // Update di halaman post-detail.html
    if (window.location.pathname.includes('post-detail.html')) {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('id') == postId) {
        const likeCountSpan = document.getElementById('likeCount');
        if (likeCountSpan) {
          likeCountSpan.textContent = likeCount;
        }
      }
    }
  },
  
  // ========== SYNC FROM SERVER ==========
  async syncFromServer() {
    if (!window.currentUser) return;
    
    try {
      const response = await fetch(`${API_BASE}/users/${window.currentUser.id}/likes`);
      if (response.ok) {
        const data = await response.json();
        this.likes.clear();
        data.likes.forEach(id => this.likes.set(id, true));
        this.save();
        console.log(`🔄 Synced ${this.likes.size} likes from server`);
      }
    } catch (error) {
      console.error('❌ Error syncing likes from server:', error);
    }
  }
};

// ========== INITIALIZE LIKE SYSTEM ==========
window.initLikeSystem = function() {
  if (window.currentUser) {
    const success = window.LikeSystem.init(window.currentUser.id);
    if (success) {
      console.log('✅ LikeSystem ready');
    } else {
      console.warn('⚠️ LikeSystem initialization failed');
    }
    return success;
  } else {
    console.warn('⚠️ Cannot init LikeSystem: no currentUser');
    return false;
  }
};

// ========== GET LIKE SYSTEM STATUS ==========
window.isLikeSystemReady = function() {
  return window.LikeSystem && window.LikeSystem.isInitialized;
};

// ========== HANDLE LIKE DARI LUAR (UTILITY) ==========
window.handleLikeWithSystem = async function(postId) {
  if (!window.LikeSystem.isInitialized) {
    console.warn('⚠️ LikeSystem not ready');
    return false;
  }
  
  const wasLiked = window.LikeSystem.isLiked(postId);
  window.LikeSystem.toggleLike(postId);
  
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ userId: window.currentUser?.id })
    });
    
    if (!response.ok) {
      // Rollback on error
      window.LikeSystem.toggleLike(postId);
      console.error('Like failed, rolled back');
      return false;
    }
    
    const data = await response.json();
    window.LikeSystem.updateUI(postId, data.likeCount);
    return true;
  } catch (error) {
    // Rollback on error
    window.LikeSystem.toggleLike(postId);
    console.error('Like error:', error);
    return false;
  }
};

console.log('✅ Like-system.js loaded');