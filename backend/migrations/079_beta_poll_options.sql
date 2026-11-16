-- Migration 079: Multi-option beta polls
--
-- Admin polls can now offer testers 2+ choices instead of just yes/no.
-- options JSONB: ["Choice A","Choice B",...] — NULL/empty means classic yes/no.
-- option_index records which option a tester picked (NULL for yes/no votes).

ALTER TABLE beta_feature_polls
  ADD COLUMN IF NOT EXISTS options JSONB DEFAULT NULL;

ALTER TABLE beta_feature_poll_votes
  ADD COLUMN IF NOT EXISTS option_index INTEGER DEFAULT NULL;

-- Widen the vote CHECK so option picks can be stored as 'option'.
ALTER TABLE beta_feature_poll_votes
  DROP CONSTRAINT IF EXISTS beta_feature_poll_votes_vote_check;
ALTER TABLE beta_feature_poll_votes
  ADD CONSTRAINT beta_feature_poll_votes_vote_check
  CHECK (vote IN ('yes','no','option'));
