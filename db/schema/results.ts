import { integer, numeric, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { boards } from "./boards";
import { pairs } from "./pairs";
import { sessions } from "./sessions";

// The one authoritative result per (session, board, ns_pair, ew_pair)
// instance — replaces the old table_result. Pre-created as a "scheduled"
// row (contract/scores NULL) when a session's movement is generated;
// recording a result is an UPDATE. Both signs are stored (score_ns/score_ew,
// always zero-sum) — unlike the old single signed rawScoreNs. Matchpoints
// (Pairs) and IMPs (Teams) are stored inline, replacing the old separate
// computed_board_score child table. No seat table — who physically sat
// where comes from `movement` -> `pairs` -> `pair_members`, not stored here.
export const boardResults = pgTable(
  "board_results",
  {
    resultId: uuid("result_id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.boardId, { onDelete: "cascade" }),
    tableNumber: integer("table_number"),
    roundNumber: integer("round_number"),
    nsPairId: uuid("ns_pair_id")
      .notNull()
      .references(() => pairs.pairId, { onDelete: "cascade" }),
    ewPairId: uuid("ew_pair_id")
      .notNull()
      .references(() => pairs.pairId, { onDelete: "cascade" }),
    contract: text("contract"), // e.g. "4SX" — level+strain+doubled combined
    declarer: text("declarer"), // "N" | "E" | "S" | "W"
    doubledStatus: text("doubled_status"), // "none" | "doubled" | "redoubled" (DB check constraint, lowercase)
    tricksTaken: integer("tricks_taken"), // 0-13
    scoreNs: integer("score_ns"),
    scoreEw: integer("score_ew"), // always -scoreNs (zero-sum)
    matchpointsNs: numeric("matchpoints_ns", { mode: "number" }), // Pairs events
    matchpointsEw: numeric("matchpoints_ew", { mode: "number" }),
    impsNs: numeric("imps_ns", { mode: "number" }), // Teams events: this board's IMP swing
    impsEw: numeric("imps_ew", { mode: "number" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (br) => [
    uniqueIndex("board_results_session_id_board_id_ns_pair_id_ew_pair_id_key").on(
      br.sessionId,
      br.boardId,
      br.nsPairId,
      br.ewPairId
    ),
  ]
);

// Optional child: bidding sequence. No alerted/announcement columns (the old
// schema had them; dropped to match the rebuilt schema exactly).
export const biddingSequence = pgTable(
  "bidding_sequence",
  {
    bidId: uuid("bid_id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => boardResults.resultId, { onDelete: "cascade" }),
    sequenceNumber: integer("sequence_number").notNull(), // 0-based order within the auction
    position: text("position").notNull(), // "N" | "E" | "S" | "W"
    call: text("call").notNull(), // "PASS" | "X" | "XX" | "1C".."7NT" — validated app-side
  },
  (c) => [uniqueIndex("bidding_sequence_result_id_sequence_number_key").on(c.resultId, c.sequenceNumber)]
);

// Optional child: card-by-card play. `card` is one combined text field
// (e.g. "SA") instead of separate suit/rank columns. `winningPosition` is
// persisted on the trick-completing row (computed once at insert time)
// instead of recomputed on every render.
export const playSequence = pgTable(
  "play_sequence",
  {
    playId: uuid("play_id").primaryKey().defaultRandom(),
    resultId: uuid("result_id")
      .notNull()
      .references(() => boardResults.resultId, { onDelete: "cascade" }),
    trickNumber: integer("trick_number").notNull(), // 1-13
    playInTrick: integer("play_in_trick").notNull(), // 1-4, position within the trick
    position: text("position").notNull(), // who played this card
    card: text("card").notNull(), // e.g. "SA", "H2" (suit letter + rank)
    winningPosition: text("winning_position"), // set on the 4th card of a completed trick
  },
  (p) => [uniqueIndex("play_sequence_result_id_trick_number_play_in_trick_key").on(p.resultId, p.trickNumber, p.playInTrick)]
);

// No director/adjustment UI exists yet — table defined for schema
// completeness, unused for now (matches the old app's unused adjustmentNote
// column).
export const adjustments = pgTable("adjustments", {
  adjustmentId: uuid("adjustment_id").primaryKey().defaultRandom(),
  resultId: uuid("result_id")
    .notNull()
    .references(() => boardResults.resultId, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  adjustedScoreNs: integer("adjusted_score_ns"),
  adjustedScoreEw: integer("adjusted_score_ew"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
