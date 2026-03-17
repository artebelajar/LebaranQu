// ===================================================
// FILE: public/js/like-system.js
// ===================================================

// Sistem like terpusat
window.LikeSystem = {
  likes: new Map(),
  
  init(userId) {
    if (!userId) return;
    const saved = localStorage.getItem(`userLikes_${userId}`);
    if (saved) {
      const likesArray = JSON.parse(saved);
      this.likes = new Map(likesArray.map(id => [id, true]));
    }
    console.log('LikeSystem initialized:', Array.from(this.likes.keys()));
  },
  
  isLiked(postId) {
    return this.likes.has(postId);
  },
  
  setLiked(postId, liked) {
    if (liked) {
      this.likes.set(postId, true);
    } else {
      this.likes.delete(postId);
    }
    this.save();
    this.notifyListeners(postId, liked);
  },
  
  save() {
    if (!window.currentUser) return;
    localStorage.setItem(
      `userLikes_${window.currentUser.id}`,
      JSON.stringify(Array.from(this.likes.keys()))
    );
  },
  
  listeners: new Map(),
  
  addListener(postId, callback) {
    if (!this.listeners.has(postId)) {
      this.listeners.set(postId, new Set());
    }
    this.listeners.get(postId).add(callback);
  },
  
  removeListener(postId, callback) {
    if (this.listeners.has(postId)) {
      this.listeners.get(postId).delete(callback);
    }
  },
  
  notifyListeners(postId, liked) {
    if (this.listeners.has(postId)) {
      this.listeners.get(postId).forEach(callback => {
        callback(postId, liked);
      });
    }
  },
  
  // Fungsi baru: Reload post dari server
  async reloadPost(postId) {
    try {
      const response = await fetch(`${API_BASE}/posts/${postId}`);
      if (!response.ok) throw new Error('Failed to reload post');
      
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
      
      // Update UI semua elemen dengan postId ini
      this.updateUI(postId, post.likeCount);
      
      return post;
    } catch (error) {
      console.error('Error reloading post:', error);
    }
  },
  
  // Update UI berdasarkan data terbaru
  updateUI(postId, likeCount) {
    document.querySelectorAll(`[data-post-id="${postId}"] .like-count`).forEach(el => {
      el.textContent = likeCount;
    });
    
    // Update juga di post detail sidebar jika sedang dibuka
    if (typeof selectedPostId !== 'undefined' && selectedPostId === postId) {
      const likeCountSpan = document.getElementById('likeCount');
      if (likeCountSpan) {
        likeCountSpan.textContent = likeCount;
      }
    }
    
    // Update di halaman post-detail.html
    if (window.location.pathname.includes('post-detail.html') && 
        new URLSearchParams(window.location.search).get('id') == postId) {
      const likeCountSpan = document.getElementById('likeCount');
      if (likeCountSpan) {
        likeCountSpan.textContent = likeCount;
      }
    }
  }
};

// Inisialisasi saat user login
window.initLikeSystem = function() {
  if (window.currentUser) {
    window.LikeSystem.init(window.currentUser.id);
  }
};