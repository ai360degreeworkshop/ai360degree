/* GoTrue returns terse machine-facing strings ("Invalid login credentials").
   They are never rendered as-is: the UI only ever shows one of these sentences,
   so a raw error object can't leak into the page. Unrecognised failures fall
   through to a generic line rather than exposing the server's wording. */
export function readableAuthError(message: string | undefined): string {
  const text = (message ?? "").toLowerCase();

  if (text.includes("invalid login credentials")) {
    return "That email and password don't match an account.";
  }
  if (text.includes("email not confirmed")) {
    return "Confirm your email address first - check your inbox for the link.";
  }
  if (text.includes("already registered") || text.includes("already been registered")) {
    return "An account with that email already exists. Try signing in instead.";
  }
  if (text.includes("password should be at least")) {
    return "Use a password of at least 8 characters.";
  }
  if (text.includes("rate limit") || text.includes("too many")) {
    return "Too many attempts. Wait a moment and try again.";
  }
  if (text.includes("failed to fetch") || text.includes("network")) {
    return "Couldn't reach the server. Check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
