// ===================================================
// FILE: public/js/notifications.js
// FILE: public/js/notifications.js
// ===================================================

let notifications = [];
let unreadCount = 0;
let notificationInterval = null;

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

// ========== UPDATE NOTIFICATION BADGE (DESKTOP & MOBILE) ==========
function updateNotificationBadges() {
  // Update badge desktop
  const desktopBadge = document.getElementById("notificationBadge");
  if (desktopBadge) {
    if (unreadCount > 0) {
      desktopBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      desktopBadge.classList.remove("hidden");
    } else {
      desktopBadge.classList.add("hidden");
    }
  }
  
  // Update badge mobile
  updateMobileNotificationBadge();
}

// ========== UPDATE MOBILE NOTIFICATION BADGE ==========
function updateMobileNotificationBadge() {
  const mobileBadge = document.getElementById("mobileNotifBadge");
  if (mobileBadge) {
    if (unreadCount > 0) {
      mobileBadge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      mobileBadge.classList.remove("hidden");
    } else {
      mobileBadge.classList.add("hidden");
    }
  }
}

// ========== LOAD NOTIFICATIONS ==========
async function loadNotifications() {
  try {
    if (!window.currentUser) return;
    
    if (!window.currentUser) return;
    
    const response = await fetch(
      `${API_BASE}/notifications?userId=${window.currentUser.id}&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      }
      `${API_BASE}/notifications?userId=${window.currentUser.id}&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      }
    );
    
    
    if (!response.ok) throw new Error("Gagal memuat notifikasi");
    
    const data = await response.json();
    notifications = data.notifications || [];
    unreadCount = data.unreadCount || 0;
    
    renderNotifications();
    updateNotificationBadges();
    
  } catch (error) {
    console.error("Error loading notifications:", error);
  }
}

// ========== RENDER NOTIFICATIONS (DESKTOP) ==========
// ========== RENDER NOTIFICATIONS (DESKTOP) ==========
function renderNotifications() {
  const notificationList = document.getElementById("notificationList");
  if (!notificationList) return;
  
  if (notifications.length === 0) {
    notificationList.innerHTML = `<div class="p-8 text-center text-gray-500"><i class="fas fa-bell-slash text-4xl mb-3 text-gray-300"></i><p class="text-sm">Belum ada notifikasi</p></div>`;
    return;
  }
  
  notificationList.innerHTML = notifications
    .slice(0, 5)
    .slice(0, 5)
    .map((notif) => {
      const isUnread = !notif.isRead;
      const timeAgo = getTimeAgo(notif.createdAt);
      const icon = getNotificationIcon(notif.type);
      const icon = getNotificationIcon(notif.type);
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
              ${isUnread ? '<span class="w-2 h-2 bg-emerald-500 rounded-full ml-1"></span>' : ''}
              ${isUnread ? '<span class="w-2 h-2 bg-emerald-500 rounded-full ml-1"></span>' : ''}
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

// ========== TOGGLE NOTIFICATION DROPDOWN ==========
function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notificationDropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) {
      loadNotifications();
    }
    if (!dropdown.classList.contains("hidden")) {
      loadNotifications();
    }
  }
}

// ========== HANDLE NOTIFICATION CLICK ==========
async function handleNotificationClick(notificationId, type, postId) {
  await markNotificationRead([notificationId]);
  
  // Update UI lokal
  notifications = notifications.map(n => 
    n.id === notificationId ? { ...n, isRead: true } : n
  );
  unreadCount = notifications.filter(n => !n.isRead).length;
  
  renderNotifications();
  updateNotificationBadges();
  
  if (postId) {
    window.location.href = `/post-detail.html?id=${postId}`;
  }
}

// ========== MARK NOTIFICATION AS READ ==========
async function markNotificationRead(notificationIds = []) {
  try {
    if (!window.currentUser) return;
    
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
    
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ 
        userId: window.currentUser.id, 
        notificationIds: ids 
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Mark read error response:', errorData);
      throw new Error(errorData.error || 'Gagal menandai notifikasi');
    }
    
    return await response.json();
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    if (typeof showToast === 'function') {
      showToast("Gagal menandai notifikasi", "error");
    }
  }
}

// ========== MARK ALL NOTIFICATIONS AS READ ==========
async function markAllNotificationsRead() {
  if (!window.currentUser) return;
  
  try {
    const response = await fetch(`${API_BASE}/notifications/mark-read`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ 
        userId: window.currentUser.id, 
        notificationIds: [] 
      }),
    });
    
    if (response.ok) {
      notifications = notifications.map(n => ({ ...n, isRead: true }));
      unreadCount = 0;
      
      renderNotifications();
      updateNotificationBadges();
      
      const dropdown = document.getElementById("notificationDropdown");
      if (dropdown) dropdown.classList.add("hidden");
      
      if (typeof showToast === 'function') {
        showToast("Semua notifikasi telah dibaca", "success");
      }
    }
  } catch (error) {
    console.error("Error marking all as read:", error);
    if (typeof showToast === 'function') {
      showToast("Gagal menandai semua notifikasi", "error");
    }
  }
}

// ========== VIEW ALL NOTIFICATIONS ==========
function viewAllNotifications() {
  window.location.href = "/notifications.html";
}

// ========== GET TIME AGO ==========
function getTimeAgo(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Baru saja";
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays === 1) return "Kemarin";
  return `${diffDays} hari lalu`;
}

// ========== EXPORT ==========
window.loadNotifications = loadNotifications;
window.renderNotifications = renderNotifications;
window.toggleNotificationDropdown = toggleNotificationDropdown;
window.handleNotificationClick = handleNotificationClick;
window.markNotificationRead = markNotificationRead;
window.markAllNotificationsRead = markAllNotificationsRead;
window.viewAllNotifications = viewAllNotifications;
window.getNotificationIcon = getNotificationIcon;
window.updateMobileNotificationBadge = updateMobileNotificationBadge;
window.updateNotificationBadges = updateNotificationBadges;