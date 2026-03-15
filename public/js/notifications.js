// ===================================================
// FILE: notifications.js - Fungsi Terkait Notifikasi
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