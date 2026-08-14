"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/auth";
import { completeOnboarding, getOrCreatePlayerForUser, isHandleTaken } from "@/db/players";
import { SKILL_LEVELS } from "@/lib/skill-levels";

const onboardingSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters"),
  handle: z
    .string()
    .trim()
    .min(3, "Player ID must be at least 3 characters")
    .max(20, "Player ID must be at most 20 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Player ID can only contain letters, numbers, and underscores"),
  skillLevel: z.enum(SKILL_LEVELS, { message: "Pick a skill level" }),
});

export async function completeOnboardingAction(
  _prevState: { error?: string } | undefined,
  formData: FormData
) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) {
    return { error: "You must be signed in." };
  }

  const parsed = onboardingSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    skillLevel: formData.get("skillLevel"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const player = await getOrCreatePlayerForUser(userId, email, parsed.data.name);

  if (await isHandleTaken(parsed.data.handle, player.playerId)) {
    return { error: `Player ID "${parsed.data.handle}" is already taken.` };
  }

  await completeOnboarding(player.playerId, parsed.data);
  redirect("/dashboard");
}
