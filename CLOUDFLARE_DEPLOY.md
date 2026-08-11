# Deploying BridgeHub to Cloudflare

This app runs on Cloudflare via the [OpenNext Cloudflare adapter](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare`), which compiles the Next.js app into a Cloudflare Worker. Note: what you create in the dashboard is technically a **Worker** project (Workers & Pages → Workers), not a classic static "Pages" project — Pages Functions and Workers run on the same underlying runtime, but only the Workers-style Git deploy flow supports this adapter's SSR build output. You'll still find it under the "Workers & Pages" section either way.

Both `main` (production) and `test` (a preview branch) deploy from **one** Worker project — Cloudflare auto-deploys every push to a non-production branch as its own preview URL once the repo is connected, so there's no need to create two separate projects.

## Why this took repo changes

- **Database**: `db/index.ts` used a raw TCP Postgres connection (`postgres.js`), which Workers can't make directly. It now goes through a **Hyperdrive** binding instead, falling back to `DATABASE_URL` outside of Workers (local dev, scratch scripts).
- **Email**: magic-link sign-in emails used SMTP (`nodemailer`), also TCP-only. Switched to **Resend's HTTP API** — turns out your existing `EMAIL_SERVER` value was already a Resend SMTP credential, so no new account was needed, just a different way of calling the same provider.
- **Middleware**: Next.js 16's `proxy.ts` always runs on the Node.js runtime, which Cloudflare Workers can't execute yet. The dashboard sign-in guard moved from `proxy.ts` into `app/dashboard/layout.tsx`. One real behavior change: the auth cookie used to refresh proactively on every request; now it only refreshes when a Server Action runs. In practice this means a tab left open past the access token's ~1hr TTL may need a manual reload before its next server action/navigation succeeds — not a broken session, just a lazier refresh.

## One-time setup

### 1. Create a Hyperdrive resource (do this first)

Dashboard → **Storage & Databases → Hyperdrive → Create**.

- Point it at your Supabase Postgres **direct** connection (the `DIRECT_URL` value in `.env.local`, port `5432`), not the pgbouncer pooler URL — Hyperdrive does its own pooling at the edge, so it wants the unpooled origin.
- Name it something like `bridgehub-prod`. If you want `test` to hit a separate database (recommended, so bot-match test runs don't pollute production data), create a second Hyperdrive resource, e.g. `bridgehub-test`, pointed at a different Supabase project/DB (or the same one if you're fine sharing data for now).
- Copy the Hyperdrive resource ID after creation — you'll bind it by ID in step 3, not by editing `wrangler.jsonc` (that file's `hyperdrive[0].id` is left blank on purpose so no connection string/ID sits in a committed file).

### 2. Connect the GitHub repo

Dashboard → **Workers & Pages → Create → Import a repository**, pick `ZenithTechTX/BridgeHub`.

- **Production branch**: `main`
- **Build command**: `npx opennextjs-cloudflare build`
- **Deploy command**: `npx wrangler deploy` (or use `npx opennextjs-cloudflare deploy`, which runs both)
- **Build output / working directory**: repo root (the adapter reads `wrangler.jsonc` itself; no output directory field needed the way static Pages projects use one)
- **Node version**: 20+ (matches `@types/node": "^20"` in `package.json`)

Every other branch you push (including `test`) automatically becomes a preview deployment with its own URL once the repo is connected — nothing further to configure for that.

### 3. Bind Hyperdrive and set environment variables

Dashboard → your Worker project → **Settings → Bindings** (configure separately for **Production** and **Preview** environments — this is where main vs. test can point at different Hyperdrive resources/databases):

| Binding type | Name | Value |
|---|---|---|
| Hyperdrive | `HYPERDRIVE` | the resource ID from step 1 (prod one for Production, test one for Preview) |

Dashboard → **Settings → Variables and Secrets**:

| Name | Type | Value |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Text | from `.env.local` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Text | from `.env.local` |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | from `.env.local` |
| `RESEND_API_KEY` | **Secret** | from `.env.local` (`re_...`) |
| `EMAIL_FROM` | Text | `BridgeHub <onboarding@bridgehub.cc>` (or your verified Resend sending domain) |
| `NEXT_PUBLIC_APP_URL` | Text | the deployed URL for that environment — differs between Production and each Preview branch, since magic links embed this |
| `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` | **Secret** | same value as `DATABASE_URL` in `.env.local` |

That last one is easy to miss: `opennextjs-cloudflare`'s `deploy` command uses Miniflare's platform-proxy internally to resolve bindings during the build itself, and Miniflare can never reach the real Hyperdrive service (it only exists on Cloudflare's actual edge network) — so it needs a real, reachable Postgres connection string for this step even on a genuine production deploy, not just for local dev.

Not needed: `DATABASE_URL` / `DIRECT_URL` (Workers get the connection through the Hyperdrive binding instead) and `AUTH_SECRET` (leftover from the old NextAuth setup — confirmed unused anywhere in the current codebase).

## Local testing before you push

- `npm run dev` — unchanged, plain Next.js dev server, uses `DATABASE_URL`/`RESEND_API_KEY` from `.env.local` as always.
- `npm run cf:build` — runs the actual Cloudflare build locally (`opennextjs-cloudflare build`), same command the CI build will run. Confirmed working on this machine.
- `npm run cf:preview` — additionally boots `wrangler dev` against that build to test bindings locally. **Known issue on Windows**: `wrangler dev` crashed here with a libuv/Windows-specific assertion (`UV_HANDLE_CLOSING`) — this matches OpenNext's own printed warning that it's "not fully compatible with Windows" and recommends WSL. This doesn't block real deployment (Cloudflare's CI builds on Linux), it just means local interactive preview isn't reliable on Windows without WSL.
- `.dev.vars` (gitignored, already created with your real values) supplies `cf:preview`'s local environment, including `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE` for emulating the Hyperdrive binding locally. `.dev.vars.example` is the committed template for anyone else setting up the repo.

## After deploying

Smoke-test both environments once live: sign-in (magic link should send via Resend and land in your inbox, not just log to console), creating a match, and playing a few cards — this exercises the DB write path through Hyperdrive and the auth cookie path through the new layout-based guard, the two things that changed the most.
