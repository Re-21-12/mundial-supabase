-- v3.30: Schedule match-reminder Edge Function via pg_cron + pg_net
-- Runs every minute; the function itself only acts when a match ends in 15-16 min.
--
-- PREREQUISITES:
--   1. pg_cron   must be enabled: Dashboard → Database → Extensions → pg_cron
--   2. pg_net    must be enabled: Dashboard → Database → Extensions → pg_net
--
-- BEFORE RUNNING: replace the two placeholders below with your project values:
--   <PROJECT_REF>     → e.g. abcdefghijklmnop  (Dashboard → Settings → General)
--   <SERVICE_ROLE_KEY> → Dashboard → Settings → API → service_role secret
--
-- You can also store these in Vault (vault.secrets) and select them inside the
-- cron body; hardcoded values are kept here for simplicity.

SELECT cron.schedule(
  'match-reminder-every-minute',   -- unique job name (run cron.unschedule() to remove)
  '* * * * *',                     -- every minute
  $cron$
  SELECT
    net.http_post(
      url     := 'https://mwflkwazlhvrtckbbkpi.supabase.co/functions/v1/match-reminder',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im13Zmxrd2F6bGh2cnRja2Jia3BpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDI5NTMzMSwiZXhwIjoyMDg5ODcxMzMxfQ.LGRu5grxW1mh_AhnMQod1YZNlTOPaX_cEkSLksRJm7w'
      ),
      body    := '{}'::jsonb
    );
  $cron$
);

-- To verify the job was registered:
-- SELECT * FROM cron.job WHERE jobname = 'match-reminder-every-minute';

-- To disable / remove when the World Cup ends:
-- SELECT cron.unschedule('match-reminder-every-minute');
