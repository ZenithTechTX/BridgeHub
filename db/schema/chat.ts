import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { players } from "./players";
import { sessions } from "./sessions";

// Added on top of the rebuilt schema (not present in the original rebuild)
// — one shared thread per session, visible to seated players and kibitzers
// alike, matching how the match page is scoped.
export const chatMessages = pgTable("chat_messages", {
  messageId: uuid("message_id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => sessions.sessionId, { onDelete: "cascade" }),
  playerId: uuid("player_id")
    .notNull()
    .references(() => players.playerId, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
});
