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
| TEAM_PASSWORD | Optional team login password, at least 16 characters |
| APP_ORIGIN | Optional on Render: automatically uses RENDER_EXTERNAL_URL; set when using a custom domain |
| OPENAI_MODEL | Optional, preserves the existing model default |

Render supplies PORT and RENDER_EXTERNAL_URL. The service binds to 0.0.0.0. Database setup runs transactionally at startup with a migration lock. Startup fails with a list of missing variable names, never secret values. No Cloudflare account or R2 subscription is required. Verify an image upload before sharing.

## Login and history

Visitors open the homepage and chatbot directly, without an account. Visit `/admin` to sign in with ADMIN_OWNER_EMAIL and ADMIN_PASSWORD. `/admin`, `/admin/sessions`, the transfer page and all admin APIs remain protected. Old homepage login links redirect to `/`. A legacy SITE_ACCESS setting in Render no longer gates visitor access. `/logout` signs out that device. Cookies last eight hours and are HttpOnly, SameSite=Lax, and Secure on HTTPS. Changing passwords or SESSION_SECRET invalidates existing sessions. Login attempts are limited in PostgreSQL, including across restarts. Shared team credentials are intended for a small trusted team; individual accounts can be added later.

Render ignores incoming Sites identity headers. Only a verified admin cookie can establish owner access. The original Cloudflare version's owner header is still supported by the worker, behind the Node authentication adapter.

## Assets and persistence

Bundled portraits/posters are served by the existing application and deploy with the repository. Reaction uploads are stored as binary data in Neon, limited to 3 MB each; the application serves their immutable image URLs. Images count toward database storage usage. A future move to object storage remains available with ASSET_STORAGE=r2 and the R2_* settings shown in .env.example. Chat sessions, messages, timestamps, planning state, receipts, persona, empathy, happy paths and reaction settings persist in PostgreSQL. No runtime uploads or transcripts rely on Render's temporary filesystem. The booking experience remains simulated; no real payment/ticket/email is produced.

## Existing data migration

The protected `/admin/transfer` page accepts an `aakash-backup-v1` JSON backup from the previous site. It merges sessions and messages without replacing new conversations, restores settings and referenced images, and recognizes repeated imports. Message IDs are reassigned to avoid collisions. Imports are transactional and available only after owner login. Backups contain private transcripts and should never be committed.


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

## Supabase and larger conversation memory

See [Supabase setup](docs/SUPABASE_SETUP.md) for the manual SQL migrations, ignored local `.env`, Render variables, existing-data transfer and memory limits. The PostgreSQL backend supports Neon or Supabase; provider selection is explicit. No Supabase browser API key is required.

## Vercel deployment

See [Vercel setup](docs/VERCEL_SETUP.md). The repository includes a single Node function for the existing homepage, chatbot, admin and database routes. `vercel.json` selects the correct build command and public output; do not deploy the Worker source as static files. Local `.env` values must be entered separately in Vercel settings.

## Gemini free-tier setup

The existing bot can use Google Gemini by setting `AI_PROVIDER=gemini`, `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-3.5-flash-lite` on the server. See [Gemini setup](docs/GEMINI_SETUP.md) for Vercel steps, free-tier limits and data handling. OpenAI remains the default until the provider is explicitly changed.

## Retro-Desi portfolio

The existing assistant homepage now contains a React + Tailwind CSS portfolio with Framer Motion and GSAP ScrollTrigger. Edit `frontend/portfolio.jsx` and `frontend/portfolio.css`; `frontend/shell.html` retains the existing assistant and simulated checkout. `npm run build` bundles the portfolio and styles into the Worker’s self-contained homepage, then builds the original deployment artifact. Do not edit the generated `const page` directly.

`npm run preview` serves a UI-only preview at http://localhost:4173. Chat and simulated checkout require the existing database-backed production server (`npm start`); the preview does not load production credentials or connect to production data.

The portfolio includes cursor/tap expression changes, animated marquees, date-aware ticket filters, a pinned desktop sprint timeline, an unpinned vertical mobile timeline, a reduced-motion stacked journey, linked video cards. The Corporate Mazdoori contact section and its navigation link have been removed. Existing show data is illustrative; ended shows are not marked sold out without that status in the source records.

Photography: existing expression stickers and the archival tour poster are reused. SprintTimeline uses four unique editorial era pairings: the same runner in a mustard T-shirt/charcoal jeans, blue office shirt/dark trousers, red/navy plaid shirt/blue jeans, and the original striped T-shirt/jeans. The first three are clothing-only imagegen edits of the original running pose. They are transparent 600×800 PNGs in `public/sprites/`, all aligned to baseline 784. `public/sprites/manifest.json` records source filenames, crops, masks, and dimensions. The same running stance is used throughout; the outfits are visual era interpretations, not historical photographs. Tour dates come from `data/sample-shows.json`; links and booking actions use the existing assistant APIs. The original additional video links remain below the bento grid.


### SprintTimeline

`frontend/components/SprintTimeline.jsx` replaces the previous journey section. Its GSAP context and responsive matchMedia handlers clean up pinning, transforms, and listeners when unmounted or resized. Desktop uses `pin: true`, `scrub: 0.6`, `anticipatePin: 1`, a 400vw track, and a background moving at 0.3 times the track speed. The foreground uses four unique era cutouts keyed to the active chapter, follows the sine bounce and ±6° tilt while moving, flips on upward scroll, and pops from 0.92 to 1.06 to 1 on an era change. Desktop keeps the foreground at left 44% / bottom 52px while each card reserves 38% of its width for text. Mobile stacks the copy above the collage and keeps the sprite in its own left-hand lane. Chapter buttons and a skip link support direct navigation. Mobile below 768px uses stacked cards and an unpinned moving sprite; reduced-motion users get static cards with their matching era cutouts. The Corporate Mazdoori chapter is biography only; the removed contact form stays removed.

To recreate the cutouts, install `rembg[cpu]` and Pillow in a Python environment, then run `scripts/prepare-sprint-sprites.py --source /path/to/supplied/photos --world-tour-poster /absolute/path/to/assets/poster-references/world-tour.png`. It uses both `u2netp` and `u2net_human_seg` locally to preserve trousers while avoiding stage-floor remnants; originals stay untouched. No model files are deployed. Builds embed the four PNGs in the existing image registry, so `/sprites/pose_*.png` works with the Worker, Render, Vercel, and local preview. `node tests/sprint-timeline.mjs` checks timing, milestone stops, direction changes, and the actual deployed image route.


### Street-poster styling

The user-supplied show posters guide the electric-blue lettering, yellow transport sign, red nameplate, newspaper grain, Devanagari ink stamps, 16-point callouts, and auto-rickshaw hazard stripes. `frontend/street-poster.css` holds the shared treatment; `frontend/components/StreetPoster.jsx` renders the era-specific DU flyer, mock office lanyard/timesheet, winner trophy, and illustrated boarding passes. The passes are decorative scrapbook props, not live inventory claims. `frontend/components/PosterEffects.jsx` adds contextual GSAP button entrances, respecting reduced motion and React cleanup. The footer reserves 96px below its content for the floating chat launcher.

The user’s poster is stored under `assets/poster-references/world-tour.png`. The running silhouette uses person segmentation plus a hand-refined source mask to preserve the outstretched arm and back leg while excluding the poster lettering; yellow print fringe is removed locally. `--only era_4_worldtour` regenerates only that asset. The sprite directory is kept in source control despite the rest of the generated Vercel public directory remaining ignored.


### Shared runner and era outfits

The selected world-tour running pose now appears in every era. The original striped outfit stays in the world-tour chapter; theatre uses mustard/charcoal, corporate uses a blue office shirt/dark trousers, and Comicstaan uses red/navy plaid with jeans. The built-in imagegen tool created the clothing edits; raw generated PNGs and the exact prompts are saved in `assets/runner-outfits/`.

Run `scripts/normalize-runner-outfits.py` with Pillow, NumPy and SciPy to normalize those outputs into the existing era filenames. It preserves alpha, fits the original runner’s footprint, and aligns every foot baseline at y=784 on a 600×800 canvas. Regenerating the older source cutouts with `prepare-sprint-sprites.py` should be followed by this outfit normalization step. `public/sprites/manifest.json` records pose provenance and cache revisions.

The portfolio hero lives in `frontend/components/Hero.jsx`. It uses the supplied steering-wheel poster as a transparent driver cutout, with GSAP `quickTo` steering limited to ±7° / ±12px and an 80ms stepped hover bounce. Motion is disabled for reduced-motion preferences and coarse pointers. The extracted PNG is `public/sprites/hero_driver_cutout.png`; its source, original generated output, and image-edit prompt are preserved under `assets/hero-driver/`. Run `npm run build` before restarting `npm run preview` to see source changes on port 4173.

The hero backdrop now uses independent `hero_sky.png`, `hero_cloud.png`, `hero_bird.png`, and `hero_road.png` assets in `public/sprites/`. The scenery responds to pointer position and animates in stepped GSAP loops, pausing when the hero is offscreen and respecting reduced motion. Generated originals and exact prompts are preserved in `assets/hero-driver/` (`scenery-prompts.json`).
