import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BridgeTable } from "@/components/bridge-table";
import { Input } from "@/components/ui/input";
import { getTeamMatchRooms, listAllActiveTeamMatchSessions } from "@/db/matches";
import { getOrCreatePlayerForUser } from "@/db/players";
import { claimSeat } from "./actions";

export default async function AllTablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; claimError?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) redirect("/signin");
  const me = await getOrCreatePlayerForUser(session.user.id, session.user.email, session.user.email.split("@")[0]);

  const { q, claimError } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const allSessions = await listAllActiveTeamMatchSessions();
  const summaries = await Promise.all(allSessions.map((s) => getTeamMatchRooms(s.sessionId)));

  const matches = summaries.filter((summary): summary is NonNullable<typeof summary> => {
    if (!summary) return false;
    if (!query) return true;
    return summary.rooms.some((room) =>
      room.seats.some(
        (seat) => seat.name.toLowerCase().includes(query) || seat.handle?.toLowerCase().includes(query)
      )
    );
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">All Tables</h1>

      <form className="mb-4">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search player names…" className="h-9" />
      </form>

      {claimError && <p className="mb-3 text-sm text-destructive">{decodeURIComponent(claimError)}</p>}

      {matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {query ? `No tables found with a player matching "${q}".` : "No tables are open right now."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {matches.map((summary) => (
          <div key={summary.session.sessionId} className="rounded-2xl border bg-card p-4 shadow-sm">
            <Link
              href={`/dashboard/matches/${summary.session.sessionId}`}
              className="mb-1 flex items-center justify-between hover:underline"
            >
              <span className="font-semibold">{summary.session.name}</span>
              <span className="text-xs text-muted-foreground">{summary.session.numBoards} boards</span>
            </Link>
            <div className="flex flex-col gap-3 sm:flex-row">
              {summary.rooms.map((room, i) => (
                <BridgeTable
                  key={room.tableId}
                  room={room}
                  interactive
                  viewerPlayerId={me.playerId}
                  claimAction={claimSeat}
                  kibitzHref={`/dashboard/matches/${summary.session.sessionId}?room=${i + 1}`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
