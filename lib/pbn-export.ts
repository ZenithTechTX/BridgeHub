import type { Direction } from "@/db/matches";

export type PbnCall = { direction: Direction; call: string; alerted: boolean; announcement: string | null };
export type PbnPlayCard = { direction: Direction; suit: string; rank: string };

// "5SX" / "Pass" style contract label for the PBN [Contract] tag.
export function contractPbnLabel(tr: {
  resultType: string | null;
  level: number | null;
  strain: string | null;
  doubled: string | null;
}): string {
  if (tr.resultType === "PASSED_OUT") return "Pass";
  if (!tr.level || !tr.strain) return "";
  const doubled = tr.doubled === "REDOUBLED" ? "XX" : tr.doubled === "DOUBLED" ? "X" : "";
  return `${tr.level}${tr.strain}${doubled}`;
}

// "NS +130" / "EW +50" style score label for the PBN [Score] tag.
export function scorePbnLabel(rawScoreNs: number | null): string {
  if (rawScoreNs == null) return "";
  return rawScoreNs >= 0 ? `NS +${rawScoreNs}` : `EW +${-rawScoreNs}`;
}

// Generates PBN text for one board at one room/table, matching the tag
// structure/order of a reference file the user supplied (event name, site,
// date, board, seat occupants, dealer, vulnerability, deal, scoring,
// declarer, contract, result, score, teams, IMP comparison, competition,
// auction with alert notes, and card-by-card play). Deliberately omits
// DoubleDummyTricks/OptimumResultTable/OptimumScore — those require a
// double-dummy solver, integrated in a separate pass.
export function generateBoardPbn(input: {
  eventName: string;
  siteName: string;
  date: string; // "YYYY.MM.DD"
  boardNumber: number;
  seats: Record<Direction, string>;
  dealer: Direction;
  vulnerability: "None" | "NS" | "EW" | "Both";
  dealPbn: string; // "N:..."
  declarer: Direction | null;
  contractLabel: string; // e.g. "5SX" or "Pass"
  result: number | null; // tricks taken, absolute (not relative to contract)
  scoreLabel: string; // e.g. "NS 500"
  homeTeam: string;
  visitTeam: string;
  scoreImpLabel: string | null; // e.g. "NS -2 EW 2"
  calls: PbnCall[];
  playCards: PbnPlayCard[];
}): string {
  const vulTag =
    input.vulnerability === "None" ? "-" : input.vulnerability === "Both" ? "All" : input.vulnerability;
  const dealValue = input.dealPbn.startsWith("N:") ? input.dealPbn : `N:${input.dealPbn}`;

  const lines: string[] = [
    `[Event "${input.eventName}"]`,
    `[Site "${input.siteName}"]`,
    `[Date "${input.date}"]`,
    `[Board "${input.boardNumber}"]`,
    `[West "${input.seats.W}"]`,
    `[North "${input.seats.N}"]`,
    `[East "${input.seats.E}"]`,
    `[South "${input.seats.S}"]`,
    `[Dealer "${input.dealer}"]`,
    `[Vulnerable "${vulTag}"]`,
    `[Deal "${dealValue}"]`,
    `[Scoring "IMP"]`,
    `[Declarer "${input.declarer ?? ""}"]`,
    `[Contract "${input.contractLabel}"]`,
    `[Result "${input.result ?? ""}"]`,
    `[Score "${input.scoreLabel}"]`,
    `[HomeTeam "${input.homeTeam}"]`,
    `[VisitTeam "${input.visitTeam}"]`,
  ];
  if (input.scoreImpLabel) lines.push(`[ScoreIMP "${input.scoreImpLabel}"]`);
  lines.push(`[Competition "Teams"]`);

  if (input.calls.length > 0) {
    lines.push(`[Auction "${input.dealer}"]`);
    const tokens: string[] = [];
    const notes: string[] = [];
    for (const c of input.calls) {
      tokens.push(c.call === "PASS" ? "Pass" : c.call);
      if (c.alerted) {
        notes.push(c.announcement ?? "");
        tokens.push(`=${notes.length}=`);
      }
    }
    for (let i = 0; i < tokens.length; i += 4) {
      lines.push(tokens.slice(i, i + 4).join(" ") + " ");
    }
    notes.forEach((note, i) => {
      if (note) lines.push(`[Note "${i + 1}: ${note}"]`);
    });
  }

  if (input.playCards.length > 0) {
    lines.push(`[Play "${input.playCards[0].direction}"]`);
    const tokens = input.playCards.map((c) => `${c.suit}${c.rank}`);
    for (let i = 0; i < tokens.length; i += 4) {
      lines.push(tokens.slice(i, i + 4).join(" ") + " ");
    }
    lines.push("*");
  }

  return lines.join("\n");
}
