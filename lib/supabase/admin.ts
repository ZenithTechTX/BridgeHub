import { createClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS, server-only, never imported by client
// components. Used solely to generate magic-link action links so we can send
// them through our own branded email (see auth.ts's sendMagicLink) instead
// of Supabase's default auth email templates.
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
