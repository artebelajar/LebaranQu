// ===================================================
// FILE: src/utils/storage.js
// ===================================================
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
  static async uploadProfilePhoto(file, userId) {
    try {
      if (!file) throw new Error('No file provided');
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Tipe file tidak diizinkan');
      }
      
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('File terlalu besar. Maksimal 2MB');
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${userId}/${uuidv4()}.${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      console.log(`Uploading to Supabase bucket: ${BUCKET_NAME}, path: ${filePath}`);

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, buffer, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: true
        });

      if (error) {
        console.error('Supabase upload error:', error);
        
        // Jika bucket tidak ditemukan, beri pesan yang jelas
        if (error.message.includes('bucket') || error.statusCode === '404') {
          throw new Error(`Bucket "${BUCKET_NAME}" tidak ditemukan. Silakan buat bucket di Supabase terlebih dahulu.`);
        }
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return { url: publicUrl, path: filePath };
    } catch (error) {
      console.error('StorageService.uploadProfilePhoto error:', error);
      throw error;
    }
  }

  static async testConnection() {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      
      const bucketExists = data?.some(b => b.name === BUCKET_NAME);
      return { 
        success: true, 
        buckets: data.map(b => b.name),
        bucketExists,
        currentBucket: BUCKET_NAME
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
  
  static async listBuckets() {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      return { 
        success: true, 
        buckets: data.map(b => ({ name: b.name, public: b.public })),
        message: `Buckets available: ${data.map(b => b.name).join(', ')}`
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}
