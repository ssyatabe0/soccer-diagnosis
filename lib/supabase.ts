import { createClient } from '@supabase/supabase-js';

export function getSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  console.log('[supabase] url:', url ? url.slice(0, 30) + '...' : 'EMPTY');
  console.log('[supabase] key:', key ? key.slice(0, 15) + '...' : 'EMPTY');

  if (!url || !key || url.includes('placeholder')) {
    console.error('[supabase] 環境変数が未設定です');
    return null;
  }

  return createClient(url, key);
}

// 互換用エクスポート
export const supabase = (() => {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('placeholder')) {
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  return createClient(url, key);
})();

export function getServiceSupabase() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key || url.includes('placeholder')) {
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  return createClient(url, key);
}
