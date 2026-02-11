// Versão protegida do client

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://offline.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "offline-key";

// Criamos um client que nunca quebra mesmo offline
export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: false,
    },
    global: {
      fetch: (...args) =>
        fetch(...args).catch(() => {
          console.warn("Supabase offline.");
          return new Response(JSON.stringify({}), { status: 200 });
        }),
    },
  }
);
