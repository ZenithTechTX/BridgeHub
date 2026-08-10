import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function ComingSoonPage({
  searchParams,
}: {
  searchParams: Promise<{ feature?: string }>;
}) {
  const { feature } = await searchParams;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold tracking-tight">
        {feature ? `${feature} is coming soon` : "Coming soon"}
      </h1>
      <p className="max-w-md text-muted-foreground">
        This feature isn&apos;t built yet. BridgeHub is focused on hosting
        and scoring duplicate tournaments — this is on the roadmap.
      </p>
      <Button nativeButton={false} render={<Link href="/dashboard">Back to Play Bridge</Link>} />
    </div>
  );
}
