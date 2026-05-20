-- v3.13: Add previous_rank to USER_LEAGUE and end_time to MATCH

ALTER TABLE "USER_LEAGUE"
  ADD COLUMN IF NOT EXISTS previous_rank SMALLINT NULL;

ALTER TABLE "MATCH"
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ NULL;

INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.13',
  'add-previous-rank-and-end-time',
  'Adds previous_rank to USER_LEAGUE for standings trend display, and end_time to MATCH for match scheduling',
  'db/script/v3.13-add-previous-rank-and-end-time.sql',
  NOW(),
  'applied'
);
