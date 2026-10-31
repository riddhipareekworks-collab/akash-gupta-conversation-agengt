-- Durable, session-scoped retrieval of older transcript excerpts.
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (to_tsvector('simple', coalesce(content, ''))) STORED;
CREATE INDEX IF NOT EXISTS chat_messages_search_idx ON chat_messages USING gin(search_vector);
