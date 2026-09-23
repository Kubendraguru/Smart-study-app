import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const getEnv = (key: string, viteKey: string, fallback: string) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key]!;
  }
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.[viteKey]) {
      return (import.meta as any).env[viteKey];
    }
  } catch {
    // Ignored
  }
  return fallback;
};

const supabaseUrl = getEnv(
  'EXPO_PUBLIC_SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'https://gtiovdtakkjwwjhwotlc.supabase.co'
);

const supabaseAnonKey = getEnv(
  'EXPO_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'sb_publishable_Fh014G2N6Ww53ONptlYuGg_JtP7emrU'
);

const isNative = typeof window === 'undefined' || !window.localStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isNative ? AsyncStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});