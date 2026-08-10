import { CardTile } from "@/components/card-tile";
import type { Direction } from "@/db/matches";
import type { CompletedTrick } from "@/lib/bridge-play";

export function TrickTracker({
  tricksWonNS,
  tricksWonEW,
  lastTrick,
  targetTricks,
  declarerSide,
}: {
  tricksWonNS: number;
  tricksWonEW: number;
  lastTrick?: CompletedTrick;
  // Tricks declarer's side needs to make the contract (contract level + 6),
  // and which side is declaring — shown so it's obvious how close declarer
  // is to making (or already has made/failed) the contract.
  targetTricks?: number;
  declarerSide?: "NS" | "EW";
}) {
  const target =
    targetTricks != null && declarerSide ? (
      <div className="mb-2 rounded-md bg-white px-2 py-1 text-center text-base font-semibold">
        {declarerSide}: {declarerSide === "NS" ? tricksWonNS : tricksWonEW}/{targetTricks}
      </div>
    ) : null;

  if (!lastTrick) {
    return (
      <div className="rounded-lg border bg-sky-50 p-3 lg:w-48">
        <div className="mb-1 text-base font-semibold text-muted-foreground">Tricks</div>
        {target}
        <p className="text-sm text-muted-foreground">No tricks played yet.</p>
      </div>
    );
  }

  // The card's long edge points toward the winning side: N/S winners get
  // the tall (portrait) orientation, E/W winners the wide (landscape) one.
  const wide = lastTrick.winner === "E" || lastTrick.winner === "W";

  return (
    <div className="rounded-lg border bg-sky-50 p-3 lg:w-48">
      <div className="mb-2 text-base font-semibold text-muted-foreground">Tricks</div>
      {target}
      <div className="flex items-center gap-4">
        <div className="group relative">
          <div className="cursor-pointer">
            <CardTile faceDown vertical={wide} />
          </div>
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden rounded-lg border bg-slate-900 p-2 shadow-lg group-hover:block">
            <div className="mb-1 text-center text-xs font-medium text-white/70">
              Last trick — {lastTrick.winner} won
            </div>
            <div className="flex gap-1">
              {(["N", "E", "S", "W"] as Direction[]).map((d) => {
                const card = lastTrick.cards.find((c) => c.direction === d);
                return (
                  <div key={d} className="flex flex-col items-center gap-0.5">
                    <span className="text-xs font-bold text-white/70">{d}</span>
                    {card ? <CardTile rank={card.rank} suit={card.suit} /> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="text-sm">
          <div>
            <span className="font-semibold">NS:</span> {tricksWonNS}
          </div>
          <div>
            <span className="font-semibold">EW:</span> {tricksWonEW}
          </div>
        </div>
      </div>
    </div>
  );
}
