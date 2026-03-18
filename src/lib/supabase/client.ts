import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseUrl = (): string => {
  const value = import.meta.env.VITE_SUPABASE_URL?.trim();

  if (!value) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable.');
  }

  return value;
};

export const getSupabaseAnonKey = (): string => {
  const value = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  if (!value) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable.');
  }

  return value;
};

export const getSupabaseClient = (): SupabaseClient => {
  if (!supabaseClient) {
    supabaseClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    });
  }

  return supabaseClient;
};
