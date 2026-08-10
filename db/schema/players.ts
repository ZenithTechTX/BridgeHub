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
  },
  (p) => [uniqueIndex("players_user_id_key").on(p.userId), uniqueIndex("players_email_key").on(p.email)]
);
