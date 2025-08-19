import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRole) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set in environment. Server-side uploads will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRole);
