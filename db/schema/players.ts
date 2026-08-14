import { sql } from "drizzle-orm";
import { numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

// Decoupled from Supabase Auth so a session can record results for people
// who've never signed in (guests). `userId` is a raw auth.users.id UUID
// (no FK — same reasoning as sessions.directorId) set once a login claims
// this roster identity.
export const players = pgTable(
  "players",
  {
    playerId: uuid("player_id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    email: text("email"),
    masterpoints: numeric("masterpoints", { mode: "number" }).default(0),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    userId: uuid("user_id"),
    // Heartbeat for the site-wide "who's online" list — distinct from
    // session_viewers, which tracks presence within one specific match.
    // Updated on every /dashboard/** page load; null means never seen.
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true, mode: "date" }),
    // User-chosen unique handle ("Player ID"), distinct from the internal
    // playerId UUID above — set during onboarding. Null means the account
    // hasn't finished onboarding yet; that's the signal dashboard/layout.tsx
    // uses to redirect to /onboarding instead of the dashboard.
    handle: text("handle"),
    skillLevel: text("skill_level"),
  },
  (p) => [
    uniqueIndex("players_user_id_key").on(p.userId),
    uniqueIndex("players_email_key").on(p.email),
    // Case-insensitive uniqueness — "Alice" and "alice" shouldn't both be
    // takeable as separate handles.
    uniqueIndex("players_handle_lower_key").on(sql`lower(${p.handle})`),
  ]
);
