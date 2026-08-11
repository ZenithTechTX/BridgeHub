import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type Session = { user: { id: string; email: string | null } };

// Thin wrapper matching the shape call sites already use (session.user.id /
// .email) — kept small on purpose so dashboard/layout.tsx, site-header.tsx,
// etc. barely change from their NextAuth-era versions. Uses getUser() (not
// getSession()) since it re-validates against Supabase's auth server rather
// than trusting an unverified JWT read from cookies.
export async function auth(): Promise<Session | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { user: { id: user.id, email: user.email ?? null } };
}

export async function signOut({ redirectTo }: { redirectTo: string }) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const { redirect } = await import("next/navigation");
  redirect(redirectTo);
}

// Generates a magic-link action link via the admin API (so we control the
// email, not Supabase's default templates), then sends it through Resend's
// HTTP API — not SMTP, which Cloudflare Workers can't reach — including the
// "log to console if RESEND_API_KEY unset" dev-mode fallback.
export async function sendMagicLink({ email, redirectTo }: { email: string; redirectTo: string }) {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${APP_URL}/auth/confirm` },
  });
  if (error || !data.properties?.hashed_token) {
    throw new Error(error?.message ?? "Failed to generate sign-in link.");
  }
  // Supabase's admin API only returns implicit-flow tokens in a URL fragment
  // (action_link), which never reaches a server Route Handler — fragments
  // are browser-only. Build our own link using the token_hash instead, and
  // verify it server-side in /auth/confirm via verifyOtp. Must use the
  // *actual* verification_type Supabase assigned, not the "magiclink" type
  // we requested — a brand-new email gets reclassified as "signup" since
  // generating the link also creates the user.
  const url = `${APP_URL}/auth/confirm?token_hash=${data.properties.hashed_token}&type=${data.properties.verification_type}&next=${encodeURIComponent(redirectTo)}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`\n[dev] Magic sign-in link for ${email}:\n${url}\n`);
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: sendError } = await resend.emails.send({
    to: email,
    from: process.env.EMAIL_FROM ?? "BridgeHub <onboarding@bridgehub.dev>",
    subject: "Sign in to BridgeHub",
    text: `Sign in to BridgeHub: ${url}`,
    html: `<p><a href="${url}">Sign in to BridgeHub</a></p>`,
  });
  if (sendError) throw new Error(sendError.message);
}
