import { Armchair, Shuffle, Trophy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateTeamMatchDialog } from "@/components/create-team-match-dialog";
import { getOrCreatePlayerForUser } from "@/db/players";

const playMenuBeforeTeamMatches = [
  { label: "Casual Game", icon: Armchair, href: "/coming-soon?feature=Casual%20Game" },
  { label: "Tournaments", icon: Trophy, href: "/coming-soon?feature=Tournaments" },
];
const playMenuAfterTeamMatches = [
  { label: "Practice", icon: Shuffle, href: "/coming-soon?feature=Practice" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");
  const userId = session.user.id;
  const email = session.user.email;
  await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <div className="mb-6 rounded-2xl bg-indigo-50/60 p-3">
        <div className="mb-3 rounded-xl bg-indigo-700 px-6 py-3 text-center text-lg font-semibold text-white shadow-sm">
          Play or Watch Bridge
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {playMenuBeforeTeamMatches.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-sm transition hover:shadow-md"
            >
              <item.icon className="size-5 shrink-0 text-indigo-700" />
              <span className="font-medium text-indigo-950">{item.label}</span>
            </Link>
          ))}
          <CreateTeamMatchDialog />
          {playMenuAfterTeamMatches.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 shadow-sm transition hover:shadow-md"
            >
              <item.icon className="size-5 shrink-0 text-indigo-700" />
              <span className="font-medium text-indigo-950">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
