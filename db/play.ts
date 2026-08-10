import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { biddingSequence, boardResults, boards, matches, playSequence, sessionBoards, sessions, teamMembers } from "@/db/schema";
import { getViewerSeat, type Direction } from "@/db/matches";
import { determineContract, type Contract } from "@/lib/bridge-auction";
import {
  expandHand,
  isPlayComplete,
  legalCards,
  nextToPlay,
  partnerOf,
  trickWinner,
  tricksWonByDeclarerSide,
  type PlayedCard,
  type Suit,
} from "@/lib/bridge-play";
import { computeRawScore, impsForDifference, victoryPoints } from "@/lib/bridge-scoring";
import { suitsFromHand } from "@/lib/deal";

async function getAuctionCallsFor(resultId: string) {
  const rows = await db
    .select({ direction: biddingSequence.position, call: biddingSequence.call })
    .from(biddingSequence)
    .where(eq(biddingSequence.resultId, resultId))
    .orderBy(asc(biddingSequence.sequenceNumber));
  return rows.map((r) => ({ direction: r.direction as Direction, call: r.call }));
}

function splitCard(card: string): { suit: Suit; rank: string } {
  return { suit: card[0] as Suit, rank: card.slice(1) };
}

// Sum of a team's board IMPs across a whole session. IMPs are stored
// directly on each room's own board_results row (imps_ns/imps_ew, relative
// to that room's own NS/EW) — no separate join table or dedup needed, since
// (unlike the old schema's per-entry computed_board_score) each room's row
// already carries exactly one correct value per side.
export async function getTeamImpsTotal(sessionId: string, teamId: string): Promise<number> {
  const teamPairs = await db.select({ pairId: teamMembers.pairId }).from(teamMembers).where(eq(teamMembers.teamId, teamId));
  const pairIds = teamPairs.map((p) => p.pairId);
  if (pairIds.length === 0) return 0;

  const rows = await db
    .select({ nsPairId: boardResults.nsPairId, ewPairId: boardResults.ewPairId, impsNs: boardResults.impsNs, impsEw: boardResults.impsEw })
    .from(boardResults)
    .where(eq(boardResults.sessionId, sessionId));

  let total = 0;
  for (const r of rows) {
    if (pairIds.includes(r.nsPairId) && r.impsNs != null) total += r.impsNs;
    if (pairIds.includes(r.ewPairId) && r.impsEw != null) total += r.impsEw;
  }
  return total;
}

export async function getPlayState(resultId: string): Promise<PlayedCard[]> {
  const rows = await db
    .select({ trickNumber: playSequence.trickNumber, position: playSequence.position, card: playSequence.card })
    .from(playSequence)
    .where(eq(playSequence.resultId, resultId))
    .orderBy(asc(playSequence.trickNumber), asc(playSequence.playInTrick));
  return rows.map((r) => ({ direction: r.position as Direction, trickNumber: r.trickNumber, ...splitCard(r.card) }));
}

// Validates and records one card played by/for `forDirection` (the acting
// viewer's own seat, or dummy's seat when the viewer is declarer — dummy
// never acts for itself, matching real bridge). Turn order and legality are
// always recomputed here — never trust the client's rendered button state.
export async function submitPlayCard(
  resultId: string,
  viewerPlayerId: string,
  forDirection: Direction,
  suit: Suit,
  rank: string
): Promise<{ error?: string }> {
  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (!result) return { error: "Table result not found." };
  if (result.scoreNs != null) return { error: "This board is already complete." };

  const board = await db.query.boards.findFirst({ where: eq(boards.boardId, result.boardId) });
  if (!board) return { error: "Board not found." };

  const calls = await getAuctionCallsFor(resultId);
  const contract = determineContract(calls);
  if (!contract || contract === "PASSED_OUT") return { error: "The auction isn't over yet." };

  const seat = await getViewerSeat(resultId, viewerPlayerId);
  if (!seat) return { error: "You're not seated at this table." };

  const dummyDirection = partnerOf(contract.declarer);
  const authorized =
    (forDirection === seat && forDirection !== dummyDirection) ||
    (forDirection === dummyDirection && seat === contract.declarer);
  if (!authorized) return { error: "You can't play that hand." };

  const playedSoFar = await getPlayState(resultId);
  if (isPlayComplete(playedSoFar)) return { error: "Play is already complete." };

  const turn = nextToPlay(contract, playedSoFar);
  if (turn !== forDirection) return { error: "It's not that hand's turn." };

  const handColumn = { N: board.handN, E: board.handE, S: board.handS, W: board.handW }[forDirection];
  if (!handColumn) return { error: "Board not found." };
  const handSuits = suitsFromHand(handColumn);
  const alreadyPlayed = playedSoFar.filter((c) => c.direction === forDirection);
  const remaining = expandHand(handSuits).filter(
    (c) => !alreadyPlayed.some((p) => p.suit === c.suit && p.rank === c.rank)
  );
  if (!remaining.some((c) => c.suit === suit && c.rank === rank)) {
    return { error: "That card isn't in the hand." };
  }

  const cardsInCurrentTrick = playedSoFar.length % 4;
  const currentTrick = playedSoFar.slice(playedSoFar.length - cardsInCurrentTrick);
  const legal = legalCards(remaining, currentTrick);
  if (!legal.some((c) => c.suit === suit && c.rank === rank)) {
    return { error: "You must follow suit." };
  }

  const trickNumber = Math.floor(playedSoFar.length / 4) + 1;
  const playInTrick = cardsInCurrentTrick + 1;
  const updatedTrick = [...currentTrick, { direction: forDirection, suit, rank }];
  const winningPosition = playInTrick === 4 ? trickWinner(updatedTrick, contract.strain) : null;

  await db.insert(playSequence).values({
    resultId,
    trickNumber,
    playInTrick,
    position: forDirection,
    card: `${suit}${rank}`,
    winningPosition,
  });

  const updated = [...playedSoFar, { direction: forDirection, suit, rank, trickNumber }];
  if (isPlayComplete(updated)) {
    await finalizePlayedResult(resultId, result.boardId, contract, updated);
  }

  return {};
}

async function finalizePlayedResult(resultId: string, boardId: string, contract: Contract, playedCards: PlayedCard[]) {
  const board = await db.query.boards.findFirst({ where: eq(boards.boardId, boardId) });
  if (!board) return;

  const tricksTaken = tricksWonByDeclarerSide(contract, playedCards);
  const declarerSide = contract.declarer === "N" || contract.declarer === "S" ? "NS" : "EW";
  const vulnerable = board.vulnerability === "Both" || board.vulnerability === declarerSide;
  const scoreNs = computeRawScore({
    level: contract.level,
    strain: contract.strain,
    doubled: contract.doubled,
    declarerSide,
    vulnerable,
    tricksTaken,
  });

  await db
    .update(boardResults)
    .set({
      contract: `${contract.level}${contract.strain}`,
      // DB check constraint wants lowercase ('none'/'doubled'/'redoubled');
      // Contract.doubled (pure game logic, unrelated to persistence) stays
      // uppercase — only translate at this one write boundary.
      doubledStatus: contract.doubled.toLowerCase(),
      declarer: contract.declarer,
      tricksTaken,
      scoreNs,
      scoreEw: -scoreNs,
    })
    .where(eq(boardResults.resultId, resultId));

  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (result) await maybeCompareRooms(result.sessionId, result.boardId);
}

// Called when a room's auction is passed out (no contract) — recorded as a
// zero-score result (scoreNs = 0 is how "passed out" is distinguished from
// "not yet played", since a played contract can never score exactly 0) so
// cross-room comparison and the record table still account for the board.
export async function finalizePassedOut(resultId: string) {
  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (!result || result.scoreNs != null) return;

  await db.update(boardResults).set({ scoreNs: 0, scoreEw: 0 }).where(eq(boardResults.resultId, resultId));

  await maybeCompareRooms(result.sessionId, result.boardId);
}

// Once both rooms have a recorded result for a board, computes the
// cross-room IMP swing and writes it directly onto each room's own
// board_results row (imps_ns/imps_ew, relative to that room's own NS/EW —
// no separate per-entry join table needed, since each row already has a
// side-specific column for it).
async function maybeCompareRooms(sessionId: string, boardId: string) {
  const roomResults = await db.select().from(boardResults).where(and(eq(boardResults.sessionId, sessionId), eq(boardResults.boardId, boardId)));
  if (roomResults.length !== 2) return;
  const [r1, r2] = roomResults;
  if (r1.scoreNs == null || r2.scoreNs == null) return;
  if (r1.impsNs != null) return; // already compared

  const pairIds = [r1.nsPairId, r1.ewPairId, r2.nsPairId, r2.ewPairId];
  const teamRows = await db.select({ pairId: teamMembers.pairId, teamId: teamMembers.teamId }).from(teamMembers).where(inArray(teamMembers.pairId, pairIds));
  const teamFor = (pairId: string) => teamRows.find((t) => t.pairId === pairId)?.teamId;

  const team1Id = teamFor(r1.nsPairId); // "team1" here = whoever is NS in room1
  const team1InR2isNs = teamFor(r2.nsPairId) === team1Id;

  const team1Total = r1.scoreNs + (team1InR2isNs ? r2.scoreNs : r2.scoreEw!);
  const imps1 = impsForDifference(team1Total) * Math.sign(team1Total);
  const imps2 = -imps1;

  await db.update(boardResults).set({ impsNs: imps1, impsEw: imps2 }).where(eq(boardResults.resultId, r1.resultId));
  await db
    .update(boardResults)
    .set(team1InR2isNs ? { impsNs: imps1, impsEw: imps2 } : { impsNs: imps2, impsEw: imps1 })
    .where(eq(boardResults.resultId, r2.resultId));

  await maybeFinalizeMatch(sessionId);
}

async function maybeFinalizeMatch(sessionId: string) {
  const sbRows = await db.select({ boardId: sessionBoards.boardId }).from(sessionBoards).where(eq(sessionBoards.sessionId, sessionId));
  const totalBoards = sbRows.length;
  if (totalBoards === 0) return;

  const allResults = await db.select({ impsNs: boardResults.impsNs }).from(boardResults).where(eq(boardResults.sessionId, sessionId));
  const allDone = allResults.length === totalBoards * 2 && allResults.every((r) => r.impsNs != null);
  if (!allDone) return;

  const match = await db.query.matches.findFirst({ where: eq(matches.sessionId, sessionId) });
  if (!match) return;

  const team1Imps = await getTeamImpsTotal(sessionId, match.team1Id);
  const team2Imps = -team1Imps;
  const vp = victoryPoints(team1Imps);
  const team1Vp = team1Imps >= team2Imps ? vp.winner : vp.loser;
  const team2Vp = team1Imps >= team2Imps ? vp.loser : vp.winner;

  await db
    .update(matches)
    .set({ boardsPlayed: totalBoards, team1Imps, team2Imps, team1Vp, team2Vp })
    .where(eq(matches.matchId, match.matchId));

  await db.update(sessions).set({ status: "completed" }).where(eq(sessions.sessionId, sessionId));
}
