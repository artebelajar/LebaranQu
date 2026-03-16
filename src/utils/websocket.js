// ===================================================
// FILE: public/js/websocket.js
// ===================================================

let ws = null;
let sseSource = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const clients = new Map();

// ========== WEBSOCKET CLIENT ==========
function connectWebSocket() {
  if (!currentUser) return;

  // Gunakan wss:// untuk HTTPS, ws:// untuk HTTP
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}/ws?userId=${currentUser.id}`;

  console.log("🔌 Connecting WebSocket to:", wsUrl);

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("🔌 WebSocket connected");
      reconnectAttempts = 0;

      // Send ping every 30 seconds
      if (window.pingInterval) clearInterval(window.pingInterval);
      window.pingInterval = setInterval(() => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📨 WebSocket message:", data);
        if (window.handleRealtimeUpdate) {
          window.handleRealtimeUpdate(data);
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onclose = (event) => {
      console.log("🔌 WebSocket disconnected:", event.code, event.reason);

      if (window.pingInterval) {
        clearInterval(window.pingInterval);
        window.pingInterval = null;
      }

      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(
          `🔄 Reconnecting in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
        );
        setTimeout(connectWebSocket, delay);
      } else {
        console.log(
          "❌ Max reconnection attempts reached, falling back to SSE",
        );
        connectSSE();
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
  } catch (error) {
    console.error("WebSocket connection error:", error);
    connectSSE();
  }
}

// ========== SSE CLIENT (FALLBACK) ==========
function connectSSE() {
  if (!currentUser) return;

  if (sseSource) {
    sseSource.close();
  }

  // Gunakan URL yang benar dengan protocol https
  const sseUrl = `/events?userId=${currentUser.id}`;
  console.log("📡 Connecting SSE to:", sseUrl);

  try {
    sseSource = new EventSource(sseUrl);

    sseSource.onopen = () => {
      console.log("📡 SSE connected");
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
        console.log("📡 SSE closed");

        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(
            `🔄 Reconnecting SSE in ${delay / 1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`,
          );
          setTimeout(connectSSE, delay);
        }
      }
    };
  } catch (error) {
    console.error("SSE connection error:", error);
  }
}

// ========== CLOSE CONNECTIONS ==========
function closeConnections() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (sseSource) {
    sseSource.close();
    sseSource = null;
  }
  if (window.pingInterval) {
    clearInterval(window.pingInterval);
    window.pingInterval = null;
  }
}

export function broadcastToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// PASTIKAN INI ADA!
export function broadcastToAll(data) {
  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });
}

export function getOnlineUsersCount() {
  return clients.size;
}

export function isUserOnline(userId) {
  return clients.has(userId);
}

// Export ke window
window.connectWebSocket = connectWebSocket;
window.connectSSE = connectSSE;
window.closeConnections = closeConnections;
