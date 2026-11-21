-- Migration 103: server-side "don't show automatically" flag for the tutorial.
-- The tutorial's opt-out checkbox previously lived only in localStorage, so it
-- didn't follow the account across devices. onboarding_never persists it.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS onboarding_never BOOLEAN NOT NULL DEFAULT false;
