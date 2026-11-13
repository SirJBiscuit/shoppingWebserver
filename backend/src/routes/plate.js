/**
 * Plate system API (migration 065)
 *
 * Per-member daily plates: food-group servings, estimated calories/macros,
 * whole-plate balance score, and recipe recommendations against group gaps.
 * Scoring is pluggable via services/plateScoring.js — each member picks an
 * engine (household_members.health_service), and each entry stores which
 * engine scored it (plate_entries.health_service + scores_by_service).
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { listServices, resolveScorer, detectGroup, GROUPS_OF_PLATE } = require('../services/plateScoring');
const { compareRecipeWithInventory } = require('../services/recipeInventoryService');

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const DEFAULT_CAL_TARGET = 2000;

/** Healthier-swap hints for 'extras' entries (recommendation engine v0). */
const SWAPS = {
  chips: 'nuts or air-popped popcorn',
  fries: 'baked sweet potato wedges',
  soda: 'sparkling water with lime',
  candy: 'fresh fruit or dates',
  'ice cream': 'frozen yogurt or a fruit smoothie',
  cookies: 'oatmeal with honey',
  donut: 'whole-grain toast with peanut butter',
};

const swapFor = (name) => {
  const lower = (name || '').toLowerCase();
  for (const [k, v] of Object.entries(SWAPS)) if (lower.includes(k)) return v;
  return 'a produce or protein alternative';
};

/** Resolve member row + its scoring service. member_id NULL/0 → owner. */
const memberContext = async (userId, memberId) => {
  if (!memberId) {
    return { member: null, scorer: resolveScorer(null), target: DEFAULT_CAL_TARGET };
  }
  const r = await db.query(
    'SELECT * FROM household_members WHERE id = $1 AND user_id = $2',
    [memberId, userId]
  );
  if (!r.rows[0]) return null;
  return {
    member: r.rows[0],
    scorer: resolveScorer(r.rows[0].health_service),
    target: r.rows[0].daily_calorie_target || DEFAULT_CAL_TARGET,
  };
};

// ---------------------------------------------------------------------------
// Members + services
// ---------------------------------------------------------------------------

/** GET /api/plate/members — owner pseudo-member + household members + their service */
router.get('/members', authenticateToken, async (req, res) => {
  try {
    const members = await db.query(
      `SELECT id, name, relationship, avatar_emoji, color, diet_type, allergies,
              daily_calorie_target, COALESCE(health_service, 'legacy') AS health_service
       FROM household_members WHERE user_id = $1 ORDER BY name`,
      [req.user.id]
    );
    res.json([
      { id: null, name: 'You', relationship: 'owner', avatar_emoji: '🧑', color: '#8b5cf6',
        daily_calorie_target: DEFAULT_CAL_TARGET, health_service: 'legacy' },
      ...members.rows,
    ]);
  } catch (err) {
    console.error('Plate members failed:', err);
    res.status(500).json({ error: 'Failed to load members' });
  }
});

/** GET /api/plate/services — registered scoring engines */
router.get('/services', authenticateToken, async (req, res) => {
  try {
    const rows = await db.query('SELECT key, name, description, version, is_active FROM plate_health_services ORDER BY version');
    const byKey = Object.fromEntries(rows.rows.map((r) => [r.key, r]));
    res.json(listServices().map((s) => ({ ...s, db_active: byKey[s.key]?.is_active ?? s.active })));
  } catch (err) {
    console.error('Plate services failed:', err);
    res.status(500).json({ error: 'Failed to load services' });
  }
});

/** PUT /api/plate/member/:id/service — assign a scoring engine to a member */
router.put('/member/:id/service', authenticateToken, async (req, res) => {
  try {
    const { service } = req.body;
    const scorer = resolveScorer(service);
    if (!scorer || scorer.key !== service) {
      return res.status(400).json({ error: `Unknown or inactive scoring service: ${service}` });
    }
    const r = await db.query(
      'UPDATE household_members SET health_service = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id',
      [service, req.params.id, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Member not found' });
    res.json({ id: r.rows[0].id, health_service: service });
  } catch (err) {
    console.error('Plate member service failed:', err);
    res.status(500).json({ error: 'Failed to assign service' });
  }
});

// ---------------------------------------------------------------------------
// Entries
// ---------------------------------------------------------------------------

/** POST /api/plate/entry — log food onto today's plate. Group/calories/macros auto-derived. */
router.post('/entry', authenticateToken, async (req, res) => {
  try {
    const { member_id, meal_type, item_name, servings, calories, recipe_id, category, food_group } = req.body;
    if (!item_name || !item_name.trim()) {
      return res.status(400).json({ error: 'item_name is required' });
    }
    const ctx = await memberContext(req.user.id, member_id);
    if (!ctx) return res.status(404).json({ error: 'Member not found' });

    const group = food_group || detectGroup(item_name, category);
    const profile = ctx.scorer.profiles[group] || ctx.scorer.profiles.other;
    const qty = Math.max(0.25, parseFloat(servings) || 1);
    const estCal = calories != null ? parseInt(calories, 10) : Math.round(profile.cal * qty);

    const r = await db.query(
      `INSERT INTO plate_entries
        (user_id, member_id, meal_type, item_name, food_group, servings, calories,
         protein_pct, fat_pct, carb_pct, recipe_id, health_service, scores_by_service)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING *`,
      [
        req.user.id, member_id || null,
        MEAL_TYPES.includes(meal_type) ? meal_type : 'snack',
        item_name.trim(), group, qty, estCal,
        profile.p, profile.f, profile.c,
        recipe_id || null, ctx.scorer.key,
        JSON.stringify({ [ctx.scorer.key]: { v: ctx.scorer.version, cal: estCal } }),
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error('Plate entry failed:', err);
    res.status(500).json({ error: 'Failed to add plate entry' });
  }
});

/** DELETE /api/plate/entry/:id */
router.delete('/entry/:id', authenticateToken, async (req, res) => {
  try {
    const r = await db.query(
      'DELETE FROM plate_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (!r.rows[0]) return res.status(404).json({ error: 'Entry not found' });
    res.json({ deleted: true });
  } catch (err) {
    console.error('Plate delete failed:', err);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

// ---------------------------------------------------------------------------
// Day view + summary
// ---------------------------------------------------------------------------

const summarize = (entries, scorer, target) => {
  const groupServings = {};
  let totalServings = 0, calories = 0, pW = 0, fW = 0, cW = 0;
  for (const e of entries) {
    const s = parseFloat(e.servings) || 0;
    const cal = parseInt(e.calories, 10) || 0;
    groupServings[e.food_group] = (groupServings[e.food_group] || 0) + s;
    totalServings += s;
    calories += cal;
    pW += (parseFloat(e.protein_pct) || 0) * cal;
    fW += (parseFloat(e.fat_pct) || 0) * cal;
    cW += (parseFloat(e.carb_pct) || 0) * cal;
  }
  const scored = scorer.score({ groupServings, totalServings });
  return {
    calories,
    target,
    groupServings,
    totalServings,
    macros: calories ? {
      protein_pct: Math.round(pW / calories),
      fat_pct: Math.round(fW / calories),
      carb_pct: Math.round(cW / calories),
    } : { protein_pct: 0, fat_pct: 0, carb_pct: 0 },
    plate_score: scored.score,
    covered_groups: scored.covered,
    missing_groups: scored.missing,
    health_service: scorer.key,
  };
};

/** GET /api/plate/today?member_id= — entries + computed summary */
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const memberId = req.query.member_id ? parseInt(req.query.member_id, 10) : null;
    const ctx = await memberContext(req.user.id, memberId);
    if (!ctx) return res.status(404).json({ error: 'Member not found' });

    const r = await db.query(
      `SELECT * FROM plate_entries
       WHERE user_id = $1 AND entry_date = CURRENT_DATE
         AND (member_id IS NOT DISTINCT FROM $2)
       ORDER BY created_at`,
      [req.user.id, memberId]
    );
    res.json({ entries: r.rows, summary: summarize(r.rows, ctx.scorer, ctx.target) });
  } catch (err) {
    console.error('Plate today failed:', err);
    res.status(500).json({ error: 'Failed to load plate' });
  }
});

/** GET /api/plate/summary?member_id=&days=7 — daily totals for trends */
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    const memberId = req.query.member_id ? parseInt(req.query.member_id, 10) : null;
    const days = Math.min(30, parseInt(req.query.days, 10) || 7);
    const ctx = await memberContext(req.user.id, memberId);
    if (!ctx) return res.status(404).json({ error: 'Member not found' });

    const r = await db.query(
      `SELECT entry_date,
              SUM(calories) AS calories,
              COUNT(*) AS entries,
              jsonb_object_agg(food_group, gserv) AS groups
       FROM (
         SELECT entry_date, food_group, SUM(calories) AS calories, SUM(servings) AS gserv, COUNT(*) AS entries
         FROM plate_entries
         WHERE user_id = $1 AND entry_date >= CURRENT_DATE - $3::int
           AND (member_id IS NOT DISTINCT FROM $2)
         GROUP BY entry_date, food_group
       ) t
       GROUP BY entry_date
       ORDER BY entry_date DESC`,
      [req.user.id, memberId, days]
    );
    res.json({ days: r.rows, target: ctx.target, health_service: ctx.scorer.key });
  } catch (err) {
    console.error('Plate summary failed:', err);
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

/**
 * GET /api/plate/recommend?member_id=
 *  - gap groups from today's plate score
 *  - recipes whose dominant ingredient group covers a gap (canMake first)
 *  - swap hints for today's 'extras' entries
 */
router.get('/recommend', authenticateToken, async (req, res) => {
  try {
    const memberId = req.query.member_id ? parseInt(req.query.member_id, 10) : null;
    const ctx = await memberContext(req.user.id, memberId);
    if (!ctx) return res.status(404).json({ error: 'Member not found' });

    const today = await db.query(
      `SELECT * FROM plate_entries
       WHERE user_id = $1 AND entry_date = CURRENT_DATE AND (member_id IS NOT DISTINCT FROM $2)`,
      [req.user.id, memberId]
    );
    const summary = summarize(today.rows, ctx.scorer, ctx.target);
    const missing = summary.missing_groups || GROUPS_OF_PLATE;

    // Dominant group per recipe from ingredient names
    const recipes = await db.query(
      `SELECT r.id, r.name, r.description, r.prep_time, ri.item_name
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       WHERE (r.user_id = $1 OR r.is_public = true) AND r.category IS DISTINCT FROM 'mix'`,
      [req.user.id]
    );
    const byRecipe = {};
    for (const row of recipes.rows) {
      byRecipe[row.id] = byRecipe[row.id] || { ...row, items: [] };
      if (row.item_name) byRecipe[row.id].items.push(row.item_name);
    }
    const dominant = {};
    for (const rec of Object.values(byRecipe)) {
      const counts = {};
      for (const n of rec.items) counts[detectGroup(n)] = (counts[detectGroup(n)] || 0) + 1;
      dominant[rec.id] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'extras';
    }

    // Candidates covering a gap, canMake-checked (cap 8 candidates to bound cost)
    const candidates = Object.values(byRecipe)
      .filter((r) => missing.includes(dominant[r.id]))
      .slice(0, 8);
    const suggestions = [];
    for (const rec of candidates) {
      let canMake = null;
      try {
        const cmp = await compareRecipeWithInventory(rec.id, req.user.id);
        canMake = !!cmp.canMake;
      } catch { canMake = null; }
      suggestions.push({
        id: rec.id, name: rec.name, description: rec.description,
        covers: dominant[rec.id], canMake, prep_time: rec.prep_time,
      });
    }
    suggestions.sort((a, b) => Number(b.canMake) - Number(a.canMake));

    // Swap hints for today's extras
    const swaps = today.rows
      .filter((e) => e.food_group === 'extras')
      .map((e) => ({ from: e.item_name, to: swapFor(e.item_name) }));

    res.json({
      missing_groups: missing,
      covered_groups: summary.covered_groups,
      plate_score: summary.plate_score,
      suggestions: suggestions.slice(0, 6),
      swaps,
      health_service: ctx.scorer.key,
    });
  } catch (err) {
    console.error('Plate recommend failed:', err);
    res.status(500).json({ error: 'Failed to build recommendations' });
  }
});

module.exports = router;
