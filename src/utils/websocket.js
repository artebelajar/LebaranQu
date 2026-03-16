// ===================================================
// FILE: src/utils/websocket.js (BACKEND)
// ===================================================
import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Map(); // userId -> WebSocket

export function initWebSocket(server) {
  try {
    console.log('🔌 Initializing WebSocket server...');
    
    wss = new WebSocketServer({ 
      server, 
      path: '/ws'  // PASTIKAN PATH INI SAMA DENGAN YANG DI FRONTEND
    });
    
    console.log(`✅ WebSocket server initialized on path: /ws`);

    wss.on('connection', (ws, req) => {
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const userId = parseInt(url.searchParams.get('userId'));

        if (userId) {
          clients.set(userId, ws);
          console.log(`👤 User ${userId} connected to WebSocket. Total clients: ${clients.size}`);

          // Broadcast ke semua user bahwa user ini online
          broadcastToAll({
            type: 'user_online',
            userId: userId,
            online: true,
            timestamp: new Date()
          });

          // Kirim konfirmasi ke user yang baru connect
          ws.send(JSON.stringify({
            type: 'connected',
            message: 'WebSocket connected successfully',
            userId
          }));
        } else {
          console.warn('⚠️ WebSocket connection without userId');
          ws.close(1008, 'User ID required');
        }

        // Handle pesan dari client
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message.toString());
            if (data.type === 'ping') {
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
            }
          } catch (error) {
            console.error('WebSocket message error:', error);
          }
        });

        // Handle koneksi ditutup
        ws.on('close', (code, reason) => {
          // Cari user mana yang terputus
          for (const [id, client] of clients.entries()) {
            if (client === ws) {
              clients.delete(id);
              console.log(`🔴 User ${id} disconnected. Total clients: ${clients.size}`);

              // Broadcast ke semua user bahwa user ini offline
              broadcastToAll({
                type: 'user_online',
                userId: id,
                online: false,
                timestamp: new Date()
              });
              break;
            }
          }
        });

        // Handle error
        ws.on('error', (error) => {
          console.error('WebSocket connection error:', error);
        });

      } catch (error) {
        console.error('Error in WebSocket connection handler:', error);
      }
    });

    return wss;
  } catch (error) {
    console.error('❌ WebSocket server error:', error);
    return null;
  }
}

export function broadcastToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) { // 1 = OPEN
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

export function broadcastToAll(data) {
  clients.forEach((ws) => {
    if (ws && ws.readyState === 1) {
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