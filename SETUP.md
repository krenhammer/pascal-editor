# Pascal Editor — Setup Guide

How to run the monorepo locally: Next.js editor, shared packages (`core`, `viewer`, `editor`, `ui`), and optional local Supabase (Postgres + API) via Docker.

## Prerequisites

- **Bun** 1.3+ (see root `package.json` `packageManager`)
- **Docker** — Supabase local stack runs in containers (`bun x supabase start`)

## Quick start

### 1. Install dependencies

```bash
bun install
```

### 2. Supabase (local database and API)

The Supabase project lives at the **repository root** in `supabase/` (`config.toml`, `seed.sql`, and eventually `migrations/`).

**First time only** — if `supabase/config.toml` is missing:

```bash
bun x supabase init
```

Start the stack:

```bash
bun x supabase start
```

You should see the API URL, DB URL, Studio URL, and keys. To print machine-friendly values for `.env`:

```bash
bun x supabase status -o env
```

Use `DB_URL` as `POSTGRES_URL`, `API_URL` as `NEXT_PUBLIC_SUPABASE_URL`, `ANON_KEY` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SERVICE_ROLE_KEY` as `SUPABASE_SERVICE_ROLE_KEY`.

Stop when finished:

```bash
bun x supabase stop
```

Default ports (from `supabase/config.toml`) are typically **54321** (API), **54322** (Postgres), **54323** (Studio). Change them in `config.toml` if they conflict on your machine, then align `apps/editor/.env.local`.

### 3. Environment variables

Create **`apps/editor/.env.local`** (see also root `.env.example`).

**Required** (see `apps/editor/env.mjs`):

| Variable | Purpose |
|----------|---------|
| `POSTGRES_URL` | Postgres connection string (e.g. from `supabase status` `DB_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role JWT (local demo or project dashboard) |
| `BETTER_AUTH_SECRET` | Secret for Better Auth (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL |

**Strongly recommended for local dev:**

| Variable | Purpose |
|----------|---------|
| `PORT` | Defaults in scripts; editor dev uses **3002** in `apps/editor/package.json` |
| `NEXT_PUBLIC_APP_URL` | Base URL for the app, e.g. `http://localhost:3002` |
| `BETTER_AUTH_URL` | Same origin as the app in dev, e.g. `http://localhost:3002` |

**Optional:**

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (optional in `env.mjs`; set for client Supabase usage) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Address autocomplete / maps features |
| `NEXT_PUBLIC_VOWEL_APP_ID` | Vowel integration; if unset, the Vowel wrapper skips the provider |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | OAuth (optional) |
| `RESEND_API_KEY` | Email (optional) |

Generate `BETTER_AUTH_SECRET`:

```bash
openssl rand -base64 32
```

**Local Supabase JWT demo keys** (unchanged across default local installs) — only for local dev:

```bash
# NEXT_PUBLIC_SUPABASE_ANON_KEY (example)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# SUPABASE_SERVICE_ROLE_KEY (example)
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

Prefer `bun x supabase status -o env` after `supabase start` so URLs and any CLI-specific keys stay in sync.

**Root `.env` (optional):** `bun dev` runs `turbo` with `set -a && . ./.env` when present. Use it for shared secrets across tasks if needed; the Next app loads **`apps/editor/.env.local`** via `dotenv-cli`.

**Builds / CI:** `SKIP_ENV_VALIDATION=1` skips strict checks in `env.mjs` when vars are injected only at deploy time.

### 4. Run the development server

```bash
bun dev
```

This runs **Turborepo** `dev`: TypeScript watch for `@pascal-app/core` and `@pascal-app/viewer`, and **Next.js** for the editor.

- **Editor:** http://localhost:3002 (see `apps/editor` `next dev --port 3002`)
- **Supabase Studio:** http://127.0.0.1:54323 (when Supabase is running)

### 5. Database migrations (when you add them)

SQL migrations belong in **`supabase/migrations/`** at the repo root.

```bash
bun x supabase migration new your_migration_name
# edit supabase/migrations/<timestamp>_your_migration_name.sql
bun x supabase db reset   # applies migrations + seed (see supabase/config.toml)
```

There is no separate `packages/db` app in this monorepo; Drizzle or other ORM wiring, if used, lives in application code and should point at `POSTGRES_URL`.

## Monorepo layout

```
.
├── apps/
│   └── editor/                 # Next.js 16 editor app
├── packages/
│   ├── core/                   # @pascal-app/core — scene schema, store, systems
│   ├── viewer/                 # @pascal-app/viewer — R3F canvas
│   ├── editor/                 # @pascal-app/editor — shared editor UI/logic
│   └── ui/                     # @repo/ui — shared components
├── supabase/                   # Local Supabase: config.toml, seed.sql, migrations/
├── turbo.json
└── package.json
```

## Production deployment (outline)

1. Create a project at [supabase.com](https://supabase.com) and note the project URL, anon key, service role key, and Postgres connection string.
2. Set the same environment variables on your host (Vercel, etc.) as in `.env.local`, using production values.
3. From the repo root, link and push migrations when you have them:

   ```bash
   bun x supabase link --project-ref <your-project-ref>
   bun x supabase db push
   ```

4. Configure Better Auth (secret, public URL, email/OAuth providers) wherever your server auth is defined.

## Troubleshooting

### `POSTGRES_URL` / Supabase env errors

Ensure `apps/editor/.env.local` exists and matches `bun x supabase status -o env` (or your hosted Supabase dashboard). URLs and ports must match `supabase/config.toml` if you changed default ports.

### Supabase will not start

- Confirm Docker is running.
- Try `bun x supabase stop` then `bun x supabase start`.
- Check nothing else is bound to ports **54321–54324** (or your customized ports).

### Port already in use (editor)

The editor defaults to **3002**. Free it or change the port in `apps/editor/package.json` `dev` / `build` scripts and update `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL`.

### `env.mjs` validation during build

Use `SKIP_ENV_VALIDATION=1` only when the platform injects env at runtime and validation should not run at build time.

## Next steps

- Add SQL migrations under `supabase/migrations/` for any persistence you need.
- Wire Better Auth routes and email (e.g. Resend) when you enable sign-in in the app.
- Set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` if you use address or map features.
- Commit `supabase/config.toml` (and migrations) so the team shares the same local stack; keep secrets out of git (use `.env.local` only).
