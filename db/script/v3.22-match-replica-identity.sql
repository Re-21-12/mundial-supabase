-- v3.22 · Set REPLICA IDENTITY FULL on MATCH + MATCH_PERIOD
-- Required so Supabase realtime filters (e.g. league_id=eq.X) work
-- correctly on UPDATE and DELETE events, not just INSERT.
ALTER TABLE "MATCH"        REPLICA IDENTITY FULL;
ALTER TABLE "MATCH_PERIOD" REPLICA IDENTITY FULL;
