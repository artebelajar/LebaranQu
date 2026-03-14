// ===================================================
// FILE: leaderboard.js - Multi-Category Leaderboard
// ===================================================

// Cek apakah sudah dideklarasikan sebelumnya
if (typeof window.leaderboardInitialized === 'undefined') {
  
  // Deklarasi variabel global
  window.currentLeaderboardCategory = 'badge';
  window.leaderboardData = [];
  
  // Kategori leaderboard yang tersedia
  window.LEADERBOARD_CATEGORIES = [
    { id: 'badge', name: 'Badge', icon: 'fa-medal', unit: 'badge' },
    { id: 'post', name: 'Postingan', icon: 'fa-newspaper', unit: 'post' },
    { id: 'like', name: 'Like', icon: 'fa-heart', unit: 'like' },
    { id: 'view', name: 'View', icon: 'fa-eye', unit: 'view' },
    { id: 'comment', name: 'Komentar', icon: 'fa-comment', unit: 'komentar' },
    { id: 'overall', name: 'Overall', icon: 'fa-star', unit: 'poin' }
  ];
  
  // ========== LOAD LEADERBOARD ==========
  window.loadLeaderboard = async function(category = 'badge') {
    try {
      showLeaderboardLoading();
      
      window.currentLeaderboardCategory = category;
      
      const sekolah = document.getElementById("leaderboardFilter")?.value || "all";
      
      console.log(`Loading ${category} leaderboard for sekolah: ${sekolah}`);
      
      const response = await fetch(`${API_BASE}/leaderboard/${category}?sekolah=${sekolah}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      window.leaderboardData = await response.json();
      console.log(`Loaded ${window.leaderboardData.length} entries for ${category} leaderboard`);
      
      renderLeaderboard();
      updateActiveCategoryButton(category);
      
    } catch (error) {
      console.error("Error loading leaderboard:", error);
      document.getElementById("leaderboardList").innerHTML = `
        <div class="text-center py-8 text-red-500">
          <i class="fas fa-exclamation-triangle text-3xl mb-2"></i>
          <p>Gagal memuat leaderboard</p>
          <p class="text-sm">${error.message}</p>
        </div>
      `;
    } finally {
      hideLeaderboardLoading();
    }
  };

  // ========== RENDER LEADERBOARD ==========
  function renderLeaderboard() {
    const leaderboardList = document.getElementById("leaderboardList");
    
    if (!leaderboardList) return;
    
    if (!window.leaderboardData || window.leaderboardData.length === 0) {
      leaderboardList.innerHTML = `
        <div class="text-center py-8 text-gray-500">
          <i class="fas fa-trophy text-4xl text-gray-300 mb-3"></i>
          <p class="text-sm">Belum ada data leaderboard</p>
        </div>
      `;
      return;
    }

    leaderboardList.innerHTML = window.leaderboardData
      .slice(0, 10)
      .map((user, index) => {
        const medal = getMedalInfo(index);
        const value = getLeaderboardValue(user, window.currentLeaderboardCategory);
        const unit = getLeaderboardUnit(window.currentLeaderboardCategory);
        
        return `
        <div class="leaderboard-item flex items-center gap-3 p-3 ${medal.bg} rounded-lg border-2 ${medal.border} hover:shadow-md transition cursor-pointer"
             onclick="goToProfile(${user.id})">
          <div class="w-8 text-center font-bold ${medal.text}">
            ${medal.icon || `#${index + 1}`}
          </div>
          <img src="${user.fotoProfil || '/images/default-avatar.png'}" 
               class="w-10 h-10 rounded-full object-cover border-2 ${medal.border}"
               onerror="this.src='/images/default-avatar.png'">
          <div class="flex-1 min-w-0">
            <p class="font-medium text-sm truncate">${user.namaLengkap || 'Unknown'}</p>
            <p class="text-xs text-gray-500">${user.title || 'Alumni'} • ${getSchoolName(user.asalSekolah)}</p>
          </div>
          <div class="text-right">
            <p class="font-bold text-sm ${medal.text}">${formatNumber(value)}</p>
            <p class="text-[10px] text-gray-500">${unit}</p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  // ========== GET LEADERBOARD VALUE ==========
  function getLeaderboardValue(user, category) {
    switch(category) {
      case 'badge':
        return user.completedBadge || 0;
      case 'view':
        return user.totalViews || 0;
      case 'post':
        return user.totalPosts || 0;
      case 'like':
        return user.totalLikes || 0;
      case 'comment':
        return user.totalComments || 0;
      case 'overall':
        return user.overallScore || 0;
      default:
        return 0;
    }
  }

  // ========== GET LEADERBOARD UNIT ==========
  function getLeaderboardUnit(category) {
    const cat = window.LEADERBOARD_CATEGORIES.find(c => c.id === category);
    return cat ? cat.unit : '';
  }

  // ========== GET MEDAL INFO ==========
  function getMedalInfo(index) {
    if (index === 0) {
      return {
        icon: '🥇',
        bg: 'bg-yellow-50',
        border: 'border-yellow-500',
        text: 'text-yellow-700'
      };
    } else if (index === 1) {
      return {
        icon: '🥈',
        bg: 'bg-gray-50',
        border: 'border-gray-400',
        text: 'text-gray-700'
      };
    } else if (index === 2) {
      return {
        icon: '🥉',
        bg: 'bg-amber-50',
        border: 'border-amber-600',
        text: 'text-amber-700'
      };
    } else {
      return {
        icon: null,
        bg: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-600'
      };
    }
  }

  // ========== FORMAT NUMBER ==========
  function formatNumber(num) {
    if (num >= 1000000) return (num/1000000).toFixed(1) + 'jt';
    if (num >= 1000) return (num/1000).toFixed(1) + 'rb';
    return num.toString();
  }

  // ========== UPDATE ACTIVE CATEGORY BUTTON ==========
  function updateActiveCategoryButton(category) {
    document.querySelectorAll('.leaderboard-category-btn').forEach(btn => {
      btn.classList.remove('bg-emerald-600', 'text-white');
      btn.classList.add('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
      
      if (btn.dataset.category === category) {
        btn.classList.remove('bg-gray-100', 'text-gray-700', 'hover:bg-gray-200');
        btn.classList.add('bg-emerald-600', 'text-white');
      }
    });
  }

  // ========== SHOW/HIDE LOADING ==========
  function showLeaderboardLoading() {
    const list = document.getElementById("leaderboardList");
    if (list) {
      list.innerHTML = `
        <div class="text-center py-8">
          <div class="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3"></div>
          <p class="text-sm text-gray-500">Memuat leaderboard...</p>
        </div>
      `;
    }
  }

  function hideLeaderboardLoading() {
    // Loading sudah diganti oleh render
  }

  // ========== INIT LEADERBOARD FILTER ==========
  window.initLeaderboardFilters = function() {
    const filter = document.getElementById("leaderboardFilter");
    if (filter) {
      filter.addEventListener("change", () => {
        loadLeaderboard(window.currentLeaderboardCategory);
      });
    }
  }

  // ========== RENDER CATEGORY BUTTONS ==========
  window.renderCategoryButtons = function() {
    const container = document.getElementById("leaderboardCategories");
    if (!container) return;
    
    container.innerHTML = window.LEADERBOARD_CATEGORIES.map(cat => `
      <button 
        class="leaderboard-category-btn px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2
               ${cat.id === 'badge' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}"
        data-category="${cat.id}"
        onclick="loadLeaderboard('${cat.id}')">
        <i class="fas ${cat.icon}"></i>
        ${cat.name}
      </button>
    `).join('');
  }

  // Tandai sudah diinisialisasi
  window.leaderboardInitialized = true;
  
  console.log("✅ Leaderboard module initialized");
}