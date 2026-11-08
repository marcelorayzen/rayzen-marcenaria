import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validatePublicSupabaseConfiguration } from "./supabaseConfiguration";

const configuration = validatePublicSupabaseConfiguration({
  url: import.meta.env.VITE_SUPABASE_URL,
  publishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});

export const isSupabaseConfigured = configuration.configured;

/**
 * Kept null until the local environment provides both public browser values.
 * This lets the current offline prototype continue to run without a remote
 * connection and prevents an accidental fallback to a privileged credential.
 */
export const supabase: SupabaseClient | null = configuration.configured
  ? createClient(configuration.configuration.url, configuration.configuration.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;
