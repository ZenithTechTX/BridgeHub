"use client";

import { useEffect } from "react";

// Access tokens expire after ~1hr; pinging well under that keeps the
// session cookie refreshed via a Route Handler (which can write cookies,
// unlike the Server Component renders that make up the rest of the app).
const REFRESH_INTERVAL_MS = 10 * 60_000;

export function SessionRefresher() {
  useEffect(() => {
    const ping = () => {
      fetch("/api/auth/refresh").catch(() => {
        // A single missed refresh isn't fatal — the next request that
        // actually needs the session will surface a real sign-in prompt
        // if it's truly expired.
      });
    };
    const id = setInterval(ping, REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return null;
}
