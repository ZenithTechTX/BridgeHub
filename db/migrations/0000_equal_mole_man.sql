CREATE TYPE "public"."club_membership_role" AS ENUM('ORGANIZER', 'PLAYER');--> statement-breakpoint
CREATE TYPE "public"."direction" AS ENUM('N', 'E', 'S', 'W');--> statement-breakpoint
CREATE TYPE "public"."doubled_state" AS ENUM('NONE', 'DOUBLED', 'REDOUBLED');--> statement-breakpoint
CREATE TYPE "public"."entry_type" AS ENUM('PAIR', 'TEAM');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('PAIRS', 'TEAMS');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('MITCHELL', 'HOWELL', 'SWISS', 'ROUND_ROBIN', 'KNOCKOUT');--> statement-breakpoint
CREATE TYPE "public"."result_type" AS ENUM('PLAYED', 'PASSED_OUT', 'DIRECTOR_ADJUSTED', 'ARTIFICIAL_ADJUSTED', 'NOT_PLAYED');--> statement-breakpoint
CREATE TYPE "public"."scoring_method" AS ENUM('MATCHPOINTS', 'IMP');--> statement-breakpoint
CREATE TYPE "public"."strain" AS ENUM('C', 'D', 'H', 'S', 'NT');--> statement-breakpoint
CREATE TYPE "public"."suit" AS ENUM('C', 'D', 'H', 'S');--> statement-breakpoint
CREATE TYPE "public"."vulnerability" AS ENUM('NONE', 'NS', 'EW', 'BOTH');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "club_membership" (
	"id" text PRIMARY KEY NOT NULL,
	"playerId" text NOT NULL,
	"clubId" text NOT NULL,
	"role" "club_membership_role" NOT NULL,
	"joinedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "club" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"ownerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "board" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"boardNumber" integer NOT NULL,
	"dealer" "direction" NOT NULL,
	"vulnerability" "vulnerability" NOT NULL,
	"dealPbn" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"type" "entry_type" NOT NULL,
	"entryNumber" integer,
	"name" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entry_player" (
	"id" text PRIMARY KEY NOT NULL,
	"entryId" text NOT NULL,
	"playerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_session" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"sessionNumber" integer NOT NULL,
	"scheduledAt" timestamp,
	"movementType" "movement_type" NOT NULL,
	"numRounds" integer NOT NULL,
	"boardsPerRound" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event" (
	"id" text PRIMARY KEY NOT NULL,
	"clubId" text NOT NULL,
	"name" text NOT NULL,
	"type" "event_type" NOT NULL,
	"scoringMethod" "scoring_method" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match" (
	"id" text PRIMARY KEY NOT NULL,
	"sectionId" text NOT NULL,
	"roundNumber" integer NOT NULL,
	"entry1Id" text NOT NULL,
	"entry2Id" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "section" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"label" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table" (
	"id" text PRIMARY KEY NOT NULL,
	"sectionId" text NOT NULL,
	"tableNumber" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text,
	"displayName" text NOT NULL,
	"bio" text,
	"federationNumber" text,
	"homeClubId" text,
	"country" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auction_call" (
	"id" text PRIMARY KEY NOT NULL,
	"tableResultId" text NOT NULL,
	"sequence" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"call" text NOT NULL,
	"alerted" boolean DEFAULT false NOT NULL,
	"announcement" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "play_card" (
	"id" text PRIMARY KEY NOT NULL,
	"tableResultId" text NOT NULL,
	"sequence" integer NOT NULL,
	"trickNumber" integer NOT NULL,
	"direction" "direction" NOT NULL,
	"suit" "suit" NOT NULL,
	"rank" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_result_seat" (
	"id" text PRIMARY KEY NOT NULL,
	"tableResultId" text NOT NULL,
	"direction" "direction" NOT NULL,
	"playerId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "table_result" (
	"id" text PRIMARY KEY NOT NULL,
	"boardId" text NOT NULL,
	"tableId" text NOT NULL,
	"roundNumber" integer NOT NULL,
	"matchId" text,
	"nsEntryId" text NOT NULL,
	"ewEntryId" text NOT NULL,
	"resultType" "result_type",
	"level" integer,
	"strain" "strain",
	"doubled" "doubled_state",
	"declarer" "direction",
	"tricksTaken" integer,
	"rawScoreNs" integer,
	"adjustmentNote" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "computed_board_score" (
	"id" text PRIMARY KEY NOT NULL,
	"tableResultId" text NOT NULL,
	"entryId" text NOT NULL,
	"matchpoints" numeric(6, 2),
	"imps" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_standing" (
	"id" text PRIMARY KEY NOT NULL,
	"eventId" text NOT NULL,
	"entryId" text NOT NULL,
	"rank" integer,
	"totalScore" numeric(8, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"victoryPoints" numeric(6, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_result" (
	"id" text PRIMARY KEY NOT NULL,
	"matchId" text NOT NULL,
	"entryId" text NOT NULL,
	"imps" integer NOT NULL,
	"victoryPoints" numeric(4, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_standing" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text NOT NULL,
	"entryId" text NOT NULL,
	"rank" integer,
	"totalScore" numeric(8, 2) NOT NULL,
	"percentage" numeric(5, 2),
	"victoryPoints" numeric(6, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_membership" ADD CONSTRAINT "club_membership_playerId_player_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_membership" ADD CONSTRAINT "club_membership_clubId_club_id_fk" FOREIGN KEY ("clubId") REFERENCES "public"."club"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club" ADD CONSTRAINT "club_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "board" ADD CONSTRAINT "board_sessionId_event_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."event_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_eventId_event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_player" ADD CONSTRAINT "entry_player_entryId_entry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_player" ADD CONSTRAINT "entry_player_playerId_player_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_session" ADD CONSTRAINT "event_session_eventId_event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event" ADD CONSTRAINT "event_clubId_club_id_fk" FOREIGN KEY ("clubId") REFERENCES "public"."club"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_sectionId_section_id_fk" FOREIGN KEY ("sectionId") REFERENCES "public"."section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_entry1Id_entry_id_fk" FOREIGN KEY ("entry1Id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match" ADD CONSTRAINT "match_entry2Id_entry_id_fk" FOREIGN KEY ("entry2Id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "section" ADD CONSTRAINT "section_sessionId_event_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."event_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table" ADD CONSTRAINT "table_sectionId_section_id_fk" FOREIGN KEY ("sectionId") REFERENCES "public"."section"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player" ADD CONSTRAINT "player_homeClubId_club_id_fk" FOREIGN KEY ("homeClubId") REFERENCES "public"."club"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auction_call" ADD CONSTRAINT "auction_call_tableResultId_table_result_id_fk" FOREIGN KEY ("tableResultId") REFERENCES "public"."table_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "play_card" ADD CONSTRAINT "play_card_tableResultId_table_result_id_fk" FOREIGN KEY ("tableResultId") REFERENCES "public"."table_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result_seat" ADD CONSTRAINT "table_result_seat_tableResultId_table_result_id_fk" FOREIGN KEY ("tableResultId") REFERENCES "public"."table_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result_seat" ADD CONSTRAINT "table_result_seat_playerId_player_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."player"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result" ADD CONSTRAINT "table_result_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result" ADD CONSTRAINT "table_result_tableId_table_id_fk" FOREIGN KEY ("tableId") REFERENCES "public"."table"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result" ADD CONSTRAINT "table_result_matchId_match_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result" ADD CONSTRAINT "table_result_nsEntryId_entry_id_fk" FOREIGN KEY ("nsEntryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "table_result" ADD CONSTRAINT "table_result_ewEntryId_entry_id_fk" FOREIGN KEY ("ewEntryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computed_board_score" ADD CONSTRAINT "computed_board_score_tableResultId_table_result_id_fk" FOREIGN KEY ("tableResultId") REFERENCES "public"."table_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "computed_board_score" ADD CONSTRAINT "computed_board_score_entryId_entry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_standing" ADD CONSTRAINT "event_standing_eventId_event_id_fk" FOREIGN KEY ("eventId") REFERENCES "public"."event"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_standing" ADD CONSTRAINT "event_standing_entryId_entry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result" ADD CONSTRAINT "match_result_matchId_match_id_fk" FOREIGN KEY ("matchId") REFERENCES "public"."match"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result" ADD CONSTRAINT "match_result_entryId_entry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_standing" ADD CONSTRAINT "session_standing_sessionId_event_session_id_fk" FOREIGN KEY ("sessionId") REFERENCES "public"."event_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_standing" ADD CONSTRAINT "session_standing_entryId_entry_id_fk" FOREIGN KEY ("entryId") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "club_membership_player_club_idx" ON "club_membership" USING btree ("playerId","clubId");--> statement-breakpoint
CREATE UNIQUE INDEX "club_slug_idx" ON "club" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "board_session_number_idx" ON "board" USING btree ("sessionId","boardNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_event_number_idx" ON "entry" USING btree ("eventId","entryNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "entry_player_entry_player_idx" ON "entry_player" USING btree ("entryId","playerId");--> statement-breakpoint
CREATE INDEX "entry_player_player_idx" ON "entry_player" USING btree ("playerId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_session_event_number_idx" ON "event_session" USING btree ("eventId","sessionNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "match_section_round_entry1_idx" ON "match" USING btree ("sectionId","roundNumber","entry1Id");--> statement-breakpoint
CREATE INDEX "match_entry2_idx" ON "match" USING btree ("entry2Id");--> statement-breakpoint
CREATE UNIQUE INDEX "section_session_label_idx" ON "section" USING btree ("sessionId","label");--> statement-breakpoint
CREATE UNIQUE INDEX "table_section_number_idx" ON "table" USING btree ("sectionId","tableNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "player_user_idx" ON "player" USING btree ("userId");--> statement-breakpoint
CREATE UNIQUE INDEX "player_federation_number_idx" ON "player" USING btree ("federationNumber");--> statement-breakpoint
CREATE UNIQUE INDEX "auction_call_result_sequence_idx" ON "auction_call" USING btree ("tableResultId","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "play_card_result_sequence_idx" ON "play_card" USING btree ("tableResultId","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "table_result_seat_result_direction_idx" ON "table_result_seat" USING btree ("tableResultId","direction");--> statement-breakpoint
CREATE INDEX "table_result_seat_player_idx" ON "table_result_seat" USING btree ("playerId");--> statement-breakpoint
CREATE UNIQUE INDEX "table_result_table_round_board_idx" ON "table_result" USING btree ("tableId","roundNumber","boardId");--> statement-breakpoint
CREATE INDEX "table_result_ns_entry_idx" ON "table_result" USING btree ("nsEntryId");--> statement-breakpoint
CREATE INDEX "table_result_ew_entry_idx" ON "table_result" USING btree ("ewEntryId");--> statement-breakpoint
CREATE INDEX "table_result_match_idx" ON "table_result" USING btree ("matchId");--> statement-breakpoint
CREATE UNIQUE INDEX "computed_board_score_result_entry_idx" ON "computed_board_score" USING btree ("tableResultId","entryId");--> statement-breakpoint
CREATE INDEX "computed_board_score_entry_idx" ON "computed_board_score" USING btree ("entryId");--> statement-breakpoint
CREATE UNIQUE INDEX "event_standing_event_entry_idx" ON "event_standing" USING btree ("eventId","entryId");--> statement-breakpoint
CREATE UNIQUE INDEX "match_result_match_entry_idx" ON "match_result" USING btree ("matchId","entryId");--> statement-breakpoint
CREATE UNIQUE INDEX "session_standing_session_entry_idx" ON "session_standing" USING btree ("sessionId","entryId");