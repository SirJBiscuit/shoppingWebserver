-- Migration 096: server-side onboarding/tutorial flag
--
-- The tutorial's "seen" state used to live only in localStorage, which meant
-- (a) it never followed an account across devices/browsers and (b) a bumped
-- tutorial version couldn't reliably re-fire for existing accounts.
-- users.onboarding_version records the last tutorial version the account
-- completed/skipped so the client can re-show it whenever the version
-- advances — for brand-new AND existing accounts.

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_version VARCHAR(20);
