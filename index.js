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

// ========== SSE ENDPOINT (Server-Sent Events) ==========
app.get("/events", async (c) => {
  const userId = c.req.query('userId');
  
  if (!userId) {
    return c.json({ error: "User ID diperlukan" }, 400);
  }
  
  console.log(`📡 SSE connection requested for user ${userId}`);
  
  // Set headers untuk SSE
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');
  c.header('Access-Control-Allow-Origin', '*');
  
  // Buat stream
  const stream = new ReadableStream({
    start(controller) {
      // Kirim pesan koneksi berhasil
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
      
      // Kirim ping setiap 30 detik
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`: ping\n\n`);
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 30000);
      
      // Bersihkan interval saat koneksi ditutup
      c.req.raw.signal.addEventListener('abort', () => {
        clearInterval(pingInterval);
        console.log(`📡 SSE connection closed for user ${userId}`);
      });
    }
  });
  
  return c.body(stream, 200);
});

// ========== STATIC FILES ==========
app.use("/*", serveStatic({ root: join(__dirname, "public") }));

// ========== 404 HANDLER ==========
app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

// ========== ERROR HANDLER ==========
app.onError((err, c) => {
  console.error('❌ Error:', err);
  return c.json({ error: err.message }, 500);
});

// ========== HEALTH CHECK ==========
app.get('/health', (c) => c.json({ status: 'ok', time: new Date() }));

// ========== START SERVER ==========
const port = process.env.PORT || 6006;

const server = serve({
  fetch: app.fetch,
  port,
}, async (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
  console.log(`📁 Using Supabase Storage for uploads`);
  
  // Inisialisasi WebSocket - PASTIKAN INI DIPANGGIL
  try {
    const { initWebSocket } = await import('./src/utils/websocket.js');
    const wss = initWebSocket(server);
    if (wss) {
      console.log(`🔌 WebSocket server running at ws://localhost:${info.port}/ws`);
      console.log(`🔒 For HTTPS: wss://${process.env.VERCEL_URL || 'yourdomain.com'}/ws`);
    } else {
      console.error('❌ Failed to initialize WebSocket server');
    }
  } catch (error) {
    console.error('❌ WebSocket initialization error:', error);
  }
  
  // Test koneksi database
  try {
    await sql`SELECT 1`;
    console.log('✅ Database connected');
  } catch (dbError) {
    console.error('❌ Database connection failed:', dbError.message);
  }
});