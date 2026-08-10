import { ChevronLeft, House } from "lucide-react";
import Link from "next/link";

export function MatchPageHeader({
  gameName,
  recordHref,
}: {
  gameName: string;
  recordHref?: string;
}) {
  return (
    <div className="flex items-center gap-3 bg-slate-950 px-4 py-3 text-white">
      <Link
        href="/dashboard/matches"
        aria-label="Back"
        className="flex size-8 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
      >
        <ChevronLeft className="size-5" />
      </Link>
      <Link
        href="/dashboard"
        aria-label="Home"
        className="flex size-8 items-center justify-center rounded-md bg-white/10 hover:bg-white/20"
      >
        <House className="size-4" />
      </Link>
      <span className="flex-1 text-center text-base font-semibold">{gameName}</span>
      {recordHref ? (
        <Link
          href={recordHref}
          className="rounded-md bg-white/10 px-2 py-1.5 text-sm font-medium hover:bg-white/20"
        >
          Record
        </Link>
      ) : (
        <span className="w-16" aria-hidden />
      )}
    </div>
  );
}
