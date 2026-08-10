import type { Contract } from "./bridge-auction";

type Doubled = Contract["doubled"];

function undertrickPenalty(undertricks: number, doubled: Doubled, vulnerable: boolean): number {
  if (doubled === "NONE") return undertricks * (vulnerable ? 100 : 50);
  const perUndertrick = (n: number) => {
    const base = vulnerable ? (n === 1 ? 200 : 300) : n === 1 ? 100 : n <= 3 ? 200 : 300;
    return doubled === "REDOUBLED" ? base * 2 : base;
  };
  let total = 0;
  for (let n = 1; n <= undertricks; n++) total += perUndertrick(n);
  return total;
}

// Standard duplicate-bridge raw score for a completed contract, signed
// relative to NS (matches tableResults.rawScoreNs's convention — positive
// means NS gained). `vulnerable` is whether the *declaring side* is
// vulnerable for this board.
export function computeRawScore({
  level,
  strain,
  doubled,
  declarerSide,
  vulnerable,
  tricksTaken,
}: {
  level: number;
  strain: Contract["strain"];
  doubled: Doubled;
  declarerSide: "NS" | "EW";
  vulnerable: boolean;
  tricksTaken: number;
}): number {
  const required = level + 6;
  const perTrick = strain === "C" || strain === "D" ? 20 : 30;

  let points: number;
  if (tricksTaken >= required) {
    const baseTrickScore = perTrick * level + (strain === "NT" ? 10 : 0);
    const multiplier = doubled === "REDOUBLED" ? 4 : doubled === "DOUBLED" ? 2 : 1;
    const trickScore = baseTrickScore * multiplier;
    const madeBonus = trickScore >= 100 ? (vulnerable ? 500 : 300) : 50;
    const slamBonus =
      level === 7 ? (vulnerable ? 1500 : 1000) : level === 6 ? (vulnerable ? 750 : 500) : 0;
    const overtricks = tricksTaken - required;
    const overtrickValue =
      doubled === "REDOUBLED"
        ? vulnerable
          ? 400
          : 200
        : doubled === "DOUBLED"
          ? vulnerable
            ? 200
            : 100
          : perTrick;
    const insultBonus = doubled === "REDOUBLED" ? 100 : doubled === "DOUBLED" ? 50 : 0;
    points = trickScore + madeBonus + slamBonus + overtricks * overtrickValue + insultBonus;
  } else {
    points = -undertrickPenalty(required - tricksTaken, doubled, vulnerable);
  }

  return declarerSide === "NS" ? points : -points;
}

const IMP_SCALE: [number, number][] = [
  [10, 0], [40, 1], [80, 2], [120, 3], [160, 4], [210, 5], [260, 6], [310, 7],
  [360, 8], [420, 9], [490, 10], [590, 11], [740, 12], [890, 13], [1090, 14],
  [1290, 15], [1490, 16], [1740, 17], [1990, 18], [2240, 19], [2490, 20],
  [2990, 21], [3490, 22], [3990, 23],
];

// The standard WBF IMP scale, converting a raw point difference into IMPs.
export function impsForDifference(pointDiff: number): number {
  const diff = Math.abs(pointDiff);
  for (const [max, imps] of IMP_SCALE) {
    if (diff <= max) return imps;
  }
  return 24;
}

// Continuous 20-point Victory Point scale (not tied to a fixed board
// count, since match length is configurable here) — a common simplified
// alternative to the fixed per-board-count WBF VP tables.
export function victoryPoints(imps: number): { winner: number; loser: number } {
  const margin = Math.abs(imps);
  const winner = Math.round(Math.min(20, 10 + margin / 3) * 100) / 100;
  const loser = Math.round(Math.max(0, 20 - winner) * 100) / 100;
  return { winner, loser };
}
