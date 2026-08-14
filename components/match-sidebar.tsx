import { Menu } from "lucide-react";
import type { Direction, TeamMatchRoom } from "@/db/matches";
import { cn } from "@/lib/utils";

// Same heuristic as live-table.tsx/bridge-table.tsx: a seat still holding
// its auto-generated placeholder name (see createTeamMatch) is genuinely
// unclaimed — show it as an empty seat instead of the raw "Team1 North
// 1786507118880"-style name.
const AUTO_GENERATED_NAME = /^Team[12] (North|East|South|West) \d+$/;

function TeamImpsLine({ name, imps }: { name: string; imps: number }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="min-w-0 truncate text-base font-semibold text-emerald-950">{name}</span>
      <span
        className={cn(
          "shrink-0 text-lg font-bold",
          imps > 0 ? "text-emerald-700" : imps < 0 ? "text-red-700" : "text-emerald-950/60"
        )}
      >
        {imps >= 0 ? "+" : ""}
        {imps} IMPs
      </span>
    </div>
  );
}

export function MatchSidebar({
  boardNumber,
  boardsPerRound,
  dealer,
  rooms,
  standing,
  kibitzers,
}: {
  boardNumber: number;
  boardsPerRound: number;
  dealer?: Direction;
  rooms: TeamMatchRoom[];
  standing?: { team1Name: string; team1Imps: number; team2Name: string; team2Imps: number };
  kibitzers?: { playerId: string; name: string }[];
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-64">
      <button
        type="button"
        disabled
        className="flex size-12 items-center justify-center self-start rounded-xl bg-indigo-700 text-white opacity-90"
        title="Options menu isn't built yet"
      >
        <Menu className="size-6" />
      </button>

      {standing && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <TeamImpsLine name={standing.team1Name} imps={standing.team1Imps} />
          <TeamImpsLine name={standing.team2Name} imps={standing.team2Imps} />
        </div>
      )}

      <div className="relative rounded-2xl border-4 border-red-800 bg-white p-4 text-center">
        {dealer && (
          <span className="absolute top-2 left-2 flex size-6 items-center justify-center rounded-sm bg-red-800 text-sm font-bold text-white">
            {dealer}
          </span>
        )}
        <div className="text-6xl font-extrabold text-red-800">{boardNumber}</div>
        <div className="text-base text-muted-foreground">of {boardsPerRound}</div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <div className="mb-1 text-base font-semibold text-muted-foreground">Players</div>
        {rooms.map((room) => (
          <div key={room.tableId} className="mb-2 last:mb-0">
            <div className="mb-0.5 text-sm font-medium text-muted-foreground">
              {room.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {room.seats.map((seat) => {
                const isEmpty = AUTO_GENERATED_NAME.test(seat.name);
                return (
                  <div key={seat.direction} className="flex items-center gap-1.5 text-base">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-slate-800 text-sm font-bold text-white">
                      {seat.direction}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate", isEmpty && "text-muted-foreground italic")}>
                      {isEmpty ? "Empty" : (seat.handle ?? seat.name)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-2">
        <div className="mb-1 text-base font-semibold text-muted-foreground">Kibitzers</div>
        {!kibitzers || kibitzers.length === 0 ? (
          <p className="text-base text-muted-foreground">No one watching right now.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {kibitzers.map((k) => (
              <div key={k.playerId} className="truncate text-base">
                {k.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
