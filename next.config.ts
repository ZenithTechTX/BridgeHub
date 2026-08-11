import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

// Deliberately not calling initOpenNextCloudflareForDev() here — it would
// make plain `next dev`/`next build` require a Hyperdrive local-connection-
// string setup just to boot. db/index.ts already falls back to
// DATABASE_URL when there's no Cloudflare Workers context, so plain local
// dev works unchanged. Binding-accurate local testing happens through
// `npm run cf:preview` instead (see CLOUDFLARE_DEPLOY.md).

export default nextConfig;
