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
      sometimes_by: result.rows.filter(r => r.preference === 'sometimes'),
      disliked_by: result.rows.filter(r => r.preference === 'dislike')
    });
  } catch (error) {
    console.error('Error checking item:', error);
    res.status(500).json({ error: 'Failed to check item' });
  }
});

// ============================================
// EATING OUT (restaurant/delivery pattern engine)
// NOTE: these root-level GET routes must stay above /:id
// ============================================

const DOW_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Reuse snack swaps to suggest a lighter/cheaper take on a restaurant item */
const suggestSwap = (name) => {
  const n = (name || '').toLowerCase();
  const hit = SNACK_SWAPS.find(s => s.match.some(m => n.includes(m)));
  return hit ? hit.to : null;
};

/**
 * GET /api/household/eat-out — all logs (newest first) w/ member info
 */
router.get('/eat-out', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*, m.name AS member_name, m.avatar_emoji, m.color AS member_color
       FROM household_eat_out_logs e
       LEFT JOIN household_members m ON e.member_id = m.id
       WHERE e.user_id = $1
       ORDER BY e.eaten_on DESC, e.created_at DESC LIMIT 200`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching eat-out logs:', error);
    res.status(500).json({ error: 'Failed to fetch eat-out logs' });
  }
});

/**
 * GET /api/household/eat-out/patterns
 * Learns each member's restaurant rhythm: weekday histograms, usual dishes,
 * average spend, predicted "eat out" days, healthier swaps + savings estimate.
 */
router.get('/eat-out/patterns', authenticateToken, async (req, res) => {
  try {
    const rows = (await db.query(
      `SELECT e.*, m.name AS member_name, m.avatar_emoji, m.color AS member_color
       FROM household_eat_out_logs e
       LEFT JOIN household_members m ON e.member_id = m.id
       WHERE e.user_id = $1 AND e.eaten_on > CURRENT_DATE - INTERVAL '120 days'
       ORDER BY e.eaten_on DESC`,
      [req.user.id]
    )).rows;

    const members = await db.query(
      'SELECT id, name, avatar_emoji, color FROM household_members WHERE user_id = $1',
      [req.user.id]
    );

    // ---- per member+restaurant aggregation ----
    const byKey = {}; // `${member_id||'household'}|${restaurant}`
    const houseDow = [0,0,0,0,0,0,0];
    let totalSpend = 0, daysWithSpend = new Set();

    for (const r of rows) {
      const dow = new Date(r.eaten_on + 'T00:00:00').getDay();
      houseDow[dow]++;
      if (r.total_cost) { totalSpend += parseFloat(r.total_cost); daysWithSpend.add(r.eaten_on.toISOString().slice(0,10)); }

      const key = `${r.member_id || 'household'}|${(r.restaurant || '').toLowerCase()}`;
      byKey[key] = byKey[key] || {
        member_id: r.member_id, member_name: r.member_name, avatar_emoji: r.avatar_emoji,
        member_color: r.member_color, ordered_for: r.ordered_for,
        restaurant: r.restaurant, count: 0, dow: [0,0,0,0,0,0,0],
        dishes: {}, spend: 0, spendCount: 0, last_visit: r.eaten_on
      };
      const agg = byKey[key];
      agg.count++;
      agg.dow[dow]++;
      (r.items || []).forEach(it => {
        const n = it.name || it;
        if (n) agg.dishes[n] = (agg.dishes[n] || 0) + 1;
      });
      if (r.total_cost) { agg.spend += parseFloat(r.total_cost); agg.spendCount++; }
      if (r.eaten_on > agg.last_visit) agg.last_visit = r.eaten_on;
    }

    const topDow = (arr) => {
      const max = Math.max(...arr);
      return max === 0 ? null : arr.indexOf(max);
    };

    const restaurantPatterns = Object.values(byKey).map(p => {
      const usualDow = topDow(p.dow);
      const topDishes = Object.entries(p.dishes).sort((a, b) => b[1] - a[1]).slice(0, 4)
        .map(([name, times]) => ({ name, times, swap: suggestSwap(name) }));
      return {
        member_id: p.member_id, member_name: p.member_name, avatar_emoji: p.avatar_emoji,
        member_color: p.member_color, ordered_for: p.ordered_for,
        restaurant: p.restaurant, visits: p.count,
        usual_day: usualDow != null ? DOW_NAMES[usualDow] : null,
        usual_dow: usualDow,
        weekday_counts: p.dow,
        top_dishes: topDishes,
        avg_spend: p.spendCount ? Math.round(p.spend / p.spendCount * 100) / 100 : null,
        last_visit: p.last_visit,
        // enough visits to call it a habit?
        confident: p.count >= 2
      };
    }).sort((a, b) => b.visits - a.visits);

    // ---- predicted eat-out days (household weekday rhythm) ----
    const predictedDays = houseDow.map((c, d) => ({ dow: d, name: DOW_NAMES[d], count: c }))
      .filter(d => d.count >= 2)
      .sort((a, b) => b.count - a.count);

    // ---- savings + calorie-friendly suggestions ----
    const monthsSpan = Math.max(1, Math.round(rows.length ?
      (Date.now() - new Date(rows[rows.length - 1].eaten_on)) / (1000*60*60*24*30) + 1 : 1));
    const avgPerVisit = daysWithSpend.size ? totalSpend / daysWithSpend.size : 0;
    const estHomeCostPerVisit = 12; // ~feeding a household at home
    const monthlyEstimate = {
      eat_out_visits: Math.round(daysWithSpend.size / monthsSpan),
      avg_spend: Math.round(avgPerVisit * 100) / 100,
      monthly_spend: Math.round(avgPerVisit * daysWithSpend.size / monthsSpan * 100) / 100,
      potential_savings: Math.round((avgPerVisit - estHomeCostPerVisit) * daysWithSpend.size / monthsSpan * 100) / 100
    };

    res.json({
      restaurant_patterns: restaurantPatterns,
      predicted_days: predictedDays,
      weekday_counts: houseDow,
      monthly_estimate: monthlyEstimate,
      members: members.rows
    });
  } catch (error) {
    console.error('Error building eat-out patterns:', error);
    res.status(500).json({ error: 'Failed to build patterns' });
  }
});

/** POST /api/household/eat-out — log a restaurant/delivery run */
router.post('/eat-out', authenticateToken, async (req, res) => {
  try {
    const { member_id, restaurant, items, total_cost, ordered_for, notes, eaten_on } = req.body;
    if (!restaurant || !restaurant.trim()) {
      return res.status(400).json({ error: 'restaurant is required' });
    }
    const result = await db.query(
      `INSERT INTO household_eat_out_logs
        (user_id, member_id, restaurant, items, total_cost, ordered_for, notes, eaten_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        req.user.id, member_id || null, restaurant.trim(),
        JSON.stringify(Array.isArray(items) ? items : []),
        total_cost || null, ordered_for || null, notes || null,
        eaten_on || new Date().toISOString().slice(0, 10)
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging eat-out:', error);
    res.status(500).json({ error: 'Failed to log eat-out' });
  }
});

/** PUT /api/household/eat-out/:logId */
router.put('/eat-out/:logId', authenticateToken, async (req, res) => {
  try {
    const { member_id, restaurant, items, total_cost, ordered_for, notes, eaten_on } = req.body;
    const result = await db.query(
      `UPDATE household_eat_out_logs SET
        member_id = $1, restaurant = $2, items = $3, total_cost = $4,
        ordered_for = $5, notes = $6, eaten_on = $7
       WHERE id = $8 AND user_id = $9 RETURNING *`,
      [
        member_id || null, restaurant, JSON.stringify(Array.isArray(items) ? items : []),
        total_cost || null, ordered_for || null, notes || null,
        eaten_on || new Date().toISOString().slice(0, 10),
        req.params.logId, req.user.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating eat-out log:', error);
    res.status(500).json({ error: 'Failed to update log' });
  }
});

/** DELETE /api/household/eat-out/:logId */
router.delete('/eat-out/:logId', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'DELETE FROM household_eat_out_logs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.logId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting eat-out log:', error);
    res.status(500).json({ error: 'Failed to delete log' });
  }
});

// ============================================
// HOUSEHOLD RANDOM MEAL (everyone's liked foods)
// ============================================

/**
 * GET /api/household/random-food
 * Weighted pick across ALL members' liked foods. 'sometimes' counts at half
 * weight; a food anyone dislikes is downweighted unless someone loves it.
 */
router.get('/random-food', authenticateToken, async (req, res) => {
  try {
    const prefs = await db.query(
      `SELECT fp.*, m.name AS member_name, m.avatar_emoji
       FROM household_member_food_prefs fp
       JOIN household_members m ON fp.member_id = m.id
       WHERE m.user_id = $1`,
      [req.user.id]
    );
    if (prefs.rows.length === 0) return res.json({ food: null, message: 'Add liked foods to members first!' });

    const byFood = {}; // name -> {weight, fans[]}
    for (const p of prefs.rows) {
      const key = p.food_name.toLowerCase();
      byFood[key] = byFood[key] || { food_name: p.food_name, tier: p.tier, weight: 0, fans: [], calories_per_serving: p.calories_per_serving };
      if (p.preference === 'dislike') { byFood[key].weight -= 2; continue; }
      const w = (TIER_WEIGHTS[p.tier] || 4) * (p.preference === 'sometimes' ? 0.5 : 1);
      byFood[key].weight += w;
      byFood[key].fans.push({ name: p.member_name, emoji: p.avatar_emoji, pref: p.preference, tier: p.tier });
      if ((TIER_WEIGHTS[p.tier] || 0) > (TIER_WEIGHTS[byFood[key].tier] || 0)) byFood[key].tier = p.tier;
    }

    const bag = [];
    Object.values(byFood).forEach(f => {
      for (let i = 0; i < Math.max(0, Math.round(f.weight)); i++) bag.push(f);
    });
    if (!bag.length) return res.json({ food: null, message: 'No liked foods across the household yet!' });

    res.json({ food: bag[Math.floor(Math.random() * bag.length)], pool_size: bag.length });
  } catch (error) {
    console.error('Error picking household food:', error);
    res.status(500).json({ error: 'Failed to pick food' });
  }
});

// ============================================
// DAILY CALORIE INTAKE
// ============================================

/** POST /api/household/:id/calories {calories} — upsert today's total */
router.post('/:id/calories', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;
    const cal = parseInt(req.body.calories, 10);
    if (!cal || cal <= 0 || cal > 20000) {
      return res.status(400).json({ error: 'calories must be 1-20000' });
    }
    const result = await db.query(
      `INSERT INTO household_member_calorie_logs (member_id, calories, notes)
       VALUES ($1, $2, $3)
       ON CONFLICT (member_id, logged_on)
       DO UPDATE SET calories = household_member_calorie_logs.calories + EXCLUDED.calories,
                     notes = COALESCE(EXCLUDED.notes, household_member_calorie_logs.notes)
       RETURNING *`,
      [member.id, cal, req.body.notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error logging calories:', error);
    res.status(500).json({ error: 'Failed to log calories' });
  }
});

/** GET /api/household/:id/calories?days=14 — intake history */
router.get('/:id/calories', authenticateToken, async (req, res) => {
  try {
    const member = await getMemberOr404(req.params.id, req.user.id, res);
    if (!member) return;
    const days = Math.min(90, parseInt(req.query.days, 10) || 14);
    const result = await db.query(
      `SELECT logged_on, SUM(calories) AS calories
       FROM household_member_calorie_logs
       WHERE member_id = $1 AND logged_on > CURRENT_DATE - $2::int * INTERVAL '1 day'
       GROUP BY logged_on ORDER BY logged_on DESC`,
      [member.id, days]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching calories:', error);
    res.status(500).json({ error: 'Failed to fetch calories' });
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

    const [latestHealth, foodPrefs, traits, chores, waterToday, healthHistory, caloriesToday, eatOutLogs] = await Promise.all([
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
      ),
      // Tolerate migration 055 not yet applied — detail page still loads
      db.query(
        `SELECT COALESCE(SUM(calories),0) AS total FROM household_member_calorie_logs
         WHERE member_id = $1 AND logged_on = CURRENT_DATE`,
        [member.id]
      ).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(
        `SELECT * FROM household_eat_out_logs WHERE member_id = $1
         ORDER BY eaten_on DESC LIMIT 20`,
        [member.id]
      ).catch(() => ({ rows: [] }))
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
      calories_today: parseInt(caloriesToday.rows[0].total, 10),
      health_history: healthHistory.rows,
      eat_out_logs: eatOutLogs.rows
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
    if (preference && !['like', 'sometimes', 'dislike'].includes(preference)) {
      return res.status(400).json({ error: 'Invalid preference' });
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

/** PUT /api/household/foods/:prefId — edit an existing pref */
router.put('/foods/:prefId', authenticateToken, async (req, res) => {
  try {
    const { food_name, preference, tier, calories_per_serving, serving_unit, notes } = req.body;
    if (preference && !['like', 'sometimes', 'dislike'].includes(preference)) {
      return res.status(400).json({ error: 'Invalid preference' });
    }
    const result = await db.query(
      `UPDATE household_member_food_prefs fp SET
        food_name = COALESCE($1, fp.food_name),
        preference = COALESCE($2, fp.preference),
        tier = COALESCE(UPPER($3), fp.tier),
        calories_per_serving = COALESCE($4, fp.calories_per_serving),
        serving_unit = COALESCE($5, fp.serving_unit),
        notes = COALESCE($6, fp.notes)
       FROM household_members m
       WHERE fp.id = $7 AND fp.member_id = m.id AND m.user_id = $8
       RETURNING fp.*`,
      [
        food_name?.trim() || null, preference || null, tier || null,
        calories_per_serving ?? null, serving_unit ?? null, notes ?? null,
        req.params.prefId, req.user.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating food pref:', error);
    res.status(500).json({ error: 'Failed to update food preference' });
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

/** PUT /api/household/traits/:traitId — edit a trait */
router.put('/traits/:traitId', authenticateToken, async (req, res) => {
  try {
    const { category, description } = req.body;
    if (category && !['like', 'dislike', 'pet_peeve', 'habit'].includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }
    const result = await db.query(
      `UPDATE household_member_traits t SET
        category = COALESCE($1, t.category),
        description = COALESCE($2, t.description)
       FROM household_members m
       WHERE t.id = $3 AND t.member_id = m.id AND m.user_id = $4
       RETURNING t.*`,
      [category || null, description?.trim() || null, req.params.traitId, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating trait:', error);
    res.status(500).json({ error: 'Failed to update trait' });
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

    const { title, frequency, xp_value, repeat_days } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    const days = Array.isArray(repeat_days)
      ? repeat_days.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6)
      : null;

    const result = await db.query(
      `INSERT INTO household_member_chores (member_id, title, frequency, xp_value, repeat_days)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [member.id, title.trim(), frequency || 'daily', xp_value || 10, days]
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

/** PUT /api/household/chores/:choreId — edit title/frequency/xp/repeat days */
router.put('/chores/:choreId', authenticateToken, async (req, res) => {
  try {
    const { title, frequency, xp_value, repeat_days, active } = req.body;
    const days = Array.isArray(repeat_days)
      ? repeat_days.map(d => parseInt(d, 10)).filter(d => d >= 0 && d <= 6)
      : null;
    const result = await db.query(
      `UPDATE household_member_chores c SET
        title = COALESCE($1, c.title),
        frequency = COALESCE($2, c.frequency),
        xp_value = COALESCE($3, c.xp_value),
        repeat_days = COALESCE($4::smallint[], c.repeat_days),
        active = COALESCE($5, c.active)
       FROM household_members m
       WHERE c.id = $6 AND c.member_id = m.id AND m.user_id = $7
       RETURNING c.*`,
      [
        title?.trim() || null, frequency || null, xp_value ?? null,
        days, active ?? null, req.params.choreId, req.user.id
      ]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating chore:', error);
    res.status(500).json({ error: 'Failed to update chore' });
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
