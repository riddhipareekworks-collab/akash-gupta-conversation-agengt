-- Run in Supabase SQL Editor. Idempotent; does not copy data from Neon.

BEGIN;

SELECT pg_advisory_xact_lock(817230941);

CREATE TABLE IF NOT EXISTS app_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

DO $migration$ BEGIN
IF NOT EXISTS (SELECT 1 FROM app_migrations WHERE version='001-render') THEN
-- ISO UTC strings preserve the existing transcript API and pagination contract.
CREATE TABLE chat_sessions (
  id text PRIMARY KEY, token_hash text NOT NULL, nickname text NOT NULL,
  visitor_name text, surface text NOT NULL, started_at text NOT NULL,
  updated_at text NOT NULL, closed_at text
);
CREATE INDEX chat_sessions_updated_idx ON chat_sessions(updated_at, id);
CREATE TABLE chat_turns (
  id text PRIMARY KEY, session_id text NOT NULL REFERENCES chat_sessions(id),
  status text NOT NULL, started_at text NOT NULL, finished_at text,
  response_json text, response_status integer
);
CREATE INDEX chat_turns_session_idx ON chat_turns(session_id, started_at);
CREATE TABLE chat_messages (
  id serial PRIMARY KEY, session_id text NOT NULL REFERENCES chat_sessions(id),
  event_id text NOT NULL, role text NOT NULL, kind text NOT NULL,
  content text NOT NULL, metadata_json text, created_at text NOT NULL,
  UNIQUE(session_id, event_id, kind)
);
CREATE INDEX chat_messages_session_idx ON chat_messages(session_id, id);
CREATE TABLE chat_session_state (
  session_id text PRIMARY KEY REFERENCES chat_sessions(id), data_json text NOT NULL,
  updated_at text NOT NULL
);
CREATE TABLE demo_bookings (
  id text PRIMARY KEY, request_id text NOT NULL UNIQUE,
  session_id text NOT NULL REFERENCES chat_sessions(id), show_id text NOT NULL,
  quantity integer NOT NULL, email text NOT NULL, receipt_json text NOT NULL,
  created_at text NOT NULL
);
CREATE INDEX demo_bookings_session_idx ON demo_bookings(session_id, created_at);
CREATE TABLE app_settings (
  key text PRIMARY KEY, document text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE login_attempts (
  key text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL
);

INSERT INTO app_migrations(version) VALUES ('001-render');
END IF;
END $migration$;

DO $migration$ BEGIN
IF NOT EXISTS (SELECT 1 FROM app_migrations WHERE version='002-images') THEN
CREATE TABLE app_images (
  key text PRIMARY KEY,
  content bytea NOT NULL CHECK (octet_length(content) <= 3145728),
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_migrations(version) VALUES ('002-images');
END IF;
END $migration$;

DO $migration$ BEGIN
IF NOT EXISTS (SELECT 1 FROM app_migrations WHERE version='003-transfers') THEN
CREATE TABLE data_imports (
  digest text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_migrations(version) VALUES ('003-transfers');
END IF;
END $migration$;

DO $migration$ BEGIN
IF NOT EXISTS (SELECT 1 FROM app_migrations WHERE version='004-memory') THEN
-- Durable, session-scoped retrieval of older transcript excerpts.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS chat_messages_search_idx ON chat_messages USING gin(search_vector);

INSERT INTO app_migrations(version) VALUES ('004-memory');
END IF;
END $migration$;

COMMIT;
