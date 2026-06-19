import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key);
}

export function getServiceSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key || url.includes('placeholder')) return null;
  return createClient(url, key);
}
