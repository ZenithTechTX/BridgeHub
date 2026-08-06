"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { clubMemberships, clubs } from "@/db/schema";

const createClubSchema = z.object({
  name: z.string().trim().min(2, "Club name must be at least 2 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens"),
  description: z.string().trim().optional(),
});

export async function createClub(_prevState: { error?: string } | undefined, formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: "You must be signed in." };
  }

  const parsed = createClubSchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    description: formData.get("description"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { name, slug, description } = parsed.data;

  const existing = await db.query.clubs.findFirst({
    where: (club, { eq }) => eq(club.slug, slug),
  });
  if (existing) {
    return { error: "That club URL is already taken." };
  }

  const [club] = await db
    .insert(clubs)
    .values({ name, slug, description, ownerId: userId })
    .returning({ id: clubs.id, slug: clubs.slug });

  await db.insert(clubMemberships).values({
    userId,
    clubId: club.id,
    role: "ORGANIZER",
  });

  redirect(`/clubs/${club.slug}`);
}
