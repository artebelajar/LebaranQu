CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."sekolah" AS ENUM('sdit_sahabat', 'pptq_almadinah', 'ppqit_almahir');--> statement-breakpoint
CREATE TABLE "comments_26" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama" varchar(200) NOT NULL,
	"deskripsi" text,
	"tanggal_mulai" timestamp NOT NULL,
	"tanggal_selesai" timestamp NOT NULL,
	"tanggal_pemilihan" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"judul" varchar(200) NOT NULL,
	"konten" text NOT NULL,
	"gambar" text,
	"gambar_path" text,
	"like_count" integer DEFAULT 0,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users_26" (
	"id" serial PRIMARY KEY NOT NULL,
	"nama_lengkap" varchar(200) NOT NULL,
	"asal_sekolah" "sekolah" NOT NULL,
	"email" varchar(200) NOT NULL,
	"nomor_telepon" varchar(20),
	"title" varchar(100) DEFAULT 'Alumni',
	"bio_singkat" text,
	"password" varchar(512),
	"foto_profil" text DEFAULT 'https://media.istockphoto.com/id/1495088043/id/vektor/ikon-profil-pengguna-avatar-atau-ikon-orang-gambar-profil-simbol-potret-gambar-potret.jpg?s=2048x2048&w=is&k=20&c=G7qTBxWs68Pm03TIb6rsOCo_m2JptQ8SVTrFfXq0kfU=',
	"foto_profil_path" text,
	"role" "role" DEFAULT 'user',
	"token_akses" varchar(100),
	"token_expired" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_26_email_unique" UNIQUE("email"),
	CONSTRAINT "users_26_token_akses_unique" UNIQUE("token_akses")
);
--> statement-breakpoint
CREATE TABLE "winners" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"sekolah" "sekolah" NOT NULL,
	"peringkat" integer NOT NULL,
	"hadiah" integer DEFAULT 50000,
	"terpilih_pada" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "comments_26" ADD CONSTRAINT "comments_26_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comments_26" ADD CONSTRAINT "comments_26_user_id_users_26_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_26"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "likes" ADD CONSTRAINT "likes_user_id_users_26_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_26"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_user_id_users_26_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_26"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_user_id_users_26_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users_26"("id") ON DELETE no action ON UPDATE no action;