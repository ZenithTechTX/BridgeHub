import type { Contract, Direction } from "./bridge-auction";

export type Suit = "S" | "H" | "D" | "C";
export type Card = { suit: Suit; rank: string };
export type PlayedCard = Card & { direction: Direction; trickNumber: number };

const COMPASS: Direction[] = ["N", "E", "S", "W"];

const SUIT_ORDER: Suit[] = ["S", "H", "D", "C"];

// Expands a PBN-style 4-suit holding (["AKQ", "T92", "", "8765"]) into
// individual cards.
export function expandHand(suits: string[]): Card[] {
  return suits.flatMap((holding, i) => [...holding].map((rank) => ({ rank, suit: SUIT_ORDER[i] })));
}

// Strips already-played cards out of a PBN-style 4-suit holding, so a
// hand display shrinks as its owner plays cards.
export function removePlayedCards(suits: string[], played: { suit: Suit; rank: string }[]): string[] {
  return suits.map((holding, i) => {
    const suit = SUIT_ORDER[i];
    const playedRanks = played.filter((p) => p.suit === suit).map((p) => p.rank);
    return [...holding].filter((r) => !playedRanks.includes(r)).join("");
  });
}

export function partnerOf(direction: Direction): Direction {
  return COMPASS[(COMPASS.indexOf(direction) + 2) % 4];
}

export function openingLeader(declarer: Direction): Direction {
  return COMPASS[(COMPASS.indexOf(declarer) + 1) % 4];
}

// Trump suit for a contract, or null for notrump — matches Contract["strain"].
function trumpSuit(strain: Contract["strain"]): Suit | null {
  return strain === "NT" ? null : strain;
}

export function legalCards(hand: Card[], trickSoFar: Card[]): Card[] {
  if (trickSoFar.length === 0) return hand;
  const leadSuit = trickSoFar[0].suit;
  const followers = hand.filter((c) => c.suit === leadSuit);
  return followers.length > 0 ? followers : hand;
}

const RANK_ORDER = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];

export function trickWinner(
  trick: { direction: Direction; suit: Suit; rank: string }[],
  strain: Contract["strain"]
): Direction {
  const trump = trumpSuit(strain);
  const leadSuit = trick[0].suit;
  const contenders = trump
    ? trick.filter((c) => c.suit === trump).length > 0
      ? trick.filter((c) => c.suit === trump)
      : trick.filter((c) => c.suit === leadSuit)
    : trick.filter((c) => c.suit === leadSuit);

  return contenders.reduce((best, c) =>
    RANK_ORDER.indexOf(c.rank) > RANK_ORDER.indexOf(best.rank) ? c : best
  ).direction;
}

// Whose turn it is to play next, given the contract and every card played so
// far (in play order). Derives the leader of the current trick from the
// previous trick's winner (or the opening leader for trick 1), then advances
// clockwise by however many cards are already in the current trick.
export function nextToPlay(contract: Contract, playedSoFar: PlayedCard[]): Direction {
  const cardsInCurrentTrick = playedSoFar.length % 4;
  let leader: Direction;
  if (playedSoFar.length < 4) {
    leader = openingLeader(contract.declarer);
  } else {
    const lastCompleteTrick = playedSoFar.slice(
      playedSoFar.length - cardsInCurrentTrick - 4,
      playedSoFar.length - cardsInCurrentTrick
    );
    leader = trickWinner(lastCompleteTrick, contract.strain);
  }
  return COMPASS[(COMPASS.indexOf(leader) + cardsInCurrentTrick) % 4];
}

export function isPlayComplete(playedSoFar: PlayedCard[]): boolean {
  return playedSoFar.length === 52;
}

export type CompletedTrick = { trickNumber: number; cards: PlayedCard[]; winner: Direction };

// Every finished trick so far (groups of 4 played cards), each tagged with
// its winner — used to drive the trick-tracker sidebar (last-trick preview
// and running NS/EW trick count).
export function completedTricks(playedSoFar: PlayedCard[], contract: Contract): CompletedTrick[] {
  const tricks: CompletedTrick[] = [];
  for (let i = 0; i + 4 <= playedSoFar.length; i += 4) {
    const cards = playedSoFar.slice(i, i + 4);
    tricks.push({ trickNumber: cards[0].trickNumber, cards, winner: trickWinner(cards, contract.strain) });
  }
  return tricks;
}

// Tricks won by declarer's side (declarer + dummy) once play is complete.
export function tricksWonByDeclarerSide(contract: Contract, playedSoFar: PlayedCard[]): number {
  const declarerSide = new Set([contract.declarer, partnerOf(contract.declarer)]);
  let won = 0;
  for (let i = 0; i < playedSoFar.length; i += 4) {
    const trick = playedSoFar.slice(i, i + 4);
    if (trick.length < 4) break;
    if (declarerSide.has(trickWinner(trick, contract.strain))) won++;
  }
  return won;
}
