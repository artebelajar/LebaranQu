import { Hono } from "hono";
import { db } from "../db/index.js";
import { users_26, posts } from "../db/schema.js";
import { checkLikeAchievements } from "../utils/achievement-check.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { broadcastToUser, broadcastToAll } from "../utils/websocket.js";
import { 
  registerSchema, 
  loginSchema, 
  updateUserSchema,
  userIdSchema,
  onlineStatusSchema
} from "../validators/schemas.js";
import { validateRequest, validateParams } from "../utils/validate.js";
import { StorageService } from "../utils/storage.js"; 

const app = new Hono();

// ========== HELPER FUNCTION VERIFY RECAPTCHA ==========
async function verifyRecaptcha(token) {
  try {
    const secretKey = process.env.RECAPTCHA_SECRET_KEY;
    
    if (!secretKey) {
      console.error('❌ RECAPTCHA_SECRET_KEY tidak ditemukan di .env');
      return true;
    }
    
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token
      })
    });
    
    const data = await response.json();
    console.log('reCAPTCHA verification:', data);
    
    return data.success;
  } catch (error) {
    console.error('reCAPTCHA error:', error);
    return false;
  }
}

// ========== PUBLIC ROUTES ==========

// POST /api/users/login - Login
app.post("/login", async (c) => {
  try {
    // VALIDASI DENGAN ZOD
    const validation = await validateRequest(c, loginSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const body = validation.data;
    console.log('Login attempt for email:', body.email);

    const isValid = await verifyRecaptcha(body.recaptchaToken);
    if (!isValid) {
      return c.json({ error: "Verifikasi reCAPTCHA gagal" }, 400);
    }

    // SELECT dengan last_active (sudah ada di database)
    const [user] = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        email: users_26.email,
        password: users_26.password,
        nomorTelepon: users_26.nomorTelepon,
        title: users_26.title,
        bioSingkat: users_26.bioSingkat,
        fotoProfil: users_26.fotoProfil,
        fotoProfilPath: users_26.fotoProfilPath,
        role: users_26.role,
        tokenAkses: users_26.tokenAkses,
        tokenExpired: users_26.tokenExpired,
        isActive: users_26.isActive,
        lastActive: users_26.lastActive,
        lastNotifRead: users_26.lastNotifRead,
        createdAt: users_26.createdAt,
        updatedAt: users_26.updatedAt
      })
      .from(users_26)
      .where(and(
        eq(users_26.email, body.email),
        eq(users_26.isActive, true)
      ))
      .limit(1);

    if (!user) {
      return c.json({ error: "Email tidak terdaftar" }, 404);
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.password);
    if (!isPasswordValid) {
      return c.json({ error: "Password salah" }, 401);
    }

    const token = uuidv4();
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 20);

    await db
      .update(users_26)
      .set({ 
        tokenAkses: token, 
        tokenExpired: expiredAt,
        lastActive: new Date()
      })
      .where(eq(users_26.id, user.id));

    const { password, ...userWithoutPassword } = user;

    return c.json({
      message: "Login berhasil",
      user: userWithoutPassword,
      token: token,
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== REGISTER - VERSI DIPERBAIKI ==========
app.post("/register", async (c) => {
  try {
    // VALIDASI DENGAN ZOD
    const validation = await validateRequest(c, registerSchema);
    if (!validation.success) {
      console.error('Validation error:', validation.error);
      return c.json({ 
        error: validation.error.message || "Validasi gagal", 
        details: validation.error.details || [] 
      }, 400);
    }
    
    const body = validation.data;
    console.log('Register attempt for email:', body.email);

    // Verifikasi reCAPTCHA
    const isValid = await verifyRecaptcha(body.recaptchaToken);
    if (!isValid) {
      return c.json({ error: "Verifikasi reCAPTCHA gagal" }, 400);
    }

    // Cek email sudah terdaftar
    const existingUser = await db
      .select({ id: users_26.id })
      .from(users_26)
      .where(eq(users_26.email, body.email))
      .limit(1);

    if (existingUser.length > 0) {
      return c.json({ error: "Email sudah terdaftar" }, 400);
    }

    const hashedPassword = await bcrypt.hash(body.password, 10);
    const token = uuidv4();
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 20);

    // INSERT dengan last_active
    const [newUser] = await db
      .insert(users_26)
      .values({
        namaLengkap: body.namaLengkap,
        asalSekolah: body.asalSekolah,
        email: body.email,
        password: hashedPassword,
        nomorTelepon: body.nomorTelepon || null,
        title: body.title || "Alumni",
        bioSingkat: body.bioSingkat || null,
        tokenAkses: token,
        tokenExpired: expiredAt,
        fotoProfil: "https://media.istockphoto.com/id/1495088043/id/vektor/ikon-profil-pengguna-avatar-atau-ikon-orang-gambar-profil-simbol-potret-gambar-potret.jpg?s=2048x2048&w=is&k=20&c=G7qTBxWs68Pm03TIb6rsOCo_m2JptQ8SVTrFfXq0kfU=",
        isActive: true,
        role: "user",
        lastActive: new Date(),
      })
      .returning();

    const { password, ...userWithoutPassword } = newUser;

    return c.json({
      message: "Registrasi berhasil",
      user: userWithoutPassword,
      token: token,
    }, 201);
    
  } catch (error) {
    console.error("❌ Register error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== ROUTES DENGAN AUTH ==========

// GET /api/users - Ambil semua users
app.get("/", async (c) => {
  try {
    const allUsers = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        lastActive: users_26.lastActive,
        isActive: users_26.isActive
      })
      .from(users_26)
      .orderBy(users_26.namaLengkap);

    return c.json(allUsers);
  } catch (error) {
    console.error("❌ Get all users error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/users/leaderboard
app.get("/leaderboard", async (c) => {
  try {
    const sekolah = c.req.query('sekolah');
    
    const query = db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        title: users_26.title,
        fotoProfil: users_26.fotoProfil,
        lastActive: users_26.lastActive,
        totalLikes: sql`COALESCE(SUM(${posts.likeCount}), 0)::integer`
      })
      .from(users_26)
      .leftJoin(posts, eq(users_26.id, posts.userId))
      .groupBy(users_26.id);
    
    if (sekolah && sekolah !== 'all') {
      query.where(eq(users_26.asalSekolah, sekolah));
    }
    
    const result = await query;
    const sortedResult = result.sort((a, b) => b.totalLikes - a.totalLikes);
    
    return c.json(sortedResult);
  } catch (error) {
    console.error('❌ Leaderboard error:', error);
    return c.json({ error: error.message }, 500);
  }
});

// GET /api/users/:id
app.get("/:id", async (c) => {
  try {
    // VALIDASI PARAM DENGAN ZOD
    const validation = validateParams(c, userIdSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { id } = validation.data;
    
    const [user] = await db
      .select({
        id: users_26.id,
        namaLengkap: users_26.namaLengkap,
        asalSekolah: users_26.asalSekolah,
        email: users_26.email,
        nomorTelepon: users_26.nomorTelepon,
        title: users_26.title,
        bioSingkat: users_26.bioSingkat,
        fotoProfil: users_26.fotoProfil,
        fotoProfilPath: users_26.fotoProfilPath,
        role: users_26.role,
        tokenAkses: users_26.tokenAkses,
        tokenExpired: users_26.tokenExpired,
        isActive: users_26.isActive,
        lastActive: users_26.lastActive,          
        lastNotifRead: users_26.lastNotifRead,
        createdAt: users_26.createdAt,
        updatedAt: users_26.updatedAt
      })
      .from(users_26)
      .where(eq(users_26.id, id))
      .limit(1);

    if (!user) {
      return c.json({ error: "User tidak ditemukan" }, 404);
    }

    const { password, ...userWithoutPassword } = user;
    return c.json(userWithoutPassword);
  } catch (error) {
    console.error("❌ Get user error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// PUT /api/users/:id
app.put("/:id", async (c) => {
  try {
    // VALIDASI PARAM DENGAN ZOD
    const paramsValidation = validateParams(c, userIdSchema);
    if (!paramsValidation.success) {
      return c.json({ error: paramsValidation.error.message, details: paramsValidation.error.details }, 400);
    }
    
    // VALIDASI BODY DENGAN ZOD
    const bodyValidation = await validateRequest(c, updateUserSchema);
    if (!bodyValidation.success) {
      return c.json({ error: bodyValidation.error.message, details: bodyValidation.error.details }, 400);
    }
    
    const { id } = paramsValidation.data;
    const body = bodyValidation.data;
    
    const [existingUser] = await db
      .select({
        id: users_26.id
      })
      .from(users_26)
      .where(eq(users_26.id, id))
      .limit(1);
    
    if (!existingUser) {
      return c.json({ error: "User tidak ditemukan" }, 404);
    }
    
    const [updatedUser] = await db.update(users_26)
      .set({
        ...(body.namaLengkap && { namaLengkap: body.namaLengkap }),
        ...(body.asalSekolah && { asalSekolah: body.asalSekolah }),
        ...(body.title && { title: body.title }),
        ...(body.bioSingkat !== undefined && { bioSingkat: body.bioSingkat }),
        ...(body.nomorTelepon !== undefined && { nomorTelepon: body.nomorTelepon }),
        updatedAt: new Date()
      })
      .where(eq(users_26.id, id))
      .returning();
    
    const { password, ...userWithoutPassword } = updatedUser;
    
    return c.json(userWithoutPassword);
  } catch (error) {
    console.error("❌ Update user error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== HEARTBEAT ==========
app.post("/:id/heartbeat", async (c) => {
  try {
    // VALIDASI PARAM DENGAN ZOD
    const validation = validateParams(c, userIdSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { id } = validation.data;
    
    await db
      .update(users_26)
      .set({ lastActive: new Date(), updatedAt: new Date() })
      .where(eq(users_26.id, id));
    
    // Broadcast online status ke semua user
    try {
      if (typeof broadcastToAll === 'function') {
        broadcastToAll({
          type: 'user_online',
          userId: id,
          online: true,
          timestamp: new Date()
        });
      }
    } catch (broadcastError) {
      console.error('Broadcast error:', broadcastError);
    }
    
    return c.json({ success: true, message: "Heartbeat received" });
  } catch (error) {
    console.error("❌ Heartbeat error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== ONLINE STATUS - VERSI DRIZZLE ==========
app.post("/online-status", async (c) => {
  try {
    // VALIDASI BODY DENGAN ZOD
    const validation = await validateRequest(c, onlineStatusSchema);
    if (!validation.success) {
      return c.json({ error: validation.error.message, details: validation.error.details }, 400);
    }
    
    const { userIds } = validation.data;
    
    console.log('Online status request for users:', userIds);
    
    const users = await db
      .select({
        id: users_26.id,
        lastActive: users_26.lastActive
      })
      .from(users_26)
      .where(sql`${users_26.id} IN (${sql.join(userIds, sql`, `)})`);
    
    console.log('Found users:', users.length);
    
    const onlineStatus = {};
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60000);
    
    users.forEach(user => {
      const lastActive = user.lastActive ? new Date(user.lastActive) : null;
      onlineStatus[user.id] = {
        online: lastActive ? lastActive > fiveMinutesAgo : false,
        lastActive: user.lastActive
      };
    });
    
    console.log('Online status:', onlineStatus);
    return c.json(onlineStatus);
    
  } catch (error) {
    console.error("❌ Online status error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== UPLOAD PHOTO - VERSI SUPABASE SAJA (TANPA FILESYSTEM) ==========
app.post("/:id/upload-photo", async (c) => {
  try {
    // Validasi params
    const paramsValidation = validateParams(c, userIdSchema);
    if (!paramsValidation.success) {
      return c.json({ error: paramsValidation.error.message, details: paramsValidation.error.details }, 400);
    }
    
    const { id } = paramsValidation.data;
    
    // Cek user exists
    const [existingUser] = await db
      .select({
        id: users_26.id,
        fotoProfil: users_26.fotoProfil,
        fotoProfilPath: users_26.fotoProfilPath
      })
      .from(users_26)
      .where(eq(users_26.id, id))
      .limit(1);
    
    if (!existingUser) {
      return c.json({ error: "User tidak ditemukan" }, 404);
    }
    
    // Parse form data
    const formData = await c.req.formData();
    const file = formData.get("foto");
    
    if (!file || typeof file === 'string') {
      return c.json({ error: "Tidak ada file yang diupload" }, 400);
    }
    
    console.log('File received:', file.name, file.type, file.size);

    // Validasi tipe file
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ 
        error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, GIF, atau WebP" 
      }, 400);
    }
    
    // Validasi ukuran file (2MB)
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: "File terlalu besar. Maksimal 2MB" }, 400);
    }

    try {
      // Upload ke Supabase Storage (TIDAK MENYIMPAN KE FILESYSTEM LOKAL)
      const { url, path } = await StorageService.uploadProfilePhoto(file, id);
      
      console.log('Upload successful:', url);

      // Hapus file lama jika ada (opsional)
      if (existingUser.fotoProfilPath) {
        await StorageService.deleteFile(existingUser.fotoProfilPath).catch(err => {
          console.warn('Failed to delete old file:', err.message);
        });
      }
      
      // Update database dengan URL dari Supabase
      const [updatedUser] = await db.update(users_26)
        .set({
          fotoProfil: url,
          fotoProfilPath: path,
          lastActive: new Date(),
          updatedAt: new Date()
        })
        .where(eq(users_26.id, id))
        .returning();
      
      const { password, ...userWithoutPassword } = updatedUser;
      
      return c.json({
        message: "Foto profil berhasil diupload ke Supabase",
        user: userWithoutPassword
      });
      
    } catch (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return c.json({ 
        error: "Gagal upload ke Supabase: " + uploadError.message 
      }, 500);
    }
    
  } catch (error) {
    console.error("❌ Upload photo error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// Logout
app.post("/logout", async (c) => {
  try {
    const body = await c.req.json();
    const token = body.token;

    if (!token) {
      return c.json({ error: "Token diperlukan" }, 400);
    }

    const [user] = await db
      .select({
        id: users_26.id
      })
      .from(users_26)
      .where(and(
        eq(users_26.tokenAkses, token), 
        eq(users_26.isActive, true)
      ))
      .limit(1);

    if (!user) {
      return c.json({ error: "Token tidak valid" }, 404);
    }

    await db
      .update(users_26)
      .set({ 
        tokenAkses: null, 
        tokenExpired: null,
        lastActive: new Date()
      })
      .where(eq(users_26.id, user.id));

    return c.json({ message: "Logout berhasil" });
  } catch (error) {
    console.error("❌ Logout error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;