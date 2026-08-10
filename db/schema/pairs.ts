import { integer, numeric, pgTable, primaryKey, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { players } from "./players";
import { sessions } from "./sessions";

// A pair entry within one session. Roster-level (not per-board) — which
// table/round/direction it sits at for a given board comes from `movement`.
export const pairs = pgTable(
  "pairs",
  {
    pairId: uuid("pair_id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    pairNumber: integer("pair_number").notNull(),
  },
  (p) => [uniqueIndex("pairs_session_id_pair_number_key").on(p.sessionId, p.pairNumber)]
);

// 2 rows per pair. No direction here — a pair's N/S vs E/W assignment is
// per (round, table) via `movement`, not fixed on the roster.
export const pairMembers = pgTable(
  "pair_members",
  {
    pairId: uuid("pair_id")
      .notNull()
      .references(() => pairs.pairId, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.playerId, { onDelete: "cascade" }),
  },
  (pm) => [primaryKey({ columns: [pm.pairId, pm.playerId] })]
);

// Final standing for one pair in one (Pairs/Mitchell) session.
export const pairStandings = pgTable(
  "pair_standings",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    pairId: uuid("pair_id")
      .notNull()
      .references(() => pairs.pairId, { onDelete: "cascade" }),
    totalMatchpoints: numeric("total_matchpoints", { mode: "number" }),
    percentage: numeric("percentage", { mode: "number" }),
    rank: integer("rank"),
  },
  (s) => [primaryKey({ columns: [s.sessionId, s.pairId] })]
);
