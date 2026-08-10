import { pgTable, primaryKey, timestamp, uuid } from "drizzle-orm/pg-core";
import { players } from "./players";
import { sessions } from "./sessions";

// Added on top of the rebuilt schema — a lightweight heartbeat row per
// (session, player), upserted on every match-page render. "Currently
// watching" is derived by filtering to a recent last_seen window, not
// stored as a boolean — a viewer who navigates away just stops refreshing
// and ages out on its own.
export const sessionViewers = pgTable(
  "session_viewers",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.playerId, { onDelete: "cascade" }),
    lastSeen: timestamp("last_seen", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.sessionId, t.playerId] })]
);
