import { eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { players } from "@/db/schema";

// The new `players` table has no username/displayName split — just `name`.
// It's also NOT NULL with no natural "not yet onboarded" marker, so a first
// login gets a name derived from their email (see auth call sites); users
// can rename themselves anytime via account settings.
//
// A separate SELECT+INSERT races when two requests for the same brand-new
// user land concurrently (e.g. a redirect landing page plus its own
// prefetch). `onConflictDoNothing()` with no target absorbs a conflict on
// *either* unique column (userId or email) — targeting just one (e.g.
// `ON CONFLICT (user_id)`) still throws if the concurrent race loses on the
// other constraint instead. A suppressed conflict returns no row, so fall
// back to a plain read for whichever request actually won.
export async function getOrCreatePlayerForUser(userId: string, email: string, name: string) {
  const [inserted] = await db.insert(players).values({ userId, email, name }).onConflictDoNothing().returning();
  if (inserted) return inserted;

  const existing = await db.query.players.findFirst({ where: eq(players.userId, userId) });
  if (existing) return existing;
  return db.query.players.findFirst({ where: eq(players.email, email) }) as Promise<typeof players.$inferSelect>;
}

// Case-insensitive exact match against existing players' display name;
// falls back to creating a new unclaimed guest player. Used for quick-table
// seat assignment, where a name is typed rather than picked from a search
// list. Unlike the old username-based lookup, `name` has no uniqueness
// constraint here — on more than one match, a fresh guest is created rather
// than guessing which one was meant.
export async function resolveOrCreatePlayerByName(name: string) {
  const matches = await db.query.players.findMany({
    where: ilike(players.name, name),
  });
  if (matches.length === 1) return matches[0];

  const [player] = await db.insert(players).values({ name }).returning();
  return player;
}
