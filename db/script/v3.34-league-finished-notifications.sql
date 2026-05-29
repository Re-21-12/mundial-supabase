-- v3.34: Notifications when a league is set to 'finished'
--
-- Creates notify_league_finished(p_league_id) that inserts one
-- NOTIFICATION_INBOX row per approved member with their rank and prize.
-- Called at the end of trigger_settle_league_rewards so it fires on
-- every path that closes a league (manual update, auto-close from MATCH,
-- or Angular-initiated close).
--
-- Idempotent: skips users that already have a league_finished notification
-- for this league.

-- Enable Realtime for NOTIFICATION_INBOX so Angular subscriptions work
ALTER TABLE "NOTIFICATION_INBOX" REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "NOTIFICATION_INBOX";
EXCEPTION WHEN OTHERS THEN
  NULL; -- table already in publication
END;
$$;

-- -----------------------------------------------------------------------------
-- 1) Helper: insert one notification per member
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_league_finished(p_league_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_league_name TEXT;
  v_rec         RECORD;
  v_body        TEXT;
  v_prize       NUMERIC(12,2);
BEGIN
  SELECT name
  INTO   v_league_name
  FROM   "LEAGUE"
  WHERE  league_id = p_league_id
    AND  is_deleted = false;

  IF v_league_name IS NULL THEN
    RETURN;
  END IF;

  FOR v_rec IN
    SELECT
      ul.user_id,
      ul.user_league_id,
      COALESCE(ul.accumulated_points, 0)                         AS pts,
      DENSE_RANK() OVER (
        ORDER BY COALESCE(ul.accumulated_points, 0) DESC
      )                                                          AS rank_pos,
      COALESCE(ulr.amount, 0)                                    AS prize_amount
    FROM "USER_LEAGUE" ul
    LEFT JOIN "USER_LEAGUE_REWARD" ulr
      ON  ulr.user_league_id = ul.user_league_id
      AND ulr.is_deleted = false
    WHERE ul.league_id   = p_league_id
      AND ul.is_deleted  = false
  LOOP
    -- Idempotency: skip if notification already sent for this user+league
    IF EXISTS (
      SELECT 1 FROM "NOTIFICATION_INBOX"
      WHERE  user_id           = v_rec.user_id
        AND  league_id         = p_league_id
        AND  notification_type = 'league_finished'
        AND  is_deleted        = false
    ) THEN
      CONTINUE;
    END IF;

    v_prize := v_rec.prize_amount;

    IF v_prize > 0 THEN
      v_body :=
        'Terminaste en el lugar #' || v_rec.rank_pos ||
        ' con '  || v_rec.pts    || ' pts. ' ||
        'Premio acreditado a tu wallet: $' || v_prize || ' Q.';
    ELSE
      v_body :=
        'Terminaste en el lugar #' || v_rec.rank_pos ||
        ' con '  || v_rec.pts    || ' pts.';
    END IF;

    INSERT INTO "NOTIFICATION_INBOX" (
      user_id,
      league_id,
      notification_type,
      title,
      body,
      icon,
      action_url,
      payload,
      priority,
      is_read,
      browser_notification_sent,
      created_by,
      created_at,
      is_deleted
    )
    VALUES (
      v_rec.user_id,
      p_league_id,
      'league_finished',
      'Liga finalizada: ' || v_league_name,
      v_body,
      '/assets/icons/trophy-icon.png',
      '/league/' || p_league_id || '/standings',
      jsonb_build_object(
        'league_id',  p_league_id,
        'rank',       v_rec.rank_pos,
        'points',     v_rec.pts,
        'prize',      v_prize
      ),
      'high',
      false,
      false,
      1,
      NOW(),
      false
    );
  END LOOP;
END;
$$;

-- -----------------------------------------------------------------------------
-- 2) Update trigger to also call notify_league_finished after prize settlement
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_settle_league_rewards()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM settle_league_rewards(NEW.league_id);
    PERFORM notify_league_finished(NEW.league_id);
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger already exists from v3.26/v3.27 — recreate to pick up new function body
DROP TRIGGER IF EXISTS trigger_settle_league_rewards ON "LEAGUE";
CREATE TRIGGER trigger_settle_league_rewards
  AFTER UPDATE OF status ON "LEAGUE"
  FOR EACH ROW
  EXECUTE FUNCTION trigger_settle_league_rewards();

-- -----------------------------------------------------------------------------
-- 3) Migration log
-- -----------------------------------------------------------------------------
INSERT INTO "MIGRATION_LOG" (version, name, description, script_path, applied_at, status)
VALUES (
  'v3.34',
  'league-finished-notifications',
  'Inserts NOTIFICATION_INBOX rows for all members when a league is set to finished. Idempotent. Fires on manual update and auto-close.',
  'db/script/v3.34-league-finished-notifications.sql',
  NOW(),
  'applied'
)
ON CONFLICT (version) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description,
      script_path = EXCLUDED.script_path,
      applied_at  = EXCLUDED.applied_at,
      status      = EXCLUDED.status;
