import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/* The two public credentials. Next inlines NEXT_PUBLIC_* at build time, so they
   are hard-coded into the client bundle - they can never be a secret, and RLS is
   what actually protects the rows. */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* createBrowserClient (not supabase-js' createClient) because it keeps the session
   in cookies instead of localStorage. That is the whole reason proxy.ts and the
   server components can see the same session the browser signed in with - with
   localStorage the server would only ever see an anonymous request. The package
   memoises one instance per URL+key, so calling this on every render is cheap. */
export function getBrowserClient(): SupabaseClient {
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill both in.",
    );
  }
  return createBrowserClient(url, key);
}
