import postgres from "postgres";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

// dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function setupDatabase() {
  try {
    console.log("🚀 Setup database...");

    // ============= 1. DROP TABLES (Urutan terbalik dari dependensi) =============
    console.log("📦 Menghapus tabel yang ada...");
    
    await sql`DROP TABLE IF EXISTS user_achievements CASCADE;`;
    await sql`DROP TABLE IF EXISTS achievements CASCADE;`;
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
        last_active TIMESTAMP DEFAULT NOW(),
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

    // ============= 4. CREATE TABEL ACHIEVEMENTS =============
    console.log("🏗️  Membuat tabel achievements...");
    
    await sql`
      CREATE TABLE IF NOT EXISTS achievements (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        icon VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL,
        requirement INTEGER NOT NULL,
        badge_color VARCHAR(50) DEFAULT 'emerald',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log("✅ Tabel achievements created");

    console.log("🏗️  Membuat tabel user_achievements...");
    await sql`
      CREATE TABLE IF NOT EXISTS user_achievements (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users_26(id) ON DELETE CASCADE NOT NULL,
        achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE NOT NULL,
        progress INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT false,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, achievement_id)
      );
    `;
    console.log("✅ Tabel user_achievements created");

    // ============= 5. CREATE INDEXES =============
    console.log("🔨 Membuat INDEXES untuk performa maksimal...");
    
    // ===== INDEX UNTUK USERS TABLE =====
    console.log("   📌 Index users...");
    await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users_26(email);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_token ON users_26(token_akses);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_school ON users_26(asal_sekolah);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_last_active ON users_26(last_active DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_created_at ON users_26(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_users_active ON users_26(is_active) WHERE is_active = true;`;
    
    // ===== INDEX UNTUK POSTS TABLE =====
    console.log("   📌 Index posts...");
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_user_created ON posts(user_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_like_count ON posts(like_count DESC) WHERE like_count > 0;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_view_count ON posts(view_count DESC) WHERE view_count > 0;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_posts_created_month ON posts(date_trunc('month', created_at));`;
    
    // ===== INDEX UNTUK LIKES TABLE =====
    console.log("   📌 Index likes...");
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_post_user ON likes(post_id, user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_likes_user_created ON likes(user_id, created_at DESC);`;
    
    // ===== INDEX UNTUK COMMENTS TABLE =====
    console.log("   📌 Index comments...");
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments_26(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments_26(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_post_created ON comments_26(post_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_user_created ON comments_26(user_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments_26(created_at DESC);`;
    
    // ===== INDEX UNTUK POST VIEWS TABLE =====
    console.log("   📌 Index post_views...");
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_post_user ON post_views(post_id, user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_post_views_viewed_at ON post_views(viewed_at DESC);`;
    
    // ===== INDEX UNTUK NOTIFICATIONS TABLE =====
    console.log("   📌 Index notifications...");
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = false;`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read, created_at DESC);`;
    
    // ===== INDEX UNTUK USER ACHIEVEMENTS TABLE =====
    console.log("   📌 Index user_achievements...");
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON user_achievements(achievement_id);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON user_achievements(completed);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_user_completed ON user_achievements(user_id, completed);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_user_achievements_completed_at ON user_achievements(completed_at DESC) WHERE completed = true;`;
    
    // ===== INDEX UNTUK ACHIEVEMENTS TABLE =====
    console.log("   📌 Index achievements...");
    await sql`CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_achievements_requirement ON achievements(requirement);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_achievements_category_req ON achievements(category, requirement);`;
    
    // ===== COMPOSITE INDEXES UNTUK LEADERBOARD =====
    console.log("   📌 Index untuk leaderboard...");
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_posts ON posts(user_id, like_count, view_count, created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_comments ON comments_26(user_id, created_at);`;
    await sql`CREATE INDEX IF NOT EXISTS idx_leaderboard_likes ON likes(user_id, created_at);`;
    
    console.log("✅ Semua indexes berhasil dibuat");

    // ============= 6. INSERT DEFAULT ACHIEVEMENTS =============
    console.log("🏆 Menambahkan data achievements...");
    
    const achievements = [
      // Postingan achievements
      { name: 'Penulis Pemula', description: 'Membuat 1 postingan pertama', icon: 'fa-pen', category: 'post', requirement: 1, badge_color: 'emerald' },
      { name: 'Penulis Aktif', description: 'Membuat 10 postingan', icon: 'fa-pen-fancy', category: 'post', requirement: 10, badge_color: 'blue' },
      { name: 'Penulis Produktif', description: 'Membuat 25 postingan', icon: 'fa-feather', category: 'post', requirement: 25, badge_color: 'purple' },
      { name: 'Penulis Legenda', description: 'Membuat 50 postingan', icon: 'fa-crown', category: 'post', requirement: 50, badge_color: 'yellow' },
      
      // Like achievements
      { name: 'Disukai Pemula', description: 'Mendapatkan 10 like', icon: 'fa-heart', category: 'like', requirement: 10, badge_color: 'red' },
      { name: 'Disukai Aktif', description: 'Mendapatkan 50 like', icon: 'fa-heart', category: 'like', requirement: 50, badge_color: 'red' },
      { name: 'Disukai Populer', description: 'Mendapatkan 100 like', icon: 'fa-heart', category: 'like', requirement: 100, badge_color: 'red' },
      { name: 'Disukai Selebriti', description: 'Mendapatkan 250 like', icon: 'fa-star', category: 'like', requirement: 250, badge_color: 'yellow' },
      
      // Comment achievements
      { name: 'Komentator Pemula', description: 'Menulis 5 komentar', icon: 'fa-comment', category: 'comment', requirement: 5, badge_color: 'blue' },
      { name: 'Komentator Aktif', description: 'Menulis 25 komentar', icon: 'fa-comments', category: 'comment', requirement: 25, badge_color: 'green' },
      { name: 'Komentator Berbakat', description: 'Menulis 50 komentar', icon: 'fa-message', category: 'comment', requirement: 50, badge_color: 'purple' },
      
      // Special achievements
      { name: 'Anggota Baru', description: 'Bergabung dengan LebaranQu', icon: 'fa-user-plus', category: 'special', requirement: 1, badge_color: 'emerald' },
      { name: 'Alumni Pertama', description: 'Menjadi alumni pertama di sekolah', icon: 'fa-graduation-cap', category: 'special', requirement: 1, badge_color: 'blue' },
      { name: 'Top 10 Leaderboard', description: 'Masuk 10 besar leaderboard', icon: 'fa-trophy', category: 'special', requirement: 10, badge_color: 'yellow' },
      { name: 'Top 3 Leaderboard', description: 'Masuk 3 besar leaderboard', icon: 'fa-crown', category: 'special', requirement: 3, badge_color: 'purple' },
    ];

    for (const ach of achievements) {
      await sql`
        INSERT INTO achievements (name, description, icon, category, requirement, badge_color)
        VALUES (${ach.name}, ${ach.description}, ${ach.icon}, ${ach.category}, ${ach.requirement}, ${ach.badge_color})
        ON CONFLICT DO NOTHING;
      `;
    }
    
    console.log("✅ Data achievements berhasil ditambahkan");

    // ============= 7. INSERT ADMIN =============
    console.log("👤 Menambahkan admin...");
    
    const hashedPassword = await bcrypt.hash("@7T3R427|V|4[]C013a4jA5!h", 10);
    const expiredAt = new Date();
    expiredAt.setDate(expiredAt.getDate() + 20);

    await sql`
      INSERT INTO users_26 (nama_lengkap, asal_sekolah, email, title, bio_singkat, password, role, token_akses, token_expired)
      VALUES (
        'Ahmad Afan Shobari',
        'ppqit_almahir',
        'arte.ra272024@gmail.com',
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

    // ============= 8. INSERT CONTOH USER UNTUK TEST BADGE =============
    console.log("📝 Menambahkan contoh user dengan achievements...");
    
    // Ambil ID admin
    const [admin] = await sql`SELECT id FROM users_26 WHERE email = 'arte.ra272024@gmail.com'`;
    
    // Buat contoh user
    const [user1] = await sql`
      INSERT INTO users_26 (nama_lengkap, asal_sekolah, email, password, title, bio_singkat, token_akses)
      VALUES (
        'Ahmad 27',
        'sdit_sahabat',
        'art374@gmail.com',
        ${hashedPassword},
        'Guru SD',
        'Alumni SDIT Sahabat angkatan 2015',
        'user-token-budi-123'
      )
      RETURNING id;
    `;

    const [user2] = await sql`
      INSERT INTO users_26 (nama_lengkap, asal_sekolah, email, password, title, bio_singkat, token_akses)
      VALUES (
        'Artera',
        'pptq_almadinah',
        'artebelajar@gmail.com',
        ${hashedPassword},
        'middle school student',
        'Santri PPTQ Al-Madinah',
        'user-token-siti-123'
      )
      RETURNING id;
    `;

    console.log("✅ Contoh user berhasil ditambahkan");

    // ============= 9. INSERT CONTOH POSTS DAN LIKES =============
    console.log("📝 Menambahkan contoh posts...");
    
    // Buat postingan untuk admin
    const [post1] = await sql`
      INSERT INTO posts (user_id, judul, konten, view_count, like_count)
      VALUES (
        ${admin.id},
        'Tips Menjaga Silaturahmi di Bulan Ramadan',
        'Bulan Ramadan adalah bulan yang penuh berkah. Selain berpuasa, kita juga dianjurkan untuk menjaga silaturahmi dengan keluarga, teman, dan kerabat. Berikut beberapa tips yang bisa dilakukan...',
        150,
        45
      )
      RETURNING id;
    `;

    const [post2] = await sql`
      INSERT INTO posts (user_id, judul, konten, view_count, like_count)
      VALUES (
        ${user1.id},
        'Pengalaman Puasa Pertamaku',
        'Tahun ini adalah pertama kalinya aku berpuasa penuh. Banyak cerita dan pengalaman yang tak terlupakan...',
        89,
        23
      )
      RETURNING id;
    `;

    const [post3] = await sql`
      INSERT INTO posts (user_id, judul, konten, view_count, like_count)
      VALUES (
        ${user2.id},
        'Kajian Ramadan di Masjid',
        'Setiap sore saya mengikuti kajian Ramadan di masjid dekat rumah. Banyak ilmu bermanfaat yang didapat...',
        67,
        12
      )
      RETURNING id;
    `;

    // Buat likes
    await sql`
      INSERT INTO likes (post_id, user_id) VALUES
      (${post1.id}, ${user1.id}),
      (${post1.id}, ${user2.id}),
      (${post2.id}, ${admin.id}),
      (${post2.id}, ${user2.id}),
      (${post3.id}, ${admin.id})
      ON CONFLICT DO NOTHING;
    `;

    // Buat komentar
    await sql`
      INSERT INTO comments_26 (post_id, user_id, text) VALUES
      (${post1.id}, ${user1.id}, 'Terima kasih tipsnya, sangat bermanfaat!'),
      (${post1.id}, ${user2.id}, 'Semoga kita semua bisa menjaga silaturahmi. Aamiin'),
      (${post2.id}, ${admin.id}, 'Selamat ya, semoga lancar puasanya!'),
      (${post3.id}, ${user1.id}, 'Kajiannya di masjid mana? Boleh join?')
      ON CONFLICT DO NOTHING;
    `;

    console.log("✅ Contoh posts berhasil ditambahkan");

    // ============= 10. BERIKAN ACHIEVEMENTS UNTUK CONTOH USER =============
    console.log("🏆 Memberikan achievements untuk contoh user...");
    
    // Ambil semua achievements
    const allAchievements = await sql`SELECT id, name, requirement FROM achievements`;
    
    // Berikan achievements untuk admin
    for (const ach of allAchievements) {
      if (ach.name === 'Penulis Pemula' || ach.name === 'Anggota Baru' || ach.name === 'Komentator Pemula') {
        await sql`
          INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
          VALUES (${admin.id}, ${ach.id}, ${ach.requirement}, true, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
    }

    // Berikan achievements untuk user1
    for (const ach of allAchievements) {
      if (ach.name === 'Penulis Pemula' || ach.name === 'Anggota Baru') {
        await sql`
          INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
          VALUES (${user1.id}, ${ach.id}, ${ach.requirement}, true, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
    }

    // Berikan achievements untuk user2
    for (const ach of allAchievements) {
      if (ach.name === 'Anggota Baru') {
        await sql`
          INSERT INTO user_achievements (user_id, achievement_id, progress, completed, completed_at)
          VALUES (${user2.id}, ${ach.id}, ${ach.requirement}, true, NOW())
          ON CONFLICT DO NOTHING;
        `;
      }
    }

    console.log("✅ Contoh achievements berhasil diberikan");

    // ============= 11. VACUUM DAN ANALYZE =============
    console.log("🧹 Menjalankan VACUUM ANALYZE untuk optimalisasi...");
    await sql`VACUUM ANALYZE;`;
    console.log("✅ VACUUM ANALYZE selesai");

    // ============= 12. VERIFIKASI =============
    const users = await sql`SELECT COUNT(*) FROM users_26`;
    const postsCount = await sql`SELECT COUNT(*) FROM posts`;
    const commentsCount = await sql`SELECT COUNT(*) FROM comments_26`;
    const likesCount = await sql`SELECT COUNT(*) FROM likes`;
    const notificationsCount = await sql`SELECT COUNT(*) FROM notifications`;
    const achievementsCount = await sql`SELECT COUNT(*) FROM achievements`;
    const userAchCount = await sql`SELECT COUNT(*) FROM user_achievements`;
    
    console.log("\n📊 **STATISTIK DATABASE**");
    console.log(`👥 Total users: ${users[0].count}`);
    console.log(`📝 Total posts: ${postsCount[0].count}`);
    console.log(`💬 Total comments: ${commentsCount[0].count}`);
    console.log(`❤️ Total likes: ${likesCount[0].count}`);
    console.log(`🔔 Total notifications: ${notificationsCount[0].count}`);
    console.log(`🏆 Total achievements: ${achievementsCount[0].count}`);
    console.log(`🎖️ User achievements: ${userAchCount[0].count}`);
    
    // Tampilkan daftar achievements
    console.log("\n📋 **DAFTAR ACHIEVEMENTS**");
    const achList = await sql`SELECT name, category, requirement FROM achievements ORDER BY category, requirement`;
    achList.forEach(ach => {
      console.log(`   - ${ach.name} (${ach.category}): ${ach.requirement}`);
    });
    
    // Tampilkan daftar indexes
    console.log("\n📑 **DAFTAR INDEXES**");
    const indexes = await sql`
      SELECT indexname, indexdef 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      ORDER BY tablename, indexname;
    `;
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
    
    console.log("\n✅ **SETUP DATABASE BERHASIL!**");

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await sql.end();
  }
}

setupDatabase();