import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Verifies a magic-link token_hash server-side (see auth.ts's sendMagicLink
// for why this is needed instead of Supabase's default action_link redirect
// — admin-generated links carry tokens in a URL fragment, which a server
// Route Handler can never see).
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    console.error("VERIFY_OTP_FAILED", error);
  }

  return NextResponse.redirect(`${origin}/signin?error=1`);
}
