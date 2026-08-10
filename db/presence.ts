import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { players, sessionViewers } from "@/db/schema";

// A viewer is "currently watching" if they've hit the match page within
// this window — roughly 3 auto-refresh cycles (4s each), so a viewer who
// just navigated away doesn't linger in the list.
const ACTIVE_WINDOW_MS = 15_000;

export async function trackViewer(sessionId: string, playerId: string) {
  await db
    .insert(sessionViewers)
    .values({ sessionId, playerId })
    .onConflictDoUpdate({ target: [sessionViewers.sessionId, sessionViewers.playerId], set: { lastSeen: new Date() } });
}

export async function getActiveKibitzers(sessionId: string, seatedPlayerIds: string[]) {
  const since = new Date(Date.now() - ACTIVE_WINDOW_MS);
  const rows = await db
    .select({ playerId: sessionViewers.playerId, name: players.name })
    .from(sessionViewers)
    .innerJoin(players, eq(sessionViewers.playerId, players.playerId))
    .where(and(eq(sessionViewers.sessionId, sessionId), gt(sessionViewers.lastSeen, since)));
  return rows.filter((r) => !seatedPlayerIds.includes(r.playerId));
}
