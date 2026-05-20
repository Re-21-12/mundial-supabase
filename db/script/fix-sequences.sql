-- Fix all sequences to max existing IDs
SELECT setval('"TEAM_team_id_seq"',      COALESCE((SELECT MAX(team_id)      FROM "TEAM"),      1), true);
SELECT setval('"STADIUM_stadium_id_seq"', COALESCE((SELECT MAX(stadium_id)   FROM "STADIUM"),   1), true);
SELECT setval('"MATCH_match_id_seq"',    COALESCE((SELECT MAX(match_id)     FROM "MATCH"),     1), true);
SELECT setval('"LEAGUE_league_id_seq"',  COALESCE((SELECT MAX(league_id)    FROM "LEAGUE"),    1), true);
SELECT setval('"GRUPO_grupo_id_seq"',    COALESCE((SELECT MAX(grupo_id)     FROM "GRUPO"),     1), true);
SELECT setval('"WORLD_LEAGUE_world_league_id_seq"', COALESCE((SELECT MAX(world_league_id) FROM "WORLD_LEAGUE"), 1), true);
