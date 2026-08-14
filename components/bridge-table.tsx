import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Direction, TeamMatchRoom } from "@/db/matches";

const SEAT_POSITION: Record<Direction, string> = {
  N: "top-1 left-1/2 -translate-x-1/2",
  E: "right-1 top-1/2 -translate-y-1/2",
  S: "bottom-1 left-1/2 -translate-x-1/2",
  W: "left-1 top-1/2 -translate-y-1/2",
};

// Same heuristic as live-table.tsx's SeatBar: a claimable seat whose name
// doesn't match the auto-generated placeholder pattern was explicitly
// typed in by the director, so it's reserved for that name specifically.
const AUTO_GENERATED_NAME = /^Team[12] (North|East|South|West) \d+$/;

type ClaimAction = (tableId: string, direction: Direction, formData: FormData) => Promise<void>;

function Seat({
  direction,
  name,
  handle,
  team,
  isViewer,
  isClaimable,
  onClaim,
  kibitzHref,
}: {
  direction: Direction;
  name: string;
  handle: string | null;
  team: string;
  isViewer: boolean;
  isClaimable: boolean;
  onClaim?: (formData: FormData) => Promise<void>;
  // Where clicking this seat should take a viewer who can't claim it —
  // only set for genuinely occupied seats (a real player, not an empty
  // placeholder), so there's something to go watch.
  kibitzHref?: string;
}) {
  const displayName = handle ?? name;
  const isOccupied = name !== "—" && !isClaimable;
  const body = (
    <div
      className={cn(
        "flex w-24 flex-col items-center rounded-lg px-2 py-1.5 text-center shadow-sm",
        isViewer ? "bg-emerald-300 ring-2 ring-emerald-600" : "bg-[#d9b48f]",
        (isClaimable || (isOccupied && kibitzHref)) && "cursor-pointer transition hover:brightness-95"
      )}
    >
      <span className="text-[10px] font-bold tracking-wide text-amber-950/70">{direction}</span>
      <span className="max-w-full truncate text-xs font-semibold text-amber-950">
        {isClaimable ? (AUTO_GENERATED_NAME.test(name) ? "Open seat" : `Reserved: ${displayName}`) : displayName}
      </span>
      <span className="max-w-full truncate text-[10px] text-amber-950/60">
        {isViewer ? "You" : isClaimable ? "Take seat" : isOccupied && kibitzHref ? "Kibitz" : team}
      </span>
    </div>
  );

  return (
    <div className={cn("absolute", SEAT_POSITION[direction])}>
      {isClaimable && onClaim ? (
        <form action={onClaim}>
          <button type="submit" className="block">
            {body}
          </button>
        </form>
      ) : isOccupied && kibitzHref ? (
        <Link href={kibitzHref} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}

export function BridgeTable({
  room,
  interactive = false,
  viewerPlayerId,
  claimAction,
  // Where clicking the table itself (the center circle, or any occupied
  // seat) should take a viewer — lets them watch this specific room rather
  // than clicking doing nothing, the way an occupied seat used to.
  kibitzHref,
}: {
  room: TeamMatchRoom;
  interactive?: boolean;
  viewerPlayerId?: string;
  claimAction?: ClaimAction;
  kibitzHref?: string;
}) {
  const { tableId, label, nsTeam, ewTeam, seats } = room;
  const seatFor = (direction: Direction) =>
    seats.find((s) => s.direction === direction) ?? {
      direction,
      playerId: "",
      name: "—",
      handle: null,
      claimed: false,
    };

  return (
    <div className="flex-1 rounded-2xl bg-sky-100 p-5">
      <div className="mb-3 text-center text-sm font-semibold text-sky-950">
        {kibitzHref ? (
          <Link href={kibitzHref} className="hover:underline">
            {label} · <span className="text-indigo-700">Kibitz</span>
          </Link>
        ) : (
          label
        )}
      </div>
      <div className="relative mx-auto h-52 w-52">
        {/* Purely decorative — West/East seats visually sit on top of this,
            which is fine for a plain color but would make any text here
            illegible, so the kibitz link lives in the header above instead. */}
        <div className="absolute top-1/2 left-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#8a5a34] shadow-inner" />
        {(["N", "E", "S", "W"] as const).map((direction) => {
          const seat = seatFor(direction);
          const isViewer = interactive && seat.playerId === viewerPlayerId;
          const isClaimable = interactive && !isViewer && !seat.claimed;
          return (
            <Seat
              key={direction}
              direction={direction}
              name={seat.name}
              handle={seat.handle}
              team={direction === "N" || direction === "S" ? nsTeam : ewTeam}
              isViewer={isViewer}
              isClaimable={isClaimable}
              onClaim={
                isClaimable && claimAction
                  ? claimAction.bind(null, tableId, direction)
                  : undefined
              }
              kibitzHref={kibitzHref}
            />
          );
        })}
      </div>
    </div>
  );
}
