import { integer, numeric, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { pairs } from "./pairs";
import { sessions } from "./sessions";

// A team within one session (Teams event type). Roster-level.
export const teams = pgTable("teams", {
  teamId: uuid("team_id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.sessionId, { onDelete: "cascade" }),
  teamName: text("team_name").notNull(),
});

// A team = exactly 2 pairs (cross-seated rooms in a 2-room team match).
export const teamMembers = pgTable(
  "team_members",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.teamId, { onDelete: "cascade" }),
    pairId: uuid("pair_id")
      .notNull()
      .references(() => pairs.pairId, { onDelete: "cascade" }),
  },
  (tm) => [primaryKey({ columns: [tm.teamId, tm.pairId] })]
);

// TEAMS only: pairs two teams for a round, with the aggregate result inline
// (replaces the old separate match_result table).
export const matches = pgTable("matches", {
  matchId: uuid("match_id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.sessionId, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  team1Id: uuid("team1_id")
    .notNull()
    .references(() => teams.teamId, { onDelete: "cascade" }),
  team2Id: uuid("team2_id")
    .notNull()
    .references(() => teams.teamId, { onDelete: "cascade" }),
  boardsPlayed: integer("boards_played"),
  team1Imps: numeric("team1_imps", { mode: "number" }),
  team2Imps: numeric("team2_imps", { mode: "number" }),
  team1Vp: numeric("team1_vp", { mode: "number" }),
  team2Vp: numeric("team2_vp", { mode: "number" }),
});

// TEAMS/Swiss only: per-round standings. Not used by a plain 1-round 2-team
// match — `matches.team{1,2}Vp` covers that case directly.
export const swissStandings = pgTable(
  "swiss_standings",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.teamId, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    cumulativeVp: numeric("cumulative_vp", { mode: "number" }),
    rank: integer("rank"),
  },
  (s) => [primaryKey({ columns: [s.sessionId, s.teamId, s.roundNumber] })]
);
