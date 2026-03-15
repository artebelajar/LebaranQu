// ===================================================
// FILE: notifications.js - Fungsi Terkait Notifikasi
// ===================================================

let notifications = [];
let unreadCount = 0;
let notificationInterval = null;
let desktopNotifications = [];
let desktopUnreadCount = 0;

// ========== NOTIFICATION ICONS ==========
function getNotificationIcon(type) {
  switch (type) {
    case "like":
      return { icon: "fa-heart", color: "text-red-500", bgColor: "red-100" };
    case "comment":
      return {
        icon: "fa-comment",
        color: "text-blue-500",
        bgColor: "blue-100",
      };
    case "rank_up":
      return {
        icon: "fa-arrow-up",
        color: "text-emerald-500",
        bgColor: "emerald-100",
      };
    case "rank_down":
      return {
        icon: "fa-arrow-down",
        color: "text-yellow-500",
        bgColor: "yellow-100",
      };
    case "event":
      return {
        icon: "fa-calendar-alt",
        color: "text-purple-500",
        bgColor: "purple-100",
      };
    case "achievement":
      return {
        icon: "fa-trophy",
        color: "text-amber-500",
        bgColor: "amber-100",
      };
    default:
      return { icon: "fa-bell", color: "text-gray-500", bgColor: "gray-100" };
  }
}

// ========== LOAD NOTIFICATIONS ==========
async function loadNotifications() {
  try {
    const response = await fetch(
      `${API_BASE}/notifications?userId=${currentUser.id}&limit=20`,
    );
    if (!response.ok) throw new Error("Gagal memuat notifikasi");
    
    const data = await response.json();
    notifications = data.notifications;
    unreadCount = data.unreadCount;
    
    renderNotifications();
    updateNotificationBadge();
    
    // Update juga untuk mobile
    mobileNotifications = notifications;
    mobileUnreadCount = unreadCount;
    updateMobileNotificationBadge();
    
  } catch (error) {
    console.error("Error loading notifications:", error);
  }
}

// ========== RENDER NOTIFICATIONS ==========
function renderNotifications() {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;
  
  if (notifications.length === 0) {
    notificationList.innerHTML = `<div class="p-8 text-center text-gray-500"><i class="fas fa-bell-slash text-4xl mb-3 text-gray-300"></i><p class="text-sm">Belum ada notifikasi</p></div>`;
    return;
  }
  
  notificationList.innerHTML = notifications
    .map((notif) => {
      const isUnread = !notif.isRead;
      const timeAgo = getTimeAgo(notif.createdAt);
      let icon = getNotificationIcon(notif.type);
      return `
      <div class="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition ${isUnread ? "bg-emerald-50" : ""}"
           onclick="handleNotificationClick(${notif.id}, '${notif.type}', ${notif.postId || "null"})">
        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-${icon.bgColor} flex items-center justify-center">
            <i class="fas ${icon.icon} text-${icon.color}"></i>
          </div>
          <div class="flex-1">
            <div class="flex justify-between items-start">
              <p class="text-sm text-gray-800">${notif.message}</p>
              ${!isUnread ? "" : '<span class="w-2 h-2 bg-emerald-500 rounded-full ml-1"></span>'}
            </div>
            <div class="flex items-center gap-2 mt-1">
              ${notif.fromUser ? `<img src="${notif.fromUser.fotoProfil || "/images/default-avatar.png"}" class="w-4 h-4 rounded-full"><span class="text-xs text-gray-500">${notif.fromUser.namaLengkap}</span>` : ""}
              <span class="text-xs text-gray-400">${timeAgo}</span>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

// ========== UPDATE NOTIFICATION BADGE ==========
function updateNotificationBadge() {
  const badge = document.getElementById("notificationBadge");
  if (badge) {
    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

// ========== TOGGLE NOTIFICATION DROPDOWN ==========
function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) loadNotifications();
  }
}

// ========== HANDLE NOTIFICATION CLICK ==========
async function handleNotificationClick(notificationId, type, postId) {
  await markNotificationRead([notificationId]);
  if (postId) {
    const post = allPosts.find((p) => p.id === postId);
    if (post) {
      selectPost(postId);
      document.getElementById("notificationDropdown")?.classList.add("hidden");
      document
        .getElementById(`post-${postId}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
}

// ========== MARK NOTIFICATION AS READ ==========
async function markNotificationRead(notificationIds = []) {
  try {
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userId: currentUser.id, notificationIds }),
    });
    
    if (response.ok) {
      if (notificationIds.length === 0) {
        notifications.forEach((n) => (n.isRead = true));
        unreadCount = 0;
        mobileUnreadCount = 0;
      } else {
        notifications.forEach((n) => {
          if (notificationIds.includes(n.id)) {
            n.isRead = true;
            unreadCount = Math.max(0, unreadCount - 1);
            mobileUnreadCount = Math.max(0, mobileUnreadCount - 1);
          }
        });
      }
      
      renderNotifications();
      updateNotificationBadge();
      updateMobileNotificationBadge();
      
      // Update mobile list jika sheet terbuka
      if (document.getElementById('notificationSheet').classList.contains('show')) {
        loadMobileNotifications();
      }
    }
  } catch (error) {
    console.error("Error marking notifications as read:", error);
  }
}

// ========== MARK ALL NOTIFICATIONS AS READ ==========
function markAllNotificationsRead() {
  markNotificationRead();
}

// ========== VIEW ALL NOTIFICATIONS ==========
function viewAllNotifications() {
  window.location.href = "/notifications.html";
}

// Toggle dropdown notifikasi (desktop)
function toggleNotificationDropdown() {
  const dropdown = document.getElementById('notificationDropdown');
  if (!dropdown) return;
  
  dropdown.classList.toggle('hidden');
  
  if (!dropdown.classList.contains('hidden')) {
    loadDesktopNotifications();
  }
}

// Load notifikasi untuk desktop
async function loadDesktopNotifications() {
  if (!currentUser) return;

  const listEl = document.getElementById('notificationListDesktop');
  if (!listEl) {
    console.error("Element #notificationListDesktop not found!");
    return;
  }

  // Tampilkan loading
  listEl.innerHTML = `
    <div class="p-8 text-center text-gray-500">
      <div class="animate-spin rounded-full h-8 w-8 border-4 border-emerald-600 border-t-transparent mx-auto mb-3"></div>
      <p class="text-sm">Memuat notifikasi...</p>
    </div>
  `;

  try {
    console.log("Loading desktop notifications for user:", currentUser.id);
    
    const response = await fetch(
      `${API_BASE}/notifications?userId=${currentUser.id}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("userToken")}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log("Desktop notifications loaded:", data);
    
    desktopNotifications = data.notifications || [];
    desktopUnreadCount = data.unreadCount || 0;

    if (desktopNotifications.length === 0) {
      listEl.innerHTML = `
        <div class="p-8 text-center text-gray-500">
          <i class="fas fa-bell-slash text-4xl text-gray-300 mb-3"></i>
          <p class="text-sm">Belum ada notifikasi</p>
        </div>
      `;
    } else {
      renderDesktopNotifications();
    }

    // Update badge
    updateNotificationBadges();

  } catch (error) {
    console.error("Error loading desktop notifications:", error);
    listEl.innerHTML = `
      <div class="p-8 text-center text-red-500">
        <i class="fas fa-exclamation-circle text-3xl mb-2"></i>
        <p class="text-sm">Gagal memuat notifikasi</p>
        <button onclick="loadDesktopNotifications()" class="mt-2 text-xs text-emerald-600">
          Coba lagi
        </button>
      </div>
    `;
  }
}

// Render notifikasi desktop
function renderDesktopNotifications() {
  const listEl = document.getElementById('notificationListDesktop');
  if (!listEl) return;

  listEl.innerHTML = desktopNotifications.slice(0, 5).map(notif => {
    const isUnread = !notif.isRead;
    const timeAgo = getTimeAgo(notif.createdAt);
    const icon = getNotificationIcon(notif.type);
    const fotoProfil = notif.fromUser?.fotoProfil || "/images/default-avatar.png";

    return `
      <div class="p-3 hover:bg-gray-50 border-b border-gray-100 cursor-pointer ${isUnread ? 'bg-emerald-50' : ''}"
           onclick="handleDesktopNotificationClick(${notif.id}, '${notif.type}', ${notif.postId || "null"})">
        <div class="flex gap-3">
          <div class="flex-shrink-0 w-8 h-8 rounded-full bg-${icon.bgColor} flex items-center justify-center">
            <i class="fas ${icon.icon} text-${icon.color} text-sm"></i>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-sm text-gray-800 truncate">${notif.message}</p>
            <div class="flex items-center gap-2 mt-1">
              ${
                notif.fromUser
                  ? `
                <img src="${fotoProfil}" class="w-4 h-4 rounded-full object-cover flex-shrink-0">
                <span class="text-xs text-gray-500 truncate">${notif.fromUser.namaLengkap}</span>
                <span class="text-xs text-gray-400">•</span>
              `
                  : ""
              }
              <span class="text-xs text-gray-400 flex-shrink-0">${timeAgo}</span>
            </div>
          </div>
          ${isUnread ? '<span class="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0"></span>' : ''}
        </div>
      </div>
    `;
  }).join('');
}

// Handle klik notifikasi desktop
function handleDesktopNotificationClick(notificationId, type, postId) {
  // Mark as read
  markNotificationRead([notificationId]);
  
  // Update lokal
  desktopNotifications = desktopNotifications.map(n => 
    n.id === notificationId ? {...n, isRead: true} : n
  );
  desktopUnreadCount = desktopNotifications.filter(n => !n.isRead).length;
  
  renderDesktopNotifications();
  updateNotificationBadges();
  
  // Tutup dropdown
  document.getElementById('notificationDropdown')?.classList.add('hidden');
  
  // Redirect ke post jika ada
  if (postId) {
    window.location.href = `/post-detail.html?id=${postId}`;
  }
}

// Update badge notifikasi (desktop & mobile)
function updateNotificationBadges() {
  const desktopBadge = document.getElementById('notificationBadge');
  const mobileBadge = document.getElementById('mobileNotifBadge');
  
  // Gabungkan unread count dari kedua sumber
  const totalUnread = desktopUnreadCount + (window.mobileUnreadCount || 0);
  
  if (totalUnread > 0) {
    const badgeText = totalUnread > 99 ? "99+" : totalUnread;
    
    if (desktopBadge) {
      desktopBadge.textContent = badgeText;
      desktopBadge.classList.remove("hidden");
    }
    if (mobileBadge) {
      mobileBadge.textContent = badgeText;
      mobileBadge.classList.remove("hidden");
    }
  } else {
    if (desktopBadge) desktopBadge.classList.add("hidden");
    if (mobileBadge) mobileBadge.classList.add("hidden");
  }
}

// Override fungsi markAllNotificationsRead untuk handle desktop
async function markAllNotificationsRead() {
  if (!currentUser) return;
  
  try {
    await fetch(`${API_BASE}/notifications/mark-read`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('userToken')}`
      },
      body: JSON.stringify({ userId: currentUser.id, notificationIds: [] })
    });
    
    // Update semua notifikasi
    desktopNotifications = desktopNotifications.map(n => ({...n, isRead: true}));
    if (window.mobileNotifications) {
      window.mobileNotifications = window.mobileNotifications.map(n => ({...n, isRead: true}));
    }
    
    desktopUnreadCount = 0;
    if (typeof window.mobileUnreadCount !== 'undefined') {
      window.mobileUnreadCount = 0;
    }
    
    renderDesktopNotifications();
    updateNotificationBadges();
    
    // Tutup dropdown jika terbuka
    document.getElementById('notificationDropdown')?.classList.add('hidden');
    
  } catch (error) {
    console.error('Error marking all as read:', error);
  }
}