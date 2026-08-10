import { integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { pairs } from "./pairs";
import { sessions } from "./sessions";

// A dealt board — session-independent (shared hand-record pool), linked to
// sessions via `session_boards`. Hands are stored one column per seat
// (PBN suit-string, e.g. "AKQ.J1032.94.QJ85") instead of one combined
// dealPbn string.
export const boards = pgTable("boards", {
  boardId: uuid("board_id").primaryKey().defaultRandom(),
  boardNumber: integer("board_number").notNull(),
  dealer: text("dealer").notNull(), // "N" | "E" | "S" | "W"
  vulnerability: text("vulnerability").notNull(), // "None" | "NS" | "EW" | "Both" (DB check constraint casing)
  handN: text("hand_n"),
  handE: text("hand_e"),
  handS: text("hand_s"),
  handW: text("hand_w"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});

// Links a board into a session's board set, in play order.
export const sessionBoards = pgTable(
  "session_boards",
  {
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.sessionId, { onDelete: "cascade" }),
    boardId: uuid("board_id")
      .notNull()
      .references(() => boards.boardId, { onDelete: "cascade" }),
    sequence: integer("sequence").notNull(),
  },
  (sb) => [primaryKey({ columns: [sb.sessionId, sb.boardId] })]
);

// The movement schedule: which pairs sit N/S and E/W at which table for
// which round, and which board range they play there. Replaces the old
// fixed "2 tables per section" model with a real schedule — used for both
// the 2-room Team Match case (1 round, 2 tables) and Mitchell (many rounds).
export const movement = pgTable("movement", {
  movementId: uuid("movement_id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.sessionId, { onDelete: "cascade" }),
  roundNumber: integer("round_number").notNull(),
  tableNumber: integer("table_number").notNull(),
  nsPairId: uuid("ns_pair_id")
    .notNull()
    .references(() => pairs.pairId, { onDelete: "cascade" }),
  ewPairId: uuid("ew_pair_id")
    .notNull()
    .references(() => pairs.pairId, { onDelete: "cascade" }),
  boardRangeStart: integer("board_range_start").notNull(),
  boardRangeEnd: integer("board_range_end").notNull(),
});
