-- v3.12 — Agrega columna logo_url a TEAM, LEAGUE, STADIUM, WORLD_LEAGUE
-- Ejecutar: export SUPABASE_DB_PASSWORD=... && npx supabase db query --linked -f db/script/v3.12-add-logo-url.sql

ALTER TABLE "TEAM"         ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;
ALTER TABLE "LEAGUE"       ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;
ALTER TABLE "STADIUM"      ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;
ALTER TABLE "WORLD_LEAGUE" ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- Registrar en MIGRATION_LOG
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES
  ('v3.12.0', 'add_logo_url_team',         'add logo_url to TEAM',        'db/script/v3.12-add-logo-url.sql', NOW(), 'applied'),
  ('v3.12.1', 'add_logo_url_league',       'add logo_url to LEAGUE',      'db/script/v3.12-add-logo-url.sql', NOW(), 'applied'),
  ('v3.12.2', 'add_logo_url_stadium',      'add logo_url to STADIUM',     'db/script/v3.12-add-logo-url.sql', NOW(), 'applied'),
  ('v3.12.3', 'add_logo_url_world_league', 'add logo_url to WORLD_LEAGUE','db/script/v3.12-add-logo-url.sql', NOW(), 'applied')
ON CONFLICT DO NOTHING;
