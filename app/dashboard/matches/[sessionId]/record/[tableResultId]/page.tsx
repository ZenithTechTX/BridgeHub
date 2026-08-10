import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BoardReplay } from "@/components/board-replay";
import { MatchPageHeader } from "@/components/match-page-header";
import { db } from "@/db";
import { boardResults, boards, matches, teams } from "@/db/schema";
import { getAuctionCalls, getTeamMatchRooms } from "@/db/matches";
import { getPlayState } from "@/db/play";
import { combineHandsToPbn } from "@/lib/deal";
import { generateBoardPbn, scorePbnLabel } from "@/lib/pbn-export";

const STRAIN_SYMBOL: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };

function contractDisplay(r: { contract: string | null; doubledStatus: string | null; declarer: string | null; scoreNs: number | null }): string {
  if (r.scoreNs === 0 && !r.contract) return "Passed out";
  if (!r.contract) return "Not played yet";
  const level = r.contract[0];
  const strain = r.contract.slice(1);
  const doubled = r.doubledStatus === "redoubled" ? " XX" : r.doubledStatus === "doubled" ? " X" : "";
  return `${level}${STRAIN_SYMBOL[strain] ?? strain}${doubled} by ${r.declarer}`;
}

function scoreDisplay(scoreNs: number | null): string {
  if (scoreNs == null) return "—";
  return scoreNs >= 0 ? `NS +${scoreNs}` : `EW +${-scoreNs}`;
}

function formatPbnDate(d: Date): string {
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

export default async function BoardReplayPage({
  params,
}: {
  params: Promise<{ sessionId: string; tableResultId: string }>;
}) {
  const { sessionId, tableResultId: resultId } = await params;

  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (!result) notFound();

  const board = await db.query.boards.findFirst({ where: eq(boards.boardId, result.boardId) });
  if (!board || result.sessionId !== sessionId) notFound();

  const summary = await getTeamMatchRooms(sessionId);
  if (!summary) notFound();
  const { session, rooms } = summary;
  const room = result.tableNumber === 1 ? rooms[0] : rooms[1];
  if (!room) notFound();

  const match = await db.query.matches.findFirst({ where: eq(matches.sessionId, sessionId) });
  const [team1, team2] = match
    ? await Promise.all([
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team1Id) }),
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team2Id) }),
      ])
    : [null, null];
  const team1Name = team1?.teamName ?? "—";
  const team2Name = team2?.teamName ?? "—";

  const calls = await getAuctionCalls(resultId);
  const playedCards = await getPlayState(resultId);

  // Room built as table1=team1's NS pair, table2=team2's NS pair (see
  // createTeamMatch) — so team1's IMP swing for this board is impsNs on
  // table1, or impsEw (team1 is EW there) on table2.
  const team1Imps = result.tableNumber === 1 ? result.impsNs : result.impsEw;

  const seats: Record<"N" | "E" | "S" | "W", string> = {
    N: room.seats.find((s) => s.direction === "N")?.name ?? "—",
    E: room.seats.find((s) => s.direction === "E")?.name ?? "—",
    S: room.seats.find((s) => s.direction === "S")?.name ?? "—",
    W: room.seats.find((s) => s.direction === "W")?.name ?? "—",
  };

  const dealPbn =
    board.handN && board.handE && board.handS && board.handW
      ? combineHandsToPbn({ handN: board.handN, handE: board.handE, handS: board.handS, handW: board.handW })
      : null;

  const contractLabelForPbn =
    result.scoreNs === 0 && !result.contract
      ? "Pass"
      : result.contract
        ? `${result.contract}${result.doubledStatus === "redoubled" ? "XX" : result.doubledStatus === "doubled" ? "X" : ""}`
        : "";

  const pbn = dealPbn
    ? generateBoardPbn({
        eventName: session.name,
        siteName: "BridgeHub",
        date: formatPbnDate(session.createdAt),
        boardNumber: board.boardNumber,
        seats,
        dealer: board.dealer as "N" | "E" | "S" | "W",
        vulnerability: board.vulnerability as "None" | "NS" | "EW" | "Both",
        dealPbn,
        declarer: (result.declarer as "N" | "E" | "S" | "W" | null) ?? null,
        contractLabel: contractLabelForPbn,
        result: result.tricksTaken,
        scoreLabel: scorePbnLabel(result.scoreNs),
        homeTeam: team1Name,
        visitTeam: team2Name,
        scoreImpLabel: team1Imps != null ? `NS ${team1Imps >= 0 ? "+" : ""}${team1Imps} EW ${-team1Imps >= 0 ? "+" : ""}${-team1Imps}` : null,
        calls: calls.map((c) => ({ direction: c.direction, call: c.call, alerted: false, announcement: null })),
        playCards: playedCards.map((c) => ({ direction: c.direction, suit: c.suit, rank: c.rank })),
      })
    : "";

  return (
    <div className="flex flex-1 flex-col">
      <MatchPageHeader gameName={session.name} recordHref={`/dashboard/matches/${sessionId}/record`} />

      <div className="mx-auto w-full max-w-[2500px] flex-1 px-4 py-6">
        <p className="mb-3 text-xs">
          <Link href={`/dashboard/matches/${sessionId}/record`} className="text-indigo-700 hover:underline">
            ← Back to record
          </Link>
        </p>

        {!dealPbn ? (
          <p className="text-sm text-muted-foreground">This board hasn&apos;t been dealt yet.</p>
        ) : (
          <BoardReplay
            room={room}
            boardNumber={board.boardNumber}
            boardsPerRound={session.numBoards ?? 0}
            dealer={board.dealer as "N" | "E" | "S" | "W"}
            vulnerability={board.vulnerability}
            dealPbn={dealPbn}
            calls={calls}
            playedCards={playedCards}
            passedOut={result.scoreNs === 0 && !result.contract}
            finalSummary={
              result.contract || result.scoreNs != null
                ? {
                    contract: contractDisplay(result),
                    score: `${result.tricksTaken != null ? `${result.tricksTaken} tricks · ` : ""}${scoreDisplay(result.scoreNs)}`,
                    imps:
                      team1Imps != null
                        ? `${team1Name} ${team1Imps >= 0 ? "+" : ""}${team1Imps} IMPs`
                        : undefined,
                  }
                : null
            }
          />
        )}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-indigo-700 hover:underline">Raw PBN</summary>
          <pre className="mt-1 w-max max-w-full overflow-x-auto rounded border bg-slate-950 p-2 text-[10px] text-slate-100">{pbn}</pre>
        </details>
      </div>
    </div>
  );
}
