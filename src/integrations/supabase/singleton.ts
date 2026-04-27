import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Singleton pattern para garantir única instância
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;
let isInitializing = false;

const getSupabaseInstance = () => {
  if (supabaseInstance) {
    return supabaseInstance;
  }

  if (isInitializing) {
    // Evitar múltiplas criações durante inicialização
    throw new Error('Supabase client is being initialized');
  }

  isInitializing = true;

  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseInstance = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers: {
        'X-Client-Info': 'treexmenu/1.0.0',
      },
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });

  isInitializing = false;
  return supabaseInstance;
};

export const supabase = getSupabaseInstance();
