import { cn } from "@/lib/utils";
import type { Call, Direction } from "@/lib/bridge-auction";

const COLUMNS: Direction[] = ["W", "N", "E", "S"];

const SUIT_SYMBOL: Record<string, string> = { C: "♣", D: "♦", H: "♥", S: "♠", NT: "NT" };
const RED_STRAIN = new Set(["D", "H"]);

function CallLabel({ call }: { call: string }) {
  if (call === "PASS") return <>Pass</>;
  if (call === "X" || call === "XX") return <>{call}</>;
  const strain = call.slice(1);
  return (
    <>
      {call[0]}
      <span className={RED_STRAIN.has(strain) ? "text-red-600" : undefined}>{SUIT_SYMBOL[strain] ?? strain}</span>
    </>
  );
}

export function AuctionGrid({
  dealer,
  calls,
  vulnerability,
}: {
  dealer: Direction;
  calls: Call[];
  // Column headers are colored by vulnerability (red = vulnerable, matching
  // how a real duplicate-bridge client marks it), not by dealer — the
  // dealer's column gets an underline instead so the two cues don't clash.
  vulnerability?: string;
}) {
  const offset = COLUMNS.indexOf(dealer);
  const rows: (Call | null)[][] = [];

  calls.forEach((call, i) => {
    const absolute = offset + i;
    const row = Math.floor(absolute / 4);
    const col = absolute % 4;
    rows[row] ??= [null, null, null, null];
    rows[row][col] = call;
  });
  if (rows.length === 0) rows.push([null, null, null, null]);

  const isVulnerable = (c: Direction) =>
    (c === "N" || c === "S") ? vulnerability === "NS" || vulnerability === "Both" : vulnerability === "EW" || vulnerability === "Both";

  return (
    <table className="w-full border-collapse text-base">
      <thead>
        <tr>
          {COLUMNS.map((c) => (
            <th
              key={c}
              className={cn(
                "border px-2 py-1 font-semibold",
                isVulnerable(c) ? "bg-red-700 text-white" : "bg-white text-slate-900",
                c === dealer && "underline decoration-2 underline-offset-4"
              )}
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border px-2 py-1 text-center">
                {cell ? (
                  <span
                    className={cell.call === "PASS" ? "text-muted-foreground" : "font-medium"}
                  >
                    <CallLabel call={cell.call} />
                  </span>
                ) : (
                  ""
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
