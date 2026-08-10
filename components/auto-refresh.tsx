"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Polls the current page for updates — this app has no real-time/WebSocket
// infrastructure, so a live table (seeing an opponent's call appear) relies
// on periodically re-fetching the server component tree.
export function AutoRefresh({ intervalMs = 4000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
