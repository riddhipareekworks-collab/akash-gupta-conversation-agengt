# Connect Render to Supabase and enable larger conversation memory

The code is prepared locally. No credentials have been filled, no remote migrations
have been run, and the live Render database has not been changed.

## 1. Create the database

Create your Supabase project and keep its database password privately.
In the project's SQL Editor, create a new query and run these files in order:

1. `supabase/migrations/202610310001_chat_storage_and_memory.sql`
2. `supabase/migrations/202610310002_server_only_access.sql`

The first creates the app's sessions, transcripts, state, settings, image storage,
booking records and memory search index. It also records the existing migration
versions, so starting the app will not try to recreate these tables. Both files
can be run again. They do not delete existing chat data.

The second enables row-level security and removes browser API access to these
server-only tables. The application continues to enforce admin login and chat
session tokens. Use the database owner's connection for this setup; no browser
access policy or Supabase Auth setup is needed.

Use a new/dedicated project or an existing database already migrated by this app.
These scripts are not designed to reconcile unrelated tables with the same names.

## 2. Fill the local environment file

An ignored `.env` is prepared in the `aakash-render` folder. Enter credentials
there yourself. Do not paste credentials into chat or commit this file.

```dotenv
DATABASE_PROVIDER=supabase
SUPABASE_DB_URL=  # Enter the PostgreSQL URI from Connect > Session pooler
DATABASE_SSL_CA= # Optional: Supabase root certificate PEM (literal \n between lines)
CHAT_CONTEXT_MESSAGES=80
CHAT_CONTEXT_CHARACTERS=48000
CHAT_MEMORY_SEARCH=true
```

Copy the full **Session pooler** PostgreSQL URI, using port **5432**. Replace its
password placeholder with your database password. URL-encode special characters
in a password if editing the URI manually. This is not the project's https URL.
The session pooler supports IPv4 and suits this persistent Node server. See
[Supabase connection instructions](https://supabase.com/docs/guides/database/connecting-to-postgres).

For encrypted connections, use the Supabase-provided TLS connection settings.
If the driver needs your project's root certificate, download it in Supabase's
Database settings and put its PEM in `DATABASE_SSL_CA`. The app enables
certificate verification when this value is present. Do not disable certificate
verification to bypass an error.

No Supabase publishable/anon/service-role API key is required: the backend uses
PostgreSQL directly. Keep the database URI server-side.

Also fill the existing `OPENAI_API_KEY`, `ADMIN_OWNER_EMAIL`, `ADMIN_PASSWORD`
(at least 16 characters), `SESSION_SECRET` (at least 32 characters) and
`APP_ORIGIN` fields for local use. Existing deployed values should be retained
on Render. `APP_ORIGIN=http://localhost:3000` is suitable locally.

The app loads `.env.local` first, then `.env`; already-set process variables
(including Render settings) take priority. If you already have `.env.local`,
ensure it does not override these values with an old provider selection.

## 3. Check locally (optional)

From `aakash-render`:

```sh
npm install
npm run db:migrate
npm start
```

`db:migrate` loads the selected database credentials from the env file and applies
only missing PostgreSQL migrations. If you already ran the two Supabase SQL
files, it should report the tables are up to date. Keep the server-only SQL
migration from step 1 applied as well; the generic migration command does not
configure Supabase-specific browser roles.

Open http://localhost:3000 and /admin. The local `.env` does not automatically
change Render's settings.

## 4. Preserve the data already saved in Neon

Creating tables in Supabase does **not** transfer existing Neon conversations,
agent settings or uploaded reaction images. Before switching the live site,
back up the current Neon database with its database backup/export workflow.
Restore the complete app data into Supabase using PostgreSQL tools, or use an
existing compatible private app backup with `/admin/transfer` after connecting
the new database. Keep any backup private: it contains transcripts and credentials
such as chat session token hashes. Do not put it in the repository.

For a full PostgreSQL restore, restore app tables/data into the new project first,
then rerun the two SQL files to ensure the memory index and server-only access
are applied. Do not overwrite Supabase-managed auth/storage schemas. A full
Neon-to-Supabase transfer is not performed by these migration files.

If you choose not to transfer data, the new project starts with empty history
and default settings. Keep Neon available until you verify the new project.

## 5. Update Render when ready

Deploy these code changes through your repository, then in Render > Environment:

- Set `DATABASE_PROVIDER` to `supabase`.
- Set `SUPABASE_DB_URL` to the same session-pooler URI.
- Set `DATABASE_SSL_CA` if needed.
- Set `CHAT_CONTEXT_MESSAGES=80`, `CHAT_CONTEXT_CHARACTERS=48000`,
  and `CHAT_MEMORY_SEARCH=true`.
- Keep the existing OpenAI, admin, session secret and origin settings.
- Keep `ASSET_STORAGE=postgres` to store reaction uploads in this database.

Keep the current `DATABASE_URL` value privately as a fallback. In Supabase mode,
the application selects `SUPABASE_DB_URL` explicitly; an old Neon URI cannot
silently override it. Save and redeploy. Check `/healthz`, send chat messages,
check `/admin/sessions`, and test a reaction image. If you restored older data,
confirm its settings, images and transcripts appear before sharing the site.
To revert the connection, set `DATABASE_PROVIDER=postgres` and redeploy with the
previous `DATABASE_URL`. New writes in Supabase are not automatically copied back.

## What the larger memory does

- Saves complete transcripts in PostgreSQL as before.
- Sends up to 80 recent messages, within 48,000 transcript characters, to the model.
- Searches indexed older user/reply messages in the same session for relevant
  words; includes up to six excerpts and 12,000 additional characters.
- Keeps current planning/preferences and saved state across requests/restarts.
- Excludes the duplicate reply-history buffer from the model prompt; that buffer
  still serves repetition checks internally.
- Never searches across different visitor sessions. A new chat starts fresh.

The character limit applies to transcript text, not the complete model prompt
(which also includes settings, event data, and state). This is keyword-based
retrieval, not semantic embeddings or unlimited model context. Larger limits
can increase latency and API cost. Recent preferences override recalled older
messages. Allowed settings: 12–200 messages, 8,000–120,000 transcript characters.
Set `CHAT_MEMORY_SEARCH=false` to use only recent context and stored planning.
