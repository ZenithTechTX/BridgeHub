const SUITS = ["S", "H", "D", "C"] as const;
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
const SEATS = ["N", "E", "S", "W"] as const;

export function dealerForBoard(boardNumber: number): "N" | "E" | "S" | "W" {
  return SEATS[(boardNumber - 1) % 4];
}

// Matches the DB's `boards_vulnerability_check` constraint casing exactly
// ("None"/"Both", not "NONE"/"BOTH") — kept as the app-wide convention
// (rather than translating at the DB boundary) since this value flows
// straight from board generation into live rendering with no other
// transformation in between.
export function vulnerabilityForBoard(boardNumber: number): "None" | "NS" | "EW" | "Both" {
  const cycle = ["None", "NS", "EW", "Both"] as const;
  const index = (boardNumber - 1 + Math.floor((boardNumber - 1) / 4)) % 4;
  return cycle[index];
}

// Returns a PBN `[Deal "N:..."]` tag value: four hands (N, E, S, W) in
// clockwise order, each as spades.hearts.diamonds.clubs with ranks sorted
// high to low.
export function generateRandomDeal(): string {
  const deck: string[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(suit + rank);
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  const hands = [0, 1, 2, 3].map((seat) => deck.slice(seat * 13, seat * 13 + 13));

  const handStrings = hands.map((cards) =>
    SUITS.map((suit) =>
      cards
        .filter((card) => card[0] === suit)
        .map((card) => card.slice(1))
        .sort((a, b) => RANKS.indexOf(a as (typeof RANKS)[number]) - RANKS.indexOf(b as (typeof RANKS)[number]))
        .join("")
    ).join(".")
  );

  return `N:${handStrings.join(" ")}`;
}

// Parses one seat's holding (4 suit strings, spades-hearts-diamonds-clubs)
// out of a PBN `[Deal "N:..."]` value.
export function parseHand(dealPbn: string, direction: "N" | "E" | "S" | "W"): string[] {
  const [, handsPart] = dealPbn.split(":");
  const hands = handsPart.split(" ");
  return hands[SEATS.indexOf(direction)].split(".");
}

// Splits one seat's `boards.hand_*` column value (e.g. "AKQ.J1032.94.QJ85")
// into the same 4-suit-string array shape parseHand returns.
export function suitsFromHand(hand: string): string[] {
  return hand.split(".");
}

// Reconstructs a single PBN `"N:..."` deal string from the 4 per-seat hand
// columns — only needed where a component still expects one combined
// string (HandDiagramTable), so that component didn't need to change.
export function combineHandsToPbn(hands: { handN: string; handE: string; handS: string; handW: string }): string {
  return `N:${hands.handN} ${hands.handE} ${hands.handS} ${hands.handW}`;
}
