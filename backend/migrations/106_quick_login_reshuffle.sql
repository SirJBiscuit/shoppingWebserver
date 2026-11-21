-- Per-tap grid reshuffle preference for quick login challenges.
-- true = grid re-scatters after every tap (observer can't predict tap spots);
-- false = layout stays fixed for the whole challenge.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS quick_login_reshuffle BOOLEAN NOT NULL DEFAULT true;
