const db = require('../database/db');

/**
 * ntfy.sh push notification service.
 *
 * Two audiences:
 *  - Users: each user may set their own ntfy topic in Settings and toggle
 *    which notification types they want (ntfy_user_settings).
 *  - Admins: a single server-side topic (ntfy_admin_settings) receives
 *    operational alerts (releases, beta signups, feedback).
 *
 * Everything is fire-and-forget: ntfy failures must never break a request.
 * Node 18+ has global fetch; if unavailable we silently skip.
 */

const NTFY_BASE = process.env.NTFY_BASE_URL || 'https://ntfy.sh';
const TOPIC_RE = /^[a-zA-Z0-9_-]{1,200}$/;

const sanitizeTopic = (t) => (typeof t === 'string' && TOPIC_RE.test(t.trim()) ? t.trim() : null);

/** Best-effort send log — powers the floating ntfy panel's recent feed.
 *  Never throws; silently skips when the table doesn't exist yet. */
async function logSend(userId, type, title, message, delivered, scope = 'user') {
  try {
    await db.query(
      `INSERT INTO ntfy_notifications (user_id, scope, type, title, message, delivered)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, scope, type, String(title || ''), String(message || ''), delivered === true]
    );
  } catch (err) {
    console.warn('ntfy logSend skipped:', err.message);
  }
}

/** Low-level publish. Returns true/false. Never throws. */
async function publish(topic, title, message, { tags = 'listzy', priority = 3 } = {}) {
  const safe = sanitizeTopic(topic);
  if (!safe || typeof fetch !== 'function') return false;
  try {
    const res = await fetch(`${NTFY_BASE}/${safe}`, {
      method: 'POST',
      headers: {
        'Title': String(title || 'Listzy'),
        'Tags': tags,
        'Priority': String(priority),
        'Content-Type': 'text/plain; charset=utf-8',
      },
      body: String(message || ''),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch (err) {
    console.warn('ntfy publish failed:', err.message);
    return false;
  }
}

/** Load one user's ntfy settings row (may not exist). On a partially
 *  migrated schema (missing types/last_expiry_alert_at) we retry with the
 *  base columns instead of failing every user-side push — prod repairs
 *  are in migration 101. */
async function getUserSettings(userId) {
  try {
    const { rows } = await db.query(
      'SELECT topic, enabled, types, last_expiry_alert_at FROM ntfy_user_settings WHERE user_id = $1',
      [userId]
    );
    return rows[0] || null;
  } catch (err) {
    if (err.code !== '42703') throw err; // undefined_column → slim retry only
    const { rows } = await db.query(
      'SELECT topic, enabled FROM ntfy_user_settings WHERE user_id = $1',
      [userId]
    );
    return rows[0] ? { ...rows[0], types: {}, last_expiry_alert_at: null } : null;
  }
}

/** Load the admin ntfy settings row (may not exist). */
async function getAdminSettings() {
  const { rows } = await db.query(
    'SELECT topic, enabled, types FROM ntfy_admin_settings WHERE id = 1'
  );
  return rows[0] || null;
}

/**
 * Notify a single user by type. Respects enabled + per-type toggle
 * (a type missing from `types` counts as ON — opts out is explicit).
 */
async function notifyUser(userId, type, title, message, opts = {}) {
  try {
    const s = await getUserSettings(userId);
    if (!s?.enabled || !s.topic) return false;
    if (s.types?.[type] === false) return false;
    const ok = await publish(s.topic, title, message, opts);
    await logSend(userId, type, title, message, ok);
    return ok;
  } catch (err) {
    console.warn('ntfy notifyUser failed:', err.message);
    return false;
  }
}

/**
 * Fan-out to every user who has ntfy enabled for this type.
 * betaOnly restricts to beta testers.
 */
async function notifyUsers(type, title, message, { betaOnly = false, tags = 'listzy', priority = 3 } = {}) {
  try {
    let rows;
    try {
      ({ rows } = await db.query(
        `SELECT s.user_id, s.topic FROM ntfy_user_settings s
         JOIN users u ON u.id = s.user_id
         WHERE s.enabled = TRUE AND s.topic <> ''
           AND (s.types->>$1)::boolean IS DISTINCT FROM FALSE
           ${betaOnly ? 'AND u.is_beta_tester = TRUE' : ''}`,
        [type]
      ));
    } catch (err) {
      if (err.code !== '42703') throw err;
      // No types column — treat everyone enabled as opted in
      ({ rows } = await db.query(
        `SELECT s.user_id, s.topic FROM ntfy_user_settings s
         JOIN users u ON u.id = s.user_id
         WHERE s.enabled = TRUE AND s.topic <> ''
           ${betaOnly ? 'AND u.is_beta_tester = TRUE' : ''}`
      ));
    }
    const results = await Promise.allSettled(
      rows.map((r) => publish(r.topic, title, message, { tags, priority }))
    );
    const sent = results.map((r) => r.status === 'fulfilled' && r.value);
    await Promise.all(rows.map((r, i) => logSend(r.user_id, type, title, message, sent[i])));
    return sent.filter(Boolean).length;
  } catch (err) {
    console.warn('ntfy notifyUsers failed:', err.message);
    return 0;
  }
}

/** Notify the admin topic for a given alert type. */
async function notifyAdmin(type, title, message, opts = {}) {
  try {
    const s = await getAdminSettings();
    if (!s?.enabled || !s.topic) return false;
    if (s.types?.[type] === false) return false;
    const ok = await publish(s.topic, title, message, opts);
    await logSend(null, type, title, message, ok, 'admin');
    return ok;
  } catch (err) {
    console.warn('ntfy notifyAdmin failed:', err.message);
    return false;
  }
}

/**
 * Daily-deduped "expiring items" digest for one user.
 * Called when the app surfaces expiring items; sends at most once per 20h.
 */
async function maybeNotifyExpiring(userId) {
  try {
    const s = await getUserSettings(userId);
    if (!s?.enabled || !s.topic) return;
    if (s.types?.expiry === false) return;
    if (s.last_expiry_alert_at && Date.now() - new Date(s.last_expiry_alert_at).getTime() < 20 * 3600 * 1000) return;

    const { rows } = await db.query(
      `SELECT item_name, estimated_expiry_date
       FROM inventory
       WHERE user_id = $1
         AND estimated_expiry_date IS NOT NULL
         AND estimated_expiry_date <= CURRENT_DATE + INTERVAL '3 days'
         AND estimated_expiry_date >= CURRENT_DATE - INTERVAL '1 day'
       ORDER BY estimated_expiry_date ASC
       LIMIT 10`,
      [userId]
    );
    if (rows.length === 0) return;

    const list = rows
      .map((r) => `• ${r.item_name} (${new Date(r.estimated_expiry_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`)
      .join('\n');
    const sent = await publish(
      s.topic,
      `Expiring soon: ${rows.length} item${rows.length === 1 ? '' : 's'}`,
      `Use these up:\n${list}`,
      { tags: 'warning,food', priority: 4 }
    );
    await logSend(userId, 'expiry', `Expiring soon: ${rows.length} item${rows.length === 1 ? '' : 's'}`, `Use these up:\n${list}`, sent);
    if (sent) {
      await db.query(
        'UPDATE ntfy_user_settings SET last_expiry_alert_at = NOW() WHERE user_id = $1',
        [userId]
      );
    }
  } catch (err) {
    console.warn('ntfy maybeNotifyExpiring failed:', err.message);
  }
}

/**
 * Persist the admin alert topic to the mounted repo dir so the host-side
 * watchdog (watchdog.sh) can still send "site down" pings when the backend
 * and even the database are unreachable. Best-effort, never throws.
 */
async function writeWatchdogFile(topic, enabled, types = {}) {
  try {
    const fs = require('fs').promises;
    const path = require('path');
    const file = {
      topic: sanitizeTopic(topic) || '',
      enabled: enabled === true,
      downtime: types?.downtime !== false, // missing counts as ON
      updated: new Date().toISOString()
    };
    await fs.writeFile(
      path.join(process.env.REPO_DIR || '/opt/cloudmc-shop', '.ntfy-watchdog.json'),
      JSON.stringify(file, null, 2)
    );
  } catch (err) {
    console.warn('ntfy watchdog file write skipped:', err.message);
  }
}

module.exports = {
  publish,
  logSend,
  sanitizeTopic,
  getUserSettings,
  getAdminSettings,
  notifyUser,
  notifyUsers,
  notifyAdmin,
  maybeNotifyExpiring,
  writeWatchdogFile,
};
