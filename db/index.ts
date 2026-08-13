import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { after } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import * as schema from "./schema";

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

// `prepare: false` is required when connecting through Supabase's
// transaction pooler (pgbouncer) or Hyperdrive, neither of which support
// prepared statements. `fetch_types: false` skips postgres.js's normal
// startup query for custom type OIDs — an extra round trip we don't need
// (matches Cloudflare's own Hyperdrive + postgres.js examples).
function buildDb(connectionString: string): DrizzleDb {
  const client = postgres(connectionString, { prepare: false, fetch_types: false });
  return drizzle(client, { schema });
}

// On Cloudflare Workers, a Postgres client must NOT be cached across
// requests: Workers can tear down a request's underlying sockets once that
// request ends, and a `postgres.js` client reused against a now-dead socket
// doesn't error on its next query — it hangs indefinitely, taking the whole
// request down with it (and the runtime eventually force-kills it as a
// "hung" Worker). Hyperdrive already pools/manages the real connections at
// the edge, so a fresh client per request is cheap; Cloudflare's own
// examples create one per request and close it via `ctx.waitUntil` once
// that request's work is done — `next/server`'s `after()` is the
// Next-native equivalent (OpenNext wires it to `ctx.waitUntil` under the
// hood) and, critically, actually waits until the response is finished
// before firing, unlike calling `ctx.waitUntil(client.end())` eagerly at
// connection-creation time — which would start closing the connection
// before any of the request's own queries had even run.
//
// `getCloudflareContext()` is backed by an AsyncLocalStorage store that's a
// brand-new object every request, so it doubles as a per-request cache key
// — multiple `db.*` accesses within the same request still share one
// client, but the next request always gets a fresh one.
const requestClients = new WeakMap<object, DrizzleDb>();

// Outside of Workers (plain `next dev`/`next start`, drizzle-kit, one-off
// tsx scripts) there's no per-request lifecycle at all, so
// getCloudflareContext() throws — fall back to one client cached for the
// life of the process, same as before.
let fallbackDb: DrizzleDb | null = null;

function getDb(): DrizzleDb {
  let cfContext;
  try {
    cfContext = getCloudflareContext();
  } catch {
    // Not running under the Cloudflare Workers adapter.
  }
  if (!cfContext) {
    if (!fallbackDb) fallbackDb = buildDb(process.env.DATABASE_URL!);
    return fallbackDb;
  }

  let db = requestClients.get(cfContext);
  if (!db) {
    const connectionString = cfContext.env.HYPERDRIVE?.connectionString ?? process.env.DATABASE_URL!;
    db = buildDb(connectionString);
    requestClients.set(cfContext, db);
    const client = db.$client;
    after(() =>
      client.end().catch(() => {
        // Best-effort cleanup — the request is already done either way.
      })
    );
  }
  return db;
}

export const db: DrizzleDb = new Proxy({} as DrizzleDb, {
  get: (_target, prop, receiver) => Reflect.get(getDb() as object, prop, receiver),
});
