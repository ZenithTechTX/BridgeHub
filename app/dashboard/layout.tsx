import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { SessionRefresher } from "@/components/session-refresher";
import { getOrCreatePlayerForUser, touchPlayerPresence } from "@/db/players";

// This guard used to live in proxy.ts (middleware) — moved here because
// Next.js 16's Proxy always runs on the Node.js runtime, which Cloudflare
// Workers can't execute. Server Component renders can't write cookies, so
// <SessionRefresher/> below pings a Route Handler instead (which can) to
// keep the auth cookie proactively refreshed the same way middleware used
// to, without needing the Node.js runtime.
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  if (session.user.email) {
    const player = await getOrCreatePlayerForUser(session.user.id, session.user.email, session.user.email.split("@")[0]);
    if (!player.handle) {
      redirect("/onboarding");
    }
    await touchPlayerPresence(player.playerId);
  }

  return (
    <div className="flex flex-1 flex-col">
      <SessionRefresher />
      <DashboardTabs />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
