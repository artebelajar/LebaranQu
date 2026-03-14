// ===================================================
// FILE: profile-badges.js - Tampilan Badge di Profile
// ===================================================

// ========== SHOW ALL ACHIEVEMENTS MODAL ==========
function showAchievementsModal() {
  // Buat modal jika belum ada
  let modal = document.getElementById('achievementsModal');
  
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'achievementsModal';
    modal.className = 'fixed inset-0 bg-black/50 backdrop-blur-sm hidden items-center justify-center z-50 modal';
    modal.innerHTML = `
      <div class="bg-white rounded-2xl p-6 max-w-3xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-2xl font-bold text-gray-800">🏆 Semua Badge</h3>
          <button onclick="hideAchievementsModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <!-- Stats Overview -->
        <div class="grid grid-cols-3 gap-3 mb-6">
          <div class="bg-emerald-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-emerald-600" id="modalTotalCompleted">0</p>
            <p class="text-xs text-gray-600">Badge Diperoleh</p>
          </div>
          <div class="bg-blue-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-blue-600" id="modalTotalAvailable">0</p>
            <p class="text-xs text-gray-600">Total Badge</p>
          </div>
          <div class="bg-purple-50 rounded-xl p-4 text-center">
            <p class="text-2xl font-bold text-purple-600" id="modalCompletionRate">0%</p>
            <p class="text-xs text-gray-600">Kelengkapan</p>
          </div>
        </div>
        
        <!-- Achievement Grid -->
        <div id="achievementGrid" class="space-y-4"></div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  
  // Update stats
  const totalCompleted = userAchievements.filter(ach => ach.completed).length;
  const totalAvailable = userAchievements.length;
  const completionRate = totalAvailable > 0 ? Math.round(totalCompleted / totalAvailable * 100) : 0;
  
  document.getElementById('modalTotalCompleted').textContent = totalCompleted;
  document.getElementById('modalTotalAvailable').textContent = totalAvailable;
  document.getElementById('modalCompletionRate').textContent = completionRate + '%';
  
  // Render grid
  renderAchievementGrid('achievementGrid', userAchievements, 'all');
  
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

// ========== HIDE ACHIEVEMENTS MODAL ==========
function hideAchievementsModal() {
  const modal = document.getElementById('achievementsModal');
  if (modal) {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
  }
}

// ========== RENDER ACHIEVEMENT STATS CARD ==========
function renderAchievementStatsCard() {
  const statsCard = document.getElementById('achievementStatsCard');
  if (!statsCard) return;
  
  const totalCompleted = userAchievements.filter(ach => ach.completed).length;
  const totalAvailable = userAchievements.length;
  const completionRate = totalAvailable > 0 ? Math.round(totalCompleted / totalAvailable * 100) : 0;
  
  statsCard.innerHTML = `
    <div class="bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-xl p-6 text-white">
      <div class="flex items-center justify-between mb-4">
        <h4 class="font-semibold">🏆 Statistik Badge</h4>
        <i class="fas fa-medal text-2xl opacity-50"></i>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <p class="text-3xl font-bold">${totalCompleted}</p>
          <p class="text-xs opacity-90">Badge Diperoleh</p>
        </div>
        <div>
          <p class="text-3xl font-bold">${completionRate}%</p>
          <p class="text-xs opacity-90">Kelengkapan</p>
        </div>
      </div>
      <div class="mt-4">
        <div class="flex justify-between text-xs mb-1">
          <span>Progress</span>
          <span>${totalCompleted}/${totalAvailable}</span>
        </div>
        <div class="w-full bg-white/30 rounded-full h-2">
          <div class="bg-yellow-400 h-2 rounded-full" style="width: ${completionRate}%"></div>
        </div>
      </div>
      <button onclick="showAchievementsModal()" class="mt-4 w-full bg-white/20 hover:bg-white/30 rounded-lg py-2 text-sm transition">
        Lihat Semua Badge
      </button>
    </div>
  `;
}

// ========== UPDATE PROFILE UI UNTUK BADGES ==========
function updateProfileWithBadges() {
  // Tambahkan section badges di profile jika belum ada
  const rightColumn = document.querySelector('.lg:col-span-2');
  if (!rightColumn) return;
  
  // Cek apakah sudah ada section badges
  let badgesSection = document.getElementById('badgesSection');
  
  if (!badgesSection) {
    // Buat section badges baru
    badgesSection = document.createElement('div');
    badgesSection.id = 'badgesSection';
    badgesSection.className = 'mt-6';
    badgesSection.innerHTML = `
      <div class="bg-white rounded-xl shadow-md p-6">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-xl font-bold text-gray-800 flex items-center gap-2">
            <i class="fas fa-medal text-emerald-600"></i>
            Badge & Pencapaian
          </h3>
          <button onclick="showAchievementsModal()" class="text-sm text-emerald-600 hover:text-emerald-800">
            Lihat Semua <i class="fas fa-arrow-right ml-1"></i>
          </button>
        </div>
        
        <!-- Recent Badges -->
        <div id="recentBadges" class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <!-- Akan diisi JavaScript -->
        </div>
        
        <!-- Achievement Stats Card -->
        <div id="achievementStatsCard" class="mt-4"></div>
      </div>
    `;
    
    // Masukkan setelah bio section
    const bioSection = rightColumn.querySelector('.bg-white.border');
    if (bioSection) {
      bioSection.insertAdjacentElement('afterend', badgesSection);
    } else {
      rightColumn.appendChild(badgesSection);
    }
  }
  
  // Render recent badges
  const recentBadges = userAchievements.filter(ach => ach.completed).slice(0, 4);
  renderAchievementBadges('recentBadges', recentBadges);
  
  // Render stats card
  renderAchievementStatsCard();
}

// Export ke window
window.showAchievementsModal = showAchievementsModal;
window.hideAchievementsModal = hideAchievementsModal;
window.updateProfileWithBadges = updateProfileWithBadges;