CREATE TABLE app_images (
  key text PRIMARY KEY,
  content bytea NOT NULL CHECK (octet_length(content) <= 3145728),
  content_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
