import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MatchPageHeader } from "@/components/match-page-header";
import { db } from "@/db";
import { boardResults, boards, matches, sessionBoards, teams } from "@/db/schema";
import { getTeamMatchRooms } from "@/db/matches";
import { getTeamImpsTotal } from "@/db/play";

const STRAIN_SYMBOL: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };

function contractDisplay(r: { contract: string | null; doubledStatus: string | null; declarer: string | null; scoreNs: number | null }): string {
  if (r.scoreNs === 0 && !r.contract) return "Passed out";
  if (!r.contract) return "—";
  const level = r.contract[0];
  const strain = r.contract.slice(1);
  const doubled = r.doubledStatus === "redoubled" ? " XX" : r.doubledStatus === "doubled" ? " X" : "";
  return `${level}${STRAIN_SYMBOL[strain] ?? strain}${doubled} by ${r.declarer}`;
}

function scoreDisplay(scoreNs: number | null): string {
  if (scoreNs == null) return "—";
  return scoreNs >= 0 ? `NS +${scoreNs}` : `EW +${-scoreNs}`;
}

export default async function MatchRecordPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  const summary = await getTeamMatchRooms(sessionId);
  if (!summary) notFound();
  const { session, rooms } = summary;

  const match = await db.query.matches.findFirst({ where: eq(matches.sessionId, sessionId) });
  const [team1, team2] = match
    ? await Promise.all([
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team1Id) }),
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team2Id) }),
      ])
    : [null, null];
  const team1Name = team1?.teamName ?? "—";
  const team2Name = team2?.teamName ?? "—";

  const allBoards = await db
    .select({ boardId: boards.boardId, boardNumber: boards.boardNumber })
    .from(sessionBoards)
    .innerJoin(boards, eq(sessionBoards.boardId, boards.boardId))
    .where(eq(sessionBoards.sessionId, sessionId))
    .orderBy(asc(sessionBoards.sequence));

  const allResults = await db.select().from(boardResults).where(eq(boardResults.sessionId, sessionId));

  const team1TotalImps = match ? await getTeamImpsTotal(sessionId, match.team1Id) : 0;
  const team2TotalImps = -team1TotalImps;
  const leader = team1TotalImps > 0 ? team1Name : team1TotalImps < 0 ? team2Name : null;

  return (
    <div className="flex flex-1 flex-col">
      <MatchPageHeader gameName={session.name} />

      <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <div className="mb-4 rounded-lg border bg-card p-3">
          <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Game type</div>
              <div>Team match</div>
            </div>
            <div>
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Session ID</div>
              <div className="truncate font-mono text-xs">{sessionId}</div>
            </div>
            <div className="col-span-2">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase">Teams</div>
              <div>
                {team1Name} vs {team2Name}
              </div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
            {rooms.map((room) => (
              <div key={room.tableId}>
                <div className="mb-0.5 font-semibold text-muted-foreground">{room.label}</div>
                {(["N", "E", "S", "W"] as const).map((d) => (
                  <div key={d}>
                    {d}: {room.seats.find((s) => s.direction === d)?.name ?? "—"}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4 rounded-lg border bg-card p-3">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Match standing</div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm">
            <span className={leader === team1Name ? "font-bold text-emerald-700" : ""}>
              {team1Name}: {team1TotalImps >= 0 ? "+" : ""}
              {team1TotalImps} IMPs
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className={leader === team2Name ? "font-bold text-emerald-700" : ""}>
              {team2Name}: {team2TotalImps >= 0 ? "+" : ""}
              {team2TotalImps} IMPs
            </span>
            <span className="text-xs text-muted-foreground">
              {leader ? `${leader} leads by ${Math.abs(team1TotalImps)} IMPs` : match ? "Tied" : ""}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] border-collapse text-xs">
            <thead>
              <tr className="border-b bg-muted text-left">
                <th className="p-2">Board</th>
                <th className="p-2">{rooms[0]?.label ?? "Room 1"} Contract</th>
                <th className="p-2">Result</th>
                <th className="p-2">Score</th>
                <th className="p-2">{rooms[1]?.label ?? "Room 2"} Contract</th>
                <th className="p-2">Result</th>
                <th className="p-2">Score</th>
                <th className="p-2">IMPs</th>
                <th className="p-2">PBN</th>
              </tr>
            </thead>
            <tbody>
              {allBoards.map((board) => {
                const boardResultRows = allResults.filter((r) => r.boardId === board.boardId);
                const r1 = boardResultRows.find((r) => r.tableNumber === 1);
                const r2 = boardResultRows.find((r) => r.tableNumber === 2);
                const team1Imps = r1?.impsNs ?? null;

                return (
                  <tr key={board.boardId} className="border-b last:border-0">
                    <td className="p-2 font-semibold">{board.boardNumber}</td>
                    <td className="p-2">{r1 ? contractDisplay(r1) : "—"}</td>
                    <td className="p-2">{r1?.tricksTaken ?? "—"}</td>
                    <td className="p-2">{r1 ? scoreDisplay(r1.scoreNs) : "—"}</td>
                    <td className="p-2">{r2 ? contractDisplay(r2) : "—"}</td>
                    <td className="p-2">{r2?.tricksTaken ?? "—"}</td>
                    <td className="p-2">{r2 ? scoreDisplay(r2.scoreNs) : "—"}</td>
                    <td className="p-2">
                      {team1Imps != null ? (
                        <div className="flex flex-col gap-0.5">
                          <span className={team1Imps > 0 ? "font-semibold text-emerald-700" : ""}>
                            {team1Name} {team1Imps >= 0 ? "+" : ""}
                            {team1Imps}
                          </span>
                          <span className={team1Imps < 0 ? "font-semibold text-emerald-700" : ""}>
                            {team2Name} {-team1Imps >= 0 ? "+" : ""}
                            {-team1Imps}
                          </span>
                          {team1Imps !== 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              {team1Imps > 0 ? team1Name : team2Name} wins this board
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex flex-col gap-0.5">
                        {r1?.contract != null && (
                          <Link href={`/dashboard/matches/${sessionId}/record/${r1.resultId}`} className="text-indigo-700 hover:underline">
                            {rooms[0]?.label ?? "Room 1"}
                          </Link>
                        )}
                        {r2?.contract != null && (
                          <Link href={`/dashboard/matches/${sessionId}/record/${r2.resultId}`} className="text-indigo-700 hover:underline">
                            {rooms[1]?.label ?? "Room 2"}
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          <Link href={`/dashboard/matches/${sessionId}`} className="text-indigo-700 hover:underline">
            Back to table
          </Link>
        </p>
      </div>
    </div>
  );
}
