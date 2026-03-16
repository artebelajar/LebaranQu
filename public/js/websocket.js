// ===================================================
// FILE: public/js/websocket.js (FRONTEND)
// ===================================================

var sseSource = null;
var reconnectAttempts = 0;
var MAX_RECONNECT_ATTEMPTS = 5;

// ========== SSE CLIENT (SATU-SATUNYA KONEKSI REAL-TIME) ==========
function connectSSE() {
  if (!currentUser) {
    console.warn('⚠️ Cannot connect SSE: No current user');
    return;
  }

  if (sseSource) {
    sseSource.close();
  }

  const sseUrl = `/events?userId=${currentUser.id}`;
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
          console.log(
            `🔄 Reconnecting SSE in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
          );
          setTimeout(connectSSE, delay);
        } else {
          console.log("❌ Max reconnection attempts reached");
        }
      }
    };
  } catch (error) {
    console.error("SSE connection error:", error);
  }
}

// ========== WEBSOCKET DINONAKTIFKAN ==========
function connectWebSocket() {
  console.log("⚠️ WebSocket tidak digunakan, menggunakan SSE");
  connectSSE();
}

// ========== CLOSE CONNECTIONS ==========
function closeConnections() {
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
}

// Export ke window
window.connectWebSocket = connectWebSocket;
window.connectSSE = connectSSE;
window.closeConnections = closeConnections;