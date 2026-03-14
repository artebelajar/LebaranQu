import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from 'hono/compress';
import { rateLimiter } from 'hono-rate-limiter';
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

// Import routes
import usersApi from "./src/api/users.js";
import postsApi from "./src/api/posts.js";
import notificationsApi from "./src/api/notifications.js";

// Import WebSocket functions
import { initWebSocket, broadcastToUser, broadcastToAll } from "./src/utils/websocket.js";

dotenv.config();

const app = new Hono();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== MIDDLEWARE ==========

// 1. Logging dengan response time
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${ms}ms`);
});

// 2. CORS
app.use("/*", cors());

// 3. Compression
app.use('*', compress({ threshold: 1024 }));

// 4. Rate limiter
const limiter = rateLimiter({
  windowMs: 60 * 1000,
  limit: 200,
  standardHeaders: 'draft-6',
  keyGenerator: (c) => {
    const userId = c.req.query('userId') || c.req.header('x-user-id');
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    return userId || ip;
  },
  skip: (c) => c.req.path.includes('/api/users/login') || 
           c.req.path.includes('/api/users/register')
});
app.use('/api/*', limiter);

// ========== API ROUTES ==========
app.route("/api/users", usersApi);
app.route("/api/posts", postsApi);
app.route("/api/notifications", notificationsApi);

// ========== SSE ENDPOINT - PERBAIKI ==========
app.get("/events", async (c) => {
  try {
    const userId = c.req.query('userId');
    
    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    console.log(`📡 SSE connected for user ${userId}`);

    // Set headers untuk SSE
    c.header('Content-Type', 'text/event-stream');
    c.header('Cache-Control', 'no-cache');
    c.header('Connection', 'keep-alive');
    c.header('Access-Control-Allow-Origin', '*');

    // Create a readable stream
    const stream = new ReadableStream({
      start(controller) {
        // Send initial connection message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);

        // Send ping every 30 seconds to keep connection alive
        const pingInterval = setInterval(() => {
          controller.enqueue(`: ping\n\n`);
        }, 30000);

        // Handle client disconnect
        c.req.raw.signal.addEventListener('abort', () => {
          clearInterval(pingInterval);
          console.log(`📡 SSE disconnected for user ${userId}`);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    console.error('❌ SSE error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== STATIC FILES ==========
app.use("/*", serveStatic({ root: join(__dirname, "public") }));

// Fallback untuk file upload
app.get('/uploads/*', async (c) => {
  try {
    const filePath = join(__dirname, 'public', c.req.path);
    if (!fs.existsSync(filePath)) {
      return c.text('File not found', 404);
    }
    
    const file = fs.readFileSync(filePath);
    const ext = filePath.split('.').pop().toLowerCase();
    
    const contentTypes = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp'
    };
    
    return c.body(file, 200, { 
      'Content-Type': contentTypes[ext] || 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000'
    });
  } catch (error) {
    return c.text('File not found', 404);
  }
});

// 404 handler
app.notFound((c) => {
  return c.text("404 Not Found", 404);
});

// ========== START SERVER DENGAN `serve` DARI HONO ==========
const port = process.env.PORT || 6006;

// Pastikan folder uploads ada
const uploadDir = join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Start server menggunakan serve dari Hono
const server = serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  
  // Inisialisasi WebSocket dengan server yang sama
  try {
    initWebSocket(server);
    console.log(`🔌 WebSocket server running at ws://localhost:${info.port}/ws`);
  } catch (error) {
    console.error('❌ Failed to initialize WebSocket:', error);
  }
});

// Export functions untuk digunakan di routes
export { broadcastToUser, broadcastToAll };