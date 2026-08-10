ALTER TABLE "player" ADD COLUMN "username" text;--> statement-breakpoint
CREATE UNIQUE INDEX "player_username_idx" ON "player" USING btree ("username");