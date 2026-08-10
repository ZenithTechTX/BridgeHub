import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, players } from "@/db/schema";

export async function getChatMessages(sessionId: string) {
  return db
    .select({ id: chatMessages.messageId, playerName: players.name, body: chatMessages.body })
    .from(chatMessages)
    .innerJoin(players, eq(chatMessages.playerId, players.playerId))
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt));
}

export async function postChatMessage(sessionId: string, playerId: string, body: string) {
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) return;
  await db.insert(chatMessages).values({ sessionId, playerId, body: trimmed });
}
