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
