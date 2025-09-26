import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if Supabase is properly configured
const isSupabaseConfigured = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'your_supabase_url_here' && 
  supabaseAnonKey !== 'your_supabase_anon_key_here' &&
  supabaseUrl.startsWith('https://') &&
  supabaseAnonKey.length > 20;

if (!isSupabaseConfigured) {
  console.warn('Supabase environment variables not configured properly:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlIsPlaceholder: supabaseUrl === 'your_supabase_url_here',
    keyIsPlaceholder: supabaseAnonKey === 'your_supabase_anon_key_here',
    urlFormat: supabaseUrl?.startsWith('https://') ? 'valid' : 'invalid',
    keyLength: supabaseAnonKey?.length || 0
  });
}