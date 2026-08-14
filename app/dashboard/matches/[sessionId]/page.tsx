import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AuctionGrid } from "@/components/auction-grid";
import { AutoRefresh } from "@/components/auto-refresh";
import { ChatHistory } from "@/components/chat-box";
import { ChatInputBar } from "@/components/chat-input-bar";
import { CurrentTrick } from "@/components/current-trick";
import { LiveTable } from "@/components/live-table";
import { MatchPageHeader } from "@/components/match-page-header";
import { MatchSidebar } from "@/components/match-sidebar";
import { TrickTracker } from "@/components/trick-tracker";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { matches, teams } from "@/db/schema";
import { getChatMessages } from "@/db/chat";
import { getActiveKibitzers, trackViewer } from "@/db/presence";
import {
  getAuctionCalls,
  getCurrentBoard,
  getRoomTableResult,
  getTeamMatchRooms,
  type Direction,
  type TeamMatchRoom,
} from "@/db/matches";
import { getPlayState, getTeamImpsTotal } from "@/db/play";
import { getOrCreatePlayerForUser } from "@/db/players";
import { determineContract, legalCalls, nextToCall, type Contract } from "@/lib/bridge-auction";
import {
  completedTricks,
  expandHand,
  legalCards,
  nextToPlay,
  partnerOf,
  removePlayedCards,
  type Suit,
} from "@/lib/bridge-play";
import { suitsFromHand } from "@/lib/deal";
import { claimSeat, makeCall, playCard, sendMessage } from "./actions";

const LEVELS = [1, 2, 3, 4, 5, 6, 7];
const STRAINS = ["C", "D", "H", "S", "NT"] as const;
const STRAIN_SYMBOL: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };
const RED_STRAIN = new Set(["D", "H"]);

type Board = { boardId: string; boardNumber: number; dealer: string; vulnerability: string; handN: string | null; handE: string | null; handS: string | null; handW: string | null };

function contractLabel(contract: ReturnType<typeof determineContract>): string | null {
  if (!contract) return null;
  if (contract === "PASSED_OUT") return "Passed out";
  const doubled =
    contract.doubled === "REDOUBLED" ? " XX" : contract.doubled === "DOUBLED" ? " X" : "";
  return `${contract.level}${STRAIN_SYMBOL[contract.strain]}${doubled} by ${contract.declarer}`;
}

function scoreLabel(scoreNs: number | null): string {
  if (scoreNs == null) return "";
  return scoreNs >= 0 ? `NS +${scoreNs}` : `EW +${-scoreNs}`;
}

function handColumn(board: Board, direction: Direction) {
  return { N: board.handN, E: board.handE, S: board.handS, W: board.handW }[direction] ?? "...........  ";
}

// All four hands exactly as dealt (nothing removed for cards already
// played) — used once a board is scored, when there's nothing left to
// hide and reviewing the whole deal is the point.
function allOriginalHands(board: Board): Partial<Record<Direction, string[]>> {
  return {
    N: suitsFromHand(handColumn(board, "N")),
    E: suitsFromHand(handColumn(board, "E")),
    S: suitsFromHand(handColumn(board, "S")),
    W: suitsFromHand(handColumn(board, "W")),
  };
}

// Once both rooms have finished the same board, shows each room's
// contract/score side by side with the resulting IMP swing — the two
// rooms are being compared, so it's shown as a comparison, not two
// separate results.
function RoomComparisonBanner({ roomA, roomB }: { roomA: RoomView; roomB: RoomView }) {
  if (!roomA.tableResult || !roomB.tableResult) return null;
  const swing = Math.abs(roomA.tableResult.impsNs ?? 0);
  return (
    <div className="rounded-lg border bg-indigo-50 p-3">
      <div className="mb-1.5 text-[10px] font-semibold text-muted-foreground uppercase">Room comparison</div>
      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <span>
          <span className="font-semibold">{roomA.room.label}:</span> {contractLabel(roomA.contract)} · {scoreLabel(roomA.tableResult.scoreNs)}
        </span>
        <span>
          <span className="font-semibold">{roomB.room.label}:</span> {contractLabel(roomB.contract)} · {scoreLabel(roomB.tableResult.scoreNs)}
        </span>
      </div>
      {swing > 0 && <div className="mt-1.5 text-lg font-bold text-indigo-700">{swing} IMP swing</div>}
    </div>
  );
}

// Everything needed to render one room's board that doesn't depend on who
// (if anyone) is viewing it — shared by both the seated player's view and
// the kibitzer's view of either/both rooms.
async function computeRoomView(room: TeamMatchRoom, currentBoard: Board) {
  const tableResult = await getRoomTableResult(room.tableId, currentBoard.boardId);
  const calls = tableResult ? await getAuctionCalls(tableResult.resultId) : [];
  const contract = determineContract(calls);
  const auctionOver = contract !== null;
  const inPlay = auctionOver && contract !== "PASSED_OUT";
  const playedCards = inPlay && tableResult ? await getPlayState(tableResult.resultId) : [];
  const dummyDirection = inPlay ? partnerOf((contract as Contract).declarer) : null;
  const dummyRevealed = playedCards.length > 0;
  const playComplete = tableResult?.scoreNs != null;

  const cardsRemaining: Partial<Record<Direction, number>> = {};
  if (inPlay) {
    for (const d of ["N", "E", "S", "W"] as const) {
      cardsRemaining[d] = 13 - playedCards.filter((c) => c.direction === d).length;
    }
  }

  const dummyHand =
    inPlay && dummyRevealed && dummyDirection
      ? {
          direction: dummyDirection,
          suits: removePlayedCards(
            suitsFromHand(handColumn(currentBoard, dummyDirection)),
            playedCards.filter((c) => c.direction === dummyDirection)
          ),
        }
      : undefined;

  // Once a trick's 4th card lands, playedCards.length is an exact multiple
  // of 4 — plain modulo would read that as "0 cards in the new trick" and
  // blank the display right as the last card is played, before anyone
  // could see it. Keep showing the just-completed trick until the next
  // trick's first card actually arrives.
  const cardsInCurrentTrick = playedCards.length % 4 || (playedCards.length > 0 ? 4 : 0);
  const currentTrick = playedCards.slice(playedCards.length - cardsInCurrentTrick);
  const currentTrickNumber = Math.ceil(playedCards.length / 4) || 1;
  const turn = inPlay && !playComplete ? nextToPlay(contract as Contract, playedCards) : null;

  const tricks = inPlay ? completedTricks(playedCards, contract as Contract) : [];
  const tricksWonNS = tricks.filter((t) => t.winner === "N" || t.winner === "S").length;
  const tricksWonEW = tricks.length - tricksWonNS;
  const lastTrick = tricks[tricks.length - 1];

  return {
    room,
    tableResult,
    calls,
    contract,
    auctionOver,
    inPlay,
    playedCards,
    playComplete,
    dummyHand,
    cardsRemaining,
    currentTrick,
    currentTrickNumber,
    turn,
    tricks,
    tricksWonNS,
    tricksWonEW,
    lastTrick,
  };
}

type RoomView = Awaited<ReturnType<typeof computeRoomView>>;

// The read-only center-panel content for a room: auction in progress,
// current trick, or the final contract/score — no acting-direction/legal
// info, since neither a kibitzer nor "the room in general" can act.
function RoomStatus({
  view,
  dealer,
  vulnerability,
  whoseTurnLabel,
}: {
  view: RoomView;
  dealer: Direction;
  vulnerability: string;
  whoseTurnLabel: (d: Direction) => string;
}) {
  const { contract, auctionOver, playComplete, tableResult } = view;
  if (!auctionOver) {
    return <AuctionGrid dealer={dealer} calls={view.calls} vulnerability={vulnerability} />;
  }
  if (contract === "PASSED_OUT") {
    return <p className="mt-2 text-center text-sm font-semibold">Passed out</p>;
  }
  if (!playComplete) {
    return (
      <div className="flex flex-col items-center gap-2">
        <p className="text-center text-xs font-semibold">{contractLabel(contract)}</p>
        <CurrentTrick trick={view.currentTrick} trickNumber={view.currentTrickNumber} />
        <p className="text-center text-xs text-muted-foreground">{view.turn ? whoseTurnLabel(view.turn) : ""}</p>
      </div>
    );
  }
  return (
    <div className="text-center">
      <p className="text-lg font-bold">{contractLabel(contract)}</p>
      <p className="text-sm text-muted-foreground">
        {tableResult!.tricksTaken} tricks · {scoreLabel(tableResult!.scoreNs)}
      </p>
    </div>
  );
}

export default async function MatchResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<{ claimError?: string; callError?: string; playError?: string; room?: string; reveal?: string }>;
}) {
  const { sessionId } = await params;
  const { claimError, callError, playError, room: roomParam, reveal } = await searchParams;

  const [session, summary, messages] = await Promise.all([auth(), getTeamMatchRooms(sessionId), getChatMessages(sessionId)]);
  if (!summary) notFound();
  const { session: matchSession, rooms } = summary;

  if (!session?.user?.id || !session.user.email) redirect("/signin");
  const userId = session.user.id;
  const email = session.user.email;
  const me = await getOrCreatePlayerForUser(userId, email, email.split("@")[0]);
  await trackViewer(sessionId, me.playerId);

  const currentBoard = await getCurrentBoard(sessionId);

  const mySeat = rooms
    .flatMap((room) => room.seats.map((seat) => ({ ...seat, roomLabel: room.label, tableId: room.tableId })))
    .find((seat) => seat.playerId === me.playerId);
  const seatedPlayerIds = rooms.flatMap((room) => room.seats.map((s) => s.playerId));
  const kibitzers = await getActiveKibitzers(sessionId, seatedPlayerIds);

  const roomViews = currentBoard ? await Promise.all(rooms.map((room) => computeRoomView(room, currentBoard))) : [];
  const myView = mySeat ? (roomViews.find((v) => v.room.tableId === mySeat.tableId) ?? null) : null;

  const boundClaimSeat = claimSeat.bind(null, sessionId);
  const boundSendMessage = sendMessage.bind(null, sessionId);

  // --- Seated-player-only derivations (whose turn, legal calls/cards) ---
  const whoseTurn = myView && currentBoard && !myView.auctionOver ? nextToCall(currentBoard.dealer as Direction, myView.calls) : null;
  const myTurn = !!mySeat && whoseTurn === mySeat.direction;
  const legal = mySeat && myTurn ? legalCalls(mySeat.direction, myView!.calls) : null;

  const actingDirection: Direction | null =
    myView && myView.turn && mySeat
      ? myView.turn === mySeat.direction && myView.turn !== myView.dummyHand?.direction
        ? myView.turn
        : myView.turn === myView.dummyHand?.direction && mySeat.direction === (myView.contract as Contract).declarer
          ? myView.turn
          : null
      : null;

  let legalPlayCards: { suit: Suit; rank: string }[] = [];
  if (actingDirection && currentBoard) {
    const handSuits = suitsFromHand(handColumn(currentBoard, actingDirection));
    const alreadyPlayed = myView!.playedCards.filter((c) => c.direction === actingDirection);
    const remainingCards = expandHand(handSuits).filter(
      (c) => !alreadyPlayed.some((p) => p.suit === c.suit && p.rank === c.rank)
    );
    const cardsInCurrentTrick = myView!.playedCards.length % 4;
    const currentTrickCards = myView!.playedCards.slice(myView!.playedCards.length - cardsInCurrentTrick);
    legalPlayCards = legalCards(remainingCards, currentTrickCards);
  }

  const comparisonImps =
    myView?.playComplete && myView.tableResult && mySeat
      ? mySeat.direction === "N" || mySeat.direction === "S"
        ? myView.tableResult.impsNs
        : myView.tableResult.impsEw
      : null;
  const boundMakeCall = myView?.tableResult ? makeCall.bind(null, sessionId, myView.tableResult.resultId) : null;
  const boundPlayCard = myView?.tableResult ? playCard.bind(null, sessionId, myView.tableResult.resultId) : null;
  const isLastBoard = matchSession.status === "completed";
  const bothRoomsDone = roomViews.length === 2 && roomViews.every((v) => v.playComplete);

  // The sidebar score box always shows both teams' running totals (not
  // just "my" net IMPs) regardless of seated/kibitzer status — matches how
  // a real duplicate-bridge client displays it.
  let standing: { team1Name: string; team1Imps: number; team2Name: string; team2Imps: number } | undefined;
  {
    const match = await db.query.matches.findFirst({ where: eq(matches.sessionId, sessionId) });
    if (match) {
      const [team1, team2, team1Imps, team2Imps] = await Promise.all([
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team1Id) }),
        db.query.teams.findFirst({ where: eq(teams.teamId, match.team2Id) }),
        getTeamImpsTotal(sessionId, match.team1Id),
        getTeamImpsTotal(sessionId, match.team2Id),
      ]);
      standing = { team1Name: team1?.teamName ?? "Team 1", team1Imps, team2Name: team2?.teamName ?? "Team 2", team2Imps };
    }
  }

  // --- Kibitzer-only derivations: pick one room to watch (never both at
  // once — same as standing behind one specific table), all four hands
  // visible by default (a kibitzer isn't bound by "don't see partner's
  // cards" the way a seated player is). ---
  const kibitzerRoomIndex = roomParam === "2" ? 1 : 0;
  const kibitzerView = roomViews[kibitzerRoomIndex] ?? roomViews[0] ?? null;
  const revealAllHands = reveal !== "dummy";
  // Once the board is scored there's nothing left to hide — show the full
  // original deal regardless of the toggle. While still in progress, the
  // toggle controls whether "remaining" cards (already-played cards
  // stripped out) are shown for all four hands or just the dummy.
  const kibitzerRevealedHands: Partial<Record<Direction, string[]>> | undefined =
    currentBoard && kibitzerView && (kibitzerView.playComplete || revealAllHands)
      ? kibitzerView.playComplete
        ? allOriginalHands(currentBoard)
        : (["N", "E", "S", "W"] as const).reduce(
            (acc, d) => {
              const suits = suitsFromHand(handColumn(currentBoard, d));
              acc[d] = kibitzerView.inPlay ? removePlayedCards(suits, kibitzerView.playedCards.filter((c) => c.direction === d)) : suits;
              return acc;
            },
            {} as Partial<Record<Direction, string[]>>
          )
      : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <AutoRefresh intervalMs={700} />
      <MatchPageHeader gameName={matchSession.name} recordHref={`/dashboard/matches/${sessionId}/record`} />

      <div className="mx-auto w-full max-w-[1900px] flex-1 px-4 py-6">
        {claimError && <p className="mb-3 text-sm text-destructive">{decodeURIComponent(claimError)}</p>}
        {callError && <p className="mb-3 text-sm text-destructive">{decodeURIComponent(callError)}</p>}
        {playError && <p className="mb-3 text-sm text-destructive">{decodeURIComponent(playError)}</p>}

        {mySeat && myView && currentBoard ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <MatchSidebar boardNumber={currentBoard.boardNumber} boardsPerRound={matchSession.numBoards ?? 0} dealer={currentBoard.dealer as Direction} rooms={rooms} standing={standing} kibitzers={kibitzers} />
            <div className="flex flex-1 flex-col gap-3 lg:flex-row">
              <div className="flex flex-1 flex-col gap-4">
                <div className="relative">
                <LiveTable
                  room={myView.room}
                  boardNumber={currentBoard.boardNumber}
                  boardsPerRound={matchSession.numBoards ?? 0}
                  dealer={currentBoard.dealer as Direction}
                  vulnerability={currentBoard.vulnerability}
                  viewerPlayerId={me.playerId}
                  viewerDirection={mySeat.direction}
                  myHandSuits={
                    myView.inPlay
                      ? removePlayedCards(
                          suitsFromHand(handColumn(currentBoard, mySeat.direction)),
                          myView.playedCards.filter((c) => c.direction === mySeat.direction)
                        )
                      : suitsFromHand(handColumn(currentBoard, mySeat.direction))
                  }
                  dummy={myView.dummyHand}
                  revealedHands={myView.playComplete && currentBoard ? allOriginalHands(currentBoard) : undefined}
                  cardsRemaining={myView.cardsRemaining}
                  playable={
                    actingDirection && legalPlayCards.length > 0 && boundPlayCard
                      ? {
                          direction: actingDirection,
                          legalCards: legalPlayCards,
                          actionFor: (suit, rank) => boundPlayCard.bind(null, actingDirection, suit, rank),
                        }
                      : undefined
                  }
                  claimAction={boundClaimSeat}
                >
                  {!myView.auctionOver ? (
                    <>
                      <AuctionGrid dealer={currentBoard.dealer as Direction} calls={myView.calls} vulnerability={currentBoard.vulnerability} />

                      {myTurn && legal ? (
                        <div className="mt-3 flex flex-col gap-2">
                          <div className="flex flex-wrap justify-center gap-2">
                            <form action={boundMakeCall!.bind(null, "PASS")}>
                              <button type="submit" className="rounded-md border bg-white px-4 py-1.5 text-sm font-medium hover:bg-muted">
                                Pass
                              </button>
                            </form>
                            <form action={boundMakeCall!.bind(null, "X")}>
                              <button
                                type="submit"
                                disabled={!legal.canDouble}
                                className="rounded-md border bg-white px-4 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-30"
                              >
                                Dbl
                              </button>
                            </form>
                            <form action={boundMakeCall!.bind(null, "XX")}>
                              <button
                                type="submit"
                                disabled={!legal.canRedouble}
                                className="rounded-md border bg-white px-4 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-30"
                              >
                                Rdbl
                              </button>
                            </form>
                          </div>
                          <table className="mx-auto border-collapse text-sm">
                            <tbody>
                              {LEVELS.map((level) => (
                                <tr key={level}>
                                  {STRAINS.map((strain) => {
                                    const bid = `${level}${strain}`;
                                    return (
                                      <td key={strain} className="p-0.5">
                                        <form action={boundMakeCall!.bind(null, bid)}>
                                          <button
                                            type="submit"
                                            disabled={!legal.legalBids.includes(bid)}
                                            className="h-9 w-14 rounded-md border bg-white px-1 py-1 font-medium hover:bg-muted disabled:opacity-30"
                                          >
                                            <span className="text-black">{level}</span>
                                            <span className={RED_STRAIN.has(strain) ? "text-red-600" : "text-black"}>
                                              {STRAIN_SYMBOL[strain]}
                                            </span>
                                          </button>
                                        </form>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="mt-2 text-center text-xs text-muted-foreground">Waiting for {whoseTurn} to call.</p>
                      )}
                    </>
                  ) : myView.contract === "PASSED_OUT" ? (
                    <p className="mt-2 text-center text-sm font-semibold">Passed out</p>
                  ) : !myView.playComplete ? (
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-center text-xs font-semibold">{contractLabel(myView.contract)}</p>
                      <CurrentTrick trick={myView.currentTrick} trickNumber={myView.currentTrickNumber} viewerDirection={mySeat.direction} />
                      <p className="text-center text-xs text-muted-foreground">
                        {actingDirection ? "Your turn to play." : `Waiting for ${myView.turn} to play.`}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-lg font-bold">{contractLabel(myView.contract)}</p>
                      <p className="text-sm text-muted-foreground">
                        {myView.tableResult!.tricksTaken} tricks · {scoreLabel(myView.tableResult!.scoreNs)}
                      </p>
                      {comparisonImps != null && (
                        <p className="mt-1 text-xl font-bold text-indigo-700">
                          {comparisonImps >= 0 ? "+" : ""}
                          {comparisonImps} IMPs
                        </p>
                      )}
                    </div>
                  )}
                </LiveTable>

                {myView.inPlay && (
                  <div className="absolute right-2 bottom-2 z-10">
                    <TrickTracker
                      tricksWonNS={myView.tricksWonNS}
                      tricksWonEW={myView.tricksWonEW}
                      lastTrick={myView.lastTrick}
                      targetTricks={(myView.contract as Contract).level + 6}
                      declarerSide={(myView.contract as Contract).declarer === "N" || (myView.contract as Contract).declarer === "S" ? "NS" : "EW"}
                    />
                  </div>
                )}
                </div>

                {bothRoomsDone && roomViews[0] && roomViews[1] && <RoomComparisonBanner roomA={roomViews[0]} roomB={roomViews[1]} />}
                {bothRoomsDone && !isLastBoard && (
                  <p className="text-sm text-muted-foreground">Both rooms are done — moving to the next board.</p>
                )}
                {bothRoomsDone && isLastBoard && <p className="text-sm text-muted-foreground">This is the final board.</p>}
                {myView.playComplete && !bothRoomsDone && (
                  <p className="text-sm text-muted-foreground">Waiting for the other room to finish this board.</p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <ChatHistory messages={messages} />
              </div>
            </div>
          </div>
        ) : currentBoard && kibitzerView ? (
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
            <MatchSidebar boardNumber={currentBoard.boardNumber} boardsPerRound={matchSession.numBoards ?? 0} dealer={currentBoard.dealer as Direction} rooms={rooms} standing={standing} kibitzers={kibitzers} />
            <div className="flex flex-1 flex-col gap-3 lg:flex-row">
              <div className="flex flex-1 flex-col gap-2">
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex gap-1">
                    {rooms.map((room, i) => (
                      <a
                        key={room.tableId}
                        href={`?room=${i + 1}${reveal ? `&reveal=${reveal}` : ""}`}
                        className={`rounded-md border px-2 py-1 ${i === kibitzerRoomIndex ? "bg-indigo-700 text-white" : "bg-white hover:bg-muted"}`}
                      >
                        {room.label}
                      </a>
                    ))}
                  </div>
                  <a href={`?room=${kibitzerRoomIndex + 1}${revealAllHands ? "&reveal=dummy" : ""}`} className="text-indigo-700 hover:underline">
                    {revealAllHands ? "Hide other hands" : "Show all four hands"}
                  </a>
                </div>

                <div className="relative">
                <LiveTable
                  room={kibitzerView.room}
                  boardNumber={currentBoard.boardNumber}
                  boardsPerRound={matchSession.numBoards ?? 0}
                  dealer={currentBoard.dealer as Direction}
                  vulnerability={currentBoard.vulnerability}
                  dummy={kibitzerView.dummyHand}
                  revealedHands={kibitzerRevealedHands}
                  cardsRemaining={kibitzerView.cardsRemaining}
                  claimAction={boundClaimSeat}
                >
                  <RoomStatus
                    view={kibitzerView}
                    dealer={currentBoard.dealer as Direction}
                    vulnerability={currentBoard.vulnerability}
                    whoseTurnLabel={(d) => `Waiting for ${d} to play.`}
                  />
                </LiveTable>

                {kibitzerView.inPlay && (
                  <div className="absolute right-2 bottom-2 z-10">
                    <TrickTracker
                      tricksWonNS={kibitzerView.tricksWonNS}
                      tricksWonEW={kibitzerView.tricksWonEW}
                      lastTrick={kibitzerView.lastTrick}
                      targetTricks={(kibitzerView.contract as Contract).level + 6}
                      declarerSide={(kibitzerView.contract as Contract).declarer === "N" || (kibitzerView.contract as Contract).declarer === "S" ? "NS" : "EW"}
                    />
                  </div>
                )}
                </div>

                {bothRoomsDone && roomViews[0] && roomViews[1] && <RoomComparisonBanner roomA={roomViews[0]} roomB={roomViews[1]} />}
              </div>

              <div className="flex flex-col gap-3">
                <ChatHistory messages={messages} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No boards in this match.</p>
        )}

        <div className="mt-4">
          <ChatInputBar action={boundSendMessage} />
        </div>
      </div>
    </div>
  );
}
