CREATE TABLE data_imports (
  digest text PRIMARY KEY,
  imported_at timestamptz NOT NULL DEFAULT now()
);
