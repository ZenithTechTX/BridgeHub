import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { players, sessions, sessionViewers } from "@/db/schema";

// A viewer is "currently watching" if they've hit the match page within
// this window — roughly 3 auto-refresh cycles (4s each), so a viewer who
// just navigated away doesn't linger in the list.
const ACTIVE_WINDOW_MS = 15_000;

// How long a table sits with zero recent viewers (players or kibitzers —
// trackViewer() is called for both) before it's considered abandoned and
// deleted. Deliberately much longer than ACTIVE_WINDOW_MS: that one is for
// "who's watching right now" in the UI, this one is "has everyone actually
// left," and needs enough slack that a refresh, a dropped connection, or
// someone stepping away for a minute doesn't wipe the table out from under
// them.
const DELETE_GRACE_MS = 5 * 60_000;

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

// Deletes every table (session) that has been visited at least once — so a
// freshly created table nobody has opened yet is never touched — but whose
// most recent visit, by anyone at all (seated or kibitzing), is older than
// the grace period. Cascades through the whole session's data (boards,
// results, chat, etc.) via the FK ON DELETE CASCADE rules, so a single
// delete on `sessions` is enough. Called opportunistically whenever the
// matches list loads — there's no persistent background worker to run this
// on a real schedule.
export async function deleteAbandonedSessions() {
  // Passed as an ISO string, not a raw Date — postgres.js can't infer a
  // param type for a placeholder that only appears inside a HAVING
  // aggregate expression, and silently fails to serialize a bare Date in
  // that position. A string sidesteps the inference entirely; Postgres
  // parses it as a timestamptz on comparison either way.
  const staleThreshold = new Date(Date.now() - DELETE_GRACE_MS).toISOString();
  const stale = await db
    .select({ sessionId: sessionViewers.sessionId })
    .from(sessionViewers)
    .groupBy(sessionViewers.sessionId)
    .having(sql`max(${sessionViewers.lastSeen}) < ${staleThreshold}`);

  if (stale.length === 0) return [];
  const sessionIds = stale.map((s) => s.sessionId);
  await db.delete(sessions).where(inArray(sessions.sessionId, sessionIds));
  return sessionIds;
}
