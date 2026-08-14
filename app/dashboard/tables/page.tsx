import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BridgeTable } from "@/components/bridge-table";
import { Input } from "@/components/ui/input";
import { getTeamMatchRooms, listAllActiveTeamMatchSessions } from "@/db/matches";

export default async function AllTablesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/signin");

  const { q } = await searchParams;
  const query = q?.trim().toLowerCase() ?? "";

  const allSessions = await listAllActiveTeamMatchSessions();
  const summaries = await Promise.all(allSessions.map((s) => getTeamMatchRooms(s.sessionId)));

  const matches = summaries.filter((summary): summary is NonNullable<typeof summary> => {
    if (!summary) return false;
    if (!query) return true;
    return summary.rooms.some((room) => room.seats.some((seat) => seat.name.toLowerCase().includes(query)));
  });

  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">All Tables</h1>

      <form className="mb-4">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search player names…" className="h-9" />
      </form>

      {matches.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {query ? `No tables found with a player matching "${q}".` : "No tables are open right now."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {matches.map((summary) => (
          <Link
            key={summary.session.sessionId}
            href={`/dashboard/matches/${summary.session.sessionId}`}
            className="block rounded-2xl border bg-card p-4 shadow-sm transition hover:shadow-md"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-semibold">{summary.session.name}</span>
              <span className="text-xs text-muted-foreground">{summary.session.numBoards} boards</span>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {summary.rooms.map((room) => (
                <BridgeTable key={room.tableId} room={room} />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
