import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  pgEnum,
  unique
} from "drizzle-orm/pg-core";

// ========== ENUMS ==========
export const sekolahEnum = pgEnum('sekolah', [
  'sdit_sahabat',
  'pptq_almadinah', 
  'ppqit_almahir'
]);

export const roleEnum = pgEnum('role', [
  'user',
  'admin'
]);

export const notifTypeEnum = pgEnum('notif_type', [
  'like',
  'comment',
  'rank_up',
  'rank_down',
  'event',
  'achievement'
]);

// ========== TABLES ==========
export const users_26 = pgTable("users_26", {
  id: serial("id").primaryKey(),
  namaLengkap: varchar("nama_lengkap", { length: 200 }).notNull(),
  asalSekolah: sekolahEnum("asal_sekolah").notNull(),
  email: varchar("email", { length: 200 }).unique().notNull(),
  password: varchar("password", { length: 512 }),
  nomorTelepon: varchar("nomor_telepon", { length: 20 }),
  title: varchar("title", { length: 100 }).default("Alumni"),
  bioSingkat: text("bio_singkat"),
  fotoProfil: text("foto_profil").default("https://media.istockphoto.com/id/1495088043/id/vektor/ikon-profil-pengguna-avatar-atau-ikon-orang-gambar-profil-simbol-potret-gambar-potret.jpg?s=2048x2048&w=is&k=20&c=G7qTBxWs68Pm03TIb6rsOCo_m2JptQ8SVTrFfXq0kfU="),
  fotoProfilPath: text("foto_profil_path"),
  role: roleEnum("role").default("user"),
  tokenAkses: varchar("token_akses", { length: 100 }).unique(),
  tokenExpired: timestamp("token_expired"),
  isActive: boolean("is_active").default(true),
  lastActive: timestamp("last_active").defaultNow(), // <-- PASTIKAN INI ADA
  lastNotifRead: timestamp("last_notif_read").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabel Postingan (Cerita)
export const posts = pgTable("posts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users_26.id).notNull(),
  judul: varchar("judul", { length: 200 }).notNull(),
  konten: text("konten").notNull(),
  gambar: text("gambar"),
  gambarPath: text("gambar_path"),
  likeCount: integer("like_count").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Tabel Likes
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users_26.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Comments
export const comments = pgTable("comments_26", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users_26.id).notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Post Views (TAMBAHKAN INI)
export const postViews = pgTable("post_views", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => posts.id).notNull(),
  userId: integer("user_id").references(() => users_26.id).notNull(),
  viewedAt: timestamp("viewed_at").defaultNow(),
}, (table) => {
  return {
    // Composite unique key agar 1 user hanya bisa view 1x per post
    uniqueView: unique().on(table.postId, table.userId)
  };
});

// Tabel Pemenang
export const winners = pgTable("winners", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users_26.id).notNull(),
  sekolah: sekolahEnum("sekolah").notNull(),
  peringkat: integer("peringkat").notNull(),
  hadiah: integer("hadiah").default(50000),
  terpilihPada: timestamp("terpilih_pada"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tabel Event
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  nama: varchar("nama", { length: 200 }).notNull(),
  deskripsi: text("deskripsi"),
  tanggalMulai: timestamp("tanggal_mulai").notNull(),
  tanggalSelesai: timestamp("tanggal_selesai").notNull(),
  tanggalPemilihan: timestamp("tanggal_pemilihan").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users_26.id).notNull(), 
  fromUserId: integer("from_user_id").references(() => users_26.id), 
  postId: integer("post_id").references(() => posts.id),
  type: notifTypeEnum("type").notNull(), 
  message: text("message").notNull(),
  data: text("data"), 
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});