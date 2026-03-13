import postgres from "postgres";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function setupDatabase() {
  try {
    console.log("🚀 Setup database...");

    // ============= 1. DROP TABLES (Urutan terbalik dari dependensi) =============
    console.log("📦 Menghapus tabel yang ada...");
    
    await sql`DROP TABLE IF EXISTS notifications CASCADE;`;
    await sql`DROP TABLE IF EXISTS post_views CASCADE;`;
    await sql`DROP TABLE IF EXISTS comments_26 CASCADE;`;
    await sql`DROP TABLE IF EXISTS likes CASCADE;`;
    await sql`DROP TABLE IF EXISTS posts CASCADE;`;
    await sql`DROP TABLE IF EXISTS users_26 CASCADE;`;
    
    // Hapus enum types
    await sql`DROP TYPE IF EXISTS notif_type CASCADE;`;
    await sql`DROP TYPE IF EXISTS sekolah CASCADE;`;
    await sql`DROP TYPE IF EXISTS role CASCADE;`;
    
    console.log("✅ Tabel dan tipe data dihapus");

    // ============= 2. CREATE ENUM TYPES =============
    console.log("🏗️  Membuat enum types...");
    
    await sql`
      DO $$ BEGIN
        CREATE TYPE sekolah AS ENUM ('sdit_sahabat', 'pptq_almadinah', 'ppqit_almahir');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE notif_type AS ENUM ('like', 'comment', 'rank_up', 'rank_down', 'event', 'achievement');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    
    console.log("✅ Enum types created");

    // ============= 3. CREATE TABLES =============
    console.log("🏗️  Membuat tabel users_26...");
    
    await sql`
      CREATE TABLE IF NOT EXISTS users_26 (
        id SERIAL PRIMARY KEY,
        nama_lengkap VARCHAR(200) NOT NULL,
        asal_sekolah sekolah NOT NULL,
        email VARCHAR(200) UNIQUE NOT NULL,
        nomor_telepon VARCHAR(20),
        title VARCHAR(100) DEFAULT 'Alumni',
        bio_singkat TEXT,
        password VARCHAR(512),
        foto_profil TEXT DEFAULT 'https://media.istockphoto.com/id/1495088043/id/vektor/ikon-profil-pengguna-avatar-atau-ikon-orang-gambar-profil-simbol-potret-gambar-potret.jpg?s=2048x2048&w=is&k=20&c=G7qTBxWs68Pm03TIb6rsOCo_m2JptQ8SVTrFfXq0kfU=',
        foto_profil_path TEXT,
        role role DEFAULT 'user',
        token_akses VARCHAR(100) UNIQUE,
        token_expired TIMESTAMP,
        is_active BOOLEAN DEFAULT true,
        lastActive TIMESTAMP DEFAULT NOW(),
        last_notif_read TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Tabel users_26 created");

    console.log("🏗️  Membuat tabel posts...");
    await sql`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        judul VARCHAR(200) NOT NULL,
        konten TEXT NOT NULL,
        gambar TEXT,
        gambar_path TEXT,
        like_count INTEGER DEFAULT 0,
        view_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Tabel posts created");

    console.log("🏗️  Membuat tabel likes...");
    await sql`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `;
    console.log("✅ Tabel likes created");

    console.log("🏗️  Membuat tabel comments_26...");
    await sql`
      CREATE TABLE IF NOT EXISTS comments_26 (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Tabel comments_26 created");

    console.log("🏗️  Membuat tabel post_views...");
    await sql`
      CREATE TABLE IF NOT EXISTS post_views (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        viewed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(post_id, user_id)
      );
    `;
    console.log("✅ Tabel post_views created");

    console.log("🏗️  Membuat tabel notifications...");
    await sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        from_user_id INTEGER REFERENCES users_26(id) ON DELETE SET NULL,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        type notif_type NOT NULL,
        message TEXT NOT NULL,
        data TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Tabel notifications created");

    // ============= 4. CREATE INDEXES =============
    console.log("🔨 Membuat indexes...");
    
    // Index untuk posts
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);`;
    
    // Index untuk likes
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);`;
    
    // Index untuk comments (perbaiki nama tabel dari 'comments' menjadi 'comments_26')
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments_26(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments_26(created_at DESC);`;
    
    // Index untuk users
    await sql`CREATE INDEX IF NOT EXISTS idx_users_school ON users_26(asal_sekolah);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_token ON users_26(token_akses);`;
    
    // Index untuk post_views
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);`;
    
    // Index untuk notifications
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;`;
    
    console.log("✅ Indexes created");

    // ============= 5. INSERT ADMIN =============
    console.log("👤 Menambahkan admin...");
    
    const hashedPassword = await bcrypt.hash("123456", 10);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 20);

    await sql`
      INSERT INTO users_26 (nama_lengkap, asal_sekolah, email, title, bio_singkat, password, role, token_akses, token_expired)
      VALUES (
        'Ahmad Afan Shobari',
        'ppqit_almahir',
        'afan@almahir.com',
        'Web Developer & Founder',
        'Pencipta platform silaturahmi alumni',
        ${hashedPassword},
        'admin',
        'admin-token-123',
        ${expiredAt}
      )
      ON CONFLICT (email) DO NOTHING;
    `;

    console.log("✅ Admin berhasil ditambahkan!");

    // ============= 6. VERIFIKASI =============
    const users = await sql`SELECT COUNT(*) FROM users_26`;
    const posts = await sql`SELECT COUNT(*) FROM posts`;
    const comments = await sql`SELECT COUNT(*) FROM comments_26`;
    const notifications = await sql`SELECT COUNT(*) FROM notifications`;
    
    console.log("\n📊 **STATISTIK DATABASE**");
    console.log(`👥 Total users: ${users[0].count}`);
    console.log(`📝 Total posts: ${posts[0].count}`);
    console.log(`💬 Total comments: ${comments[0].count}`);
    console.log(`🔔 Total notifications: ${notifications[0].count}`);
    console.log("\n✅ **SETUP DATABASE BERHASIL!**");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

setupDatabase();