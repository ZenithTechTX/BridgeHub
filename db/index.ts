import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let cached: DrizzleDb | null = null;

// On Cloudflare Workers, the Postgres connection string never lands in
// process.env — it only exists on the Hyperdrive binding (env.HYPERDRIVE),
// which is only reachable from inside a request. Everywhere else (plain
// `next dev`/`next start`, drizzle-kit, one-off tsx scripts) there's no
// Workers runtime at all, so getCloudflareContext() throws and this falls
// back to a plain env var.
function getConnectionString(): string {
  try {
    const { env } = getCloudflareContext();
    if (env.HYPERDRIVE?.connectionString) return env.HYPERDRIVE.connectionString;
  } catch {
    // Not running under the Cloudflare Workers adapter.
  }
  return process.env.DATABASE_URL!;
}

// Lazily built and cached on first real use (not at module load, when no
// request context exists yet) — safe to reuse across requests in the same
// Worker instance since Hyperdrive itself pools/manages the underlying
// connections.
function getDb(): DrizzleDb {
  if (!cached) {
    // `prepare: false` is required when connecting through Supabase's
    // transaction pooler (pgbouncer) or Hyperdrive, neither of which
    // support prepared statements.
    const client = postgres(getConnectionString(), { prepare: false });
    cached = drizzle(client, { schema });
  }
  return cached;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get: (_target, prop, receiver) => Reflect.get(getDb() as object, prop, receiver),
});
