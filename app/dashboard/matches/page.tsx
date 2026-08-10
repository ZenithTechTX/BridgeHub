import Link from "next/link";
import { auth } from "@/auth";
import { BridgeTable } from "@/components/bridge-table";
import { getTeamMatchRooms, listMyTeamMatchSessions } from "@/db/matches";

export default async function TeamMatchPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const mySessions = await listMyTeamMatchSessions(userId);
  const matchSummaries = await Promise.all(
    mySessions.map((s) => getTeamMatchRooms(s.sessionId))
  );

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Team Match</h1>

      {matchSummaries.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No ongoing tables yet — create a Team Match from Play Bridge to get
          started.
        </p>
      )}

      <div className="flex flex-col gap-4">
        {matchSummaries.map((summary) => {
          if (!summary) return null;
          const { session, rooms } = summary;
          return (
            <Link
              key={session.sessionId}
              href={`/dashboard/matches/${session.sessionId}`}
              className="block rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold">{session.name}</span>
                <span className="text-xs text-muted-foreground">{session.numBoards} boards</span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                {rooms.map((room) => (
                  <BridgeTable key={room.tableId} room={room} />
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
