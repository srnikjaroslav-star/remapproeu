import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kivqvwdfujsnuwfxjtcz.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtpdnF2d2RmdWpzbnV3ZnhqdGN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcwMjQ1OTMsImV4cCI6MjA4MjYwMDU5M30.-iDvC0T6lozYv5d4xrHrHeS9PSGOfqwajZapMB7hqjQ';

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
