export type Direction = "N" | "E" | "S" | "W";
export type Call = { direction: Direction; call: string };

const SEATS: Direction[] = ["N", "E", "S", "W"];
const STRAINS = ["C", "D", "H", "S", "NT"] as const;
type Strain = (typeof STRAINS)[number];

function side(direction: Direction): "NS" | "EW" {
  return direction === "N" || direction === "S" ? "NS" : "EW";
}

function isPlainBid(call: string) {
  return call !== "PASS" && call !== "X" && call !== "XX";
}

function parseBid(call: string): { level: number; strain: Strain } {
  return { level: Number(call[0]), strain: call.slice(1) as Strain };
}

function higherBid(a: { level: number; strain: Strain }, b: { level: number; strain: Strain }) {
  if (a.level !== b.level) return a.level > b.level;
  return STRAINS.indexOf(a.strain) > STRAINS.indexOf(b.strain);
}

export function nextToCall(dealer: Direction, calls: Call[]): Direction {
  return SEATS[(SEATS.indexOf(dealer) + calls.length) % 4];
}

export function legalCalls(
  callerDirection: Direction,
  calls: Call[]
): { canPass: boolean; canDouble: boolean; canRedouble: boolean; legalBids: string[] } {
  const lastNonPass = [...calls].reverse().find((c) => c.call !== "PASS");
  const lastBidCall = [...calls].reverse().find((c) => isPlainBid(c.call));
  const lastBid = lastBidCall ? parseBid(lastBidCall.call) : null;

  const canDouble = !!(
    lastNonPass &&
    isPlainBid(lastNonPass.call) &&
    side(lastNonPass.direction) !== side(callerDirection)
  );
  const canRedouble = !!(
    lastNonPass &&
    lastNonPass.call === "X" &&
    side(lastNonPass.direction) !== side(callerDirection)
  );

  const legalBids: string[] = [];
  for (let level = 1; level <= 7; level++) {
    for (const strain of STRAINS) {
      const candidate = { level, strain };
      if (!lastBid || higherBid(candidate, lastBid)) {
        legalBids.push(`${level}${strain}`);
      }
    }
  }

  return { canPass: true, canDouble, canRedouble, legalBids };
}

export type Contract = {
  level: number;
  strain: Strain;
  doubled: "NONE" | "DOUBLED" | "REDOUBLED";
  declarer: Direction;
};

export function determineContract(calls: Call[]): Contract | "PASSED_OUT" | null {
  if (calls.length < 4) return null;

  const lastThree = calls.slice(-3);
  const allPass = (c: Call) => c.call === "PASS";

  if (calls.length === 4 && calls.every(allPass)) return "PASSED_OUT";
  if (!lastThree.every(allPass)) return null;

  let lastBidIndex = -1;
  for (let i = calls.length - 1; i >= 0; i--) {
    if (isPlainBid(calls[i].call)) {
      lastBidIndex = i;
      break;
    }
  }
  if (lastBidIndex === -1) return null;

  const finalBid = calls[lastBidIndex];
  const { level, strain } = parseBid(finalBid.call);
  const doubled = calls.slice(lastBidIndex + 1).some((c) => c.call === "XX")
    ? "REDOUBLED"
    : calls.slice(lastBidIndex + 1).some((c) => c.call === "X")
      ? "DOUBLED"
      : "NONE";

  const winningSide = side(finalBid.direction);
  const declarerCall = calls.find(
    (c) => side(c.direction) === winningSide && isPlainBid(c.call) && parseBid(c.call).strain === strain
  )!;

  return { level, strain, doubled, declarer: declarerCall.direction };
}
