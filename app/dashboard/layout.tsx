import { auth } from "@/auth";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { getOrCreatePlayerForUser } from "@/db/players";

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const session = await auth();
  if (session?.user?.id && session.user.email) {
    await getOrCreatePlayerForUser(session.user.id, session.user.email, session.user.email.split("@")[0]);
  }

  return (
    <div className="flex flex-1 flex-col">
      <DashboardTabs />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
