import { createClient } from '@supabase/supabase-js';

// Detect if we are running in a React Native (Expo) environment
const isReactNative = typeof navigator !== 'undefined' && navigator.product === 'ReactNative';

const supabaseUrl = 
  typeof window !== 'undefined'
    ? (window as any).env?.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ''
    : process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const supabaseAnonKey = 
  typeof window !== 'undefined'
    ? (window as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

let customStorage: any = undefined;

if (isReactNative) {
  try {
    // Dynamic import to avoid bundling on Web/Desktop
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    customStorage = AsyncStorage;
  } catch (e) {
    console.warn('AsyncStorage is not available for Supabase client persistence in React Native.');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isReactNative,
    storage: customStorage,
  },
});

export function getSupabaseClient() {
  return supabase;
}
