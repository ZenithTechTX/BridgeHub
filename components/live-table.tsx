import { CardTile } from "@/components/card-tile";
import { expandHand, type Card, type Suit } from "@/lib/bridge-play";
import { cn } from "@/lib/utils";
import type { Direction, TeamMatchRoom } from "@/db/matches";

type ClaimAction = (tableId: string, direction: Direction, formData: FormData) => Promise<void>;

type RevealedHand = { direction: Direction; suits: string[] };

type Playable = {
  direction: Direction;
  legalCards: { suit: Suit; rank: string }[];
  actionFor: (suit: Suit, rank: string) => (formData: FormData) => Promise<void>;
};

const COMPASS: Direction[] = ["N", "E", "S", "W"];

// Rotates the compass so the viewer's own seat always renders at the
// bottom of the screen — standard bridge-software convention — with
// partner opposite (top) and the defenders on the sides, regardless of
// which actual direction the viewer is sitting. A kibitzer (no seat) has
// no "own" direction to rotate around — defaults to a fixed South-at-bottom
// perspective, same as a spectator standing behind South's chair.
export function rotateForViewer(viewerDirection: Direction | null) {
  const vIdx = COMPASS.indexOf(viewerDirection ?? "S");
  const at = (offset: number) => COMPASS[(vIdx + offset + 4) % 4];
  return { top: at(-2), right: at(-1), bottom: at(0), left: at(1) };
}

function DirectionBadge({ direction }: { direction: Direction }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-slate-900 text-base font-bold text-white">
      {direction}
    </span>
  );
}

// Seats left blank at match creation get an auto-generated placeholder
// name like "Team1 North 1786507118880" (see createTeamMatch) — there's no
// dedicated "was this reserved" column, so a still-claimable seat with a
// name that DOESN'T match that pattern means the director typed a real
// name in for it, and it's worth showing who it's reserved for rather than
// a generic "Sit!".
const AUTO_GENERATED_NAME = /^Team[12] (North|East|South|West) \d+$/;

function SeatBar({
  name,
  handle,
  isViewer,
  isClaimable,
  onClaim,
}: {
  name: string;
  handle: string | null;
  isViewer: boolean;
  isClaimable: boolean;
  onClaim?: (formData: FormData) => Promise<void>;
}) {
  const displayName = handle ?? name;
  const label = isClaimable ? (AUTO_GENERATED_NAME.test(name) ? "Sit!" : `Reserved for: ${displayName}`) : displayName;
  const body = (
    <div
      className={cn(
        "rounded-md px-3 py-2 text-center text-base font-semibold",
        isViewer ? "bg-rose-200 text-rose-950" : "bg-amber-50/90 text-slate-900",
        isClaimable && "cursor-pointer hover:brightness-95"
      )}
    >
      <span className="max-w-52 truncate" title={label}>
        {label}
      </span>
    </div>
  );
  return isClaimable && onClaim ? (
    <form action={onClaim}>
      <button type="submit">{body}</button>
    </form>
  ) : (
    body
  );
}

function VulBadge({ label, vulnerable }: { label: string; vulnerable: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-sm font-bold",
        vulnerable ? "bg-red-600 text-white" : "bg-white text-slate-900"
      )}
    >
      {label}
    </span>
  );
}

export function LiveTable({
  room,
  boardNumber,
  boardsPerRound,
  dealer,
  vulnerability,
  viewerPlayerId,
  viewerDirection,
  myHandSuits,
  dummy,
  revealedHands,
  cardsRemaining,
  playable,
  claimAction,
  readOnly,
  children,
}: {
  room: TeamMatchRoom;
  boardNumber: number;
  boardsPerRound: number;
  dealer: Direction;
  vulnerability: string;
  // Both null for a kibitzer (no seat of their own) — the table still
  // renders fully (face-down hands, revealed dummy, claimable seats), just
  // with nothing of "mine" to highlight or show face-up.
  viewerPlayerId?: string | null;
  viewerDirection?: Direction | null;
  myHandSuits?: string[];
  dummy?: RevealedHand;
  // Kibitzer "see all four hands" mode — when a direction has an entry
  // here, it's shown face-up regardless of viewerDirection/dummy. Takes
  // priority over both.
  revealedHands?: Partial<Record<Direction, string[]>>;
  cardsRemaining?: Partial<Record<Direction, number>>;
  playable?: Playable;
  claimAction: ClaimAction;
  // Static replay/history view (e.g. the PBN board page) — seats always
  // show the player's name, never a claimable "Sit!" button, since there's
  // no live room to join.
  readOnly?: boolean;
  children: React.ReactNode;
}) {
  const seatFor = (direction: Direction) =>
    room.seats.find((s) => s.direction === direction) ?? {
      direction,
      playerId: "",
      name: "—",
      handle: null,
      claimed: false,
    };

  const seatBarFor = (direction: Direction) => {
    const seat = seatFor(direction);
    const isViewer = !!viewerPlayerId && seat.playerId === viewerPlayerId;
    const isClaimable = !readOnly && !isViewer && !seat.claimed;
    return (
      <SeatBar
        name={seat.name}
        handle={seat.handle}
        isViewer={isViewer}
        isClaimable={isClaimable}
        onClaim={isClaimable ? claimAction.bind(null, room.tableId, direction) : undefined}
      />
    );
  };

  const revealedFor = (direction: Direction): RevealedHand | null => {
    if (revealedHands?.[direction]) return { direction, suits: revealedHands[direction]! };
    if (viewerDirection && direction === viewerDirection) return { direction, suits: myHandSuits ?? [] };
    if (dummy && direction === dummy.direction) return dummy;
    return null;
  };

  // Every hand always reserves space for a full 13 cards — otherwise the
  // whole table visibly shrinks/reflows as cards get played out over the
  // course of a board. "Missing" slots (already played, or not dealt to
  // this viewer) render as invisible placeholders of the same size rather
  // than being omitted.
  const HAND_SIZE = 13;

  // Vertical (E/W) hands stay a single column (a real hand fanned to one
  // side, not a grid) but overlap each other so 13 cards don't run over
  // 1000px tall — each card after the first only needs to keep its top
  // ~46px clear (well past the rank/suit, which sits centered around 39px)
  // uncovered by the next one for the whole hand to stay readable.
  const slotClass = (vertical: boolean, i: number, invisible?: boolean) =>
    cn(vertical && i > 0 && "-mt-8", invisible && "invisible");

  const hand = (direction: Direction, vertical: boolean) => {
    const revealed = revealedFor(direction);
    const isPlayable = playable?.direction === direction;
    // flex-nowrap is deliberate: a wrapping N/S row would shrink its own
    // reported width whenever the page is squeezed (sidebar/chat competing
    // for space), which — combined with the felt sizing to its content —
    // caused the whole table to spiral down in size and eventually clip
    // hands entirely. Horizontal scroll on the felt is a better failure
    // mode than that.
    const containerClass = vertical
      ? "flex flex-col items-start"
      : "flex flex-nowrap justify-center gap-px";
    // E/W cards render portrait (like N/S) rather than landscape — only the
    // hand's layout (a side column vs. a horizontal fan) differs by seat,
    // not the card shape itself.
    const cardShape = false;

    if (!revealed) {
      const remaining = cardsRemaining?.[direction] ?? HAND_SIZE;
      return (
        <div className={containerClass}>
          {Array.from({ length: remaining }).map((_, i) => (
            <div key={i} className={slotClass(vertical, i)}>
              <CardTile faceDown vertical={cardShape} />
            </div>
          ))}
          {Array.from({ length: HAND_SIZE - remaining }).map((_, i) => (
            <div key={`ph-${i}`} className={slotClass(vertical, remaining + i, true)}>
              <CardTile faceDown vertical={cardShape} />
            </div>
          ))}
        </div>
      );
    }

    const cards = expandHand(revealed.suits);
    const cardNode = (c: Card) => {
      const legal = isPlayable && playable!.legalCards.some((l) => l.suit === c.suit && l.rank === c.rank);
      const tile = <CardTile rank={c.rank} suit={c.suit} vertical={cardShape} dim={isPlayable && !legal} />;
      return isPlayable && legal ? (
        <form action={playable!.actionFor(c.suit, c.rank)}>
          <button type="submit">{tile}</button>
        </form>
      ) : (
        tile
      );
    };

    // E/W hands are grouped one suit per row (spades, hearts, diamonds,
    // clubs) instead of one long fanned column — matches how a hand is
    // normally sorted and read, and keeps every card fully legible since
    // cards only need to share space with same-suit neighbors.
    if (vertical) {
      const bySuit: Record<Suit, Card[]> = { S: [], H: [], D: [], C: [] };
      for (const c of cards) bySuit[c.suit].push(c);
      const leftover = HAND_SIZE - cards.length;
      return (
        <div className="flex flex-col items-start gap-1">
          {(["S", "H", "D", "C"] as Suit[]).map((suit) =>
            bySuit[suit].length === 0 ? null : (
              <div key={suit} className="flex items-center gap-px">
                {bySuit[suit].map((c, i) => (
                  <div key={i}>{cardNode(c)}</div>
                ))}
              </div>
            )
          )}
          {leftover > 0 && (
            <div className="flex items-center gap-px invisible">
              {Array.from({ length: leftover }).map((_, i) => (
                <CardTile key={i} faceDown vertical={cardShape} />
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={containerClass}>
        {cards.map((c, i) => (
          <div key={i} className={slotClass(vertical, i)}>
            {cardNode(c)}
          </div>
        ))}
        {Array.from({ length: HAND_SIZE - cards.length }).map((_, i) => (
          <div key={`ph-${i}`} className={slotClass(vertical, cards.length + i, true)}>
            <CardTile faceDown vertical={cardShape} />
          </div>
        ))}
      </div>
    );
  };

  const { top, right, bottom, left } = rotateForViewer(viewerDirection ?? null);

  return (
    <div className="overflow-hidden rounded-xl shadow-sm">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
        <span className="text-base text-white/70">
          Board {boardNumber} of {boardsPerRound}
        </span>
        <span className="text-base font-semibold">{room.label}</span>
        <div className="flex items-center gap-1.5 text-sm text-white/70">
          <span>Dealer {dealer}</span>
          <VulBadge label="NS" vulnerable={vulnerability === "NS" || vulnerability === "Both"} />
          <VulBadge label="EW" vulnerable={vulnerability === "EW" || vulnerability === "Both"} />
        </div>
      </div>

      <div className="overflow-x-auto bg-emerald-800 px-10 py-4">
        <div className="mx-auto flex w-fit flex-col items-center gap-3">
          <div className="flex flex-col items-center gap-2">
            <DirectionBadge direction={top} />
            {hand(top, false)}
            {seatBarFor(top)}
          </div>

          <div className="flex w-full items-center justify-between gap-16">
            <div className="flex flex-col items-center gap-2">
              <DirectionBadge direction={left} />
              {hand(left, true)}
              {seatBarFor(left)}
            </div>

            <div className="flex h-[480px] w-[480px] shrink-0 flex-col items-center justify-start overflow-auto rounded-lg bg-[#e8e4d8] p-6 shadow-inner">
              {children}
            </div>

            <div className="flex flex-col items-center gap-2">
              <DirectionBadge direction={right} />
              {hand(right, true)}
              {seatBarFor(right)}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <DirectionBadge direction={bottom} />
            {hand(bottom, false)}
            {seatBarFor(bottom)}
          </div>
        </div>
      </div>
    </div>
  );
}
