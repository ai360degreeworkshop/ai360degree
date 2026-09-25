import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "./server";

/* The data access layer for auth. The Next docs are explicit that this - not
   proxy.ts and not a layout - is where authorisation belongs:

     "While Proxy can be useful for initial checks, it should not be your only
      line of defense in protecting your data. The majority of security checks
      should be performed as close as possible to your data source."

   and, on doing it in layouts:

     "A layout also does not control whether the rest of the route renders.
      Route segments and parallel route slots are rendered by the router, so a
      layout that hides or swaps them does not stop them from running or from
      appearing in the RSC Payload."

   So the checks below are called from the page components. Because they run
   before the page returns its tree, a rejected visitor never receives that tree
   in the RSC payload at all - which a client-side guard could not promise.

   Both helpers return by throwing a redirect, so the caller's next line only
   runs for an authorised user. */

/* /user/* needs any signed-in user - admins included. */
export async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return user;
}

/* /admin/* needs role 'admin'. A signed-in non-admin is sent to their own
   dashboard rather than shown a 404, so the failure is legible. */
export async function requireAdmin() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (data?.role !== "admin") redirect("/user");

  return user;
}
