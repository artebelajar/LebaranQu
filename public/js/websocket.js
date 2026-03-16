// ===================================================
// FILE: websocket.js - WebSocket & SSE Connection
// ===================================================

let ws = null;
let sseSource = null;
let reconnectAttempts = 0;

// ========== WEBSOCKET CLIENT ==========
function connectWebSocket() {
  if (!currentUser) return;
  
  const wsUrl = `ws://${window.location.host}/ws?userId=${currentUser.id}`;
  // console.log('🔌 Connecting WebSocket...');
  
  ws = new WebSocket(wsUrl);
  
  ws.onopen = () => {
    // console.log('🔌 WebSocket connected');
    reconnectAttempts = 0;
    
    // Send ping every 30 seconds
    setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };
  
  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      // console.log('📨 WebSocket message:', data);
      if (window.handleRealtimeUpdate) {
        window.handleRealtimeUpdate(data);
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  };
  
  ws.onclose = () => {
    // console.log('🔌 WebSocket disconnected');
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      // console.log(`🔄 Reconnecting in ${delay/1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
      setTimeout(connectWebSocket, delay);
    } else {
      // console.log('❌ Max reconnection attempts reached, falling back to SSE');
      connectSSE();
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
}

// ========== SSE CLIENT (FALLBACK) ==========
function connectSSE() {
  if (!currentUser) return;
  
  if (sseSource) {
    sseSource.close();
  }
  
  const sseUrl = `/events?userId=${currentUser.id}`;
  // console.log('📡 Connecting SSE...');
  
  sseSource = new EventSource(sseUrl);
  
  sseSource.onopen = () => {
    // console.log('📡 SSE connected');
    reconnectAttempts = 0;
  };
  
  sseSource.onmessage = (event) => {
    try {
      if (event.data && !event.data.startsWith(':')) {
        const data = JSON.parse(event.data);
        // console.log('📡 SSE message:', data);
        if (window.handleRealtimeUpdate) {
          window.handleRealtimeUpdate(data);
        }
      }
    } catch (error) {
      console.error('SSE message error:', error);
    }
  };
  
  sseSource.onerror = (error) => {
    console.error('SSE error:', error);
    
    if (sseSource.readyState === EventSource.CLOSED) {
      // console.log('📡 SSE closed');
      
      if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        // console.log(`🔄 Reconnecting SSE in ${delay/1000}s... (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`);
        setTimeout(connectSSE, delay);
      }
    }
  };
}

// ========== CLOSE CONNECTIONS ==========
function closeConnections() {
  if (ws) ws.close();
  if (sseSource) sseSource.close();
}