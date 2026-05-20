SELECT 'STADIUM'       AS tbl, COUNT(*)::int AS cnt FROM "STADIUM"       WHERE is_deleted=false AND name NOT IN ('KicheFC','PacayaFC','PacayaFCC','nuevoequipo','aaa')
UNION ALL
SELECT 'TEAM',           COUNT(*) FROM "TEAM"           WHERE is_deleted=false
UNION ALL
SELECT 'GRUPO',          COUNT(*) FROM "GRUPO"          WHERE is_deleted=false
UNION ALL
SELECT 'MATCH',          COUNT(*) FROM "MATCH"          WHERE is_deleted=false
UNION ALL
SELECT 'GRUPO_STANDING', COUNT(*) FROM "GRUPO_STANDING" WHERE is_deleted=false
UNION ALL
SELECT 'TEAM_LEAGUE',    COUNT(*) FROM "TEAM_LEAGUE"    WHERE is_deleted=false;
