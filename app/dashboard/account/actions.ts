"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { getOrCreatePlayerForUser } from "@/db/players";
import { players } from "@/db/schema";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2, "Display name must be at least 2 characters"),
});

export async function updatePlayerProfile(
  _prevState: { error?: string; success?: boolean } | undefined,
  formData: FormData
) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return { error: "You must be signed in." };
  }

  const parsed = updateProfileSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const player = await getOrCreatePlayerForUser(userId, email, parsed.data.name);
  await db.update(players).set({ name: parsed.data.name }).where(eq(players.playerId, player.playerId));

  const { revalidatePath } = await import("next/cache");
  revalidatePath("/dashboard/account");
  return { success: true };
}
