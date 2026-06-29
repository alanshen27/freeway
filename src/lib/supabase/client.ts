import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Browser Supabase client (used by the /auth page). */
export function createSupabaseBrowser() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnon);
}
