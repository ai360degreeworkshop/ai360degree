/* Throwaway proof that the two env values in .env.local really do reach the
   backend and that both demo accounts resolve to a profile row with the role the
   app routes on. Run with: node scripts/verify-demo-accounts.mjs */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

/* Parsed by hand rather than with a dotenv dependency, so the script reads the
   very same file the app does and needs nothing installed for it. */
function loadEnv(path) {
  const env = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (line.trimStart().startsWith("#")) continue;
    const match = /^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv(new URL("../.env.local", import.meta.url));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log("URL from .env.local :", url);
console.log("anon key present    :", key ? `yes (${key.length} chars)` : "NO");
console.log("");

const accounts = [
  { email: "learner@ai360degree.demo", password: "DemoLearner#2026" },
  { email: "admin@ai360degree.demo", password: "DemoAdmin#2026" },
];

let failures = 0;

for (const account of accounts) {
  const supabase = createClient(url, key);
  const { data, error } = await supabase.auth.signInWithPassword(account);

  if (error) {
    failures++;
    console.log(`${account.email}  SIGN-IN FAILED: ${error.message}`);
    continue;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", data.user.id)
    .single();

  if (profileError) {
    failures++;
    console.log(`${account.email}  profile read FAILED: ${profileError.message}`);
    continue;
  }

  console.log(`${account.email}`);
  console.log(`  auth.users.id : ${data.user.id}`);
  console.log(`  profile.email : ${profile.email}`);
  console.log(`  full_name     : ${profile.full_name}`);
  console.log(`  role          : ${profile.role}`);
  console.log(`  -> routes to  : ${profile.role === "admin" ? "/admin" : "/user"}`);
  console.log("");
}

console.log(failures === 0 ? "ALL ACCOUNTS OK" : `${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
