import { Armchair, Shuffle, Trophy } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CreateTeamMatchDialog } from "@/components/create-team-match-dialog";
import { OnlinePlayersList } from "@/components/online-players-list";
import { getActiveSeatForPlayers } from "@/db/matches";
import { getOnlinePlayers, getOrCreatePlayerForUser } from "@/db/players";

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
  const me = await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);
  const onlinePlayers = await getOnlinePlayers(me.playerId);
  const activeSeats = await getActiveSeatForPlayers(onlinePlayers.map((p) => p.playerId));
  const onlinePlayersWithKibitz = onlinePlayers.map((p) => {
    const seat = activeSeats.get(p.playerId);
    return {
      playerId: p.playerId,
      name: p.handle ?? p.name,
      kibitzHref: seat ? `/dashboard/matches/${seat.sessionId}?room=${seat.tableNumber}` : undefined,
    };
  });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 items-start gap-4 px-4 py-6">
      <OnlinePlayersList players={onlinePlayersWithKibitz} />
      <div className="mb-6 flex-1 rounded-2xl bg-indigo-50/60 p-3">
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
