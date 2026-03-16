import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL is not defined in .env');
}
if (!process.env.SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY is not defined in .env');
}
if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY is not defined in .env');
}

console.log('✅ Supabase URL:', process.env.SUPABASE_URL);
console.log('✅ Supabase Anon Key length:', process.env.SUPABASE_ANON_KEY.length);
console.log('✅ Supabase Service Key length:', process.env.SUPABASE_SERVICE_KEY.length);

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY, 
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

export const supabasePublic = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);