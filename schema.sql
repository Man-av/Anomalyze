-- Anomalyze per-user analysis history.
-- Run once against the Neon/Postgres database (Neon SQL editor or psql).
--
-- Privacy: this table holds ONLY aggregates — the statistical `profile` and the
-- narrative `report` (both jsonb), plus file metadata. No raw rows, no cell
-- values are ever stored here.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text        NOT NULL,
  file_name     text        NOT NULL,
  file_size     integer,
  row_count     integer     NOT NULL,
  column_count  integer     NOT NULL,
  quality_score integer     NOT NULL,
  anomaly_count integer     NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  profile       jsonb       NOT NULL,
  report        jsonb       NOT NULL
);

CREATE INDEX IF NOT EXISTS history_user_created_idx
  ON history (user_id, created_at DESC);
