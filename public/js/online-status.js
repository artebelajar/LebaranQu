// ===================================================
// FILE: online-status.js - Fungsi Terkait Online Status
// ===================================================

let onlineStatus = {};
let heartbeatInterval = null;

// ========== LOAD ONLINE STATUS ==========
async function loadOnlineStatus(userIds) {
  if (!userIds || userIds.length === 0) return;
  
  const validUserIds = userIds.filter(id => id && !isNaN(parseInt(id))).map(id => parseInt(id));
  
  if (validUserIds.length === 0) return;
  
  const uniqueUserIds = [...new Set(validUserIds)];
  
  console.log('Loading online status for users:', uniqueUserIds);
  
  try {
    const response = await fetch(`${API_BASE}/users/online-status`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("userToken")}`,
      },
      body: JSON.stringify({ userIds: uniqueUserIds }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Online status response error:', response.status, errorText);
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();
    console.log('Online status data:', data);
    
    onlineStatus = { ...onlineStatus, ...data };
    updateOnlineStatusUI();
    
  } catch (error) {
    console.error("Error loading online status:", error);
  }
}

// ========== UPDATE ONLINE STATUS UI ==========
function updateOnlineStatusUI() {
  document.querySelectorAll("[data-user-id]").forEach((el) => {
    const userId = parseInt(el.dataset.userId);
    if (isNaN(userId)) return;
    
    const status = onlineStatus[userId];
    
    if (status) {
      const statusDot = el.querySelector(".online-status-dot");
      if (statusDot) {
        if (status.online) {
          statusDot.className = "online-status-dot w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0";
        } else {
          statusDot.className = "online-status-dot w-2 h-2 bg-gray-400 rounded-full absolute bottom-0 right-0";
        }
      }
    }
  });
}

// ========== UPDATE ONLINE STATUS (from realtime) ==========
function updateOnlineStatus(userId, online) {
  onlineStatus[userId] = { online, lastActive: new Date() };

  const userElement = document.querySelector(`[data-user-id="${userId}"]`);
  if (userElement) {
    const statusDot = userElement.querySelector(".online-status-dot");
    if (statusDot) {
      statusDot.className = `online-status-dot w-2 h-2 ${online ? "bg-green-500" : "bg-gray-400"} rounded-full absolute bottom-0 right-0`;
    }
  }
}

// ========== HEARTBEAT ==========
function startHeartbeat() {
  if (!currentUser) return;

  console.log("Starting heartbeat for user:", currentUser.id);

  heartbeatInterval = setInterval(async () => {
    try {
      const response = await fetch(`${API_BASE}/users/${currentUser.id}/heartbeat`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });

      if (response.ok) {
        console.log("💓 Heartbeat sent");
      } else {
        console.error("Heartbeat failed:", response.status);
      }
    } catch (error) {
      console.error("Heartbeat error:", error);
    }
  }, HEARTBEAT_INTERVAL);

  fetch(`${API_BASE}/users/${currentUser.id}/heartbeat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${localStorage.getItem("userToken")}`,
    },
  })
    .then((response) => {
      if (response.ok) {
        console.log("💓 Initial heartbeat sent");
      }
    })
    .catch((error) => console.error("Initial heartbeat error:", error));
}