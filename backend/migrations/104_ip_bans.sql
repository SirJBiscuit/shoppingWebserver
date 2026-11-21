-- IP bans for the brute-force/bot guard (services/ipGuard.js).
-- Bans live in memory for fast checks; this table makes them durable
-- across restarts and gives the admin panel a view/unban surface.
CREATE TABLE IF NOT EXISTS ip_bans (
    ip          TEXT PRIMARY KEY,
    reason      TEXT NOT NULL DEFAULT '',
    banned_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at  TIMESTAMP NOT NULL,
    unbanned_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ip_bans_active
    ON ip_bans (expires_at) WHERE unbanned_at IS NULL;
