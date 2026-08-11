import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { getOrCreatePlayerForUser } from "@/db/players";

// This guard used to live in proxy.ts (middleware) — moved here because
// Next.js 16's Proxy always runs on the Node.js runtime, which Cloudflare
// Workers can't execute. One consequence of dropping the middleware-based
// session refresh: the auth cookie now only refreshes when a Server Action
// runs (Server Component renders can't write cookies), so a long-idle tab
// may occasionally need a manual reload after the access token's ~1hr TTL.
export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  if (session.user.email) {
    await getOrCreatePlayerForUser(session.user.id, session.user.email, session.user.email.split("@")[0]);
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardTabs />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
