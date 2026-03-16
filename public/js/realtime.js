// ===================================================
// FILE: public/js/realtime.js (CLEAN VERSION)
// ===================================================

let sseSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

// ========== INITIALIZE SSE ==========
function initSSE() {
  // Gunakan window.currentUser
  if (!window.currentUser) {
    console.log('⚠️ No user logged in, SSE not started');
    return;
  }
  connectSSE();
}

// ========== SSE CLIENT ==========
function connectSSE() {
  if (!window.currentUser) return;

  if (sseSource) {
    sseSource.close();
  }

  const sseUrl = `/events?userId=${window.currentUser.id}`;
  console.log("📡 Connecting SSE to:", sseUrl);

  try {
    sseSource = new EventSource(sseUrl);

    sseSource.onopen = () => {
      console.log("✅ SSE connected");
      reconnectAttempts = 0;
    };

    sseSource.onmessage = (event) => {
      try {
        if (event.data && !event.data.startsWith(":")) {
          const data = JSON.parse(event.data);
          console.log("📡 SSE message:", data);
          if (window.handleRealtimeUpdate) {
            window.handleRealtimeUpdate(data);
          }
        }
      } catch (error) {
        console.error("SSE message error:", error);
      }
    };

    sseSource.onerror = (error) => {
      console.error("SSE error:", error);

      if (sseSource.readyState === EventSource.CLOSED) {
        console.log("📡 SSE connection closed");

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`🔄 Reconnecting SSE in ${delay / 1000}s...`);
          setTimeout(connectSSE, delay);
        }
      }
    };
  } catch (error) {
    console.error("SSE connection error:", error);
  }
}

// ========== CLOSE SSE ==========
function closeSSE() {
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
}

// ========== HANDLE REAL-TIME UPDATES ==========
function handleRealtimeUpdate(data) {
  switch (data.type) {
    case 'connected':
      console.log('✅ Real-time connected');
      break;
    case 'user_online':
      handleUserOnline(data.userId, data.online);
      break;
    case 'new_post':
      if (typeof handleNewPost === 'function') handleNewPost(data.post);
      break;
    case 'update_likes':
      if (typeof handleLikeUpdate === 'function') handleLikeUpdate(data.postId, data.likeCount);
      break;
    default:
      console.log('Unknown event type:', data.type);
  }
}

function handleUserOnline(userId, online) {
  const userElement = document.querySelector(`[data-user-id="${userId}"]`);
  if (userElement) {
    const statusDot = userElement.querySelector('.online-status-dot');
    if (statusDot) {
      statusDot.className = `online-status-dot w-2 h-2 ${online ? 'bg-green-500' : 'bg-gray-400'} rounded-full absolute bottom-0 right-0`;
    }
  }
}

// Export ke window
window.initSSE = initSSE;
window.connectSSE = connectSSE;
window.closeSSE = closeSSE;
window.handleRealtimeUpdate = handleRealtimeUpdate;