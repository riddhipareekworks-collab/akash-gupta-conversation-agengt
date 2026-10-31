# Deploy the existing application on Vercel

This repository contains a Node backend, not a static HTML export. `vercel.json`
uses `api/index.mjs` for the homepage, chat, admin, images and all other app routes.
Only the generated `public` folder is a static output. Do not set the output to
`.` or expose `dist/server`, `.env`, or the repository source.

## Project settings

- Repository: `riddhipareekworks-collab/akash-gupta-conversation-agengt`
- Production branch: `main`
- Root directory: blank / repository root (not `aakash-render`; files are already at root on GitHub)
- Framework preset: Other (`framework: null` in the committed config)
- Build: `node scripts/build-vercel.mjs` (set in `vercel.json`)
- Output: `public` (set in `vercel.json`)
- Node: 24.x, as pinned in package.json. The log warning about a 26.x dashboard
  setting being overridden is harmless; choose 24.x in the dashboard for clarity.

## Environment variables

In Vercel Project Settings > Environment Variables, set these for Production and
any Preview environment you want to test. Your local .env is private and is NOT
uploaded or automatically available on Vercel.

Required:

- `DATABASE_PROVIDER=supabase`
- `SUPABASE_DB_URL`: the PostgreSQL session-pooler URI, not the HTTPS project URL
- `OPENAI_API_KEY`: your existing API key
- `ADMIN_OWNER_EMAIL`: your owner email
- `ADMIN_PASSWORD`: your existing admin password, at least 16 characters
- `SESSION_SECRET`: your existing random secret, at least 32 characters

Optional (the code already supplies these defaults):

- `OPENAI_MODEL=gpt-4.1-mini`
- `ASSET_STORAGE=postgres`
- `CHAT_CONTEXT_MESSAGES=80`
- `CHAT_CONTEXT_CHARACTERS=48000`
- `CHAT_MEMORY_SEARCH=true`
- `DATABASE_SSL_CA`: database root certificate PEM if required by your connection

Leave APP_ORIGIN unset to use Vercel's trusted production/preview domain variables.
For a custom domain, explicitly set `APP_ORIGIN=https://your-domain.example` in
Production. Never copy the local `http://localhost:3000` value to Production.
Preview needs its own origin; a production-only custom origin must not be copied
to Preview, or browser requests/cookies will target the wrong site.

Run the Supabase migrations as described in [SUPABASE_SETUP.md](SUPABASE_SETUP.md).
Runtime startup also applies missing app migrations transactionally; the build
does not access the database. Supabase-specific RLS permissions are still set by
the manual SQL file. Existing Neon data is not automatically copied.

## Verify

Redeploy the newest commit after saving variables. Check:

1. Homepage loads with its portrait and chat launcher.
2. `/healthz` returns `{"ok":true}`.
3. Chat replies and a refresh restores the current chat.
4. `/admin` requires the owner login.
5. Admin history lists the new session and image uploads render.

All routes run through one function with a shared database pool per warm instance.
Request limits and Vercel's platform limits both apply. In particular, Vercel may
reject large backup uploads before the handler runs; use a private command-line
data import for backups larger than Vercel's request-body limit.

Reference: https://vercel.com/docs/functions/runtimes/node-js
