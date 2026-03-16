// ===================================================
// FILE: src/utils/storage.js
// ===================================================
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

// Inisialisasi Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL or SUPABASE_ANON_KEY is missing');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'lebaran_26';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export class StorageService {
  /**
   * Upload foto profil ke Supabase Storage
   */
  static async uploadProfilePhoto(file, userId) {
    try {
      // Validasi input
      if (!file) throw new Error('No file provided');
      
      // Validasi tipe file
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, GIF, atau WebP');
      }
      
      // Validasi ukuran file
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      // Konversi file ke buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Generate nama file unik
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${uuidv4()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      console.log(`Uploading to Supabase: ${filePath}`);
      console.log(`Bucket: ${BUCKET_NAME}`);

      // Cek apakah bucket ada
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (listError) {
        console.error('Error listing buckets:', listError);
        throw new Error(`Gagal mengakses storage: ${listError.message}`);
      }

      const bucketExists = buckets?.some(b => b.name === BUCKET_NAME);
      if (!bucketExists) {
        console.error(`Bucket "${BUCKET_NAME}" tidak ditemukan. Buckets available:`, buckets?.map(b => b.name));
        throw new Error(`Bucket "${BUCKET_NAME}" tidak ditemukan. Silakan buat bucket terlebih dahulu di Supabase.`);
      }

      // Upload ke Supabase
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw new Error(`Gagal upload: ${error.message}`);
      }

      // Dapatkan public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      console.log('Upload successful:', publicUrl);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('StorageService.uploadProfilePhoto error:', error);
      throw error;
    }
  }

  /**
   * Hapus file dari Supabase Storage
   */
  static async deleteFile(filePath) {
    try {
      if (!filePath) return;

      console.log(`Deleting file: ${filePath}`);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      console.log('File deleted successfully');
      return true;
    } catch (error) {
      console.error('StorageService.deleteFile error:', error);
      throw error;
    }
  }

  /**
   * Test koneksi ke Supabase Storage
   */
  static async testConnection() {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) {
        console.error('Storage connection test failed:', error);
        return { success: false, error: error.message };
      }
      console.log('Storage connection successful. Buckets:', data?.map(b => b.name));
      return { success: true, buckets: data };
    } catch (error) {
      console.error('Storage connection test failed:', error);
      return { success: false, error: error.message };
    }
  }
}