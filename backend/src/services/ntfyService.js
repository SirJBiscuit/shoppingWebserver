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

/** Load one user's ntfy settings row (may not exist). */
async function getUserSettings(userId) {
  const { rows } = await db.query(
    'SELECT topic, enabled, types, last_expiry_alert_at FROM ntfy_user_settings WHERE user_id = $1',
    [userId]
  );
  return rows[0] || null;
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
    if (!s || !s.enabled || !s.topic) return false;
    if (s.types?.[type] === false) return false;
    return await publish(s.topic, title, message, opts);
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
    const { rows } = await db.query(
      `SELECT s.topic FROM ntfy_user_settings s
       JOIN users u ON u.id = s.user_id
       WHERE s.enabled = TRUE AND s.topic <> ''
         AND (s.types->>$1)::boolean IS DISTINCT FROM FALSE
         ${betaOnly ? 'AND u.is_beta_tester = TRUE' : ''}`,
      [type]
    );
    const results = await Promise.allSettled(
      rows.map((r) => publish(r.topic, title, message, { tags, priority }))
    );
    return results.filter((r) => r.status === 'fulfilled' && r.value).length;
  } catch (err) {
    console.warn('ntfy notifyUsers failed:', err.message);
    return 0;
  }
}

/** Notify the admin topic for a given alert type. */
async function notifyAdmin(type, title, message, opts = {}) {
  try {
    const s = await getAdminSettings();
    if (!s || !s.enabled || !s.topic) return false;
    if (s.types?.[type] === false) return false;
    return await publish(s.topic, title, message, opts);
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
    if (!s || !s.enabled || !s.topic) return;
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

module.exports = {
  publish,
  sanitizeTopic,
  getUserSettings,
  getAdminSettings,
  notifyUser,
  notifyUsers,
  notifyAdmin,
  maybeNotifyExpiring,
};
