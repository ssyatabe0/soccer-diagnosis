import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // 末尾スラッシュを除去
  return raw.replace(/\/+$/, '');
}

function getAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
}

function getServiceKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || '';
}

function safeCreateClient(url: string, key: string): SupabaseClient {
  if (!url || !key || url.includes('placeholder') || url.includes('あなた')) {
    console.error(
      '[supabase] 環境変数が未設定です。.env.local に NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください。'
    );
    // ダミーURL でクライアントを生成（fetch は失敗するが、アプリはクラッシュしない）
    return createClient('https://placeholder.supabase.co', 'placeholder');
  }
  return createClient(url, key);
}

export const supabase = safeCreateClient(getUrl(), getAnonKey());

export function getServiceSupabase(): SupabaseClient {
  return safeCreateClient(getUrl(), getServiceKey());
}
