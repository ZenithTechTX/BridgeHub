import { CardTile } from "@/components/card-tile";
import { expandHand } from "@/lib/bridge-play";
import { parseHand } from "@/lib/deal";
import { cn } from "@/lib/utils";
import type { Direction, TeamMatchRoom } from "@/db/matches";

function SeatLabel({ direction, name }: { direction: Direction; name: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-amber-50/90 px-3 py-1.5 text-sm font-semibold text-slate-900">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-slate-900 text-sm font-bold text-white">
        {direction}
      </span>
      <span className="max-w-52 truncate" title={name}>
        {name}
      </span>
    </div>
  );
}

function VulBadge({ label, vulnerable }: { label: string; vulnerable: boolean }) {
  return (
    <span
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-bold",
        vulnerable ? "bg-red-600 text-white" : "bg-white text-slate-900"
      )}
    >
      {label}
    </span>
  );
}

// A static, non-interactive board diagram — all four hands as dealt (fixed
// N/E/S/W compass, no per-viewer rotation, since a replay has no seated
// viewer) with a center panel for the auction/result. Visually mirrors
// LiveTable so a finished board "looks like" the live playing page.
export function HandDiagramTable({
  room,
  boardNumber,
  boardsPerRound,
  dealer,
  vulnerability,
  dealPbn,
  children,
}: {
  room: TeamMatchRoom;
  boardNumber: number;
  boardsPerRound: number;
  dealer: Direction;
  vulnerability: string;
  dealPbn: string;
  children: React.ReactNode;
}) {
  const nameFor = (direction: Direction) =>
    room.seats.find((s) => s.direction === direction)?.name ?? "—";

  const hand = (direction: Direction, vertical: boolean) => {
    const suits = parseHand(dealPbn, direction);
    const containerClass = vertical
      ? "flex flex-col gap-px"
      : "flex flex-wrap justify-center gap-px";
    return (
      <div className={containerClass}>
        {expandHand(suits).map((c, i) => (
          <CardTile key={i} rank={c.rank} suit={c.suit} vertical={vertical} />
        ))}
      </div>
    );
  };

  return (
    <div className="overflow-hidden rounded-xl shadow-sm">
      <div className="flex items-center justify-between bg-slate-900 px-4 py-2 text-white">
        <span className="text-sm text-white/70">
          Board {boardNumber} of {boardsPerRound}
        </span>
        <span className="text-base font-semibold">{room.label}</span>
        <div className="flex items-center gap-1.5 text-sm text-white/70">
          <span>Dealer {dealer}</span>
          <VulBadge label="NS" vulnerable={vulnerability === "NS" || vulnerability === "Both"} />
          <VulBadge label="EW" vulnerable={vulnerability === "EW" || vulnerability === "Both"} />
        </div>
      </div>

      <div className="bg-emerald-800 p-4">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <SeatLabel direction="N" name={nameFor("N")} />
            {hand("N", false)}
          </div>

          <div className="flex w-full items-center justify-center gap-3">
            <div className="flex flex-col items-center gap-1">
              <SeatLabel direction="W" name={nameFor("W")} />
              {hand("W", true)}
            </div>

            <div className="min-w-[220px] rounded-lg bg-[#e8e4d8] p-3 shadow-inner">{children}</div>

            <div className="flex flex-col items-center gap-1">
              <SeatLabel direction="E" name={nameFor("E")} />
              {hand("E", true)}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <SeatLabel direction="S" name={nameFor("S")} />
            {hand("S", false)}
          </div>
        </div>
      </div>
    </div>
  );
}
