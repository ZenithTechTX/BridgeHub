"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { resolveOrCreatePlayerByName } from "@/db/players";
import { boardResults, boards, matches, movement, pairMembers, pairs, sessionBoards, sessions, teamMembers, teams } from "@/db/schema";
import { dealerForBoard, generateRandomDeal, parseHand, vulnerabilityForBoard } from "@/lib/deal";

const createTeamMatchSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters"),
  description: z.string().trim().optional(),
  team1Name: z.string().trim().optional(),
  team2Name: z.string().trim().optional(),
  boardsCount: z.coerce.number().int().min(1, "At least 1 board").max(40, "40 boards max"),
  team1North: z.string().trim().optional(),
  team1East: z.string().trim().optional(),
  team1South: z.string().trim().optional(),
  team1West: z.string().trim().optional(),
  team2North: z.string().trim().optional(),
  team2East: z.string().trim().optional(),
  team2South: z.string().trim().optional(),
  team2West: z.string().trim().optional(),
});

export async function createTeamMatch(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be signed in." };
  }

  const parsed = createTeamMatchSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }
  const data = parsed.data;
  const team1Name = data.team1Name || "Team 1";
  const team2Name = data.team2Name || "Team 2";

  const [t1n, t1e, t1s, t1w, t2n, t2e, t2s, t2w] = await Promise.all([
    resolveOrCreatePlayerByName(data.team1North || `Team1 North ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team1East || `Team1 East ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team1South || `Team1 South ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team1West || `Team1 West ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team2North || `Team2 North ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team2East || `Team2 East ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team2South || `Team2 South ${Date.now()}`),
    resolveOrCreatePlayerByName(data.team2West || `Team2 West ${Date.now()}`),
  ]);

  const [newSession] = await db
    .insert(sessions)
    .values({
      name: data.title,
      date: new Date(),
      // DB check constraints: session_type only allows pairs|swiss|individual
      // (no literal "teams" — team events are modeled as a 1+-round Swiss
      // between teams) and movement_type only allows mitchell|howell|rover.
      // Our fixed 2-table single round doesn't run a real movement
      // algorithm — "mitchell" is just the closest conventional label.
      sessionType: "swiss",
      movementType: "mitchell",
      numTables: 2,
      numBoards: data.boardsCount,
      status: "in_progress",
      directorId: userId,
    })
    .returning();

  // Open room: Team1's N/S pair vs Team2's E/W pair.
  // Closed room: Team2's N/S pair vs Team1's E/W pair (the cross-seat swap).
  const [pairOpenNs, pairOpenEw, pairClosedNs, pairClosedEw] = await db
    .insert(pairs)
    .values([
      { sessionId: newSession.sessionId, pairNumber: 1 },
      { sessionId: newSession.sessionId, pairNumber: 2 },
      { sessionId: newSession.sessionId, pairNumber: 3 },
      { sessionId: newSession.sessionId, pairNumber: 4 },
    ])
    .returning();

  await db.insert(pairMembers).values([
    { pairId: pairOpenNs.pairId, playerId: t1n.playerId },
    { pairId: pairOpenNs.pairId, playerId: t1s.playerId },
    { pairId: pairOpenEw.pairId, playerId: t2e.playerId },
    { pairId: pairOpenEw.pairId, playerId: t2w.playerId },
    { pairId: pairClosedNs.pairId, playerId: t2n.playerId },
    { pairId: pairClosedNs.pairId, playerId: t2s.playerId },
    { pairId: pairClosedEw.pairId, playerId: t1e.playerId },
    { pairId: pairClosedEw.pairId, playerId: t1w.playerId },
  ]);

  const [team1, team2] = await db
    .insert(teams)
    .values([
      { sessionId: newSession.sessionId, teamName: team1Name },
      { sessionId: newSession.sessionId, teamName: team2Name },
    ])
    .returning();

  await db.insert(teamMembers).values([
    { teamId: team1.teamId, pairId: pairOpenNs.pairId },
    { teamId: team1.teamId, pairId: pairClosedEw.pairId },
    { teamId: team2.teamId, pairId: pairOpenEw.pairId },
    { teamId: team2.teamId, pairId: pairClosedNs.pairId },
  ]);

  await db.insert(matches).values({
    sessionId: newSession.sessionId,
    roundNumber: 1,
    team1Id: team1.teamId,
    team2Id: team2.teamId,
  });

  await db.insert(movement).values([
    {
      sessionId: newSession.sessionId,
      roundNumber: 1,
      tableNumber: 1,
      nsPairId: pairOpenNs.pairId,
      ewPairId: pairOpenEw.pairId,
      boardRangeStart: 1,
      boardRangeEnd: data.boardsCount,
    },
    {
      sessionId: newSession.sessionId,
      roundNumber: 1,
      tableNumber: 2,
      nsPairId: pairClosedNs.pairId,
      ewPairId: pairClosedEw.pairId,
      boardRangeStart: 1,
      boardRangeEnd: data.boardsCount,
    },
  ]);

  for (let boardNumber = 1; boardNumber <= data.boardsCount; boardNumber++) {
    const dealPbn = generateRandomDeal();
    const [board] = await db
      .insert(boards)
      .values({
        boardNumber,
        dealer: dealerForBoard(boardNumber),
        vulnerability: vulnerabilityForBoard(boardNumber),
        handN: parseHand(dealPbn, "N").join("."),
        handE: parseHand(dealPbn, "E").join("."),
        handS: parseHand(dealPbn, "S").join("."),
        handW: parseHand(dealPbn, "W").join("."),
      })
      .returning();

    await db.insert(sessionBoards).values({ sessionId: newSession.sessionId, boardId: board.boardId, sequence: boardNumber });

    await db.insert(boardResults).values([
      {
        sessionId: newSession.sessionId,
        boardId: board.boardId,
        tableNumber: 1,
        roundNumber: 1,
        nsPairId: pairOpenNs.pairId,
        ewPairId: pairOpenEw.pairId,
      },
      {
        sessionId: newSession.sessionId,
        boardId: board.boardId,
        tableNumber: 2,
        roundNumber: 1,
        nsPairId: pairClosedNs.pairId,
        ewPairId: pairClosedEw.pairId,
      },
    ]);
  }

  redirect(`/dashboard/matches`);
}
