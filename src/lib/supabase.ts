import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your_supabase_url_here' || supabaseAnonKey === 'your_supabase_anon_key_here') {
  console.error('Supabase environment variables not configured properly:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlIsPlaceholder: supabaseUrl === 'your_supabase_url_here',
    keyIsPlaceholder: supabaseAnonKey === 'your_supabase_anon_key_here'
  });
  throw new Error('Missing or invalid Supabase environment variables. Please check your .env file and ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set with actual values from your Supabase project.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)