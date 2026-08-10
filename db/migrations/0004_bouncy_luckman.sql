CREATE TABLE "chat_message" (
	"id" text PRIMARY KEY NOT NULL,
	"eventSessionId" text NOT NULL,
	"playerId" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_eventSessionId_event_session_id_fk" FOREIGN KEY ("eventSessionId") REFERENCES "public"."event_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_message" ADD CONSTRAINT "chat_message_playerId_player_id_fk" FOREIGN KEY ("playerId") REFERENCES "public"."player"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_message_session_idx" ON "chat_message" USING btree ("eventSessionId","createdAt");