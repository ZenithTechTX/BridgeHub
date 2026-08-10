ALTER TYPE "public"."movement_type" ADD VALUE 'TWO_TABLE';--> statement-breakpoint
ALTER TYPE "public"."scoring_method" ADD VALUE 'BAM';--> statement-breakpoint
ALTER TABLE "event" ADD COLUMN "description" text;