/**
 * MDL (Massive Data List) API Routes
 * Product master database with icons, prices, and metadata
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

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
    
    query += ` ORDER BY times_purchased DESC, product_name ASC LIMIT $${paramCount}`;
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
      icon_emoji, notes
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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $14
      RETURNING *
    `, [
      product_name, category, average_price,
      default_price_low, default_price_high,
      best_store, common_stores, common_size, common_unit,
      typical_shelf_life_days, typical_location,
      icon_emoji, notes, id
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

// Get aisle prediction for item at specific store
router.get('/aisle/:itemName/:storeId', authenticateToken, async (req, res) => {
  try {
    const { itemName, storeId } = req.params;
    
    // First, try to get from mdl_location_aisles (learned data)
    const aisleResult = await db.query(`
      SELECT aisle_number, confidence, total_reports
      FROM mdl_location_aisles
      WHERE LOWER(item_name) = LOWER($1) 
        AND store_id = $2
        AND confidence > 0.5
      ORDER BY confidence DESC
      LIMIT 1
    `, [itemName, storeId]);
    
    if (aisleResult.rows.length > 0) {
      return res.json({
        aisle: aisleResult.rows[0].aisle_number,
        confidence: aisleResult.rows[0].confidence,
        source: 'learned',
        reports: aisleResult.rows[0].total_reports
      });
    }
    
    // Fallback: Try category-based prediction
    const categoryResult = await db.query(`
      SELECT ca.aisle_number, ca.confidence
      FROM shopping_list_items sli
      JOIN mdl_category_aisles ca ON sli.category = ca.category_id
      WHERE LOWER(sli.item_name) = LOWER($1)
        AND ca.store_id = $2
      ORDER BY ca.confidence DESC
      LIMIT 1
    `, [itemName, storeId]);
    
    if (categoryResult.rows.length > 0) {
      return res.json({
        aisle: categoryResult.rows[0].aisle_number,
        confidence: categoryResult.rows[0].confidence,
        source: 'category'
      });
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
    const { itemName, aisleNumber, storeId, wasCorrect, categoryId } = req.body;
    
    if (!itemName || !aisleNumber || !storeId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Record the report
    await db.query(`
      INSERT INTO mdl_aisle_reports (
        user_id, item_name, aisle_number, store_id, 
        was_correct, category_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [req.user.id, itemName, aisleNumber, storeId, wasCorrect, categoryId]);
    
    // Update or create aggregated aisle data
    await db.query(`
      INSERT INTO mdl_location_aisles (
        item_name, store_id, aisle_number, total_reports, correct_reports, confidence
      ) VALUES ($1, $2, $3, 1, $4, $5)
      ON CONFLICT (item_name, store_id)
      DO UPDATE SET
        aisle_number = (
          SELECT MODE() WITHIN GROUP (ORDER BY aisle_number)
          FROM mdl_aisle_reports
          WHERE item_name = $1 AND store_id = $2
        ),
        total_reports = mdl_location_aisles.total_reports + 1,
        correct_reports = mdl_location_aisles.correct_reports + CASE WHEN $4 THEN 1 ELSE 0 END,
        confidence = (mdl_location_aisles.correct_reports + CASE WHEN $4 THEN 1 ELSE 0 END)::float / 
                     (mdl_location_aisles.total_reports + 1),
        last_reported = CURRENT_TIMESTAMP
    `, [itemName, storeId, aisleNumber, wasCorrect ? 1 : 0, wasCorrect ? 1.0 : 0.5]);
    
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
      SELECT DISTINCT store_id, store_name, city, state,
        COUNT(*) OVER (PARTITION BY store_id) as aisle_count
      FROM store_locations
      WHERE user_id = $1 OR is_public = true
      ORDER BY store_name ASC
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
      SELECT * FROM store_locations
      WHERE LOWER(store_name) LIKE LOWER($1)
        AND (user_id = $2 OR is_public = true)
      ORDER BY store_name ASC
      LIMIT 10
    `, [`%${name}%`, req.user.id]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error searching stores:', error);
    res.status(500).json({ error: 'Failed to search stores' });
  }
});

// Create new store location
router.post('/stores', authenticateToken, async (req, res) => {
  try {
    const { chain_name, store_name, state, city, address, latitude, longitude } = req.body;
    
    const result = await db.query(`
      INSERT INTO store_locations (
        user_id, chain_name, store_name, state, city, 
        address, latitude, longitude
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [req.user.id, chain_name, store_name, state, city, address, latitude, longitude]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
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
         ON CONFLICT ON CONSTRAINT uq_mdl_location_prices DO UPDATE SET
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
// BACKUPS (admin)
// ============================================================================

const mdlBackup = require('../services/mdlBackup');

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

module.exports = router;
