import { cn } from "@/lib/utils";

const SUIT_SYMBOL: Record<string, string> = { S: "♠", H: "♥", D: "♦", C: "♣" };
// "T" is the internal rank code (matches RANK_ORDER in lib/bridge-play.ts);
// shown as "10" to match how a real card reads.
const RANK_LABEL: Record<string, string> = { T: "10" };

export function CardTile({
  rank,
  suit,
  faceDown,
  vertical,
  dim,
}: {
  rank?: string;
  suit?: "S" | "H" | "D" | "C";
  faceDown?: boolean;
  vertical?: boolean;
  dim?: boolean;
}) {
  if (faceDown) {
    return (
      <div
        className={cn(
          "rounded-lg border border-slate-950/40 bg-slate-800 shadow-sm",
          vertical ? "h-[78px] w-[108px]" : "h-[108px] w-[78px]"
        )}
      />
    );
  }
  const isRed = suit === "H" || suit === "D";
  const rankLabel = rank ? (RANK_LABEL[rank] ?? rank) : "";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-1 rounded-lg border-2 bg-white shadow-md",
        isRed ? "border-red-500" : "border-slate-800",
        vertical ? "h-[78px] w-[108px] flex-row gap-3" : "h-[108px] w-[78px]",
        dim && "opacity-40"
      )}
    >
      <span className={cn("text-4xl leading-none font-extrabold", isRed ? "text-red-600" : "text-black")}>
        {rankLabel}
      </span>
      <span className={cn("text-4xl leading-none", isRed ? "text-red-600" : "text-black")}>
        {suit && SUIT_SYMBOL[suit]}
      </span>
    </div>
  );
}
