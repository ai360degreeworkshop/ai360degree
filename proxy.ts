import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/* Next 16 renamed the `middleware` convention to `proxy` (middleware.ts is
   deprecated), and proxy runs on the Node.js runtime only.

   This is the optimistic half of the auth story: it turns away signed-out
   visitors before the route renders, and it refreshes an expired access token so
   the server components downstream see a live session.

   What it deliberately does NOT do is check the role. The docs warn that proxy
   "runs on every route, including prefetched routes, so it's important to only
   read the session from the cookie (optimistic checks), and avoid database
   checks to prevent performance issues" - and reading `profiles.role` would be
   exactly such a database check. requireAdmin() in lib/supabase/dal.ts does it
   instead, on the page, which is both cheaper and authoritative. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /* Also refreshes the session when the access token has expired, which is why
     the refreshed cookies above must be written back onto the response. */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    return NextResponse.redirect(login);
  }

  return response;
}

/* Scoped to the protected trees so proxy does not run for /login, /register, the
   landing page or any static asset - the matcher is what keeps it off the hot
   path for the public pages. */
export const config = {
  matcher: ["/user/:path*", "/admin/:path*"],
};
