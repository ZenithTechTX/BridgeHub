import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  biddingSequence,
  boardResults,
  boards,
  movement,
  pairMembers,
  players,
  sessionBoards,
  sessions,
  teamMembers,
  teams,
} from "@/db/schema";
import { finalizePassedOut } from "@/db/play";
import { determineContract, legalCalls, nextToCall } from "@/lib/bridge-auction";

export type Direction = "N" | "E" | "S" | "W";

export type SeatInfo = {
  direction: Direction;
  playerId: string;
  name: string;
  // False once a real signed-in account has claimed this seat — until then
  // it's held by an auto-created guest placeholder and anyone can sit down.
  claimed: boolean;
};

export type TeamMatchRoom = {
  tableId: string; // movement.movementId for this (round, table)
  label: string;
  nsTeam: string;
  ewTeam: string;
  seats: SeatInfo[];
};

// A pair has exactly 2 members but no per-player direction column (unlike
// the old schema's per-board seat table) — which partner is displayed as
// the "first" vs "second" compass letter (N vs S, E vs W) is a stable,
// deterministic sort by playerId, not stored data. Since dealer rotates
// every board, neither slot is systematically advantaged.
function sortedPairMembers<T extends { playerId: string }>(members: T[]): T[] {
  return [...members].sort((a, b) => a.playerId.localeCompare(b.playerId));
}

// The event + its 2 rooms (cross-seated teams) for a team-match session.
export async function getTeamMatchRooms(sessionId: string) {
  const [session, movementRows] = await Promise.all([
    db.query.sessions.findFirst({ where: eq(sessions.sessionId, sessionId) }),
    db.select().from(movement).where(eq(movement.sessionId, sessionId)).orderBy(asc(movement.tableNumber)),
  ]);
  if (!session || session.sessionType !== "swiss") return null;

  const pairIds = [...new Set(movementRows.flatMap((m) => [m.nsPairId, m.ewPairId]))];

  const [allPairMembers, allTeamMembers] = await Promise.all([
    pairIds.length
      ? db
          .select({ pairId: pairMembers.pairId, playerId: pairMembers.playerId, name: players.name, userId: players.userId })
          .from(pairMembers)
          .innerJoin(players, eq(pairMembers.playerId, players.playerId))
          .where(inArray(pairMembers.pairId, pairIds))
      : Promise.resolve([]),
    pairIds.length
      ? db
          .select({ pairId: teamMembers.pairId, teamName: teams.teamName })
          .from(teamMembers)
          .innerJoin(teams, eq(teamMembers.teamId, teams.teamId))
          .where(inArray(teamMembers.pairId, pairIds))
      : Promise.resolve([]),
  ]);

  const teamNameForPair = (pairId: string) => allTeamMembers.find((t) => t.pairId === pairId)?.teamName ?? "—";

  const seatsForPair = (pairId: string, directions: [Direction, Direction]): SeatInfo[] =>
    sortedPairMembers(allPairMembers.filter((m) => m.pairId === pairId)).map((m, i) => ({
      direction: directions[i],
      playerId: m.playerId,
      name: m.name,
      claimed: m.userId !== null,
    }));

  const rooms: TeamMatchRoom[] = movementRows.map((m, i) => ({
    tableId: m.movementId,
    label: i === 0 ? "Room 1 — Open" : "Room 2 — Closed",
    nsTeam: teamNameForPair(m.nsPairId),
    ewTeam: teamNameForPair(m.ewPairId),
    seats: [...seatsForPair(m.nsPairId, ["N", "S"]), ...seatsForPair(m.ewPairId, ["E", "W"])],
  }));

  return { session, rooms };
}

// All team-match sessions this user directs, most recent first. The old
// schema hid sessions >60s after they finished; the new one has no
// "finished at" timestamp to drive that with, so this simply lists
// everything (in-progress and completed) — a session naturally drops off
// once the user starts a newer one, which is close enough for a quick-play
// list.
export async function listMyTeamMatchSessions(userId: string) {
  return db
    .select()
    .from(sessions)
    .where(and(eq(sessions.directorId, userId), eq(sessions.sessionType, "swiss")))
    .orderBy(desc(sessions.createdAt));
}

// The "current board" for a session is derived, not stored: the lowest
// play-order board that isn't fully scored across every table for its
// round yet. Once both rooms finish a board, the derived current board
// moves on by itself — no separate "advance" mutation to run or forget.
export async function getCurrentBoard(sessionId: string) {
  const ordered = await db
    .select({
      boardId: boards.boardId,
      boardNumber: boards.boardNumber,
      dealer: boards.dealer,
      vulnerability: boards.vulnerability,
      handN: boards.handN,
      handE: boards.handE,
      handS: boards.handS,
      handW: boards.handW,
      sequence: sessionBoards.sequence,
    })
    .from(sessionBoards)
    .innerJoin(boards, eq(sessionBoards.boardId, boards.boardId))
    .where(eq(sessionBoards.sessionId, sessionId))
    .orderBy(asc(sessionBoards.sequence));
  if (ordered.length === 0) return null;

  const results = await db
    .select({ boardId: boardResults.boardId, scoreNs: boardResults.scoreNs })
    .from(boardResults)
    .where(eq(boardResults.sessionId, sessionId));

  for (const board of ordered) {
    const forBoard = results.filter((r) => r.boardId === board.boardId);
    const allScored = forBoard.length > 0 && forBoard.every((r) => r.scoreNs != null);
    if (!allScored) return board;
  }
  return ordered[ordered.length - 1];
}

// Reassigns the seat: swaps out whoever's currently in that direction's
// slot for the viewer's own player. Any signed-in player may claim a seat
// still held by an unclaimed guest placeholder (userId IS NULL) — reserved
// seat names are a label for organizers, not a hard restriction. A seat
// already claimed by another real account can't be taken. Because seating
// lives on `pair_members` (roster-level) rather than a per-board seat
// table, this is a single row update — no fan-out across every board.
export async function claimSeatForPlayer(
  viewerPlayerId: string,
  movementId: string,
  direction: Direction
): Promise<{ error?: string }> {
  const m = await db.query.movement.findFirst({ where: eq(movement.movementId, movementId) });
  if (!m) return { error: "Table not found." };

  const pairId = direction === "N" || direction === "S" ? m.nsPairId : m.ewPairId;
  const members = await db.select({ playerId: pairMembers.playerId }).from(pairMembers).where(eq(pairMembers.pairId, pairId));
  const slotIndex = direction === "N" || direction === "E" ? 0 : 1;
  const occupantId = sortedPairMembers(members)[slotIndex]?.playerId;
  if (!occupantId) return { error: "Seat not found." };
  if (occupantId === viewerPlayerId) return {};

  const occupant = await db.query.players.findFirst({ where: eq(players.playerId, occupantId) });
  if (!occupant || occupant.userId !== null) {
    return { error: "That seat is already taken." };
  }

  await db
    .update(pairMembers)
    .set({ playerId: viewerPlayerId })
    .where(and(eq(pairMembers.pairId, pairId), eq(pairMembers.playerId, occupantId)));

  return {};
}

// Which compass direction (if any) the viewer is seated at for this room's
// board result — derived the same deterministic way as getTeamMatchRooms.
export async function getViewerSeat(resultId: string, viewerPlayerId: string): Promise<Direction | null> {
  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (!result) return null;

  const [nsMembers, ewMembers] = await Promise.all([
    db.select({ playerId: pairMembers.playerId }).from(pairMembers).where(eq(pairMembers.pairId, result.nsPairId)),
    db.select({ playerId: pairMembers.playerId }).from(pairMembers).where(eq(pairMembers.pairId, result.ewPairId)),
  ]);
  const ns = sortedPairMembers(nsMembers);
  const ew = sortedPairMembers(ewMembers);

  if (ns[0]?.playerId === viewerPlayerId) return "N";
  if (ns[1]?.playerId === viewerPlayerId) return "S";
  if (ew[0]?.playerId === viewerPlayerId) return "E";
  if (ew[1]?.playerId === viewerPlayerId) return "W";
  return null;
}

// The specific room+board's board_result — auctions/play are scoped per
// board per room, never carried across boards.
export async function getTeamForPair(pairId: string): Promise<string | null> {
  const row = await db.query.teamMembers.findFirst({ where: eq(teamMembers.pairId, pairId) });
  return row?.teamId ?? null;
}

export async function getRoomTableResult(movementId: string, boardId: string) {
  const m = await db.query.movement.findFirst({ where: eq(movement.movementId, movementId) });
  if (!m) return null;
  return db.query.boardResults.findFirst({
    where: and(
      eq(boardResults.sessionId, m.sessionId),
      eq(boardResults.boardId, boardId),
      eq(boardResults.nsPairId, m.nsPairId),
      eq(boardResults.ewPairId, m.ewPairId)
    ),
  });
}

export async function getAuctionCalls(resultId: string) {
  const rows = await db
    .select({ direction: biddingSequence.position, call: biddingSequence.call })
    .from(biddingSequence)
    .where(eq(biddingSequence.resultId, resultId))
    .orderBy(asc(biddingSequence.sequenceNumber));
  return rows.map((r) => ({ direction: r.direction as Direction, call: r.call }));
}

// Validates and records one call. Turn order and legality are always
// recomputed here server-side — never trust which button the client
// rendered as enabled.
export async function submitAuctionCall(
  resultId: string,
  viewerPlayerId: string,
  call: string
): Promise<{ error?: string }> {
  const result = await db.query.boardResults.findFirst({ where: eq(boardResults.resultId, resultId) });
  if (!result) return { error: "Table result not found." };

  const board = await db.query.boards.findFirst({ where: eq(boards.boardId, result.boardId) });
  if (!board) return { error: "Board not found." };

  const seatDirection = await getViewerSeat(resultId, viewerPlayerId);
  if (!seatDirection) return { error: "You're not seated at this table." };

  const existingCalls = await getAuctionCalls(resultId);

  if (determineContract(existingCalls) !== null) {
    return { error: "The auction is already complete." };
  }

  const whoseTurn = nextToCall(board.dealer as Direction, existingCalls);
  if (whoseTurn !== seatDirection) return { error: "It's not your turn to call." };

  const legal = legalCalls(seatDirection, existingCalls);
  const isValid =
    call === "PASS"
      ? legal.canPass
      : call === "X"
        ? legal.canDouble
        : call === "XX"
          ? legal.canRedouble
          : legal.legalBids.includes(call);
  if (!isValid) return { error: "That call isn't legal right now." };

  await db.insert(biddingSequence).values({
    resultId,
    sequenceNumber: existingCalls.length,
    position: seatDirection,
    call,
  });

  const updatedCalls = [...existingCalls, { direction: seatDirection, call }];
  if (determineContract(updatedCalls) === "PASSED_OUT") {
    await finalizePassedOut(resultId);
  }

  return {};
}
