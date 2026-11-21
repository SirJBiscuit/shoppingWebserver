/**
 * ipGuard — brute-force / bot-scan IP guard.
 *
 * Failure sources call recordFailure(ip, reason): failed logins, 404s on
 * unknown /api paths (bot scans), or an instant ban via
 * middleware suspiciousPathGuard for classic exploit probes.
 *
 * Threshold: FAIL_THRESHOLD failures inside FAIL_WINDOW -> banned for
 * BAN_TTL. Bans are cached in memory and persisted to ip_bans so they
 * survive restarts; expired bans are lazily dropped on lookup.
 *
 * Local/LAN/Docker ranges are never bannable — the reverse proxy
 * (cloudflared on 127.0.0.1) must never be able to lock the site out.
 * req.ip is the real client because server.js sets `trust proxy`.
 */
const db = require('../database/db');
const { notifyAdmin } = require('./ntfyService');

const FAIL_WINDOW_MS = 10 * 60 * 1000;   // failures counted within 10 min
const FAIL_THRESHOLD = 10;               // failures -> ban
const BAN_TTL_MS = 24 * 60 * 60 * 1000;  // 24h ban
const MAX_FAILURE_KEYS = 5000;           // memory cap for the counter map

const failures = new Map(); // ip -> number[] timestamps
const banned = new Map();   // ip -> { reason, expiresAt }

const INTERNAL_IP = /^(::ffff:)?(127\.|::1$|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|169\.254\.|fe80)/;

const isInternal = (ip) => !ip || INTERNAL_IP.test(ip);

// Paths nobody legitimately requests — instant ban, no counter needed.
// (Probes under /api reach Express; the SPA/nginx filter the rest.)
const EXPLOIT_PROBE = /\.env|wp-?admin|phpmyadmin|\.git|xmlrpc|boaform|hnd1|\.php$|\/etc\/passwd|eval\(|cmd=|union select/i;

async function ban(ip, reason, ttlMs = BAN_TTL_MS) {
  if (isInternal(ip)) return;
  const existing = banned.get(ip);
  const expiresAt = Date.now() + ttlMs;
  if (existing && existing.expiresAt > Date.now()) {
    existing.expiresAt = expiresAt; // refresh, no re-notify
    return;
  }
  banned.set(ip, { reason, expiresAt });

  try {
    await db.query(
      `INSERT INTO ip_bans (ip, reason, expires_at)
       VALUES ($1, $2, to_timestamp($3 / 1000.0))
       ON CONFLICT (ip) DO UPDATE SET
         reason = EXCLUDED.reason,
         banned_at = CURRENT_TIMESTAMP,
         expires_at = EXCLUDED.expires_at,
         unbanned_at = NULL`,
      [ip, reason, expiresAt]
    );
  } catch (e) {
    console.warn('ipGuard: failed to persist ban:', e.message);
  }

  console.warn(`🚫 ipGuard: banned ${ip} for ${ttlMs / 3600000}h — ${reason}`);
  notifyAdmin(
    'security',
    'IP blocked — brute force detected',
    `${ip} was banned for ${Math.round(ttlMs / 3600000)}h.\nReason: ${reason}`,
    { tags: 'warning,shield', priority: 4 }
  );
}

function recordFailure(ip, reason = 'repeated failed requests') {
  if (isInternal(ip)) return;
  const now = Date.now();
  const list = failures.get(ip) || [];
  const recent = list.filter((t) => now - t < FAIL_WINDOW_MS);
  recent.push(now);
  if (failures.size > MAX_FAILURE_KEYS && !failures.has(ip)) return; // cap; attacker still banned by count on existing keys
  failures.set(ip, recent);
  if (recent.length >= FAIL_THRESHOLD) {
    failures.delete(ip);
    ban(ip, `${recent.length}+ ${reason} within ${FAIL_WINDOW_MS / 60000}min`);
  }
}

function recordSuspicious(ip, path) {
  ban(ip, `exploit probe (${String(path).slice(0, 80)})`);
}

function isBanned(ip) {
  const entry = banned.get(ip);
  if (!entry) return false;
  if (entry.expiresAt > Date.now()) return true;
  banned.delete(ip);
  return false;
}

async function unban(ip) {
  banned.delete(ip);
  failures.delete(ip);
  try {
    await db.query('UPDATE ip_bans SET unbanned_at = CURRENT_TIMESTAMP WHERE ip = $1', [ip]);
  } catch (e) {
    console.warn('ipGuard: failed to persist unban:', e.message);
  }
}

async function listBans() {
  try {
    const r = await db.query(
      `SELECT ip, reason, banned_at, expires_at
       FROM ip_bans
       WHERE unbanned_at IS NULL AND expires_at > CURRENT_TIMESTAMP
       ORDER BY banned_at DESC LIMIT 200`
    );
    return r.rows;
  } catch {
    // Table may not exist yet — memory view is still accurate
    return [...banned.entries()].map(([ip, b]) => ({
      ip, reason: b.reason, banned_at: null, expires_at: new Date(b.expiresAt),
    }));
  }
}

/** Reject banned IPs outright — mounted before everything else under /api. */
const banMiddleware = (req, res, next) =>
  isBanned(req.ip)
    ? res.status(403).json({ error: 'Access denied' })
    : next();

/** Instant-ban on classic exploit probe paths under /api. */
const probeGuard = (req, res, next) => {
  if (EXPLOIT_PROBE.test(req.path)) {
    recordSuspicious(req.ip, req.originalUrl);
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
};

/** Unknown /api path -> count as a scan attempt (bots hit thresholds fast). */
const notFoundGuard = (req, res) => {
  recordFailure(req.ip, 'requests to unknown API paths');
  res.status(404).json({ error: 'Not found' });
};

/** Load active bans on boot so restarts don't free attackers. */
async function loadBans() {
  try {
    const r = await db.query(
      `SELECT ip, reason, expires_at FROM ip_bans
       WHERE unbanned_at IS NULL AND expires_at > CURRENT_TIMESTAMP`
    );
    for (const row of r.rows) {
      banned.set(row.ip, { reason: row.reason, expiresAt: new Date(row.expires_at).getTime() });
    }
    if (r.rows.length) console.log(`ipGuard: restored ${r.rows.length} active ban(s)`);
  } catch (e) {
    // Pre-migration boot — memory-only mode until the table exists
    if (!/does not exist/.test(e.message)) console.warn('ipGuard loadBans:', e.message);
  }
}

module.exports = {
  recordFailure,
  recordSuspicious,
  isBanned,
  ban,
  unban,
  listBans,
  loadBans,
  banMiddleware,
  probeGuard,
  notFoundGuard,
};
