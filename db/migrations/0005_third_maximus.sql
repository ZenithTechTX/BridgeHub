CREATE TYPE "public"."skill_level" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');--> statement-breakpoint
ALTER TABLE "player" ADD COLUMN "skillLevel" "skill_level";