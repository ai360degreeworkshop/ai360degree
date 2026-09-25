"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { getBrowserClient } from "../lib/supabase/client";

/* Mounted from the two dashboard sidebars, which are server components - hence
   this one separate client island. Icon-only because the sidebar footer is a
   fixed 244px wide and already holds an avatar and two lines of copy; the label
   lives in aria-label/title instead of stealing the space. */
export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    if (pending) return;
    setPending(true);
    await getBrowserClient().auth.signOut();
    /* replace, not push: after signing out, "back" must not return to the
       dashboard. refresh() then drops the cached RSC payload so the router cannot
       re-render a tree that was built for the session we just ended. */
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      className="sign-out"
      onClick={handleSignOut}
      disabled={pending}
      aria-label={pending ? "Signing out" : "Sign out"}
      title="Sign out"
    >
      <LogOut size={16} aria-hidden="true" strokeWidth={1.8} />
    </button>
  );
}
