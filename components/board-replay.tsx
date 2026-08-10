"use client";

import { useEffect, useMemo, useState } from "react";
import { AuctionGrid } from "@/components/auction-grid";
import { CurrentTrick } from "@/components/current-trick";
import { LiveTable } from "@/components/live-table";
import type { Direction, TeamMatchRoom } from "@/db/matches";
import type { Call } from "@/lib/bridge-auction";
import { removePlayedCards, type Suit } from "@/lib/bridge-play";
import { parseHand } from "@/lib/deal";

const STEP_MS = 900;

type PlayedCard = { direction: Direction; suit: Suit; rank: string };

// Steps through the auction call-by-call and then the play card-by-card,
// reusing the same LiveTable/AuctionGrid/CurrentTrick visuals as the live
// match page — this is a static replay of a finished board, not a live
// room, so there's no seat to claim and no turn to act on.
export function BoardReplay({
  room,
  boardNumber,
  boardsPerRound,
  dealer,
  vulnerability,
  dealPbn,
  calls,
  playedCards,
  passedOut,
  finalSummary,
}: {
  room: TeamMatchRoom;
  boardNumber: number;
  boardsPerRound: number;
  dealer: Direction;
  vulnerability: string;
  dealPbn: string;
  calls: Call[];
  playedCards: PlayedCard[];
  passedOut: boolean;
  finalSummary: { contract: string; score: string; imps?: string } | null;
}) {
  const totalSteps = calls.length + playedCards.length;
  // Defaults to the auction fully revealed but no cards played yet — the
  // bidding process is visible immediately on load. Pressing Play advances
  // past this point into the card-by-card replay.
  const [step, setStep] = useState(calls.length);
  const [playing, setPlaying] = useState(false);
  const done = step >= totalSteps;

  useEffect(() => {
    if (!playing || done) return;
    const id = setTimeout(() => {
      setStep((s) => Math.min(s + 1, totalSteps));
      if (step + 1 >= totalSteps) setPlaying(false);
    }, STEP_MS);
    return () => clearTimeout(id);
  }, [playing, done, step, totalSteps]);

  const revealedCalls = calls.slice(0, Math.min(step, calls.length));
  const revealedPlay = playedCards.slice(0, Math.max(0, step - calls.length));
  // The bidding board stays up until a card is actually played (i.e. Play
  // has been pressed and advanced past the last call) — reaching the end
  // of the auction on its own isn't enough to hide it.
  const cardPlayStarted = step > calls.length;

  // Same fix as the live match page: a plain modulo blanks the trick the
  // instant its 4th card lands (length is an exact multiple of 4), so the
  // last card of every trick would never actually render.
  const cardsInTrick = revealedPlay.length % 4 || (revealedPlay.length > 0 ? 4 : 0);
  const currentTrick = revealedPlay.slice(revealedPlay.length - cardsInTrick);
  const trickNumber = Math.ceil(revealedPlay.length / 4) || 1;

  // Once every card has been played, show each side's complete original
  // holding rather than the now-empty stripped-down hands — that's the
  // useful view for reviewing how a board was played, not four empty racks.
  const revealedHands = useMemo(() => {
    const out: Partial<Record<Direction, string[]>> = {};
    for (const d of ["N", "E", "S", "W"] as Direction[]) {
      const suits = parseHand(dealPbn, d);
      out[d] = done ? suits : removePlayedCards(suits, revealedPlay.filter((c) => c.direction === d));
    }
    return out;
  }, [dealPbn, revealedPlay, done]);

  return (
    <div className="flex flex-col items-center gap-3">
      <LiveTable
        room={room}
        boardNumber={boardNumber}
        boardsPerRound={boardsPerRound}
        dealer={dealer}
        vulnerability={vulnerability}
        revealedHands={revealedHands}
        claimAction={async () => {}}
        readOnly
      >
        <div className="relative flex h-full w-full flex-col items-center justify-start">
          {cardPlayStarted && finalSummary && (
            <div className="absolute top-0 left-0 rounded bg-slate-900/90 px-2 py-1 text-xs font-semibold text-white">
              {finalSummary.contract}
            </div>
          )}

          {!cardPlayStarted ? (
            <AuctionGrid dealer={dealer} calls={revealedCalls} />
          ) : passedOut ? (
            <p className="text-center text-sm font-semibold">Passed out</p>
          ) : !done ? (
            <CurrentTrick trick={currentTrick} trickNumber={trickNumber} />
          ) : (
            finalSummary && (
              <div className="text-center">
                <p className="text-lg font-bold">{finalSummary.contract}</p>
                <p className="text-sm text-muted-foreground">{finalSummary.score}</p>
                {finalSummary.imps && (
                  <p className="mt-1 text-sm font-semibold text-indigo-700">{finalSummary.imps}</p>
                )}
              </div>
            )
          )}
        </div>
      </LiveTable>

      <div className="flex w-full max-w-md items-center justify-center gap-2 rounded-lg border bg-card p-3">
        <button
          type="button"
          onClick={() => setStep(0)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
          title="Restart"
        >
          ⏮
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
          title="Step back"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={() => {
            if (done) {
              setStep(0);
              setPlaying(true);
            } else {
              setPlaying((p) => !p);
            }
          }}
          className="rounded-md bg-indigo-700 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-800"
        >
          {playing ? "Pause" : done ? "Replay" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => setStep((s) => Math.min(totalSteps, s + 1))}
          disabled={done}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-40"
          title="Step forward"
        >
          ▶
        </button>
        <span className="ml-2 text-xs text-muted-foreground">
          {step} / {totalSteps}
        </span>
      </div>
    </div>
  );
}
