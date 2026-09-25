import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* Server-side counterpart of lib/supabase/client.ts. It reads the same cookies the
   browser wrote, which is what lets a page decide whether to render at all before
   any of its tree reaches the RSC payload.

   `cookies()` is async in this Next version and must be awaited. Awaiting it is
   also what opts these routes into dynamic rendering - a route that reads the
   session per request cannot be a static page. */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill both in.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* A Server Component cannot write cookies. That is fine here: proxy.ts
             already refreshed the session before this ran, so there is nothing
             left to persist. */
        }
      },
    },
  });
}
