import { getBrowserClient } from "./client";

export type AppRole = "user" | "admin";

/* The role lives in public.profiles, not in the session, so every sign-in has to
   look it up before it knows which dashboard to open. RLS only lets a signed-in
   user read their own row, so this query cannot be used to read anyone else's. */
export async function fetchCurrentUserRole(): Promise<AppRole | null> {
  const supabase = getBrowserClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (error) return null;
  return data?.role === "admin" ? "admin" : "user";
}

/* Both pages route the same way, so the mapping lives here rather than twice. */
export function dashboardPathFor(role: AppRole | null): string {
  return role === "admin" ? "/admin" : "/user";
}
