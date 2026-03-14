// ===================================================
// FILE: achievements.js - Frontend untuk Badge & Achievement
// ===================================================

// Gunakan var untuk variabel global agar bisa diakses lintas file
if (typeof userAchievements === 'undefined') {
  var userAchievements = [];
  var achievementStats = { total: 0, completed: 0, recent: [] };
}

// ========== LOAD USER ACHIEVEMENTS ==========
async function loadUserAchievements(userId) {
  try {
    console.log("Loading achievements for user:", userId);
    
    const response = await fetch(`${API_BASE}/achievements/user/${userId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Achievements response error:', response.status, errorText);
      throw new Error(`Gagal memuat achievements: ${response.status}`);
    }
    
    userAchievements = await response.json();
    console.log(`Loaded ${userAchievements.length} achievements for user ${userId}`);
    
    return userAchievements;
  } catch (error) {
    console.error("Error loading achievements:", error);
    return [];
  }
}

// ========== LOAD ACHIEVEMENT STATS ==========
async function loadAchievementStats(userId) {
  try {
    console.log("Loading achievement stats for user:", userId);
    
    const response = await fetch(`${API_BASE}/achievements/stats/${userId}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Stats response error:', response.status, errorText);
      throw new Error(`Gagal memuat statistik achievement: ${response.status}`);
    }
    
    achievementStats = await response.json();
    console.log("Achievement stats:", achievementStats);
    
    return achievementStats;
  } catch (error) {
    console.error("Error loading achievement stats:", error);
    return { total: 0, completed: 0, recent: [] };
  }
}

// ========== RENDER ACHIEVEMENT BADGES ==========
function renderAchievementBadges(containerId, achievements, limit = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let displayAchs = achievements;
  if (limit) {
    displayAchs = achievements.slice(0, limit);
  }
  
  if (displayAchs.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-gray-500 col-span-4">
        <i class="fas fa-medal text-4xl text-gray-300 mb-3"></i>
        <p class="text-sm">Belum ada badge yang diperoleh</p>
        <p class="text-xs mt-2">Aktif di LebaranQu untuk mendapatkan badge!</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = displayAchs.map(ach => {
    const progress = ach.completed ? 100 : ((ach.progress || 0) / (ach.achievement?.requirement || 1) * 100);
    const badgeColor = getBadgeColor(ach.achievement?.badge_color || 'emerald');
    
    return `
      <div class="achievement-item bg-white rounded-xl shadow-sm p-3 border ${ach.completed ? 'border-emerald-300' : 'border-gray-200'} hover:shadow-md transition">
        <div class="flex flex-col items-center text-center">
          <div class="w-12 h-12 ${badgeColor.bg} rounded-full flex items-center justify-center ${badgeColor.text} text-xl mb-2">
            <i class="fas ${ach.achievement?.icon || 'fa-medal'}"></i>
          </div>
          <h4 class="font-semibold text-sm text-gray-800">${ach.achievement?.name || 'Badge'}</h4>
          ${ach.completed ? 
            '<span class="text-xs text-emerald-600 mt-1"><i class="fas fa-check-circle"></i> Diperoleh</span>' : 
            `<div class="w-full mt-2">
              <div class="flex justify-between text-xs text-gray-500 mb-1">
                <span>${ach.progress || 0}/${ach.achievement?.requirement || 0}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-1">
                <div class="bg-emerald-500 h-1 rounded-full" style="width: ${progress}%"></div>
              </div>
            </div>`
          }
        </div>
      </div>
    `;
  }).join('');
}

// ========== RENDER ACHIEVEMENT GRID ==========
function renderAchievementGrid(containerId, achievements, filter = 'all') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  let filtered = achievements;
  if (filter !== 'all') {
    filtered = achievements.filter(ach => ach.achievement?.category === filter);
  }
  
  const completed = filtered.filter(ach => ach.completed).length;
  const total = filtered.length;
  
  container.innerHTML = `
    <div class="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>
        <span class="text-sm text-gray-600">Progress: </span>
        <span class="font-semibold text-emerald-600">${completed}/${total}</span>
        <span class="text-xs text-gray-500 ml-2">(${Math.round(completed/total*100 || 0)}%)</span>
      </div>
    </div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-2">
      ${filtered.map(ach => {
        const progress = ach.completed ? 100 : ((ach.progress || 0) / (ach.achievement?.requirement || 1) * 100);
        const badgeColor = getBadgeColor(ach.achievement?.badge_color || 'emerald');
        
        return `
          <div class="achievement-card bg-gray-50 rounded-lg p-3 border ${ach.completed ? 'border-emerald-300' : 'border-gray-200'}">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 ${badgeColor.bg} rounded-full flex items-center justify-center ${badgeColor.text} text-sm">
                <i class="fas ${ach.achievement?.icon || 'fa-medal'}"></i>
              </div>
              <div class="flex-1">
                <h5 class="font-medium text-sm">${ach.achievement?.name || 'Badge'}</h5>
                <div class="flex items-center gap-2">
                  <div class="flex-1 h-1 bg-gray-300 rounded-full">
                    <div class="${ach.completed ? 'bg-emerald-500' : 'bg-blue-500'} h-1 rounded-full" style="width: ${progress}%"></div>
                  </div>
                  <span class="text-xs text-gray-500">${ach.progress || 0}/${ach.achievement?.requirement || 0}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ========== FILTER ACHIEVEMENTS ==========
function filterAchievements(category) {
  // Update active button
  document.querySelectorAll('.filter-achievement-btn').forEach(btn => {
    btn.classList.remove('bg-emerald-600', 'text-white');
    btn.classList.add('bg-gray-200', 'text-gray-700');
  });
  
  event.target.classList.remove('bg-gray-200', 'text-gray-700');
  event.target.classList.add('bg-emerald-600', 'text-white');
  
  renderAchievementGrid('achievementGrid', userAchievements, category);
}

// ========== GET BADGE COLOR ==========
function getBadgeColor(color) {
  const colors = {
    emerald: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    gray: { bg: 'bg-gray-100', text: 'text-gray-600' }
  };
  return colors[color] || colors.gray;
}

// ========== SHOW ACHIEVEMENT NOTIFICATION ==========
function showAchievementNotification(achievement) {
  const badgeColor = getBadgeColor(achievement.badge_color);
  
  // Buat elemen notifikasi
  const notif = document.createElement('div');
  notif.className = 'fixed top-4 right-4 bg-white rounded-lg shadow-xl border-l-4 border-emerald-500 p-4 max-w-sm z-50 animate-slide-in';
  notif.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="w-12 h-12 ${badgeColor.bg} rounded-full flex items-center justify-center ${badgeColor.text} text-2xl animate-bounce">
        <i class="fas ${achievement.icon}"></i>
      </div>
      <div>
        <p class="text-xs text-emerald-600 font-semibold">🏆 Badge Baru!</p>
        <h4 class="font-bold text-gray-800">${achievement.name}</h4>
        <p class="text-xs text-gray-500">${achievement.description}</p>
      </div>
    </div>
  `;
  
  document.body.appendChild(notif);
  
  setTimeout(() => {
    notif.remove();
  }, 5000);
}

// ========== CHECK FOR NEW ACHIEVEMENTS ==========
async function checkNewAchievements() {
  if (!currentUser) return;
  
  const oldCompleted = achievementStats.completed;
  
  await loadAchievementStats(currentUser.id);
  
  if (achievementStats.completed > oldCompleted) {
    // Ada achievement baru, cari yang baru didapat
    const newAchievements = achievementStats.recent || [];
    newAchievements.forEach(ach => {
      showAchievementNotification(ach);
    });
  }
}

// Export ke window
window.loadUserAchievements = loadUserAchievements;
window.loadAchievementStats = loadAchievementStats;
window.renderAchievementBadges = renderAchievementBadges;
window.renderAchievementGrid = renderAchievementGrid;
window.filterAchievements = filterAchievements;
window.checkNewAchievements = checkNewAchievements;
window.getBadgeColor = getBadgeColor;