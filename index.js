import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { compress } from 'hono/compress';
import { rateLimiter } from 'hono-rate-limiter';
import { RedisStore } from 'rate-limit-redis';
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import fs from "fs";

// Import routes
import usersApi from "./src/api/users.js";
import postsApi from "./src/api/posts.js";
import notificationsApi from "./src/api/notifications.js";

// Import redis untuk rate limiter store
import redis from "./src/utils/redis.js";

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
app.use('*', compress({
  threshold: 1024,
}));

// 4. Global rate limiter - PERBAIKAN DI SINI
const limiter = rateLimiter({
  windowMs: 60 * 1000, // 1 menit
  limit: 200, // 200 request per menit (gunakan 'limit' bukan 'max')
  standardHeaders: 'draft-6', // Mengirim rate limit info di headers
  keyGenerator: (c) => {
    // Rate limit berdasarkan IP atau user ID
    const userId = c.req.query('userId') || c.req.header('x-user-id');
    const ip = c.req.header('x-forwarded-for') || 'unknown';
    return userId || ip;
  },
  skip: (c) => {
    // Skip rate limiter untuk login/register
    return c.req.path.includes('/api/users/login') || 
           c.req.path.includes('/api/users/register');
  },
  // Optional: gunakan Redis store untuk rate limiter
  // store: new RedisStore({
  //   client: redis,
  //   prefix: 'rl:',
  // })
});

// Terapkan rate limiter ke semua route API
app.use('/api/*', limiter);

// ========== API ROUTES ==========
app.route("/api/users", usersApi);
app.route("/api/posts", postsApi);
app.route("/api/notifications", notificationsApi);

// ========== STATIC FILES ==========
app.use("/*", serveStatic({
  root: join(__dirname, "public"),
}));

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
  console.log('❌ 404 Not Found:', c.req.path);
  return c.text("404 Not Found", 404);
});

// ========== START SERVER ==========
const port = process.env.PORT || 6006;

// Pastikan folder uploads ada
const uploadDir = join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`🚀 Server running at http://localhost:${info.port}`);
    console.log(`📁 Upload directory: ${uploadDir}`);
    console.log(`⚡ Compression: enabled`);
    console.log(`🛡️ Rate limiter: enabled (200 req/min)`);
    console.log(`📦 Redis: ${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`);
  },
);