import { CardTile } from "@/components/card-tile";
import { rotateForViewer } from "@/components/live-table";
import type { Direction } from "@/db/matches";
import type { Suit } from "@/lib/bridge-play";

// Each card rests at its own compass slot (never overlapping another card,
// so rank and suit stay fully readable) and slides in from further out in
// that same direction when it's played.
export function CurrentTrick({
  trick,
  trickNumber,
  viewerDirection,
}: {
  trick: { direction: Direction; suit: Suit; rank: string }[];
  trickNumber: number;
  viewerDirection?: Direction | null;
}) {
  const { top, right, bottom, left } = rotateForViewer(viewerDirection ?? null);
  const cardFor = (d: Direction) => trick.find((c) => c.direction === d);

  const spot = (d: Direction, position: string, from: { x: number; y: number }) => {
    const card = cardFor(d);
    if (!card) return null;
    return (
      <div
        // Keyed by the card itself (not just the seat) so React mounts a
        // fresh element whenever a new card lands here — a stable key
        // would just patch props in place and the slide-in animation
        // would never re-trigger.
        key={`${d}-${card.suit}${card.rank}`}
        className={`absolute ${position} animate-card-slide`}
        style={{ ["--from-x" as string]: `${from.x}px`, ["--from-y" as string]: `${from.y}px` }}
      >
        <CardTile rank={card.rank} suit={card.suit} />
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-base font-semibold text-muted-foreground">Trick {trickNumber}</div>
      <div className="relative h-[280px] w-[280px]">
        {spot(top, "top-0 left-1/2 -translate-x-1/2", { x: 0, y: -60 })}
        {spot(bottom, "bottom-0 left-1/2 -translate-x-1/2", { x: 0, y: 60 })}
        {spot(left, "left-0 top-1/2 -translate-y-1/2", { x: -60, y: 0 })}
        {spot(right, "right-0 top-1/2 -translate-y-1/2", { x: 60, y: 0 })}
      </div>
    </div>
  );
}
