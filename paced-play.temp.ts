import { db } from "@/db";
import { boardResults, pairMembers, sessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuctionCalls, submitAuctionCall } from "@/db/matches";
import { getPlayState, submitPlayCard } from "@/db/play";
import { determineContract, legalCalls, nextToCall } from "@/lib/bridge-auction";
import { expandHand, legalCards, nextToPlay, type Suit } from "@/lib/bridge-play";
import { suitsFromHand } from "@/lib/deal";

const SESSION_ID = process.argv[2];
const DELAY_MS = Number(process.argv[3] ?? 900);
if (!SESSION_ID) throw new Error("Usage: tsx paced-play.temp.ts <sessionId> [delayMs]");

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function driveResult(resultId: string, boardId: string, nsPairId: string, ewPairId: string) {
  const nsRows = await db.select({ playerId: pairMembers.playerId }).from(pairMembers).where(eq(pairMembers.pairId, nsPairId));
  const ewRows = await db.select({ playerId: pairMembers.playerId }).from(pairMembers).where(eq(pairMembers.pairId, ewPairId));
  const sortedNs = [...nsRows].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const sortedEw = [...ewRows].sort((a, b) => a.playerId.localeCompare(b.playerId));
  const playerFor: Record<string, string> = {
    N: sortedNs[0]?.playerId,
    S: sortedNs[1]?.playerId,
    E: sortedEw[0]?.playerId,
    W: sortedEw[1]?.playerId,
  };

  const board = await db.query.boards.findFirst({ where: (b, { eq }) => eq(b.boardId, boardId) });
  if (!board) return;

  for (let guard = 0; guard < 200; guard++) {
    const calls = await getAuctionCalls(resultId);
    const contract = determineContract(calls);
    if (contract !== null) break;
    const turn = nextToCall(board.dealer as never, calls);
    const legal = legalCalls(turn, calls);
    const options = ["PASS", ...(legal.canDouble ? ["X"] : []), ...(legal.canRedouble ? ["XX"] : []), ...legal.legalBids];
    const call = pick(options);
    const res = await submitAuctionCall(resultId, playerFor[turn], call);
    if (res.error) throw new Error(`submitAuctionCall failed: ${res.error}`);
    await sleep(DELAY_MS);
  }

  const finalCalls = await getAuctionCalls(resultId);
  const contract = determineContract(finalCalls);
  if (contract === "PASSED_OUT" || !contract) return;

  const handCol = (d: "N" | "E" | "S" | "W") => ({ N: board.handN, E: board.handE, S: board.handS, W: board.handW }[d]!);

  for (let guard = 0; guard < 60; guard++) {
    const played = await getPlayState(resultId);
    if (played.length >= 52) break;
    const turn = nextToPlay(contract, played);
    const dummyDir = contract.declarer === "N" ? "S" : contract.declarer === "S" ? "N" : contract.declarer === "E" ? "W" : "E";
    const actingPlayer = turn === dummyDir ? playerFor[contract.declarer] : playerFor[turn];

    const handSuits = suitsFromHand(handCol(turn));
    const alreadyPlayed = played.filter((c) => c.direction === turn);
    const remaining = expandHand(handSuits).filter((c) => !alreadyPlayed.some((p) => p.suit === c.suit && p.rank === c.rank));
    const cardsInTrick = played.length % 4;
    const currentTrick = played.slice(played.length - cardsInTrick);
    const legal = legalCards(remaining, currentTrick);
    const card = pick(legal);
    const res = await submitPlayCard(resultId, actingPlayer, turn, card.suit as Suit, card.rank);
    if (res.error) throw new Error(`submitPlayCard failed: ${res.error} (turn=${turn})`);
    await sleep(DELAY_MS);
  }
}

async function main() {
  console.log("Driving session", SESSION_ID, "delay", DELAY_MS + "ms/move");
  for (let round = 0; round < 3; round++) {
    const results = await db.select().from(boardResults).where(eq(boardResults.sessionId, SESSION_ID));
    const pending = results.filter((r) => r.scoreNs == null);
    if (pending.length === 0) break;
    console.log(`Round ${round + 1}: ${pending.length} room-instances pending`);
    for (const r of pending) {
      await driveResult(r.resultId, r.boardId, r.nsPairId, r.ewPairId);
      console.log(`  finished board_result ${r.resultId.slice(0, 8)}`);
    }
  }

  const finalSession = await db.query.sessions.findFirst({ where: eq(sessions.sessionId, SESSION_ID) });
  console.log("Final session status:", finalSession?.status);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("FAILED", e);
    process.exit(1);
  });
