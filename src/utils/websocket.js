// src/utils/websocket.js
import { WebSocketServer } from 'ws';

let wss = null;
const clients = new Map(); // userId -> WebSocket

// Inisialisasi WebSocket
export function initWebSocket(server) {
  try {
    wss = new WebSocketServer({ server, path: '/ws' });
    
    console.log(`🔌 WebSocket server initialized`);
    
    wss.on('connection', (ws, req) => {
      // Parse user ID dari URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = parseInt(url.searchParams.get('userId'));
      
      if (userId) {
        clients.set(userId, ws);
        console.log(`👤 User ${userId} connected to WebSocket`);
        
        // Broadcast user online
        broadcastToAll({
          type: 'user_online',
          userId: userId,
          online: true,
          timestamp: new Date()
        });
        
        ws.send(JSON.stringify({
          type: 'connected',
          message: 'WebSocket connected successfully',
          userId
        }));
      }
      
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          console.log('📨 WebSocket message:', data);
          
          switch (data.type) {
            case 'ping':
              ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
              break;
              
            case 'typing':
              if (data.postId && data.userId) {
                broadcastToAll({
                  type: 'typing',
                  userId: data.userId,
                  postId: data.postId,
                  isTyping: data.isTyping,
                  timestamp: new Date()
                });
              }
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      ws.on('close', () => {
        for (const [id, client] of clients.entries()) {
          if (client === ws) {
            clients.delete(id);
            console.log(`🔴 User ${id} disconnected from WebSocket`);
            
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
    });
    
    return wss;
  } catch (error) {
    console.error('❌ WebSocket server error:', error);
    return null;
  }
}

// Broadcast to specific user
export function broadcastToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
    ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

// Broadcast to all connected users
export function broadcastToAll(data) {
  clients.forEach((ws) => {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(data));
    }
  });
}

// Get online users count
export function getOnlineUsersCount() {
  return clients.size;
}

// Check if user is online
export function isUserOnline(userId) {
  return clients.has(userId);
}