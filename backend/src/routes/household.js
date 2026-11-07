const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// ============================================
// HOUSEHOLD MEMBER CATALOG ROUTES
// ============================================

const ACTIVITY_FACTORS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

const TIER_WEIGHTS = { S: 6, A: 5, B: 4, C: 3, D: 2, F: 1 };

// Common treat -> lighter swap ideas (playful, not preachy)
const SNACK_SWAPS = [
  { match: ['chip', 'crisp'], from: 'chips', to: 'popcorn or pretzels' },
  { match: ['soda', 'cola', 'pop '], from: 'soda', to: 'sparkling water with fruit' },
  { match: ['candy', 'chocolate bar', 'gummy'], from: 'candy', to: 'dark chocolate or frozen grapes' },
  { match: ['cookie', 'brownie'], from: 'cookies', to: 'banana with peanut butter' },
  { match: ['ice cream', 'gelato'], from: 'ice cream', to: 'frozen yogurt or a smoothie' },
  { match: ['fries'], from: 'fries', to: 'baked sweet potato wedges' },
  { match: ['donut', 'doughnut'], from: 'donuts', to: 'whole-grain toast with honey' },
  { match: ['burger', 'big mac'], from: 'burgers', to: 'turkey or veggie burger' },
  { match: ['pizza'], from: 'pizza', to: 'homemade pita pizza with veggies' },
  { match: ['energy drink'], from: 'energy drinks', to: 'iced green tea' },
  { match: ['cereal'], from: 'sugary cereal', to: 'oatmeal with berries' },
  { match: ['cake'], from: 'cake', to: 'Greek yogurt parfait' }
];

/**
 * Fun, positive-framed badges. Never shame — only celebrate + suggest.
 * extras: { water_today_oz, water_streak, chores_done_week, likedCount, dislikedCount,
 *           treatCount (D/F-tier liked foods), topTierCount (S/A), traitCount }
 */
const computeBadges = (member, stats, extras = {}) => {
  const badges = [];
  const add = (id, emoji, label, tip) => badges.push({ id, emoji, label, tip });

  if (extras.topTierCount >= 5) {
    add('food_royalty', '👑', 'Food Royalty', `${member.name} has an elite taste in food`);
  }
  if (extras.treatCount >= 4 && extras.treatCount > extras.topTierCount) {
    add('treat_explorer', '🍩', 'Treat Explorer', 'Life is short — a treat now and then is fine. Maybe sneak in a swap sometimes?');
  }
  if (extras.likedCount >= 10) {
    add('foodie', '🍽️', 'Certified Foodie', `${extras.likedCount} liked foods catalogued!`);
  }
  if (extras.water_today_oz >= (stats.water_goal_oz || 64)) {
    add('hydrated', '💧', 'Hydrated Today', 'Water goal smashed! 🎉');
  } else if (extras.water_today_oz >= (stats.water_goal_oz || 64) * 0.5) {
    add('halfway_hydrated', '💦', 'Halfway Hydrated', 'A few more sips to go');
  }
  if (extras.water_streak >= 3) {
    add('water_streak', '🌊', `${extras.water_streak}-Day Water Streak`, 'On a hydration roll!');
  }
  if (extras.chores_done_week >= 3) {
    add('chore_champ', '🏆', 'Chore Champ', `${extras.chores_done_week} chores crushed this week`);
  }
  if (extras.chores_done_week >= 1 && extras.chores_done_week < 3) {
    add('helping_hand', '🙌', 'Helping Hand', 'Chores done this week — nice!');
  }
  if (stats.bmi_category === 'healthy') {
    add('balanced', '💪', 'In the Zone', 'BMI sitting in a healthy spot');
  }
  if (member.activity_level === 'active' || member.activity_level === 'very_active') {
    add('energizer', '⚡', 'Energizer', 'An active lifestyle powers everything');
  }
  if (extras.traitCount >= 5) {
    add('open_book', '📖', 'Open Book', 'Great self-awareness — lots of traits logged');
  }
  if (member.diet_type && member.diet_type !== 'none') {
    add('goal_getter', '🎯', 'Diet Goals', `Rocking the ${member.diet_type.replace(/_/g, ' ')} lifestyle`);
  }

  return badges;
};

/**
 * Fun score: water days + chores this week + foods logged. Just for flavor.
 */
const computeFunPoints = (extras) =>
  (extras.water_streak || 0) * 15 +
  (extras.chores_done_week || 0) * 10 +
  (extras.likedCount || 0) * 2 +
  (extras.traitCount || 0) * 3;

/** Match liked treats to lighter swap ideas */
const buildSnackSwaps = (foodPrefs) => {
  const swaps = [];
  const liked = (foodPrefs || []).filter(f => f.preference === 'like');
  for (const f of liked) {
    const name = f.food_name.toLowerCase();
    const hit = SNACK_SWAPS.find(s => s.match.some(m => name.includes(m)));
    if (hit) swaps.push({ from: f.food_name, to: hit.to });
  }
  return swaps.slice(0, 5);
};

/** Meal ideas = highest-tier liked foods, framed positively */
const buildMealIdeas = (foodPrefs) =>
  (foodPrefs || [])
    .filter(f => f.preference === 'like')
    .sort((a, b) => (TIER_WEIGHTS[b.tier] || 0) - (TIER_WEIGHTS[a.tier] || 0))
    .slice(0, 5)
    .map(f => ({ food_name: f.food_name, tier: f.tier }));

/** Consecutive-day streak of hitting water goal */
const getWaterStreak = async (memberId, goalOz) => {
  const days = await db.query(
    `SELECT logged_at::date as day, SUM(amount_oz) as total
     FROM household_member_water_logs
     WHERE member_id = $1 AND logged_at::date > CURRENT_DATE - INTERVAL '30 days'
     GROUP BY logged_at::date ORDER BY day DESC`,
    [memberId]
  );
  let streak = 0;
  let expected = new Date();
  // Today doesn't break the streak if not yet complete
  const rows = days.rows.map(r => ({ day: new Date(r.day), total: parseInt(r.total, 10) }));
  if (rows.length && rows[0].day.toDateString() === expected.toDateString() && rows[0].total < goalOz) {
    rows.shift();
  }
  for (const r of rows) {
    if (r.total < goalOz) break;
    if (r.day.toDateString() === expected.toDateString() ||
        r.day.toDateString() === new Date(expected.setDate(expected.getDate() - 1)).toDateString()) {
      streak++;
      expected = r.day;
    } else break;
  }
  return streak;
};

const getChoresDoneWeek = async (memberId) => {
  const r = await db.query(
    `SELECT COUNT(*) as c FROM household_member_chores
     WHERE member_id = $1 AND last_completed_at > CURRENT_DATE - INTERVAL '7 days'`,
    [memberId]
  );
  return parseInt(r.rows[0].c, 10);
};

/** Gather the extras used for badges/points for one member */
const getFunExtras = async (member, stats) => {
  const [prefs, traits, waterToday, streak, choresWeek] = await Promise.all([
    db.query('SELECT preference, tier, food_name FROM household_member_food_prefs WHERE member_id = $1', [member.id]),
    db.query('SELECT COUNT(*) as c FROM household_member_traits WHERE member_id = $1', [member.id]),
    db.query(
      `SELECT COALESCE(SUM(amount_oz),0) as t FROM household_member_water_logs
       WHERE member_id = $1 AND logged_at::date = CURRENT_DATE`,
      [member.id]
    ),
    getWaterStreak(member.id, stats.water_goal_oz || 64),
    getChoresDoneWeek(member.id)
  ]);

  const liked = prefs.rows.filter(p => p.preference === 'like');
  const extras = {
    water_today_oz: parseInt(waterToday.rows[0].t, 10),
    water_streak: streak,
    chores_done_week: choresWeek,
    likedCount: liked.length,
    dislikedCount: prefs.rows.length - liked.length,
    treatCount: liked.filter(p => p.tier === 'D' || p.tier === 'F').length,
    topTierCount: liked.filter(p => p.tier === 'S' || p.tier === 'A').length,
    traitCount: parseInt(traits.rows[0].c, 10)
  };
  return { extras, foodPrefs: prefs.rows };
};

/**
 * Compute health stats for a member.
 * Uses Mifflin-St Jeor for BMR and activity factor for TDEE.
 */
const computeStats = (member, latestWeight) => {
  const stats = {};
  const weightKg = latestWeight?.weight_kg ? parseFloat(latestWeight.weight_kg) : null;
  const heightCm = member.height_cm ? parseFloat(member.height_cm) : null;

  // Age
  if (member.date_of_birth) {
    const dob = new Date(member.date_of_birth);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
    stats.age = age;
  }

  // BMI
  if (weightKg && heightCm) {
    const hM = heightCm / 100;
    const bmi = weightKg / (hM * hM);
    stats.bmi = Math.round(bmi * 10) / 10;
    stats.bmi_category =
      bmi < 18.5 ? 'underweight' :
      bmi < 25 ? 'healthy' :
      bmi < 30 ? 'overweight' : 'obese';
    stats.ideal_weight_min_kg = Math.round(18.5 * hM * hM * 10) / 10;
    stats.ideal_weight_max_kg = Math.round(24.9 * hM * hM * 10) / 10;
  }

  // BMR + TDEE (Mifflin-St Jeor)
  if (weightKg && heightCm && stats.age != null) {
    const genderOffset = member.gender === 'female' ? -161 : member.gender === 'male' ? 5 : -78;
    const bmr = 10 * weightKg + 6.25 * heightCm - 5 * stats.age + genderOffset;
    stats.bmr = Math.round(bmr);
    const factor = ACTIVITY_FACTORS[member.activity_level] || ACTIVITY_FACTORS.moderate;
    stats.tdee = Math.round(bmr * factor);
    stats.calorie_target = member.daily_calorie_target || stats.tdee;
  } else if (member.daily_calorie_target) {
    stats.calorie_target = member.daily_calorie_target;
  }

  // Water goal: explicit, else half body weight (lbs) in oz, else 64
  stats.water_goal_oz = member.water_goal_oz ||
    (weightKg ? Math.round((weightKg * 2.20462) / 2) : 64);

  stats.latest_weight_kg = weightKg;
  stats.latest_body_fat_pct = latestWeight?.body_fat_pct ? parseFloat(latestWeight.body_fat_pct) : null;
  stats.latest_muscle_pct = latestWeight?.muscle_pct ? parseFloat(latestWeight.muscle_pct) : null;

  return stats;
};

const getMemberOr404 = async (memberId, userId, res) => {
  const result = await db.query(
    'SELECT * FROM household_members WHERE id = $1 AND user_id = $2',
    [memberId, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Member not found' });
    return null;
  }
  return result.rows[0];
};

const getLatestHealth = async (memberId) => {
  const result = await db.query(
    `SELECT * FROM household_member_health_logs
     WHERE member_id = $1 ORDER BY logged_at DESC LIMIT 1`,
    [memberId]
  );
  return result.rows[0] || null;
};

// ============================================
// MEMBERS
// ============================================

/**
 * GET /api/household
 * List all members with latest weight + today's water
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const members = await db.query(
      `SELECT m.*,
        (SELECT weight_kg FROM household_member_health_logs
          WHERE member_id = m.id ORDER BY logged_at DESC LIMIT 1) as latest_weight_kg,
        (SELECT muscle_pct FROM household_member_health_logs
          WHERE member_id = m.id ORDER BY logged_at DESC LIMIT 1) as latest_muscle_pct,
        (SELECT COALESCE(SUM(amount_oz), 0) FROM household_member_water_logs
          WHERE member_id = m.id AND logged_at::date = CURRENT_DATE) as water_today_oz,
        (SELECT COUNT(*) FROM household_member_chores
          WHERE member_id = m.id AND active = true) as chore_count
      FROM household_members m
      WHERE m.user_id = $1
      ORDER BY m.created_at ASC`,
      [req.user.id]
    );

    const enriched = await Promise.all(members.rows.map(async (member) => {
      const latest = member.latest_weight_kg
        ? { weight_kg: member.latest_weight_kg, muscle_pct: member.latest_muscle_pct }
        : null;
      const stats = computeStats(member, latest);
      const { extras } = await getFunExtras(member, stats);
      return {
        ...member,
        stats,
        badges: computeBadges(member, stats, extras),
        fun_points: computeFunPoints(extras),
        water_streak: extras.water_streak
      };
    }));

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching household members:', error);
    res.status(500).json({ error: 'Failed to fetch household members' });
  }
});

/**
 * POST /api/household
 * Create a member (optionally logs initial weight)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      name, relationship, avatar_emoji, color, date_of_birth, gender,
      height_cm, activity_level, diet_type, allergies,
      daily_calorie_target, water_goal_oz, notes, weight_kg
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await db.query(
      `INSERT INTO household_members
        (user_id, name, relationship, avatar_emoji, color, date_of_birth, gender,
         height_cm, activity_level, diet_type, allergies, daily_calorie_target,
         water_goal_oz, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [
        req.user.id, name.trim(), relationship || 'member', avatar_emoji || '😀',
        color || '#6366f1', date_of_birth || null, gender || null,
        height_cm || null, activity_level || 'moderate', diet_type || 'none',
        allergies || [], daily_calorie_target || null, water_goal_oz || 64,
        notes || null
      ]
    );

    const member = result.rows[0];

    if (weight_kg) {
      await db.query(
        'INSERT INTO household_member_health_logs (member_id, weight_kg) VALUES ($1, $2)',
        [member.id, weight_kg]
      );
    }

    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating household member:', error);
    res.status(500).json({ error: 'Failed to create member' });
  }
});

/**
 * GET /api/household/shopping-guide
 * Per-member shopping guidance: daily calorie target, top liked foods to
 * stock, and disliked foods to avoid. Feeds list-level decisions.
 * NOTE: must be declared before /:id
 */
router.get('/shopping-guide', authenticateToken, async (req, res) => {
  try {
    const members = await db.query(
      'SELECT * FROM household_members WHERE user_id = $1 ORDER BY name',
      [req.user.id]
    );

    const guide = await Promise.all(members.rows.map(async (member) => {
      const [latest, prefs] = await Promise.all([
        getLatestHealth(member.id),
        db.query(
          `SELECT * FROM household_member_food_prefs
           WHERE member_id = $1 ORDER BY preference, tier ASC`,
          [member.id]
        )
      ]);

      const stats = computeStats(member, latest);
      const liked = prefs.rows.filter(p => p.preference === 'like');
      const disliked = prefs.rows.filter(p => p.preference === 'dislike');

      return {
        member_id: member.id,
        name: member.name,
        avatar_emoji: member.avatar_emoji,
        calorie_target: stats.calorie_target || null,
        weekly_calories: stats.calorie_target ? stats.calorie_target * 7 : null,
        buy_these: liked.slice(0, 8).map(f => ({
          food_name: f.food_name,
          tier: f.tier,
          calories_per_serving: f.calories_per_serving
        })),
        avoid_these: disliked.map(f => f.food_name)
      };
    }));

    const household_daily_calories = guide.reduce(
      (sum, m) => sum + (m.calorie_target || 0), 0
    );

    res.json({
      members: guide,
      household_daily_calories: household_daily_calories || null,
      household_weekly_calories: household_daily_calories ? household_daily_calories * 7 : null
    });
  } catch (error) {
    console.error('Error building shopping guide:', error);
    res.status(500).json({ error: 'Failed to build shopping guide' });
  }
});

/**
 * GET /api/household/check-item?name=X
 * Who likes/dislikes an item - for shopping list integration.
 * NOTE: must be declared before /:id
 */
router.get('/check-item', authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const result = await db.query(
      `SELECT m.id, m.name, m.avatar_emoji, fp.preference, fp.tier
       FROM household_member_food_prefs fp
       JOIN household_members m ON fp.member_id = m.id
       WHERE m.user_id = $1 AND LOWER(fp.food_name) = LOWER($2)`,
      [req.user.id, name.trim()]
    );

    res.json({
      liked_by: result.rows.filter(r => r.preference === 'like'),
      disliked_by: result.rows.filter(r => r.preference === 'dislike')
    });
  } catch (error) {
    console.error('Error checking item:', error);
    res.status(500).json({ error: 'Failed to check item' });
  }
});

/**
 * GET /api/household/:id
 * Full member detail: profile + stats + prefs + traits + chores + water
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const [latestHealth, foodPrefs, traits, chores, waterToday, healthHistory] = await Promise.all([
      getLatestHealth(member.id),
      db.query('SELECT * FROM household_member_food_prefs WHERE member_id = $1 ORDER BY preference, tier, food_name', [member.id]),
      db.query('SELECT * FROM household_member_traits WHERE member_id = $1 ORDER BY created_at DESC', [member.id]),
      db.query('SELECT * FROM household_member_chores WHERE member_id = $1 AND active = true ORDER BY frequency, title', [member.id]),
      db.query(
        `SELECT COALESCE(SUM(amount_oz), 0) as total FROM household_member_water_logs
         WHERE member_id = $1 AND logged_at::date = CURRENT_DATE`,
        [member.id]
      ),
      db.query(
        `SELECT * FROM household_member_health_logs WHERE member_id = $1
         ORDER BY logged_at DESC LIMIT 30`,
        [member.id]
      )
    ]);

    const stats = computeStats(member, latestHealth);
    const { extras } = await getFunExtras(member, stats);

    res.json({
      ...member,
      stats,
      badges: computeBadges(member, stats, extras),
      fun_points: computeFunPoints(extras),
      water_streak: extras.water_streak,
      snack_swaps: buildSnackSwaps(foodPrefs.rows),
      meal_ideas: buildMealIdeas(foodPrefs.rows),
      food_prefs: foodPrefs.rows,
      traits: traits.rows,
      chores: chores.rows,
      water_today_oz: parseInt(waterToday.rows[0].total, 10),
      health_history: healthHistory.rows
    });
  } catch (error) {
    console.error('Error fetching member:', error);
    res.status(500).json({ error: 'Failed to fetch member' });
  }
});

/**
 * PUT /api/household/:id
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const {
      name, relationship, avatar_emoji, color, date_of_birth, gender,
      height_cm, activity_level, diet_type, allergies,
      daily_calorie_target, water_goal_oz, notes
    } = req.body;

    const result = await db.query(
      `UPDATE household_members SET
        name = $1, relationship = $2, avatar_emoji = $3, color = $4,
        date_of_birth = $5, gender = $6, height_cm = $7,
        activity_level = $8, diet_type = $9, allergies = $10,
        daily_calorie_target = $11, water_goal_oz = $12, notes = $13,
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $14 RETURNING *`,
      [
        name ?? member.name, relationship ?? member.relationship,
        avatar_emoji ?? member.avatar_emoji, color ?? member.color,
        date_of_birth ?? member.date_of_birth, gender ?? member.gender,
        height_cm ?? member.height_cm, activity_level ?? member.activity_level,
        diet_type ?? member.diet_type, allergies ?? member.allergies,
        daily_calorie_target ?? member.daily_calorie_target,
        water_goal_oz ?? member.water_goal_oz, notes ?? member.notes,
        member.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating member:', error);
    res.status(500).json({ error: 'Failed to update member' });
  }
});

/**
 * DELETE /api/household/:id
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;
    await db.query('DELETE FROM household_members WHERE id = $1', [member.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting member:', error);
    res.status(500).json({ error: 'Failed to delete member' });
  }
});

// ============================================
// HEALTH LOGS (weight / BMI / muscle)
// ============================================

router.post('/:id/health', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const { weight_kg, body_fat_pct, muscle_pct, notes } = req.body;
    const result = await db.query(
      `INSERT INTO household_member_health_logs (member_id, weight_kg, body_fat_pct, muscle_pct, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [member.id, weight_kg || null, body_fat_pct || null, muscle_pct || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging health:', error);
    res.status(500).json({ error: 'Failed to log health entry' });
  }
});

// ============================================
// WATER
// ============================================

router.post('/:id/water', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const amount = parseInt(req.body.amount_oz, 10);
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'amount_oz must be a positive number' });
    }

    await db.query(
      'INSERT INTO household_member_water_logs (member_id, amount_oz) VALUES ($1, $2)',
      [member.id, amount]
    );

    const total = await db.query(
      `SELECT COALESCE(SUM(amount_oz), 0) as total FROM household_member_water_logs
       WHERE member_id = $1 AND logged_at::date = CURRENT_DATE`,
      [member.id]
    );

    res.status(201).json({ water_today_oz: parseInt(total.rows[0].total, 10) });
  } catch (error) {
    console.error('Error logging water:', error);
    res.status(500).json({ error: 'Failed to log water' });
  }
});

// ============================================
// FOOD PREFERENCES (tier list)
// ============================================

router.post('/:id/foods', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const { food_name, preference, tier, calories_per_serving, serving_unit, notes } = req.body;
    if (!food_name || !food_name.trim()) {
      return res.status(400).json({ error: 'food_name is required' });
    }

    const result = await db.query(
      `INSERT INTO household_member_food_prefs
        (member_id, food_name, preference, tier, calories_per_serving, serving_unit, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (member_id, food_name) DO UPDATE SET
        preference = EXCLUDED.preference, tier = EXCLUDED.tier,
        calories_per_serving = EXCLUDED.calories_per_serving,
        serving_unit = EXCLUDED.serving_unit, notes = EXCLUDED.notes
       RETURNING *`,
      [
        member.id, food_name.trim(), preference || 'like',
        (tier || 'B').toUpperCase(), calories_per_serving || null,
        serving_unit || null, notes || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving food pref:', error);
    res.status(500).json({ error: 'Failed to save food preference' });
  }
});

router.delete('/foods/:prefId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM household_member_food_prefs fp
       USING household_members m
       WHERE fp.id = $1 AND fp.member_id = m.id AND m.user_id = $2
       RETURNING fp.id`,
      [req.params.prefId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting food pref:', error);
    res.status(500).json({ error: 'Failed to delete food preference' });
  }
});

// ============================================
// TRAITS (likes / dislikes / pet peeves / habits)
// ============================================

router.post('/:id/traits', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const { category, description } = req.body;
    const validCategories = ['like', 'dislike', 'pet_peeve', 'habit'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    if (!description || !description.trim()) {
      return res.status(400).json({ error: 'description is required' });
    }

    const result = await db.query(
      `INSERT INTO household_member_traits (member_id, category, description)
       VALUES ($1,$2,$3) RETURNING *`,
      [member.id, category, description.trim()]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding trait:', error);
    res.status(500).json({ error: 'Failed to add trait' });
  }
});

router.delete('/traits/:traitId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM household_member_traits t
       USING household_members m
       WHERE t.id = $1 AND t.member_id = m.id AND m.user_id = $2
       RETURNING t.id`,
      [req.params.traitId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting trait:', error);
    res.status(500).json({ error: 'Failed to delete trait' });
  }
});

// ============================================
// CHORES
// ============================================

router.post('/:id/chores', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const { title, frequency, xp_value } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    const result = await db.query(
      `INSERT INTO household_member_chores (member_id, title, frequency, xp_value)
       VALUES ($1,$2,$3,$4) RETURNING *`,
      [member.id, title.trim(), frequency || 'daily', xp_value || 10]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding chore:', error);
    res.status(500).json({ error: 'Failed to add chore' });
  }
});

router.post('/chores/:choreId/complete', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE household_member_chores c SET last_completed_at = CURRENT_TIMESTAMP
       FROM household_members m
       WHERE c.id = $1 AND c.member_id = m.id AND m.user_id = $2
       RETURNING c.*`,
      [req.params.choreId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error completing chore:', error);
    res.status(500).json({ error: 'Failed to complete chore' });
  }
});

router.delete('/chores/:choreId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM household_member_chores c
       USING household_members m
       WHERE c.id = $1 AND c.member_id = m.id AND m.user_id = $2
       RETURNING c.id`,
      [req.params.choreId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting chore:', error);
    res.status(500).json({ error: 'Failed to delete chore' });
  }
});

// ============================================
// RANDOM FOOD GENERATOR
// ============================================

/**
 * GET /api/household/:id/random-food
 * Weighted random pick from liked foods (S-tier most likely, F least)
 */
router.get('/:id/random-food', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;

    const prefs = await db.query(
      `SELECT * FROM household_member_food_prefs
       WHERE member_id = $1 AND preference = 'like'`,
      [member.id]
    );

    if (prefs.rows.length === 0) {
      return res.json({ food: null, message: 'Add some liked foods first!' });
    }

    const bag = [];
    prefs.rows.forEach((p) => {
      const w = TIER_WEIGHTS[p.tier] || 4;
      for (let i = 0; i < w; i++) bag.push(p);
    });

    const pick = bag[Math.floor(Math.random() * bag.length)];
    res.json({ food: pick, pool_size: prefs.rows.length });
  } catch (error) {
    console.error('Error picking random food:', error);
    res.status(500).json({ error: 'Failed to pick food' });
  }
});

module.exports = router;
