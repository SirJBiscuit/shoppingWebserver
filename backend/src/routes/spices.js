const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();
router.use(authenticateToken);

// ============================================================================
// Spice catalog + user rack
// ============================================================================

// GET /api/spices — all spices, each flagged with whether the user owns it + fill level
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT s.*,
              (r.spice_id IS NOT NULL) AS owned,
              COALESCE(r.level_percent, 100) AS level_percent,
              COALESCE(r.container_tsp, 12) AS container_tsp
       FROM spices s
       LEFT JOIN user_spice_rack r ON r.spice_id = s.id AND r.user_id = $1
       ORDER BY s.is_common DESC, s.name ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching spices:', error);
    res.status(500).json({ error: 'Failed to fetch spices' });
  }
});

// POST /api/spices/rack { spiceId, owned } — toggle spice ownership
router.post('/rack', async (req, res) => {
  try {
    const { spiceId, owned } = req.body;
    if (!spiceId) return res.status(400).json({ error: 'spiceId is required' });

    if (owned) {
      await db.query(
        'INSERT INTO user_spice_rack (user_id, spice_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [req.user.id, spiceId]
      );
    } else {
      await db.query(
        'DELETE FROM user_spice_rack WHERE user_id = $1 AND spice_id = $2',
        [req.user.id, spiceId]
      );
    }
    res.json({ ok: true });
  } catch (error) {
    console.error('Error updating spice rack:', error);
    res.status(500).json({ error: 'Failed to update spice rack' });
  }
});

// PATCH /api/spices/rack/:spiceId { level_percent, container_tsp } — set fill level
router.patch('/rack/:spiceId', async (req, res) => {
  try {
    const level = Math.max(0, Math.min(100, parseInt(req.body.level_percent, 10)));
    if (Number.isNaN(level)) return res.status(400).json({ error: 'level_percent 0-100 is required' });
    const container = req.body.container_tsp != null
      ? Math.max(0.5, Math.min(500, parseFloat(req.body.container_tsp)))
      : null;

    const result = await db.query(
      `INSERT INTO user_spice_rack (user_id, spice_id, level_percent, container_tsp)
       VALUES ($1, $2, $3, COALESCE($4, 12))
       ON CONFLICT (user_id, spice_id)
       DO UPDATE SET level_percent = $3,
                     container_tsp = COALESCE($4, user_spice_rack.container_tsp)
       RETURNING level_percent, container_tsp`,
      [req.user.id, req.params.spiceId, level, container]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating spice level:', error);
    res.status(500).json({ error: 'Failed to update spice level' });
  }
});

// ============================================================================
// Blends
// ============================================================================

// GET /api/spices/blends — presets + user's custom blends with ingredients
router.get('/blends', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
              COALESCE(
                json_agg(
                  json_build_object(
                    'spice_id', s.id, 'name', s.name, 'icon', s.icon,
                    'parts', i.parts, 'note', i.note,
                    'flavor_notes', s.flavor_notes, 'adds', s.adds,
                    'heat_level', s.heat_level,
                    'owned', (r.spice_id IS NOT NULL),
                    'level_percent', COALESCE(r.level_percent, 100),
                    'container_tsp', COALESCE(r.container_tsp, 12)
                  ) ORDER BY i.parts DESC
                ) FILTER (WHERE s.id IS NOT NULL), '[]'
              ) AS ingredients
       FROM spice_blends b
       LEFT JOIN spice_blend_ingredients i ON i.blend_id = b.id
       LEFT JOIN spices s ON s.id = i.spice_id
       LEFT JOIN user_spice_rack r ON r.spice_id = s.id AND r.user_id = $1
       WHERE b.user_id IS NULL OR b.user_id = $1
       GROUP BY b.id
       ORDER BY b.user_id NULLS FIRST, b.name ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching blends:', error);
    res.status(500).json({ error: 'Failed to fetch blends' });
  }
});

// POST /api/spices/blends { name, description, icon, dish_tags, ingredients:[{spice_id, parts, note}] }
router.post('/blends', async (req, res) => {
  const { name, description, icon, dish_tags, ingredients } = req.body;
  if (!name || !Array.isArray(ingredients) || ingredients.length === 0) {
    return res.status(400).json({ error: 'name and at least one ingredient are required' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const blend = await client.query(
      `INSERT INTO spice_blends (user_id, name, icon, description, dish_tags, source)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [req.user.id, name, icon || '🧂', description || '', dish_tags || [], req.body.source || 'custom']
    );
    const blendId = blend.rows[0].id;
    for (const ing of ingredients) {
      await client.query(
        'INSERT INTO spice_blend_ingredients (blend_id, spice_id, parts, note) VALUES ($1, $2, $3, $4) ON CONFLICT (blend_id, spice_id) DO UPDATE SET parts = EXCLUDED.parts',
        [blendId, ing.spice_id, ing.parts || 1, ing.note || null]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(blend.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating blend:', error);
    res.status(500).json({ error: 'Failed to create blend' });
  } finally {
    client.release();
  }
});

// PUT /api/spices/blends/:id — update own blend (ingredients replaced wholesale)
router.put('/blends/:id', async (req, res) => {
  const { name, description, icon, dish_tags, ingredients } = req.body;
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const blend = await client.query(
      `UPDATE spice_blends SET name = COALESCE($1, name),
        icon = COALESCE($2, icon), description = COALESCE($3, description),
        dish_tags = COALESCE($4, dish_tags), updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 AND user_id = $6 RETURNING *`,
      [name, icon, description, dish_tags, req.params.id, req.user.id]
    );
    if (blend.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Blend not found' });
    }
    if (Array.isArray(ingredients)) {
      await client.query('DELETE FROM spice_blend_ingredients WHERE blend_id = $1', [req.params.id]);
      for (const ing of ingredients) {
        await client.query(
          'INSERT INTO spice_blend_ingredients (blend_id, spice_id, parts, note) VALUES ($1, $2, $3, $4)',
          [req.params.id, ing.spice_id, ing.parts || 1, ing.note || null]
        );
      }
    }
    await client.query('COMMIT');
    res.json(blend.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating blend:', error);
    res.status(500).json({ error: 'Failed to update blend' });
  } finally {
    client.release();
  }
});

// DELETE /api/spices/blends/:id — delete own blend
router.delete('/blends/:id', async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM spice_blends WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Blend not found' });
    res.json({ ok: true });
  } catch (error) {
    console.error('Error deleting blend:', error);
    res.status(500).json({ error: 'Failed to delete blend' });
  }
});

// ============================================================================
// Dish suggester — "what am I trying to make" → proposed blend
// ============================================================================

// keyword → { cuisine, dish } tags to score spices against
const DISH_PROFILES = [
  { match: ['taco', 'burrito', 'fajita', 'quesadilla', 'enchilada', 'mexican'], cuisine: 'mexican', dish: 'tacos', name: 'Taco Blend' },
  { match: ['chili'], cuisine: 'mexican', dish: 'chili', name: 'Chili Blend' },
  { match: ['pasta', 'spaghetti', 'lasagna', 'alfredo', 'italian', 'pesto'], cuisine: 'italian', dish: 'pasta', name: 'Italian Pasta Blend' },
  { match: ['pizza'], cuisine: 'italian', dish: 'pizza', name: 'Pizza Blend' },
  { match: ['curry', 'tikka', 'masala', 'indian', 'korma', 'lentil'], cuisine: 'indian', dish: 'curry', name: 'Curry Blend' },
  { match: ['bbq', 'ribs', 'brisket', 'pulled pork', 'grill', 'barbecue'], cuisine: 'american', dish: 'bbq', name: 'BBQ Rub' },
  { match: ['steak'], cuisine: 'american', dish: 'steak', name: 'Steak Rub' },
  { match: ['chicken', 'wings', 'drumstick'], cuisine: 'american', dish: 'chicken', name: 'Chicken Blend' },
  { match: ['fish', 'salmon', 'tilapia', 'cod', 'shrimp', 'seafood'], cuisine: 'mediterranean', dish: 'fish', name: 'Seafood Blend' },
  { match: ['soup', 'stew', 'broth', 'gumbo', 'bisque'], cuisine: 'american', dish: 'soup', name: 'Soup Blend' },
  { match: ['stir fry', 'stirfry', 'asian', 'chinese', 'teriyaki', 'fried rice'], cuisine: 'chinese', dish: 'stir fry', name: 'Stir Fry Blend' },
  { match: ['thai'], cuisine: 'thai', dish: 'curry', name: 'Thai Blend' },
  { match: ['greek', 'gyro', 'mediterranean', 'hummus', 'falafel', 'kebab'], cuisine: 'middle_eastern', dish: 'kebab', name: 'Mediterranean Blend' },
  { match: ['roast', 'roasted', 'potatoes', 'vegetables', 'veggie'], cuisine: 'american', dish: 'vegetables', name: 'Roast Blend' },
  { match: ['eggs', 'omelet', 'omelette', 'scrambled', 'breakfast'], cuisine: 'american', dish: 'eggs', name: 'Breakfast Blend' },
  { match: ['cake', 'cookie', 'baking', 'pumpkin', 'cinnamon roll', 'pie', 'dessert'], cuisine: 'american', dish: 'dessert', name: 'Baking Blend' },
  { match: ['salad', 'dressing'], cuisine: 'american', dish: 'salad', name: 'Salad Blend' },
  { match: ['rice', 'biryani', 'pilaf'], cuisine: 'indian', dish: 'rice', name: 'Rice Blend' },
  { match: ['bread'], cuisine: 'italian', dish: 'bread', name: 'Bread Blend' },
];

// GET /api/spices/suggest?dish=tacos
// Scores spices: cuisine match +3, dish_tag match +2, owned +1 → picks top 7,
// scales parts → teaspoons for ~4 servings, explains what each adds.
router.get('/suggest', async (req, res) => {
  try {
    const dish = (req.query.dish || '').toLowerCase().trim();
    if (!dish) return res.status(400).json({ error: 'dish query is required' });

    const profile = DISH_PROFILES.find((p) => p.match.some((m) => dish.includes(m)));
    const spices = await db.query(
      `SELECT s.*, (r.spice_id IS NOT NULL) AS owned,
              COALESCE(r.level_percent, 100) AS level_percent,
              COALESCE(r.container_tsp, 12) AS container_tsp
       FROM spices s
       LEFT JOIN user_spice_rack r ON r.spice_id = s.id AND r.user_id = $1`,
      [req.user.id]
    );

    const scored = spices.rows.map((s) => {
      let score = 0;
      if (profile && s.cuisine_tags.includes(profile.cuisine)) score += 3;
      if (profile && s.dish_tags.includes(profile.dish)) score += 2;
      // fallback scoring — match dish text against dish_tags directly
      if (s.dish_tags.some((t) => dish.includes(t) || t.includes(dish))) score += 2;
      if (s.owned) score += 1;
      return { ...s, score };
    });

    const picked = scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score || b.is_common - a.is_common)
      .slice(0, 7);

    if (picked.length === 0) {
      return res.json({
        dish,
        suggestion: null,
        message: "No blend match for that dish — try building a custom blend!",
      });
    }

    // Parts: score leader gets 2 parts, mid 1, tail 0.5 — then scale to tsp
    const totalParts = picked.reduce((sum, s, i) => sum + (i === 0 ? 2 : i < 4 ? 1 : 0.5), 0);
    const TARGET_TSP = 9; // ~3 tbsp for a 4-serving dish
    const ingredients = picked.map((s, i) => {
      const parts = i === 0 ? 2 : i < 4 ? 1 : 0.5;
      const tsp = Math.max(0.5, Math.round((parts / totalParts) * TARGET_TSP * 2) / 2);
      return {
        spice_id: s.id,
        name: s.name,
        icon: s.icon,
        parts,
        tsp,
        amount: `${tsp} tsp`,
        owned: s.owned,
        heat_level: s.heat_level,
        flavor_notes: s.flavor_notes,
        adds: s.adds,
        // how much the user roughly has left in their container
        level_percent: s.owned ? s.level_percent : null,
        container_tsp: s.owned ? s.container_tsp : null,
        have_tsp: s.owned
          ? Math.round((s.level_percent / 100) * s.container_tsp * 2) / 2
          : null,
      };
    });

    res.json({
      dish,
      profile: profile ? { cuisine: profile.cuisine, dish: profile.dish } : null,
      suggested_name: profile ? profile.name : 'Custom Blend',
      ingredients,
      missing: ingredients.filter((i) => !i.owned).map((i) => i.name),
      flavor_profile: [...new Set(picked.flatMap((s) => s.flavor_notes))],
      max_heat: Math.max(...picked.map((s) => s.heat_level)),
    });
  } catch (error) {
    console.error('Error suggesting blend:', error);
    res.status(500).json({ error: 'Failed to suggest blend' });
  }
});

// POST /api/spices/blends/:id/made { yield_tsp }
// "I just mixed this blend" — scale parts to the batch yield and deduct the
// tsp consumed from each owned ingredient's container level.
router.post('/blends/:id/made', async (req, res) => {
  try {
    const yieldTsp = Math.max(1, Math.min(500, parseFloat(req.body.yield_tsp) || 9));
    const ing = await db.query(
      `SELECT i.spice_id, i.parts, s.name
       FROM spice_blend_ingredients i
       JOIN spices s ON s.id = i.spice_id
       WHERE i.blend_id = $1`,
      [req.params.id]
    );
    if (ing.rows.length === 0) {
      return res.status(404).json({ error: 'Blend not found or has no ingredients' });
    }

    const totalParts = ing.rows.reduce((s, r) => s + parseFloat(r.parts), 0) || 1;
    const consumed = [];
    for (const r of ing.rows) {
      const tspUsed = (parseFloat(r.parts) / totalParts) * yieldTsp;
      const result = await db.query(
        `UPDATE user_spice_rack
         SET level_percent = GREATEST(0, level_percent - ROUND(($3 / container_tsp) * 100)::smallint)
         WHERE user_id = $1 AND spice_id = $2
         RETURNING level_percent`,
        [req.user.id, r.spice_id, tspUsed]
      );
      if (result.rows.length) {
        consumed.push({ spice_id: r.spice_id, name: r.name, level_percent: result.rows[0].level_percent });
      }
    }
    res.json({ ok: true, consumed });
  } catch (error) {
    console.error('Error recording blend usage:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

// GET /api/spices/pairings/:spiceId — what pairs with a spice (combination game)
router.get('/pairings/:spiceId', async (req, res) => {
  try {
    const spice = await db.query('SELECT * FROM spices WHERE id = $1', [req.params.spiceId]);
    if (spice.rows.length === 0) return res.status(404).json({ error: 'Spice not found' });
    const s = spice.rows[0];
    const partners = await db.query(
      `SELECT s2.*, (r.spice_id IS NOT NULL) AS owned
       FROM spices s2
       LEFT JOIN user_spice_rack r ON r.spice_id = s2.id AND r.user_id = $1
       WHERE s2.name = ANY($2::text[])
       ORDER BY s2.name`,
      [req.user.id, s.pairs_with]
    );
    res.json({ spice: s.name, pairs: partners.rows });
  } catch (error) {
    console.error('Error fetching pairings:', error);
    res.status(500).json({ error: 'Failed to fetch pairings' });
  }
});

module.exports = router;
