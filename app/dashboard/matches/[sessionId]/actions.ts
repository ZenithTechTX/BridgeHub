"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { postChatMessage } from "@/db/chat";
import { claimSeatForPlayer, submitAuctionCall, type Direction } from "@/db/matches";
import type { Suit } from "@/lib/bridge-play";
import { getOrCreatePlayerForUser } from "@/db/players";
import { submitPlayCard } from "@/db/play";

async function currentPlayer() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  if (!userId || !email) redirect("/signin");
  return getOrCreatePlayerForUser(userId, email, email.split("@")[0]);
}

export async function claimSeat(sessionId: string, movementId: string, direction: Direction, _formData: FormData) {
  const me = await currentPlayer();
  const result = await claimSeatForPlayer(me.playerId, movementId, direction);

  revalidatePath(`/dashboard/matches/${sessionId}`);
  redirect(
    result.error
      ? `/dashboard/matches/${sessionId}?claimError=${encodeURIComponent(result.error)}`
      : `/dashboard/matches/${sessionId}`
  );
}

export async function makeCall(sessionId: string, resultId: string, call: string, _formData: FormData) {
  const me = await currentPlayer();
  const result = await submitAuctionCall(resultId, me.playerId, call);

  revalidatePath(`/dashboard/matches/${sessionId}`);
  redirect(
    result.error
      ? `/dashboard/matches/${sessionId}?callError=${encodeURIComponent(result.error)}`
      : `/dashboard/matches/${sessionId}`
  );
}

export async function playCard(
  sessionId: string,
  resultId: string,
  forDirection: Direction,
  suit: Suit,
  rank: string,
  _formData: FormData
) {
  const me = await currentPlayer();
  const result = await submitPlayCard(resultId, me.playerId, forDirection, suit, rank);

  revalidatePath(`/dashboard/matches/${sessionId}`);
  redirect(
    result.error
      ? `/dashboard/matches/${sessionId}?playError=${encodeURIComponent(result.error)}`
      : `/dashboard/matches/${sessionId}`
  );
}

export async function sendMessage(sessionId: string, formData: FormData) {
  const me = await currentPlayer();
  const body = formData.get("body");
  if (typeof body === "string") {
    await postChatMessage(sessionId, me.playerId, body);
  }

  revalidatePath(`/dashboard/matches/${sessionId}`);
  redirect(`/dashboard/matches/${sessionId}`);
}
