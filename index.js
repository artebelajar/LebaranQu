import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from 'hono/compress';
import { secureHeaders } from 'hono/secure-headers';
import { rateLimiter } from 'hono-rate-limiter';
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { WebSocketServer } from 'ws';

// Import routes
import usersApi from "./src/api/users.js";
import postsApi from "./src/api/posts.js";
import notificationsApi from "./src/api/notifications.js";
import achievementsApi from "./src/api/achievements.js";
import leaderboardApi from "./src/api/leaderboard.js";

dotenv.config();

const app = new Hono();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== WEBSOCKET SETUP ==========
let wss = null;
const clients = new Map(); // userId -> WebSocket

export function initWebSocket(server) {
  try {
    wss = new WebSocketServer({ server, path: '/ws' });
    
    console.log(`🔌 WebSocket server initialized`);

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const userId = parseInt(url.searchParams.get('userId'));

      if (userId) {
        clients.set(userId, ws);
        console.log(`👤 User ${userId} connected to WebSocket`);

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
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
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

export function broadcastToUser(userId, data) {
  const ws = clients.get(userId);
  if (ws && ws.readyState === 1) {
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

// ========== SECURITY HEADERS ==========
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "'unsafe-eval'",
      "https://cdn.tailwindcss.com",
      "https://cdnjs.cloudflare.com",
      "https://www.google.com",
      "https://www.gstatic.com"
    ],
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    fontSrc: [
      "'self'", 
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com",
      "data:"
    ],
    imgSrc: [
      "'self'", 
      "data:", 
      "https://media.istockphoto.com",
      "https://cdnjs.cloudflare.com",
      "https://www.gstatic.com",
      "https://www.google.com",
      "https://*.supabase.co"
    ],
    connectSrc: [
      "'self'", 
      "ws:", 
      "wss:",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://*.supabase.co"
    ],
    frameSrc: ["'self'", "https://www.google.com", "https://recaptcha.google.com"],
  },
}));

// ========== MIDDLEWARE ==========
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`);
});

app.use("/*", cors());
app.use('*', compress({ threshold: 1024 }));

// ========== RATE LIMITER ==========
const limiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 200,
  keyGenerator: (c) => c.req.header('x-forwarded-for') || 'unknown',
});

app.use('/api/*', limiter);

// ========== API ROUTES ==========
app.route("/api/users", usersApi);
app.route("/api/posts", postsApi);
app.route("/api/notifications", notificationsApi);
app.route("/api/achievements", achievementsApi);
app.route("/api/leaderboard", leaderboardApi);

// ========== SSE ENDPOINT (FALLBACK) ==========
app.get("/events", (c) => {
  const userId = c.req.query('userId');
  
  if (!userId) {
    return c.json({ error: "User ID diperlukan" }, 400);
  }
  
  console.log(`📡 SSE connection requested for user ${userId}`);
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('Access-Control-Allow-Origin', '*');
  
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
      
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`: ping\n\n`);
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 30000);
      
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        console.log(`📡 SSE connection closed for user ${userId}`);
      });
    }
  });
  
  return c.body(stream, 200);
});

// ========== HEALTH CHECK ==========
app.get('/health', (c) => {
  return c.json({ 
    status: 'ok', 
    time: new Date().toISOString(),
    message: 'Server is running'
  });
});

// ========== STATIC FILES ==========
app.use("/*", serveStatic({ root: join(__dirname, "public") }));

// ========== 404 HANDLER ==========
app.notFound((c) => {
  return c.json({ error: "Not Found", message: "Endpoint tidak ditemukan" }, 404);
});

// ========== ERROR HANDLER ==========
app.onError((err, c) => {
  console.error('❌ Error:', err);
  return c.json({ error: err.message }, 500);
});

// ========== START SERVER ==========
const port = process.env.PORT || 6006;

const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
  console.log(`📡 SSE endpoint at /events`);
  
  // Inisialisasi WebSocket
  initWebSocket(server);
  console.log(`🔌 WebSocket server running at ws://localhost:${info.port}/ws`);
});