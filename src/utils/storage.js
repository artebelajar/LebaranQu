import { supabase } from "../lib/supabase.js";
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

const BUCKET_NAME = 'lebaran_26';
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export class StorageService {
  static async uploadProfilePhoto(file, userId) {
    try {
      if (!file) throw new Error('No file provided');
      
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Tipe file tidak diizinkan. Gunakan JPG, PNG, GIF, atau WebP');
      }
      
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File terlalu besar. Maksimal ${MAX_FILE_SIZE / 1024 / 1024}MB`);
      }

      const fileExt = path.extname(file.name);
      const fileName = `${userId}-${uuidv4()}${fileExt}`;
      const filePath = `profile-pictures/${fileName}`;

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true 
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  // Delete file
  static async deleteFile(filePath) {
    try {
      if (!filePath) return;
      
      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      throw error;
    }
  }

  // Get default avatar URL
  static getDefaultAvatar() {
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl('defaults/avatar.png');
    
    return publicUrl;
  }
}