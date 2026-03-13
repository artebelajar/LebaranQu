import { Hono } from "hono";
import { db } from "../db/index.js";
import { users_26, posts } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

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
    const body = await c.req.json();

    console.log('Login attempt for email:', body.email);

    if (!body.recaptchaToken) {
      return c.json({ error: "reCAPTCHA token diperlukan" }, 400);
    }
    
    const isValid = await verifyRecaptcha(body.recaptchaToken);
    if (!isValid) {
      return c.json({ error: "Verifikasi reCAPTCHA gagal" }, 400);
    }

    if (!body.email || !body.password) {
      return c.json({ error: "Email dan password harus diisi" }, 400);
    }

    // SELECT tanpa last_active
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
        // HAPUS last_active
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
        tokenExpired: expiredAt 
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

// POST /api/users/register - Register
app.post("/register", async (c) => {
  try {
    const body = await c.req.json();

    if (!body.recaptchaToken) {
      return c.json({ error: "reCAPTCHA token diperlukan" }, 400);
    }
    
    const isValid = await verifyRecaptcha(body.recaptchaToken);
    if (!isValid) {
      return c.json({ error: "Verifikasi reCAPTCHA gagal" }, 400);
    }

    if (!body.namaLengkap || !body.asalSekolah || !body.email || !body.password) {
      return c.json({ error: "Data wajib harus diisi" }, 400);
    }

    if (body.password.length < 6) {
      return c.json({ error: "Password minimal 6 karakter" }, 400);
    }

    const existingUser = await db
      .select()
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
    const idParam = c.req.param("id");
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return c.json({ error: "ID tidak valid" }, 400);
    }
    
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
        // HAPUS last_active
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
    const idParam = c.req.param("id");
    const id = parseInt(idParam);
    const body = await c.req.json();
    
    if (isNaN(id)) {
      return c.json({ error: "ID tidak valid" }, 400);
    }
    
    const [existingUser] = await db.select()
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

// ========== HEARTBEAT - TANPA last_active ==========
app.post("/:id/heartbeat", async (c) => {
  try {
    const idParam = c.req.param("id");
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return c.json({ error: "ID tidak valid" }, 400);
    }
    
    // Update hanya updatedAt, tanpa last_active
    await db
      .update(users_26)
      .set({ 
        updatedAt: new Date() 
      })
      .where(eq(users_26.id, id));
    
    return c.json({ 
      success: true,
      message: "Heartbeat received",
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Heartbeat error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// ========== ONLINE STATUS - TANPA last_active ==========
app.post("/online-status", async (c) => {
  try {
    const { userIds } = await c.req.json();
    
    if (!userIds || !Array.isArray(userIds)) {
      return c.json({ error: "Invalid request" }, 400);
    }
    
    if (userIds.length === 0) {
      return c.json({});
    }
    
    const users = await db
      .select({
        id: users_26.id,
        // Gunakan updatedAt sebagai fallback
        lastActive: users_26.updatedAt
      })
      .from(users_26)
      .where(sql`${users_26.id} IN (${userIds.join(',')})`);
    
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
    
    return c.json(onlineStatus);
  } catch (error) {
    console.error("❌ Online status error:", error);
    return c.json({ error: error.message }, 500);
  }
});

// POST /api/users/:id/upload-photo
app.post("/:id/upload-photo", async (c) => {
  try {
    const idParam = c.req.param("id");
    const id = parseInt(idParam);
    
    if (isNaN(id)) {
      return c.json({ error: "ID tidak valid" }, 400);
    }
    
    const [existingUser] = await db.select()
      .from(users_26)
      .where(eq(users_26.id, id))
      .limit(1);
    
    if (!existingUser) {
      return c.json({ error: "User tidak ditemukan" }, 404);
    }
    
    const formData = await c.req.formData();
    const file = formData.get("foto");
    
    if (!file || typeof file === 'string') {
      return c.json({ error: "Tidak ada file yang diupload" }, 400);
    }
    
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: "File terlalu besar. Maksimal 2MB" }, 400);
    }
    
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Tipe file tidak diizinkan. Gunakan JPG, PNG, GIF, atau WebP" }, 400);
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const timestamp = Date.now();
    const extension = file.type.split('/')[1] || 'jpg';
    const fileName = `profile-${id}-${timestamp}.${extension}`;
    const filePath = `public/uploads/${fileName}`;
    const publicUrl = `/uploads/${fileName}`;
    
    const fs = await import('fs');
    const path = await import('path');
    const uploadDir = path.join(process.cwd(), 'public/uploads');
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(process.cwd(), filePath), buffer);
    
    const [updatedUser] = await db.update(users_26)
      .set({
        fotoProfil: publicUrl,
        fotoProfilPath: filePath,
        updatedAt: new Date()
      })
      .where(eq(users_26.id, id))
      .returning();
    
    const { password, ...userWithoutPassword } = updatedUser;
    
    return c.json({
      message: "Foto profil berhasil diupload",
      user: userWithoutPassword
    });
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

    const [user] = await db
      .select()
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
      .set({ tokenAkses: null, tokenExpired: null })
      .where(eq(users_26.id, user.id));

    return c.json({ message: "Logout berhasil" });
  } catch (error) {
    console.error("❌ Logout error:", error);
    return c.json({ error: error.message }, 500);
  }
});

export default app;