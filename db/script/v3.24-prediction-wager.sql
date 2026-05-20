-- v3.24 · Add buy_in_amount to LEAGUE + wager_amount to PREDICTION
-- buy_in_amount: cost per participant to join a paid league (0 = free)
-- wager_amount:  amount the user bets on a specific prediction in a paid league

ALTER TABLE "LEAGUE"
  ADD COLUMN IF NOT EXISTS buy_in_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE "PREDICTION"
  ADD COLUMN IF NOT EXISTS wager_amount NUMERIC(10,2) NOT NULL DEFAULT 0;
