/**
 * MDL (Massive Data List) API Routes
 * Product master database with icons, prices, and metadata
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { canonicalizeCategory } = require('../utils/canonicalCategory');

// Search products in MDL
router.get('/search', async (req, res) => {
  try {
    const { q, category, limit = 20 } = req.query;
    
    let query = 'SELECT * FROM product_master_data WHERE 1=1';
    const params = [];
    let paramCount = 1;
    
    if (q) {
      query += ` AND (
        product_name ILIKE $${paramCount} OR
        slug ILIKE $${paramCount} OR
        $${paramCount} = ANY(keywords)
      )`;
      params.push(`%${q}%`);
      paramCount++;
    }
    
    if (category) {
      query += ` AND category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    query += ` ORDER BY is_best DESC, times_purchased DESC, product_name ASC LIMIT $${paramCount}`;
    params.push(limit);
    
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching MDL:', error);
    res.status(500).json({ error: 'Failed to search products' });
  }
});

// Get product by ID or slug
router.get('/product/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Try by ID first, then by slug
    const query = `
      SELECT * FROM product_master_data
      WHERE id = $1 OR slug = $2
      LIMIT 1
    `;
    
    const result = await db.query(query, [identifier, identifier]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Get price history
    const priceHistory = await db.query(`
      SELECT price, store, source, recorded_at
      FROM mdl_price_history
      WHERE product_id = $1
      ORDER BY recorded_at DESC
      LIMIT 10
    `, [result.rows[0].id]);
    
    res.json({
      ...result.rows[0],
      priceHistory: priceHistory.rows
    });
  } catch (error) {
    console.error('Error getting product:', error);
    res.status(500).json({ error: 'Failed to get product' });
  }
});

// Get all categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(`
      SELECT category, COUNT(*) as count
      FROM product_master_data
      GROUP BY category
      ORDER BY category ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Get popular products
router.get('/popular', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await db.query(`
      SELECT * FROM product_master_data
      WHERE times_purchased > 0
      ORDER BY times_purchased DESC
      LIMIT $1
    `, [limit]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting popular products:', error);
    res.status(500).json({ error: 'Failed to get popular products' });
  }
});

// Admin: Create product
router.post('/admin/product', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const {
      product_name, category, average_price,
      default_price_low, default_price_high,
      best_store, common_size, common_unit,
      icon_emoji, notes, aisle, brand, is_best
    } = req.body;

    if (!product_name || !product_name.trim()) {
      return res.status(400).json({ error: 'product_name is required' });
    }

    // Unique slug from name + short random suffix
    const baseSlug = product_name.trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
    const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`;

    const result = await db.query(`
      INSERT INTO product_master_data
        (product_name, slug, category, average_price, default_price_low,
         default_price_high, best_store, common_size, common_unit, icon_emoji,
         notes, aisle, brand, is_best)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      product_name.trim(), slug, category ? canonicalizeCategory(category) : null,
      average_price ?? null, default_price_low ?? null, default_price_high ?? null,
      best_store || null, common_size || null, common_unit || null,
      icon_emoji || null, notes || null, aisle || null, brand || null,
      !!is_best
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A product with this name already exists' });
    }
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

// Admin: Update product
router.put('/admin/product/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const {
      product_name, category, average_price,
      default_price_low, default_price_high,
      best_store, common_stores, common_size, common_unit,
      typical_shelf_life_days, typical_location,
      icon_emoji, notes, aisle, brand, is_best
    } = req.body;
    
    const result = await db.query(`
      UPDATE product_master_data SET
        product_name = COALESCE($1, product_name),
        category = COALESCE($2, category),
        average_price = COALESCE($3, average_price),
        default_price_low = COALESCE($4, default_price_low),
        default_price_high = COALESCE($5, default_price_high),
        best_store = COALESCE($6, best_store),
        common_stores = COALESCE($7, common_stores),
        common_size = COALESCE($8, common_size),
        common_unit = COALESCE($9, common_unit),
        typical_shelf_life_days = COALESCE($10, typical_shelf_life_days),
        typical_location = COALESCE($11, typical_location),
        icon_emoji = COALESCE($12, icon_emoji),
        notes = COALESCE($13, notes),
        aisle = COALESCE($15, aisle),
        brand = COALESCE($16, brand),
        is_best = COALESCE($17, is_best),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      product_name, category ? canonicalizeCategory(category) : null, average_price,
      default_price_low, default_price_high,
      best_store, common_stores, common_size, common_unit,
      typical_shelf_life_days, typical_location,
      icon_emoji, notes, id, aisle, brand, is_best
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// Admin: Add price data point
router.post('/admin/product/:id/price', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { id } = req.params;
    const { price, store, source = 'manual' } = req.body;
    
    await db.query(`
      INSERT INTO mdl_price_history (product_id, price, store, source)
      VALUES ($1, $2, $3, $4)
    `, [id, price, store, source]);
    
    // Update average price
    const avgResult = await db.query(`
      SELECT AVG(price) as avg_price
      FROM mdl_price_history
      WHERE product_id = $1
    `, [id]);
    
    await db.query(`
      UPDATE product_master_data
      SET average_price = $1, last_price_update = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [avgResult.rows[0].avg_price, id]);
    
    res.json({ success: true, averagePrice: avgResult.rows[0].avg_price });
  } catch (error) {
    console.error('Error adding price:', error);
    res.status(500).json({ error: 'Failed to add price' });
  }
});

// Get user preferences for a product (numeric product IDs only —
// string keys like 'last_active_list_id' fall through to /preferences/:key)
router.get('/preferences/:productId(\\d+)', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM user_product_preferences
      WHERE user_id = $1 AND product_id = $2
    `, [req.user.id, req.params.productId]);
    
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Set user preferences for a product
router.post('/preferences/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { preferred_store, preferred_size, preferred_price, preferred_location, notes } = req.body;
    
    const result = await db.query(`
      INSERT INTO user_product_preferences (
        user_id, product_id, preferred_store, preferred_size,
        preferred_price, preferred_location, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (user_id, product_id)
      DO UPDATE SET
        preferred_store = EXCLUDED.preferred_store,
        preferred_size = EXCLUDED.preferred_size,
        preferred_price = EXCLUDED.preferred_price,
        preferred_location = EXCLUDED.preferred_location,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.id, productId, preferred_store, preferred_size, preferred_price, preferred_location, notes]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// Resolve a storeId param which may be numeric (store id) or a store name
const resolveStoreId = async (storeId) => {
  if (storeId == null) return null;
  if (/^\d+$/.test(String(storeId))) return parseInt(storeId, 10);
  const s = await db.query(
    `SELECT id FROM store_locations
     WHERE LOWER(COALESCE(name, store_name)) = LOWER($1) LIMIT 1`,
    [decodeURIComponent(String(storeId))]
  );
  return s.rows[0]?.id || null;
};

// Get aisle prediction for item at specific store
router.get('/aisle/:itemName/:storeId', authenticateToken, async (req, res) => {
  try {
    const { itemName } = req.params;

    // Aisle prediction is best-effort — if the MDL tables aren't migrated yet
    // (migration 040 can abort mid-file on some deployments), degrade to
    // "no prediction" instead of 500ing the whole dashboard.
    let storeId = null;
    try {
      storeId = await resolveStoreId(req.params.storeId);
    } catch (lookupErr) {
      console.warn('Aisle prediction: store lookup failed:', lookupErr.message);
    }

    // First, try learned data for this specific store
    if (storeId) {
      try {
        const aisleResult = await db.query(`
          SELECT la.aisle_number, la.confidence_score, la.report_count
          FROM mdl_location_aisles la
          JOIN mdl_item_names n ON la.item_name_id = n.id
          WHERE n.normalized_name = normalize_item_name($1)
            AND la.specific_store_id = $2
            AND la.confidence_score > 0.5
          ORDER BY la.confidence_score DESC, la.report_count DESC
          LIMIT 1
        `, [itemName, storeId]);

        if (aisleResult.rows.length > 0) {
          return res.json({
            aisle: aisleResult.rows[0].aisle_number,
            confidence: aisleResult.rows[0].confidence_score,
            source: 'learned',
            reports: aisleResult.rows[0].report_count
          });
        }
      } catch (learnedErr) {
        console.warn('Aisle prediction: learned lookup failed:', learnedErr.message);
      }
    }

    // Fallback: category-based mapping (this store first, then any store)
    try {
      const categoryResult = await db.query(`
        SELECT ca.aisle_number, ca.item_count, ca.store_id
        FROM shopping_list_items sli
        JOIN mdl_category_aisles ca ON LOWER(sli.category) = LOWER(ca.category)
        WHERE LOWER(sli.item_name) = LOWER($1)
          AND (ca.store_id = $2 OR ca.store_id IS NULL)
        ORDER BY (ca.store_id IS NOT NULL AND ca.store_id = $2) DESC, ca.item_count DESC
        LIMIT 1
      `, [itemName, storeId || -1]);

      if (categoryResult.rows.length > 0) {
        return res.json({
          aisle: categoryResult.rows[0].aisle_number,
          confidence: Math.min(0.9, 0.3 + (categoryResult.rows[0].item_count || 0) / 10),
          source: 'category'
        });
      }
    } catch (catErr) {
      console.warn('Aisle prediction: category fallback failed:', catErr.message);
    }

    // No prediction available
    res.json({ aisle: null, confidence: 0, source: 'none' });
  } catch (error) {
    console.error('Error getting aisle prediction:', error);
    res.status(500).json({ error: 'Failed to get aisle prediction' });
  }
});

// Report aisle location (user feedback for learning)
router.post('/aisle/report', authenticateToken, async (req, res) => {
  try {
    const { itemName, aisleNumber, wasCorrect, category, categoryId } = req.body;
    const { storeId } = req.body;

    if (!itemName || !aisleNumber || !storeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const itemNameId = (await db.query(
      'SELECT get_or_create_item_name($1) AS id', [itemName.trim()]
    )).rows[0].id;
    const storeIdNum = await resolveStoreId(storeId);

    // Resolve category name (accept a string category, a category name in
    // categoryId, or a numeric categories.id)
    let categoryName = typeof category === 'string' ? category
      : (categoryId != null && !/^\d+$/.test(String(categoryId)) ? String(categoryId) : null);
    if (categoryName == null && categoryId != null) {
      const cat = await db.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
      categoryName = cat.rows[0]?.name || null;
    }

    // Record the report
    await db.query(`
      INSERT INTO mdl_aisle_reports (
        user_id, item_name_id, store_id, aisle_number, was_prediction_correct
      ) VALUES ($1, $2, $3, $4, $5)
    `, [req.user.id, itemNameId, storeIdNum, aisleNumber, wasCorrect ?? null]);

    // Upsert aggregated aisle data (confidence = share of non-incorrect reports)
    await db.query(`
      INSERT INTO mdl_location_aisles (
        item_name_id, specific_store_id, category, aisle_number,
        report_count, confidence_score, last_updated
      ) VALUES ($1, $2, $3, $4, 1, 0.6, NOW())
      ON CONFLICT (item_name_id, (COALESCE(specific_store_id, 0)))
      DO UPDATE SET
        aisle_number = (
          SELECT MODE() WITHIN GROUP (ORDER BY r.aisle_number)
          FROM mdl_aisle_reports r
          WHERE r.item_name_id = $1 AND r.store_id IS NOT DISTINCT FROM $2
        ),
        category = COALESCE($3, mdl_location_aisles.category),
        report_count = (
          SELECT COUNT(*) FROM mdl_aisle_reports r
          WHERE r.item_name_id = $1 AND r.store_id IS NOT DISTINCT FROM $2
        ),
        confidence_score = LEAST(0.95, (
          SELECT COALESCE(AVG(CASE WHEN COALESCE(r.was_prediction_correct, true) THEN 1.0 ELSE 0.0 END), 0.5)
          FROM mdl_aisle_reports r
          WHERE r.item_name_id = $1 AND r.store_id IS NOT DISTINCT FROM $2
        )),
        last_updated = NOW()
    `, [itemNameId, storeIdNum, categoryName, aisleNumber]);

    // Feed the category→aisle mapping used by the prediction fallback
    if (categoryName) {
      await db.query(`
        INSERT INTO mdl_category_aisles (category, store_id, aisle_number, item_count, last_updated)
        VALUES ($1, $2, $3, 1, NOW())
        ON CONFLICT (category, store_id, aisle_number)
        DO UPDATE SET item_count = mdl_category_aisles.item_count + 1, last_updated = NOW()
      `, [categoryName, storeIdNum, aisleNumber]);
    }

    res.json({ success: true, message: 'Aisle report recorded' });
  } catch (error) {
    console.error('Error reporting aisle:', error);
    res.status(500).json({ error: 'Failed to report aisle' });
  }
});

// Get store locations (for My Stores feature)
router.get('/stores', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, COALESCE(name, store_name) AS name,
        COALESCE(chain, chain_name, store_chain) AS chain,
        city, state, zip_code, area_code, latitude, longitude,
        is_public, user_id, created_at
      FROM store_locations
      WHERE user_id = $1 OR user_id IS NULL OR is_public = true
      ORDER BY COALESCE(name, store_name) ASC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting stores:', error);
    res.status(500).json({ error: 'Failed to get stores' });
  }
});

// Search stores by name
router.get('/stores/search', authenticateToken, async (req, res) => {
  try {
    const { name } = req.query;

    const result = await db.query(`
      SELECT id, COALESCE(name, store_name) AS name,
        COALESCE(chain, chain_name, store_chain) AS chain,
        city, state, zip_code, area_code, latitude, longitude,
        is_public, user_id, created_at
      FROM store_locations
      WHERE (COALESCE(name, store_name) ILIKE $1
        OR COALESCE(chain, chain_name, store_chain) ILIKE $1)
        AND (user_id = $2 OR user_id IS NULL OR is_public = true)
      ORDER BY COALESCE(name, store_name) ASC
      LIMIT 10
    `, [`%${name || ''}%`, req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching stores:', error);
    res.status(500).json({ error: 'Failed to search stores' });
  }
});

// Create new store location
router.post('/stores', authenticateToken, async (req, res) => {
  try {
    const {
      name, store_name, chain, chain_name, state, city,
      area_code, zip_code, latitude, longitude, is_public
    } = req.body;
    const storeName = name || store_name;
    const storeChain = chain || chain_name;

    if (!storeName || !String(storeName).trim()) {
      return res.status(400).json({ error: 'Store name is required' });
    }

    const result = await db.query(`
      INSERT INTO store_locations (
        name, store_name, chain, chain_name, user_id,
        state, city, area_code, zip_code, latitude, longitude, is_public
      ) VALUES ($1, $1, $2, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      String(storeName).trim(), storeChain || null, req.user.id,
      state || null, city || null, area_code || null, zip_code || null,
      latitude || null, longitude || null, is_public === true
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Get all MDL preferences for the user as a key->value object
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT preference_key, preference_value FROM mdl_user_preferences WHERE user_id = $1',
      [req.user.id]
    );
    const preferences = {};
    for (const row of result.rows) {
      preferences[row.preference_key] = row.preference_value;
    }
    res.json({ preferences });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Get user preference by key
router.get('/preferences/:key', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT preference_value FROM mdl_user_preferences
      WHERE user_id = $1 AND preference_key = $2
    `, [req.user.id, req.params.key]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preference not found' });
    }
    
    res.json({ value: result.rows[0].preference_value });
  } catch (error) {
    console.error('Error getting preference:', error);
    res.status(500).json({ error: 'Failed to get preference' });
  }
});

// Set user preference
router.post('/preferences', authenticateToken, async (req, res) => {
  try {
    const { key, value } = req.body;
    
    const result = await db.query(`
      INSERT INTO mdl_user_preferences (user_id, preference_key, preference_value, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (user_id, preference_key) 
      DO UPDATE SET preference_value = $3, updated_at = NOW()
      RETURNING *
    `, [req.user.id, key, value]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving preference:', error);
    res.status(500).json({ error: 'Failed to save preference' });
  }
});

// ============================================================================
// ITEM TRACKING — the core learning write path
// ============================================================================

/**
 * POST /api/mdl/track-item
 * Records an item addition into the MDL system:
 *  1. Registry entry via get_or_create_item_name()
 *  2. History row with temporal + location context
 *  3. User pattern upsert (frequency, price stats, cadence, prediction)
 *  4. Seeds product_master_data so the product DB grows organically
 */
router.post('/track-item', authenticateToken, async (req, res) => {
  try {
    const { itemName, price, quantity, unit, store, listId, wasSuggestion, userTyped } = req.body;
    if (!itemName || !itemName.trim()) {
      return res.status(400).json({ error: 'itemName is required' });
    }

    const itemNameId = await db.query(
      'SELECT get_or_create_item_name($1) as id',
      [itemName.trim()]
    ).then(r => r.rows[0].id);

    // User location context (optional)
    const loc = await db.query(
      'SELECT state, city FROM user_locations WHERE user_id = $1',
      [req.user.id]
    );
    const userState = loc.rows[0]?.state || null;
    const userCity = loc.rows[0]?.city || null;

    await db.query(
      `INSERT INTO mdl_user_item_history
        (user_id, item_name_id, day_of_week, hour_of_day, week_of_month, month, season,
         quantity, unit, price, store_name, list_id, user_state, user_city, was_suggestion, user_typed)
       VALUES ($1,$2, EXTRACT(DOW FROM NOW()), EXTRACT(HOUR FROM NOW()),
               CEIL(EXTRACT(DAY FROM NOW())/7.0), EXTRACT(MONTH FROM NOW()), get_season(CURRENT_DATE),
               $3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        req.user.id, itemNameId,
        quantity || null, unit || null, price || null, store || null, listId || null,
        userState, userCity, !!wasSuggestion, userTyped !== false
      ]
    );

    // Pattern upsert
    await db.query(
      `INSERT INTO mdl_user_patterns
        (user_id, item_name_id, total_times_added, first_added, last_added,
         average_price, min_price, max_price, last_price, average_quantity, typical_unit, updated_at)
       VALUES ($1,$2,1,NOW(),NOW(),$3,$3,$3,$3,$4,$5,NOW())
       ON CONFLICT (user_id, item_name_id) DO UPDATE SET
         total_times_added = mdl_user_patterns.total_times_added + 1,
         last_added = NOW(),
         last_price = COALESCE(EXCLUDED.last_price, mdl_user_patterns.last_price),
         min_price = LEAST(mdl_user_patterns.min_price, COALESCE(EXCLUDED.min_price, mdl_user_patterns.min_price)),
         max_price = GREATEST(mdl_user_patterns.max_price, COALESCE(EXCLUDED.max_price, mdl_user_patterns.max_price)),
         average_price = CASE
           WHEN EXCLUDED.average_price IS NOT NULL THEN
             ROUND(((mdl_user_patterns.average_price * mdl_user_patterns.total_times_added) + EXCLUDED.average_price)
                   / (mdl_user_patterns.total_times_added + 1), 2)
           ELSE mdl_user_patterns.average_price END,
         average_quantity = COALESCE(mdl_user_patterns.average_quantity, EXCLUDED.average_quantity),
         typical_unit = COALESCE(EXCLUDED.typical_unit, mdl_user_patterns.typical_unit),
         updated_at = NOW()`,
      [req.user.id, itemNameId, price || null, quantity || null, unit || null]
    );

    // Cadence + prediction (avg days between adds -> next predicted date)
    await db.query(
      `WITH diffs AS (
         SELECT EXTRACT(EPOCH FROM (added_at - LAG(added_at) OVER (ORDER BY added_at)))/86400.0 AS gap
         FROM mdl_user_item_history
         WHERE user_id = $1 AND item_name_id = $2
       ), agg AS (
         SELECT AVG(gap)::numeric(10,2) AS avg_gap, COUNT(gap) AS gaps FROM diffs WHERE gap IS NOT NULL
       )
       UPDATE mdl_user_patterns p
       SET average_days_between = agg.avg_gap,
           next_predicted_date = (NOW() + (COALESCE(agg.avg_gap, 7) || ' days')::interval)::date,
           prediction_confidence = LEAST(0.95, agg.gaps / 10.0),
           preferred_stores = CASE WHEN $3::text IS NOT NULL
             THEN jsonb_build_object($3::text, COALESCE((p.preferred_stores->>$3::text)::int, 0) + 1)
             ELSE p.preferred_stores END
       FROM agg
       WHERE p.user_id = $1 AND p.item_name_id = $2`,
      [req.user.id, itemNameId, store || null]
    );

    // Seed the product catalog organically (never fails the track call)
    if (itemName.trim().length > 2) {
      try {
        const slug = itemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        await db.query(
          `INSERT INTO product_master_data
             (product_name, slug, category, average_price, icon_emoji, times_purchased, last_price_update)
           VALUES ($1, $2, 'uncategorized', $3, $4, 1, NOW())
           ON CONFLICT (product_name) DO UPDATE SET
             times_purchased = product_master_data.times_purchased + 1,
             average_price = COALESCE(product_master_data.average_price, EXCLUDED.average_price),
             icon_emoji = COALESCE(product_master_data.icon_emoji, EXCLUDED.icon_emoji),
             last_price_update = NOW()`,
          [itemName.trim(), slug, price || null, req.body.icon || null]
        );
      } catch (e) {
        console.warn('Product catalog upsert failed (non-fatal):', e.message);
      }
    }

    // Location-aware price aggregation (state-level)
    if (price && userState) {
      await db.query(
        `INSERT INTO mdl_location_prices
           (item_name_id, state, average_price, min_price, max_price, sample_size, confidence_score)
         VALUES ($1,$2,$3,$3,$3,1,0.1)
         ON CONFLICT (item_name_id, (COALESCE(state, '')), (COALESCE(store_chain, '')), (COALESCE(specific_store_id, 0))) DO UPDATE SET
           average_price = ROUND(((mdl_location_prices.average_price * mdl_location_prices.sample_size) + $3)
                                 / (mdl_location_prices.sample_size + 1), 2),
           min_price = LEAST(mdl_location_prices.min_price, $3),
           max_price = GREATEST(mdl_location_prices.max_price, $3),
           sample_size = mdl_location_prices.sample_size + 1,
           confidence_score = LEAST(0.95, (mdl_location_prices.sample_size + 1) / 20.0),
           last_updated = NOW()`,
        [itemNameId, userState, price]
      );
    }

    // Weird-data check — questionable submissions go to the admin review
    // queue instead of polluting the learned data (never fails the request)
    try {
      const reasons = [];
      const raw = itemName.trim();
      const letters = (raw.match(/[a-zA-Z]/g) || []).length;
      const digits = (raw.match(/\d/g) || []).length;
      if (raw.length > 60) reasons.push('long_name');
      if (letters === 0) reasons.push('no_letters');
      else if (digits > letters * 2 && digits > 4) reasons.push('excessive_digits');
      if (/[^a-zA-Z0-9\s&'().\-\/]/.test(raw)) reasons.push('special_chars');
      if (price != null && !(price >= 0.01 && price <= 10000)) reasons.push('extreme_price');

      if (reasons.length > 0) {
        await db.query(
          `INSERT INTO mdl_review_queue (user_id, raw_name, price, store, reason)
           VALUES ($1, $2, $3, $4, $5)`,
          [req.user.id, raw, price || null, store || null, reasons.join(',')]
        );
      }
    } catch (e) {
      console.warn('Review-queue insert skipped:', e.message);
    }

    res.status(201).json({ tracked: true, itemNameId });
  } catch (error) {
    console.error('Error tracking item:', error);
    res.status(500).json({ error: 'Failed to track item' });
  }
});

/**
 * GET /api/mdl/patterns/:itemName
 * User's learned pattern for a specific item
 */
router.get('/patterns/:itemName', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT p.*, n.normalized_name
       FROM mdl_user_patterns p
       JOIN mdl_item_names n ON p.item_name_id = n.id
       WHERE p.user_id = $1 AND n.normalized_name = normalize_item_name($2)`,
      [req.user.id, req.params.itemName]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error getting pattern:', error);
    res.status(500).json({ error: 'Failed to get pattern' });
  }
});

/**
 * GET /api/mdl/suggestions
 * Items predicted to be due again (next_predicted_date <= today + 2)
 */
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.normalized_name AS item_name, n.predicted_category, n.predicted_icon,
              n.image_url, p.last_price, p.average_price, p.total_times_added,
              p.next_predicted_date, p.prediction_confidence, p.average_days_between
       FROM mdl_user_patterns p
       JOIN mdl_item_names n ON p.item_name_id = n.id
       WHERE p.user_id = $1
         AND p.next_predicted_date IS NOT NULL
         AND p.next_predicted_date <= CURRENT_DATE + INTERVAL '2 days'
         AND p.prediction_confidence >= 0.2
       ORDER BY p.next_predicted_date ASC, p.prediction_confidence DESC
       LIMIT 15`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * GET /api/mdl/price/:itemName
 * Best price estimate: personal avg > state avg > global avg > catalog
 */
router.get('/price/:itemName', authenticateToken, async (req, res) => {
  try {
    const { itemName } = req.params;

    // Personal average
    const personal = await db.query(
      `SELECT p.average_price, p.last_price, p.total_times_added as samples
       FROM mdl_user_patterns p
       JOIN mdl_item_names n ON p.item_name_id = n.id
       WHERE p.user_id = $1 AND n.normalized_name = normalize_item_name($2)`,
      [req.user.id, itemName]
    );
    if (personal.rows[0]?.average_price) {
      const p = personal.rows[0];
      return res.json({
        price: p.average_price, last_price: p.last_price,
        confidence: Math.min(0.95, p.samples / 10), source: 'personal'
      });
    }

    // Location average (user's state first, then all-state)
    const loc = await db.query(
      `SELECT lp.average_price, lp.confidence_score, lp.sample_size
       FROM mdl_location_prices lp
       JOIN mdl_item_names n ON lp.item_name_id = n.id
       LEFT JOIN user_locations ul ON ul.user_id = $1
       WHERE n.normalized_name = normalize_item_name($2)
       ORDER BY (lp.state = ul.state) DESC NULLS LAST, lp.sample_size DESC
       LIMIT 1`,
      [req.user.id, itemName]
    );
    if (loc.rows[0]?.average_price) {
      const l = loc.rows[0];
      return res.json({ price: l.average_price, confidence: l.confidence_score, source: 'location' });
    }

    // Catalog default
    const catalog = await db.query(
      `SELECT average_price, price_confidence FROM product_master_data
       WHERE LOWER(product_name) = LOWER($1) OR slug = $2 LIMIT 1`,
      [itemName.trim(), itemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')]
    );
    res.json({
      price: catalog.rows[0]?.average_price || null,
      confidence: (catalog.rows[0]?.price_confidence || 0) / 100,
      source: catalog.rows.length ? 'catalog' : 'none'
    });
  } catch (error) {
    console.error('Error getting price estimate:', error);
    res.status(500).json({ error: 'Failed to get price estimate' });
  }
});

// ============================================================================
// STORE USUALS — per-store "you usually buy" predictions
// ============================================================================

/**
 * GET /api/mdl/store-usuals?store=&limit=
 * Most-bought items at the given store (history rows store_name match).
 * If the store has fewer than `limit` items, tops up with the user's
 * global usuals — each row carries store_match so the UI can label
 * "at Walmart" vs "usually".
 */
router.get('/store-usuals', authenticateToken, async (req, res) => {
  try {
    const { store } = req.query;
    const lim = Math.min(parseInt(req.query.limit) || 8, 25);

    const base = `
      SELECT n.normalized_name AS item_name, n.predicted_icon, n.predicted_category,
             COUNT(*) AS times_bought,
             MAX(h.created_at) AS last_bought,
             (ARRAY_AGG(h.price    ORDER BY h.created_at DESC))[1] AS last_price,
             (ARRAY_AGG(h.quantity ORDER BY h.created_at DESC))[1] AS last_quantity,
             (ARRAY_AGG(h.unit     ORDER BY h.created_at DESC))[1] AS last_unit
      FROM mdl_user_item_history h
      JOIN mdl_item_names n ON n.id = h.item_name_id
      WHERE h.user_id = $1`;

    let rows = [];
    if (store) {
      const r = await db.query(
        `${base} AND LOWER(h.store_name) = LOWER($2)
         GROUP BY n.normalized_name, n.predicted_icon, n.predicted_category
         ORDER BY times_bought DESC, last_bought DESC LIMIT $3`,
        [req.user.id, store, lim]
      );
      rows = r.rows.map((row) => ({ ...row, store_match: true }));
    }

    if (rows.length < lim) {
      const have = new Set(rows.map((r) => r.item_name));
      const r = await db.query(
        `${base} GROUP BY n.normalized_name, n.predicted_icon, n.predicted_category
         ORDER BY times_bought DESC, last_bought DESC LIMIT $2`,
        [req.user.id, lim * 2]
      );
      for (const row of r.rows) {
        if (rows.length >= lim) break;
        if (!have.has(row.item_name)) {
          rows.push({ ...row, store_match: false });
        }
      }
    }

    res.json(rows);
  } catch (error) {
    console.error('Store usuals error:', error);
    res.status(500).json({ error: 'Failed to fetch store usuals' });
  }
});

// ============================================================================
// USER LOCATION
// ============================================================================

router.post('/location', authenticateToken, async (req, res) => {
  try {
    const { state, city, zipCode, metroArea, sharingLevel } = req.body;
    const result = await db.query(
      `INSERT INTO user_locations (user_id, state, city, zip_code, metro_area, location_sharing_level)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id) DO UPDATE SET
         state = EXCLUDED.state, city = EXCLUDED.city, zip_code = EXCLUDED.zip_code,
         metro_area = EXCLUDED.metro_area, location_sharing_level = EXCLUDED.location_sharing_level,
         updated_at = NOW()
       RETURNING *`,
      [req.user.id, state || null, city || null, zipCode || null, metroArea || null, sharingLevel || 'state']
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving location:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

router.get('/location', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM user_locations WHERE user_id = $1', [req.user.id]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error getting location:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// ============================================================================
// ADMIN STATS + BACKUPS
// ============================================================================

const mdlBackup = require('../services/mdlBackup');

/**
 * GET /api/mdl/admin/stats
 * Real counts across the product DB + training tables (admin only)
 */
router.get('/admin/stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const count = async (table) => {
      try {
        const r = await db.query(`SELECT COUNT(*)::int AS c FROM ${table}`);
        return r.rows[0].c;
      } catch (e) {
        return null; // table missing
      }
    };

    const [products, categories, priceRecords, itemNames, userHistory, userPatterns, stores] =
      await Promise.all([
        count('product_master_data'),
        db.query(`SELECT COUNT(DISTINCT category)::int AS c FROM product_master_data`)
          .then(r => r.rows[0].c).catch(() => null),
        count('mdl_price_history'),
        count('mdl_item_names'),
        count('mdl_user_item_history'),
        count('mdl_user_patterns'),
        count('store_locations'),
      ]);

    res.json({ products, categories, priceRecords, itemNames, userHistory, userPatterns, stores });
  } catch (error) {
    console.error('Error getting MDL stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

router.post('/backups/run', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    res.json(await mdlBackup.runBackup('manual'));
  } catch (error) {
    console.error('Error running backup:', error);
    res.status(500).json({ error: 'Backup failed' });
  }
});

router.get('/backups', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    res.json(mdlBackup.listBackupFiles());
  } catch (error) {
    console.error('Error listing backups:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// ============================================================================
// SIZE / WEIGHT / UNIT PRESETS (admin-managed, simple names, color-coded)
// ============================================================================

// List presets — optionally filtered to a category (includes global presets)
router.get('/size-presets', authenticateToken, async (req, res) => {
  try {
    const { category } = req.query;
    const result = await db.query(
      `SELECT * FROM mdl_size_presets
       WHERE category IS NULL OR category = $1
       ORDER BY preset_type, sort_order`,
      [category || null]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting size presets:', error);
    res.status(500).json({ error: 'Failed to get size presets' });
  }
});

// Admin: create preset
router.post('/admin/size-presets', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { category, preset_type, label, value, sort_order, color } = req.body;
    if (!label || !value) return res.status(400).json({ error: 'label and value required' });
    const result = await db.query(
      `INSERT INTO mdl_size_presets (category, preset_type, label, value, sort_order, color)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (category, preset_type, value) DO UPDATE SET
         label = EXCLUDED.label, sort_order = EXCLUDED.sort_order, color = EXCLUDED.color
       RETURNING *`,
      [category || null, preset_type || 'size', label, value, sort_order ?? 0, color || 'gray']
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating size preset:', error);
    res.status(500).json({ error: 'Failed to create size preset' });
  }
});

// Admin: delete preset
router.delete('/admin/size-presets/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    await db.query('DELETE FROM mdl_size_presets WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting size preset:', error);
    res.status(500).json({ error: 'Failed to delete size preset' });
  }
});

// ============================================================================
// PER-STORE PRODUCT VARIANTS (sub-entries for different store locations)
// ============================================================================

// Get all store variants for a product
router.get('/admin/product/:id/variants', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM mdl_product_variants WHERE product_id = $1 ORDER BY store_name, size_value',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting variants:', error);
    res.status(500).json({ error: 'Failed to get variants' });
  }
});

// Admin: upsert a store variant
router.post('/admin/product/:id/variants', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { store_name, aisle, price, size_value, is_best, notes } = req.body;
    if (!store_name || !store_name.trim()) {
      return res.status(400).json({ error: 'store_name required' });
    }
    const result = await db.query(
      `INSERT INTO mdl_product_variants (product_id, store_name, aisle, price, size_value, is_best, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (product_id, store_name, size_value) DO UPDATE SET
         aisle = COALESCE(EXCLUDED.aisle, mdl_product_variants.aisle),
         price = COALESCE(EXCLUDED.price, mdl_product_variants.price),
         is_best = COALESCE(EXCLUDED.is_best, mdl_product_variants.is_best),
         notes = COALESCE(EXCLUDED.notes, mdl_product_variants.notes),
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.params.id, store_name.trim(), aisle || null, price ?? null,
       size_value || '', is_best || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving variant:', error);
    res.status(500).json({ error: 'Failed to save variant' });
  }
});

// Admin: delete a variant
router.delete('/admin/variants/:variantId', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    await db.query('DELETE FROM mdl_product_variants WHERE id = $1', [req.params.variantId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting variant:', error);
    res.status(500).json({ error: 'Failed to delete variant' });
  }
});

// Admin: mark one variant as the "best version" (clears other stores' flag)
router.post('/admin/variants/:variantId/mark-best', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    await db.query(
      `UPDATE mdl_product_variants SET is_best = FALSE, updated_at = CURRENT_TIMESTAMP
       WHERE product_id = (SELECT product_id FROM mdl_product_variants WHERE id = $1)`,
      [req.params.variantId]
    );
    const result = await db.query(
      `UPDATE mdl_product_variants SET is_best = TRUE, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 RETURNING *`,
      [req.params.variantId]
    );
    res.json(result.rows[0] || null);
  } catch (error) {
    console.error('Error marking best variant:', error);
    res.status(500).json({ error: 'Failed to mark best variant' });
  }
});

// ============================================================================
// HOUSEHOLD-MEMBER FAVORITES (items / brands / ingredients / meals / restaurants)
// ============================================================================

// Get favorites for this user — optionally filtered by entity
router.get('/favorites', authenticateToken, async (req, res) => {
  try {
    const { entity_type, entity_name } = req.query;
    let query = `
      SELECT f.*, m.name AS member_name, m.avatar_emoji, m.color AS member_color
      FROM mdl_item_favorites f
      LEFT JOIN household_members m ON f.member_id = m.id
      WHERE f.user_id = $1`;
    const params = [req.user.id];
    if (entity_type) { params.push(entity_type); query += ` AND f.entity_type = $${params.length}`; }
    if (entity_name) { params.push(entity_name); query += ` AND LOWER(f.entity_name) = LOWER($${params.length})`; }
    query += ' ORDER BY f.created_at DESC';
    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error getting favorites:', error);
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

// Set a member's preference on an entity (favorite / like / hated)
router.post('/favorites', authenticateToken, async (req, res) => {
  try {
    const { member_id, entity_type, entity_name, product_id, preference } = req.body;
    if (!entity_name || !preference) {
      return res.status(400).json({ error: 'entity_name and preference required' });
    }
    if (!['favorite', 'like', 'hated'].includes(preference)) {
      return res.status(400).json({ error: 'preference must be favorite, like, or hated' });
    }
    const result = await db.query(
      `INSERT INTO mdl_item_favorites
         (user_id, member_id, entity_type, entity_name, product_id, preference)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (user_id, member_id, entity_type, entity_name)
       DO UPDATE SET preference = EXCLUDED.preference,
                     product_id = EXCLUDED.product_id,
                     updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [req.user.id, member_id || null, entity_type || 'item',
       entity_name.trim(), product_id || null, preference]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error saving favorite:', error);
    res.status(500).json({ error: 'Failed to save favorite' });
  }
});

// Remove a favorite mark
router.delete('/favorites/:id', authenticateToken, async (req, res) => {
  try {
    await db.query('DELETE FROM mdl_item_favorites WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting favorite:', error);
    res.status(500).json({ error: 'Failed to delete favorite' });
  }
});

module.exports = router;
