import { createClient } from '@supabase/supabase-js';

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Remove trailing /rest/v1/ if present in env variable to get base project URL
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '');

export const supabase = createClient(supabaseUrl, supabaseKey);
