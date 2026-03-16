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
import fs from "fs";

// Import routes
import usersApi from "./src/api/users.js";
import postsApi from "./src/api/posts.js";
import notificationsApi from "./src/api/notifications.js";
import achievementsApi from "./src/api/achievements.js";
import leaderboardApi from "./src/api/leaderboard.js";

dotenv.config();

const app = new Hono();
const __dirname = dirname(fileURLToPath(import.meta.url));

// ========== SECURITY HEADERS UNTUK RECAPTCHA ==========
app.use('*', secureHeaders({
  contentSecurityPolicy: {
    defaultSrc: ["'self'"],
    
    // Script sources
    scriptSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "'unsafe-eval'",
      "https://cdn.tailwindcss.com",
      "https://cdnjs.cloudflare.com",
      "https://www.google.com",
      "https://www.gstatic.com",
      "https://www.google.com/recaptcha/",
      "https://www.gstatic.com/recaptcha/",
      "https://recaptcha.google.com/recaptcha/"
    ],
    
    // Style sources
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", 
      "https://fonts.googleapis.com",
      "https://cdnjs.cloudflare.com"
    ],
    
    // Font sources
    fontSrc: [
      "'self'", 
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com",
      "data:"
    ],
    
    // Image sources
    imgSrc: [
      "'self'", 
      "data:", 
      "https://media.istockphoto.com",
      "https://cdnjs.cloudflare.com",
      "https://www.gstatic.com",
      "https://www.google.com",
      "https://*.supabase.co",           
      "https://*.supabase.in",           
      "https://supabase.co",             
      "https://supabase.in"  
    ],
    
    // CONNECT SOURCES - INI YANG PALING PENTING UNTUK FETCH API
    connectSrc: [
      "'self'", 
      "ws:", 
      "wss:",
      "https://www.google.com",
      "https://www.google.com/recaptcha/",
      "https://www.gstatic.com",
      "https://www.gstatic.com/recaptcha/",
      "https://recaptcha.google.com",
      "https://recaptcha.google.com/recaptcha/",
      "https://*.google.com",
      "https://*.gstatic.com"
    ],
    
    // Frame sources
    frameSrc: [
      "'self'", 
      "https://www.google.com",
      "https://www.google.com/recaptcha/",
      "https://recaptcha.google.com",
      "https://recaptcha.google.com/recaptcha/"
    ],
    
    // Child sources
    childSrc: [
      "'self'", 
      "https://www.google.com",
      "https://recaptcha.google.com"
    ],
    
    // Form actions
    formAction: ["'self'"],
    
    // Frame ancestors
    frameAncestors: ["'self'"],
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

// ========== RATE LIMITER - VERSI YANG BENAR ==========
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 menit
  limit: 200, // Maksimal 200 request
  standardHeaders: 'draft-7',
  keyGenerator: (c) => {
    const userId = c.req.query('userId') || c.req.header('x-user-id');
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    return userId || ip;
  },
  skip: (c) => {
    const path = c.req.path;
    return path.includes('/api/users/login') || path.includes('/api/users/register');
  },
  handler: (c) => {
    return c.json({ 
      error: 'Terlalu banyak permintaan', 
      message: 'Silakan coba lagi nanti',
      retryAfter: 60 
    }, 429);
  }
});

app.use('/api/*', limiter);

// ========== API ROUTES ==========
app.route("/api/users", usersApi);
app.route("/api/posts", postsApi);
app.route("/api/notifications", notificationsApi);
app.route("/api/achievements", achievementsApi);
app.route("/api/leaderboard", leaderboardApi);

// ========== SSE ENDPOINT - VERSI YANG BENAR ==========
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
  c.header('X-Accel-Buffering', 'no'); // Untuk nginx
  
  // Buat stream manual
  const stream = new ReadableStream({
    start(controller) {
      // Kirim koneksi berhasil
      controller.enqueue(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`);
      
      // Ping setiap 30 detik
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`: ping\n\n`);
        } catch (e) {
          clearInterval(pingInterval);
        }
      }, 30000);
      
      // Cleanup saat koneksi ditutup
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

// Fallback untuk file upload
app.get('/uploads/*', async (c) => {
  try {
    const filePath = join(__dirname, 'public', c.req.path);
    if (!fs.existsSync(filePath)) return c.text('File not found', 404);
    
    const file = fs.readFileSync(filePath);
    const ext = filePath.split('.').pop().toLowerCase();
    const contentTypes = {
      jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
      gif: 'image/gif', webp: 'image/webp'
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
  return c.json({ 
    error: "Not Found",
    message: "Endpoint tidak ditemukan"
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('❌ Error:', err);
  return c.json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Terjadi kesalahan internal' 
      : err.message 
  }, 500);
});

// ========== START SERVER ==========
const port = process.env.PORT || 6006;

// Pastikan folder uploads ada
const uploadDir = join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Start server
const server = serve({
  fetch: app.fetch,
  port,
}, async (info) => {
  console.log(`🚀 Server running at http://localhost:${info.port}`);
  console.log(`📁 Upload directory: ${uploadDir}`);
  
  // Inisialisasi WebSocket - DENGAN TRY-CATCH
  try {
    const { initWebSocket } = await import('./src/utils/websocket.js');
    initWebSocket(server);
    console.log(`🔌 WebSocket server running at ws://localhost:${info.port}/ws`);
  } catch (wsError) {
    console.error('❌ WebSocket initialization failed:', wsError);
    console.log('📡 Falling back to SSE only');
  }
});