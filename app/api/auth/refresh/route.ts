import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Pinged periodically by <SessionRefresher/> to keep the auth cookie alive.
// Route Handlers (unlike Server Component renders) can actually write
// cookies, so this is what replaces proxy.ts's proactive session refresh —
// that file was removed because Next.js 16's Proxy always runs on the
// Node.js runtime, which Cloudflare Workers can't execute, but Route
// Handlers run fine there.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return NextResponse.json({ signedIn: !!user });
}
