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

const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'lebaranqu-profiles';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export class StorageService {
  /**
   * Upload foto profil ke Supabase Storage
   * @param {File} file - File gambar
   * @param {number} userId - ID user
   * @returns {Promise<{url: string, path: string}>}
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

      // Upload ke Supabase
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true // Overwrite jika ada file dengan nama sama
        });

      if (error) {
        console.error('Supabase upload error:', error);
        throw error;
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
   * @param {string} filePath - Path file di storage
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
   * Hapus semua file lama milik user
   * @param {number} userId - ID user
   */
  static async deleteAllUserFiles(userId) {
    try {
      console.log(`Deleting all files for user ${userId}`);

      // List semua file user
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list(`profile-pictures/${userId}`);

      if (listError) {
        console.error('Error listing files:', listError);
        return;
      }

      if (files && files.length > 0) {
        // Hapus semua file
        const filePaths = files.map(file => `profile-pictures/${userId}/${file.name}`);
        
        const { error: deleteError } = await supabase.storage
          .from(BUCKET_NAME)
          .remove(filePaths);

        if (deleteError) {
          console.error('Error deleting files:', deleteError);
        } else {
          console.log(`Deleted ${files.length} old files`);
        }
      }
    } catch (error) {
      console.error('StorageService.deleteAllUserFiles error:', error);
    }
  }

  /**
   * Mendapatkan default avatar URL
   * @returns {string}
   */
  static getDefaultAvatar() {
    // Anda bisa upload default avatar ke Supabase
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl('defaults/avatar.png');
    
    return publicUrl || 'https://media.istockphoto.com/id/1495088043/id/vektor/ikon-profil-pengguna-avatar-atau-ikon-orang-gambar-profil-simbol-potret-gambar-potret.jpg?s=2048x2048&w=is&k=20&c=G7qTBxWs68Pm03TIb6rsOCo_m2JptQ8SVTrFfXq0kfU=';
  }

  /**
   * Mendapatkan URL file dari path
   * @param {string} filePath 
   * @returns {string}
   */
  static getPublicUrl(filePath) {
    if (!filePath) return this.getDefaultAvatar();
    
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);
    
    return publicUrl;
  }
}