ALTER TYPE "public"."movement_type" ADD VALUE 'SINGLE_TABLE';--> statement-breakpoint
ALTER TABLE "club" ADD COLUMN "isPersonal" boolean DEFAULT false NOT NULL;