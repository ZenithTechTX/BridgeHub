"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { claimSeatForPlayer, type Direction } from "@/db/matches";
import { getOrCreatePlayerForUser } from "@/db/players";

export async function claimSeat(movementId: string, direction: Direction, _formData: FormData) {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) redirect("/signin");
  const me = await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);

  const result = await claimSeatForPlayer(me.playerId, movementId, direction);

  revalidatePath("/dashboard/tables");
  redirect(result.error ? `/dashboard/tables?claimError=${encodeURIComponent(result.error)}` : "/dashboard/tables");
}
