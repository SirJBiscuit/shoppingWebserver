// ============================================================================
// BTCS — Beta Tester Contribution System
//
// Admin-visible XP layer for beta testers. The score is DERIVED from the
// contribution data the app already collects — nothing extra is written:
//
//   beta_feedback            10 pts each, +5 for bug reports
//   beta_pins                 8 pts each, +12 when admin marks it fixed
//   beta_feature_poll_votes   2 pts each
//   mdl_user_item_history     3 pts per distinct item contributed,
//                             +4 per priced observation
//   mdl_aisle_reports         4 pts each
//   recipes                   5 pts each
//   beta_testers.score_bonus  admin-granted points (can be negative)
//
// Score maps to a tier; the tier's perk set is what score actually unlocks.
// Per-tester overrides (pin_limit, feature flags) live in migration-114
// tables and sit above the tier defaults.
// ============================================================================

const db = require('../database/db');

const WEIGHTS = {
  feedback: 10,
  bugBonus: 5,
  pin: 8,
  pinFixedBonus: 12,
  pollVote: 2,
  mdlItem: 3,
  mdlPrice: 4,
  aisleReport: 4,
  recipe: 5,
};

const TIERS = [
  { key: 'elite',       label: 'Elite',       min: 700, perks: { pinLimit: 250 } },
  { key: 'veteran',     label: 'Veteran',     min: 300, perks: { pinLimit: 100 } },
  { key: 'contributor', label: 'Contributor', min: 100, perks: { pinLimit: 50 } },
  { key: 'rookie',      label: 'Rookie',      min: 0,   perks: { pinLimit: 30 } },
];

const tierFor = (score) => TIERS.find((t) => score >= t.min) || TIERS[TIERS.length - 1];

const zeroCounts = () => ({
  feedback: 0, bugs: 0, pins: 0, pinsFixed: 0, pollVotes: 0,
  mdlItems: 0, mdlPrices: 0, aisleReports: 0, recipes: 0,
});

const scoreFromCounts = (c, bonus = 0) =>
  c.feedback * WEIGHTS.feedback +
  c.bugs * WEIGHTS.bugBonus +
  c.pins * WEIGHTS.pin +
  c.pinsFixed * WEIGHTS.pinFixedBonus +
  c.pollVotes * WEIGHTS.pollVote +
  c.mdlItems * WEIGHTS.mdlItem +
  c.mdlPrices * WEIGHTS.mdlPrice +
  c.aisleReports * WEIGHTS.aisleReport +
  c.recipes * WEIGHTS.recipe +
  bonus;

// Contribution counts grouped by user_id. Each source is optional — a DB
// that predates a table just contributes 0 instead of failing the request.
const countContributions = async (userIds = null) => {
  const filter = userIds ? 'WHERE user_id = ANY($1)' : '';
  const params = userIds ? [userIds] : [];
  const merge = (map, rows, fn) => {
    rows.forEach((r) => {
      fn(map.get(r.user_id) || map.set(r.user_id, zeroCounts()).get(r.user_id), r);
    });
    return map;
  };
  let map = new Map();

  const safe = (sql) => db.query(sql, params).catch(() => ({ rows: [] }));

  const [feedback, pins, votes, items, prices, aisles, recipes, testers] = await Promise.all([
    safe(`SELECT user_id, COUNT(*)::int total, COUNT(*) FILTER (WHERE type='bug')::int bugs
          FROM beta_feedback ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(*)::int total, COUNT(*) FILTER (WHERE status='fixed')::int fixed
          FROM beta_pins ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(*)::int total FROM beta_feature_poll_votes ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(DISTINCT item_name_id)::int items
          FROM mdl_user_item_history ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(*) FILTER (WHERE price IS NOT NULL AND price > 0)::int priced
          FROM mdl_user_item_history ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(*)::int total FROM mdl_aisle_reports ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, COUNT(*)::int total FROM recipes ${filter} GROUP BY user_id`),
    safe(`SELECT user_id, score_bonus, pin_limit FROM beta_testers ${filter}`),
  ]);

  map = merge(map, feedback.rows, (c, r) => { c.feedback = r.total; c.bugs = r.bugs; });
  map = merge(map, pins.rows, (c, r) => { c.pins = r.total; c.pinsFixed = r.fixed; });
  map = merge(map, votes.rows, (c, r) => { c.pollVotes = r.total; });
  map = merge(map, items.rows, (c, r) => { c.mdlItems = r.items; });
  map = merge(map, prices.rows, (c, r) => { c.mdlPrices = r.priced; });
  map = merge(map, aisles.rows, (c, r) => { c.aisleReports = r.total; });
  map = merge(map, recipes.rows, (c, r) => { c.recipes = r.total; });

  const meta = new Map(testers.rows.map((r) => [r.user_id, r]));

  const result = new Map();
  for (const [uid, counts] of map) {
    const t = meta.get(uid) || {};
    const bonus = parseInt(t.score_bonus, 10) || 0;
    const score = Math.max(0, scoreFromCounts(counts, bonus));
    result.set(uid, {
      score,
      tier: tierFor(score),
      bonus,
      pinLimitOverride: t.pin_limit ?? null,
      counts,
      breakdown: {
        'Feedback': counts.feedback * WEIGHTS.feedback,
        'Bug reports': counts.bugs * WEIGHTS.bugBonus,
        'Pins': counts.pins * WEIGHTS.pin,
        'Pins fixed': counts.pinsFixed * WEIGHTS.pinFixedBonus,
        'Poll votes': counts.pollVotes * WEIGHTS.pollVote,
        'Items taught': counts.mdlItems * WEIGHTS.mdlItem,
        'Prices logged': counts.mdlPrices * WEIGHTS.mdlPrice,
        'Aisle reports': counts.aisleReports * WEIGHTS.aisleReport,
        'Recipes': counts.recipes * WEIGHTS.recipe,
        'Admin bonus': bonus,
      },
    });
  }
  return result;
};

/** Full BTCS record for one user: score, tier, counts, point breakdown. */
const getScore = async (userId) => {
  const map = await countContributions([userId]);
  return map.get(userId) || {
    score: 0, tier: tierFor(0), bonus: 0, pinLimitOverride: null,
    counts: zeroCounts(), breakdown: {},
  };
};

/** Bulk scores for the admin tester list — one query per source, not per user. */
const getScores = async (userIds) => countContributions(userIds);

/**
 * Effective open-pin limit per page for a user.
 * Priority: per-tester override → tier perk → 30 (the old hardcoded default).
 */
const pinLimitFor = async (userId) => {
  const { tier, pinLimitOverride } = await getScore(userId);
  if (pinLimitOverride != null) return pinLimitOverride;
  return tier?.perks?.pinLimit ?? 30;
};

module.exports = { WEIGHTS, TIERS, tierFor, getScore, getScores, pinLimitFor };
