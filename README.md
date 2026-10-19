# Aakash Gupta conversational agent

Existing website and chatbot, now runnable as a Node.js web service on Render with Neon PostgreSQL. The UI and conversation logic are preserved.

## Deploy the existing Render service

Repository: `riddhipareekworks-collab/akash-gupta-conversation-agengt`
Branch: `main`
Root directory: blank
Build command: `npm ci --include=dev && npm run build`
Start command: `npm start`
Health check: `/healthz`
Node: 24.x (specified in package.json)

`render.yaml` supports new Blueprint deployments. For the already-created service, enter these settings in its dashboard; importing a Blueprint may create a duplicate service.

## Environment settings

Set these in Render's Environment tab. Never commit values or put them in browser JavaScript.

| Name | Purpose |
| --- | --- |
| DATABASE_URL | Neon PostgreSQL connection string, retaining its TLS parameters |
| OPENAI_API_KEY | Existing server-side OpenAI key |
| ADMIN_OWNER_EMAIL | Owner login email |
| ADMIN_PASSWORD | Owner password, at least 16 characters |
| SESSION_SECRET | Random secret of at least 32 characters |
| ASSET_STORAGE | `postgres` (default); uploaded reaction images are stored in Neon |
| SITE_ACCESS | `private` (default); use `public` only when intentionally opening the homepage/chat to everyone |
| TEAM_PASSWORD | Optional team login password, at least 16 characters |
| APP_ORIGIN | Optional on Render: automatically uses RENDER_EXTERNAL_URL; set when using a custom domain |
| OPENAI_MODEL | Optional, preserves the existing model default |

Render supplies PORT and RENDER_EXTERNAL_URL. The service binds to 0.0.0.0. Database setup runs transactionally at startup with a migration lock. Startup fails with a list of missing variable names, never secret values. No Cloudflare account or R2 subscription is required. Verify an image upload before sharing.

## Login and history

Visit `/login`. The owner signs in with ADMIN_OWNER_EMAIL and ADMIN_PASSWORD. Team members sign in with username `team` and TEAM_PASSWORD; they cannot access `/admin`, `/admin/sessions`, or admin APIs. The default private setting protects the entire website. `/logout` signs out that device. Cookies last eight hours and are HttpOnly, SameSite=Lax, and Secure on HTTPS. Changing passwords or SESSION_SECRET invalidates existing sessions. Login attempts are limited in PostgreSQL, including across restarts. Shared team credentials are intended for a small trusted team; individual accounts can be added later.

Render ignores incoming Sites identity headers. Only a verified admin cookie can establish owner access. The original Cloudflare version's owner header is still supported by the worker, behind the Node authentication adapter.

## Assets and persistence

Bundled portraits/posters are served by the existing application and deploy with the repository. Reaction uploads are stored as binary data in Neon, limited to 3 MB each; the application serves their immutable image URLs. Images count toward database storage usage. A future move to object storage remains available with ASSET_STORAGE=r2 and the R2_* settings shown in .env.example. Chat sessions, messages, timestamps, planning state, receipts, persona, empathy, happy paths and reaction settings persist in PostgreSQL. No runtime uploads or transcripts rely on Render's temporary filesystem. The booking experience remains simulated; no real payment/ticket/email is produced.

## Existing data migration

New infrastructure starts empty. Source code does not contain saved chat transcripts, owner settings or uploaded reaction files. Do not assume these are migrated by deploying.

Prepare an access-restricted local export directory (never commit it):
- `database.json`: object with arrays for chat_sessions, chat_turns, chat_messages, chat_session_state, demo_bookings, using original SQL column names.
- `settings.json`: the saved `{settings, updatedAt}` document from the current admin configuration.
- `reaction-images/`: uploaded images under their original UUID filenames.

With the destination variables loaded, run `npm run data:import -- /absolute/path/to/private-export`. The target chat tables must be empty. Inserts run in one transaction; errors roll back table writes. Image uploads may already have completed and are safe to retry. Back up and verify row counts, settings and images before switching traffic. Browser session tokens do not transfer automatically to a different domain; old transcripts remain visible in admin history after import.

Keep the old site available until the new deployment is verified.

## Local checks

Use Node 24.x. Install with `npm ci --include=dev`.
- `npm test`: existing chatbot regression suites (mocked model responses).
- `npm run test:render`: real PostgreSQL engine tests via PGlite, PostgreSQL image storage, optional R2 adapter and HTTP/login checks, without cloud credentials.
- `npm run build && npm run validate`: original Worker artifact checks.
- `npm run db:migrate`: explicitly initialise the configured PostgreSQL database.
- `node --env-file=.env.local server/index.mjs`: local start with a private env file based on `.env.example`.

Cloud credentials and a successful hosted smoke test are still required to verify a live Render deployment. Local tests do not verify live Neon/OpenAI accounts.

The previous Cloudflare deployment notes remain in [docs/cloudflare.md](docs/cloudflare.md).
