import Link from "next/link";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await auth();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">
        Run duplicate bridge tournaments, without the spreadsheet.
      </h1>
      <p className="max-w-xl text-muted-foreground">
        BridgeHub handles movements, scoring, and live standings for Pairs,
        Duplicate Teams, and Swiss Teams events.
      </p>
      <Button
        size="lg"
        nativeButton={false}
        render={
          <Link href={session ? "/dashboard" : "/signin"}>
            {session ? "Go to dashboard" : "Get started"}
          </Link>
        }
      />
    </div>
  );
}
