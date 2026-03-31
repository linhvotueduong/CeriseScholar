import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a Supabase client for use in browser-side code (React components).
 * Call this in any component that needs to talk to Supabase.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
