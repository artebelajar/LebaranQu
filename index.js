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

// Import routes
import usersApi from "./src/api/users.js";
import postsApi from "./src/api/posts.js";
import notificationsApi from "./src/api/notifications.js";
import achievementsApi from "./src/api/achievements.js";
import leaderboardApi from "./src/api/leaderboard.js";

dotenv.config();

const app = new Hono();
const __dirname = dirname(fileURLToPath(import.meta.url));

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
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
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
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    const userId = c.req.query('userId') || c.req.header('x-user-id');
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    return userId || ip;
  },
  skip: (c) => {
    const path = c.req.path;
    return path.includes('/api/users/login') || path.includes('/api/users/register');
  }
});

app.use('/api/*', limiter);

// ========== API ROUTES ==========
app.route("/api/users", usersApi);
app.route("/api/posts", postsApi);
app.route("/api/notifications", notificationsApi);
app.route("/api/achievements", achievementsApi);
app.route("/api/leaderboard", leaderboardApi);

// ========== SSE ENDPOINT ==========
app.get("/events", async (c) => {
  const userId = c.req.query('userId');
  
  if (!userId) {
    return c.json({ error: "User ID diperlukan" }, 400);
  }
  
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();
  
  writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
  
  const pingInterval = setInterval(() => {
    writer.write(encoder.encode(`: ping\n\n`));
  }, 30000);
  
  c.req.raw.signal.addEventListener('abort', () => {
    clearInterval(pingInterval);
    writer.close();
    console.log(`📡 SSE connection closed for user ${userId}`);
  });
  
  return c.body(readable, 200);
});

// ========== STATIC FILES ==========
app.use("/*", serveStatic({ root: join(__dirname, "public") }));

// 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found", message: "Endpoint tidak ditemukan" }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('❌ Error:', err);
  return c.json({ error: err.message }, 500);
});

// Test endpoint untuk melihat bucket yang tersedia
app.get('/api/list-buckets', async (c) => {
  try {
    const { StorageService } = await import('./src/utils/storage.js');
    const result = await StorageService.listBuckets();
    return c.json(result);
  } catch (error) {
    return c.json({ error: error.message }, 500);
  }
});

// ========== START SERVER ==========
const port = process.env.PORT || 6006;

const server = serve({
  fetch: app.fetch,
  port,
}, async (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
  console.log(`📁 Using Supabase Storage for uploads`);
  
  // Test koneksi Supabase
  try {
    const { StorageService } = await import('./src/utils/storage.js');
    const test = await StorageService.testConnection();
    if (test.success) {
      console.log(`✅ Supabase Storage connected`);
    } else {
      console.warn(`⚠️ Supabase Storage warning:`, test.error);
    }
  } catch (error) {
    console.warn(`⚠️ Could not test Supabase`);
  }
  
  // Inisialisasi WebSocket
  try {
    const { initWebSocket } = await import('./src/utils/websocket.js');
    initWebSocket(server);
    console.log(`🔌 WebSocket server running at ws://localhost:${info.port}/ws`);
  } catch (wsError) {
    console.log('📡 Falling back to SSE only');
  }
});