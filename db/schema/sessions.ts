import { date, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

// A single game session (Pairs movement or Teams match) — standalone, not
// nested under any club/event hierarchy. `director_id` is a raw Supabase
// Auth UUID (auth.users.id) — no FK, since RLS's `is_session_director()`
// checks it directly against auth.uid() and Supabase discourages formal FKs
// into the `auth` schema.
export const sessions = pgTable("sessions", {
  sessionId: uuid("session_id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  date: date("date", { mode: "date" }).notNull(),
  sessionType: text("session_type").notNull(), // "pairs" | "swiss" | "individual" (DB check constraint)
  movementType: text("movement_type"), // "mitchell" | "howell" | "rover" (DB check constraint)
  numTables: integer("num_tables"),
  numBoards: integer("num_boards"),
  status: text("status").notNull().default("scheduled"), // "scheduled" | "in_progress" | "completed"
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  directorId: uuid("director_id"),
});
