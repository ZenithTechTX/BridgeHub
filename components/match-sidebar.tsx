import { Menu } from "lucide-react";
import type { TeamMatchRoom } from "@/db/matches";
import { cn } from "@/lib/utils";

export function MatchSidebar({
  boardNumber,
  boardsPerRound,
  rooms,
  myImps,
  standing,
  kibitzers,
}: {
  boardNumber: number;
  boardsPerRound: number;
  rooms: TeamMatchRoom[];
  myImps?: number;
  // Shown instead of myImps for a kibitzer — no "my team" to score, so the
  // home team's (team1) running total is shown instead.
  standing?: { team1Name: string; team1Imps: number; team2Name: string; team2Imps: number };
  kibitzers?: { playerId: string; name: string }[];
}) {
  return (
    <div className="flex w-full shrink-0 flex-col gap-3 lg:w-60">
      <button
        type="button"
        disabled
        className="flex items-center justify-center gap-1.5 rounded-lg border bg-card py-1.5 text-sm text-muted-foreground opacity-60"
        title="Options menu isn't built yet"
      >
        <Menu className="size-4" />
        Options
      </button>

      <div className="flex gap-2">
        <div className="flex-1 rounded-lg border-2 border-red-800 bg-white p-2.5 text-center">
          <div className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Board
          </div>
          <div className="text-3xl font-bold text-red-800">{boardNumber}</div>
          <div className="text-sm text-muted-foreground">of {boardsPerRound}</div>
        </div>

        <div className="flex-1 rounded-lg border bg-card p-2.5 text-center">
          {myImps != null ? (
            <>
              <div
                className={cn(
                  "text-3xl font-bold",
                  myImps > 0 ? "text-emerald-700" : myImps < 0 ? "text-red-700" : "text-muted-foreground"
                )}
              >
                {myImps >= 0 ? "+" : ""}
                {myImps}
              </div>
              <div className="text-sm text-muted-foreground">IMPs</div>
            </>
          ) : standing ? (
            <>
              <div
                className={cn(
                  "text-3xl font-bold",
                  standing.team1Imps > 0 ? "text-emerald-700" : standing.team1Imps < 0 ? "text-red-700" : "text-muted-foreground"
                )}
              >
                {standing.team1Imps >= 0 ? "+" : ""}
                {standing.team1Imps}
              </div>
              <div className="truncate text-sm text-muted-foreground">{standing.team1Name}</div>
            </>
          ) : (
            <div className="py-2.5 text-sm text-muted-foreground">No boards yet</div>
          )}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-2">
        <div className="mb-1 text-sm font-semibold text-muted-foreground">Players</div>
        {rooms.map((room) => (
          <div key={room.tableId} className="mb-2 last:mb-0">
            <div className="mb-0.5 text-xs font-medium text-muted-foreground">
              {room.label}
            </div>
            <div className="flex flex-col gap-0.5">
              {room.seats.map((seat) => (
                <div key={seat.direction} className="flex items-center gap-1.5 text-sm">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-slate-800 text-xs font-bold text-white">
                    {seat.direction}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{seat.name}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-2">
        <div className="mb-1 text-sm font-semibold text-muted-foreground">Kibitzers</div>
        {!kibitzers || kibitzers.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one watching right now.</p>
        ) : (
          <div className="flex flex-col gap-0.5">
            {kibitzers.map((k) => (
              <div key={k.playerId} className="truncate text-sm">
                {k.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
