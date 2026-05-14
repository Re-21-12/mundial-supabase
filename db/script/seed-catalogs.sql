-- ===================================================================
-- Seed: CATALOG entries for all SELECT fields in dynamic forms
--
-- Taxonomy of table_id values:
--   1  → FK placeholder LEAGUE (existing, do not use for dropdowns)
--   2  → FK placeholder TEAM   (existing)
--   3  → FK placeholder STADIUM (existing)
--   4  → FK placeholder MATCH_PERIOD (existing)
--   10 → team_category  — used by teams-form  (filterField: table_id, filterValue: 10)
--   20 → league_type    — used by league-form  (filterField: table_id, filterValue: 20)
--   30 → period_type    — used by matchPeriodForm (filterField: table_id, filterValue: 30)
--   40 → transaction_type — used by transactionForm (filterField: table_id, filterValue: 40)
--   50 → country        — used by stadiumForm  (filterField: table_name, filterValue: 'country')
--   60 → league_status  — used by league status field (filterField: table_id, filterValue: 60)
-- ===================================================================

BEGIN;

-- -------------------------------------------------------------------
-- table_id = 10 | team_category
-- Used by: teams-form.ts  optionsSource.filterValue = 10
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (10, 'team_category', 'TEAM_CAT_SELECCION',   'Selección Nacional',   'seleccion',  1, CURRENT_TIMESTAMP, false),
  (10, 'team_category', 'TEAM_CAT_CLUB',         'Club de Liga',          'club',        1, CURRENT_TIMESTAMP, false),
  (10, 'team_category', 'TEAM_CAT_AMISTOSO',     'Equipo Amistoso',       'amistoso',    1, CURRENT_TIMESTAMP, false),
  (10, 'team_category', 'TEAM_CAT_RESERVA',      'Equipo de Reserva',     'reserva',     1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

-- -------------------------------------------------------------------
-- table_id = 20 | league_type
-- Used by: league-form.ts  optionsSource.filterValue = 20
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (20, 'league_type', 'LEAGUE_TYPE_REGULAR',    'Liga Regular',              'regular',     1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_COPA',        'Copa',                      'copa',        1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_ELIM',        'Eliminatoria Directa',      'eliminatoria',1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_APERTURA',    'Torneo Apertura',           'apertura',    1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_CLAUSURA',    'Torneo Clausura',           'clausura',    1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_AMISTOSO',    'Amistoso Internacional',    'amistoso',    1, CURRENT_TIMESTAMP, false),
  (20, 'league_type', 'LEAGUE_TYPE_CHAMPIONS',   'Champions / Continental',   'champions',   1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

-- -------------------------------------------------------------------
-- table_id = 30 | period_type
-- Used by: matchPeriodForm  optionsSource.filterValue = 30
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (30, 'period_type', 'PERIOD_1T',       '1er Tiempo',        '1T',  1, CURRENT_TIMESTAMP, false),
  (30, 'period_type', 'PERIOD_2T',       '2do Tiempo',        '2T',  1, CURRENT_TIMESTAMP, false),
  (30, 'period_type', 'PERIOD_TE1',      'Tiempo Extra 1',    'TE1', 1, CURRENT_TIMESTAMP, false),
  (30, 'period_type', 'PERIOD_TE2',      'Tiempo Extra 2',    'TE2', 1, CURRENT_TIMESTAMP, false),
  (30, 'period_type', 'PERIOD_PEN',      'Penales',           'PEN', 1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

-- -------------------------------------------------------------------
-- table_id = 40 | transaction_type
-- Used by: transactionForm  optionsSource.filterValue = 40
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (40, 'transaction_type', 'TRX_DEPOSITO',   'Depósito',           'deposito',   1, CURRENT_TIMESTAMP, false),
  (40, 'transaction_type', 'TRX_RETIRO',     'Retiro',             'retiro',     1, CURRENT_TIMESTAMP, false),
  (40, 'transaction_type', 'TRX_PREMIO',     'Premio Liga',         'premio',     1, CURRENT_TIMESTAMP, false),
  (40, 'transaction_type', 'TRX_CUOTA',      'Cuota de Entrada',   'cuota',      1, CURRENT_TIMESTAMP, false),
  (40, 'transaction_type', 'TRX_COMISION',   'Comisión Plataforma','comision',   1, CURRENT_TIMESTAMP, false),
  (40, 'transaction_type', 'TRX_AJUSTE',     'Ajuste Manual',      'ajuste',     1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

-- -------------------------------------------------------------------
-- table_id = 50 | country
-- Used by: stadiumForm  optionsSource filterField='table_name', filterValue='country'
-- Note: also indexed by table_name='country' for the table_name filter
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (50, 'country', 'COUNTRY_MX',  'México',     'MX',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_AR',  'Argentina',  'AR',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_BR',  'Brasil',     'BR',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_ES',  'España',     'ES',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_CO',  'Colombia',   'CO',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_CL',  'Chile',      'CL',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_UY',  'Uruguay',    'UY',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_FR',  'Francia',    'FR',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_DE',  'Alemania',   'DE',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_EN',  'Inglaterra', 'EN',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_IT',  'Italia',     'IT',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_PT',  'Portugal',   'PT',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_US',  'Estados Unidos', 'US', 1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_PE',  'Perú',       'PE',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_EC',  'Ecuador',    'EC',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_PY',  'Paraguay',   'PY',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_VE',  'Venezuela',  'VE',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_NL',  'Países Bajos','NL', 1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_BE',  'Bélgica',    'BE',  1, CURRENT_TIMESTAMP, false),
  (50, 'country', 'COUNTRY_HR',  'Croacia',    'HR',  1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

-- -------------------------------------------------------------------
-- table_id = 60 | league_status
-- Used by: league-form status field (if converted to SELECT)
-- -------------------------------------------------------------------
INSERT INTO "CATALOG" (
  "table_id", "table_name", "neumonic", "description", "value",
  "created_by", "created_at", "is_deleted"
)
VALUES
  (60, 'league_status', 'LEAGUE_STATUS_ACTIVE',   'Activa',      'active',    1, CURRENT_TIMESTAMP, false),
  (60, 'league_status', 'LEAGUE_STATUS_INACTIVE', 'Inactiva',    'inactive',  1, CURRENT_TIMESTAMP, false),
  (60, 'league_status', 'LEAGUE_STATUS_FINISHED', 'Finalizada',  'finished',  1, CURRENT_TIMESTAMP, false),
  (60, 'league_status', 'LEAGUE_STATUS_DRAFT',    'Borrador',    'draft',     1, CURRENT_TIMESTAMP, false)
ON CONFLICT (neumonic) DO NOTHING;

COMMIT;
