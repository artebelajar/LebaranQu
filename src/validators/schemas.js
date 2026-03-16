// ===================================================
// FILE: src/validators/schemas.js
// ===================================================
import { z } from 'zod';

// ========== ENUMS ==========
export const sekolahEnum = z.enum(['sdit_sahabat', 'pptq_almadinah', 'ppqit_almahir']);
export const roleEnum = z.enum(['user', 'admin']);
export const notifTypeEnum = z.enum(['like', 'comment', 'rank_up', 'rank_down', 'event', 'achievement']);

// ========== USER SCHEMAS ==========
export const registerSchema = z.object({
  namaLengkap: z.string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .trim(),
  
  asalSekolah: sekolahEnum,
  
  email: z.string()
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(6, 'Password minimal 6 karakter')
    .max(50, 'Password maksimal 50 karakter'),
  
  nomorTelepon: z.string()
    .regex(/^[0-9+\-\s]{10,15}$/, 'Nomor telepon tidak valid')
    .nullable()
    .optional(),
  
  title: z.string()
    .max(100, 'Title maksimal 100 karakter')
    .default('Alumni')
    .optional(),
  
  bioSingkat: z.string()
    .max(500, 'Bio maksimal 500 karakter')
    .nullable()
    .optional(),
  
  recaptchaToken: z.string()
    .min(1, 'reCAPTCHA token diperlukan'),
});

export const loginSchema = z.object({
  email: z.string()
    .email('Format email tidak valid')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'Password harus diisi'),
  
  recaptchaToken: z.string()
    .min(1, 'reCAPTCHA token diperlukan'),
});

export const updateUserSchema = z.object({
  namaLengkap: z.string()
    .min(3, 'Nama lengkap minimal 3 karakter')
    .max(100, 'Nama lengkap maksimal 100 karakter')
    .trim()
    .optional(),
  
  asalSekolah: sekolahEnum.optional(),
  
  email: z.string()
    .email('Format email tidak valid')
    .toLowerCase()
    .trim()
    .optional(),
  
  nomorTelepon: z.string()
    .regex(/^[0-9+\-\s]{10,15}$/, 'Nomor telepon tidak valid')
    .nullable()
    .optional(),
  
  title: z.string()
    .max(100, 'Title maksimal 100 karakter')
    .optional(),
  
  bioSingkat: z.string()
    .max(500, 'Bio maksimal 500 karakter')
    .nullable()
    .optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Minimal satu field harus diupdate'
});

// Schema untuk params ID
export const userIdSchema = z.object({
  id: z.string()
    .transform((val) => {
      const parsed = parseInt(val);
      if (isNaN(parsed)) throw new Error('ID harus berupa angka');
      return parsed;
    })
    .pipe(z.number().int().positive('ID harus positif')),
});

// Schema untuk post ID
export const postIdSchema = z.object({
  id: z.string()
    .transform((val) => {
      const parsed = parseInt(val);
      if (isNaN(parsed)) throw new Error('ID harus berupa angka');
      return parsed;
    })
    .pipe(z.number().int().positive('ID harus positif')),
});

// Schema khusus untuk endpoint /user/:userId di posts.js
export const userPostSchema = z.object({
  userId: z.string()
    .transform((val) => {
      const parsed = parseInt(val);
      if (isNaN(parsed)) throw new Error('User ID harus berupa angka');
      return parsed;
    })
    .pipe(z.number().int().positive('User ID harus positif')),
});

// ========== POST SCHEMAS ==========
export const createPostSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
  
  judul: z.string()
    .min(5, 'Judul minimal 5 karakter')
    .max(200, 'Judul maksimal 200 karakter')
    .trim(),
  
  konten: z.string()
    .min(10, 'Konten minimal 10 karakter')
    .max(5000, 'Konten maksimal 5000 karakter')
    .trim(),
  
  gambar: z.string()
    .url('URL gambar tidak valid')
    .nullable()
    .optional(),
});

export const updatePostSchema = z.object({
  judul: z.string()
    .min(5, 'Judul minimal 5 karakter')
    .max(200, 'Judul maksimal 200 karakter')
    .trim()
    .optional(),
  
  konten: z.string()
    .min(10, 'Konten minimal 10 karakter')
    .max(5000, 'Konten maksimal 5000 karakter')
    .trim()
    .optional(),
}).refine(data => Object.keys(data).length > 0, {
  message: 'Minimal satu field harus diupdate'
});

// ========== COMMENT SCHEMAS ==========
export const createCommentSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
  
  text: z.string()
    .min(1, 'Komentar tidak boleh kosong')
    .max(1000, 'Komentar maksimal 1000 karakter')
    .trim(),
});

// ========== LIKE SCHEMAS ==========
export const likeSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
});

// ========== VIEW SCHEMAS ==========
export const viewSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
});

// ========== NOTIFICATION SCHEMAS ==========
export const markReadSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
  
  notificationIds: z.array(z.number().int().positive())
    .optional(),
});

// ========== ACHIEVEMENT SCHEMAS ==========
export const achievementCheckSchema = z.object({
  userId: z.number()
    .int()
    .positive('User ID harus positif'),
});

// ========== LEADERBOARD SCHEMAS ==========
export const leaderboardQuerySchema = z.object({
  sekolah: z.enum(['all', 'sdit_sahabat', 'pptq_almadinah', 'ppqit_almahir'])
    .default('all'),
});

// ========== ONLINE STATUS SCHEMAS ==========
export const onlineStatusSchema = z.object({
  userIds: z.array(z.number().int().positive())
    .min(1, 'Minimal 1 user ID')
    .max(100, 'Maksimal 100 user ID'),
});

// ========== PAGINATION SCHEMAS ==========
export const paginationSchema = z.object({
  page: z.string()
    .regex(/^\d+$/, 'Page harus berupa angka')
    .transform(Number)
    .pipe(z.number().int().positive('Page harus positif'))
    .default('1'),
  
  limit: z.string()
    .regex(/^\d+$/, 'Limit harus berupa angka')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100))
    .default('10'),
});