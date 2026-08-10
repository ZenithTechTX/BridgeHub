CREATE TABLE "DuplicateGame" (
	"id" text PRIMARY KEY NOT NULL,
	"tableResultId" text NOT NULL,
	"boardId" text NOT NULL,
	"pbn" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "DuplicateGame" ADD CONSTRAINT "DuplicateGame_tableResultId_table_result_id_fk" FOREIGN KEY ("tableResultId") REFERENCES "public"."table_result"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "DuplicateGame" ADD CONSTRAINT "DuplicateGame_boardId_board_id_fk" FOREIGN KEY ("boardId") REFERENCES "public"."board"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "duplicate_game_table_result_idx" ON "DuplicateGame" USING btree ("tableResultId");