import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server Component / Server Action client — reads the caller's session from
// cookies. Uses the anon key; RLS still applies if this client is ever used
// directly (it currently isn't for app data — see db/index.ts's privileged
// connection — but auth.getUser()/signOut() go through this).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
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
          // Called from a Server Component render, where cookies can't be
          // written — the session-refresh middleware handles it instead.
        }
      },
    },
  });
}
