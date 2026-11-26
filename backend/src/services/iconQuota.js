const db = require('../database/db');

// Beta tester icon quota — 5 item_icon uploads/day until they've earned
// contribution credit: 10 of their MDL term suggestions approved.
// Non-beta users and admins are unlimited.
const ICON_DAILY_LIMIT = 5;
const ICON_CONTRIB_THRESHOLD = 10;

const iconQuota = async (userId) => {
  const u = await db.query(
    'SELECT is_beta_tester, is_admin FROM users WHERE id = $1', [userId]
  );
  const row = u.rows[0] || {};
  if (!row.is_beta_tester || row.is_admin) {
    return { unlimited: true, used: 0, limit: ICON_DAILY_LIMIT, contribution: 0, threshold: ICON_CONTRIB_THRESHOLD };
  }
  const [usedR, contribR] = await Promise.all([
    db.query(
      `SELECT COUNT(*)::int AS n FROM images
       WHERE user_id = $1 AND image_type = 'item_icon' AND created_at > NOW() - INTERVAL '1 day'`,
      [userId]
    ),
    db.query(
      `SELECT COUNT(*)::int AS n FROM mdl_custom_terms
       WHERE created_by = $1 AND status = 'approved'`,
      [userId]
    ),
  ]);
  const contribution = contribR.rows[0].n;
  return {
    unlimited: contribution >= ICON_CONTRIB_THRESHOLD,
    used: usedR.rows[0].n,
    limit: ICON_DAILY_LIMIT,
    contribution,
    threshold: ICON_CONTRIB_THRESHOLD,
  };
};

module.exports = { iconQuota, ICON_DAILY_LIMIT, ICON_CONTRIB_THRESHOLD };
