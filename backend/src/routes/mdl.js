/**
 * MDL (Massive Data List) API Routes
 * Product master database with icons, prices, and metadata
 */

const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { canonicalizeCategory } = require('../utils/canonicalCategory');
const { detectCategoryForName } = require('../utils/categories');
const mdlQuality = require('../services/mdlQuality');
const fs = require('fs');
const path = require('path');

/**
 * Learn a name -> canonical category mapping (064 mdl_category_learned).
 * Confidence grows with repetition; keeps mdl_item_names predictions fresh.
 * Never throws — learning must not break the caller's write path.
 */
const learnCategory = async (itemName, category, source = 'usage', baseConfidence = 0.60) => {
  try {
    const normalized = String(itemName || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const canonical = canonicalizeCategory(category);
    if (!normalized || canonical === 'Other') return;
    await db.query(
      `INSERT INTO mdl_category_learned (normalized_name, category, times_seen, confidence, source)
       VALUES ($1, $2, 1, $3, $4)
       ON CONFLICT (normalized_name, category) DO UPDATE SET
         times_seen = mdl_category_learned.times_seen + 1,
         confidence = LEAST(0.95, mdl_category_learned.confidence + 0.02),
         updated_at = CURRENT_TIMESTAMP`,
      [normalized, canonical, baseConfidence, source]
    );
    await db.query(
      `UPDATE mdl_item_names n
       SET predicted_category = $2, category_confidence = $3, is_trained = true
       WHERE n.normalized_name = $1
         AND (n.category_confidence IS NULL OR n.category_confidence <= $3)`,
      [normalized, canonical, baseConfidence]
    );
  } catch (e) {
    console.warn('learnCategory failed (non-fatal):', e.message);
  }
};

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

/**
 * GET /api/mdl/autocomplete?q=&store=
 * Autofill for the add-item input.
 * Tiers: 'user' (this user's learned items, store-matched first) then
 * 'global' (crowd registry). Opt out via
 * mdl_user_preferences.autocomplete_enabled = false. Never errors the client —
 * returns [] so typing is never blocked.
 */
router.get('/autocomplete', authenticateToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim().toLowerCase();
    const store = (req.query.store || '').trim().toLowerCase();
    if (q.length < 2) return res.json([]);

    const opt = await db.query(
      `SELECT preference_value::text AS v FROM mdl_user_preferences
       WHERE user_id = $1 AND preference_key = 'autocomplete_enabled'`,
      [req.user.id]
    );
    if (opt.rows.length && opt.rows[0].v === 'false') return res.json([]);

    const like = `%${q}%`;
    const out = [];
    const seen = new Set();

    const displayName = (row) => {
      const vars = Array.isArray(row.original_variations) ? row.original_variations : [];
      return vars.find(v => String(v).toLowerCase().startsWith(q)) || vars[0] || row.normalized_name;
    };
    const push = (row, source, extra = {}) => {
      if (seen.has(row.normalized_name)) return;
      seen.add(row.normalized_name);
      out.push({
        name: displayName(row),
        icon: row.predicted_icon || null,
        category: row.predicted_category || null,
        source,
        ...extra
      });
    };

    // USER tier — this user's learned items, store-matched first
    const userRows = await db.query(
      `SELECT n.normalized_name, n.original_variations, n.predicted_icon, n.predicted_category,
              p.total_times_added,
              EXISTS (
                SELECT 1 FROM mdl_user_item_history h
                WHERE h.user_id = p.user_id AND h.item_name_id = n.id
                  AND $3 <> '' AND LOWER(h.store_name) = $3
              ) AS store_match
       FROM mdl_user_patterns p
       JOIN mdl_item_names n ON n.id = p.item_name_id
       WHERE p.user_id = $1 AND n.normalized_name ILIKE $2
       ORDER BY store_match DESC, p.total_times_added DESC, p.last_added DESC NULLS LAST
       LIMIT 8`,
      [req.user.id, like, store]
    );
    userRows.rows.forEach(r => push(r, 'user', { storeMatch: r.store_match }));

    // GLOBAL tier — crowd registry ranked by usage.
    // is_flagged names are quarantined junk and never suggested.
    const globalRows = await db.query(
      `SELECT normalized_name, original_variations, predicted_icon, predicted_category,
              total_uses, user_count
       FROM mdl_item_names
       WHERE normalized_name ILIKE $1 AND is_flagged = FALSE
       ORDER BY total_uses DESC, user_count DESC
       LIMIT 10`,
      [like]
    );
    globalRows.rows.forEach(r => push(r, 'global'));

    res.json(out.slice(0, 10));
  } catch (error) {
    console.error('MDL autocomplete failed:', error);
    res.json([]); // never block typing on a failed lookup
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

    if (category) await learnCategory(product_name, category, 'product', 0.90);
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

// Normalized-store key — trimmed lowercase display name. Duplicates
// historically piled up because creates were unconditional inserts and
// casing/whitespace variants didn't match.
const STORE_NORM = `lower(btrim(COALESCE(name, store_name, '')))`;

// Get store locations (for My Stores feature) — deduped by normalized
// name so the picker count is accurate even before the admin merges.
router.get('/stores', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT ON (${STORE_NORM})
        id, COALESCE(name, store_name) AS name,
        COALESCE(chain, chain_name, store_chain) AS chain,
        city, state, zip_code, area_code, latitude, longitude,
        is_public, user_id, created_at
      FROM store_locations
      WHERE user_id = $1 OR user_id IS NULL OR is_public = true
      ORDER BY ${STORE_NORM}, created_at ASC
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

    // Dedupe on normalized name within the caller's visible set — returns
    // the existing row instead of creating "walmart"/"Walmart " dupes.
    const existing = await db.query(`
      SELECT * FROM store_locations
      WHERE ${STORE_NORM} = lower(btrim($1))
        AND (user_id = $2 OR user_id IS NULL OR is_public = true)
      ORDER BY created_at ASC LIMIT 1
    `, [String(storeName).trim(), req.user.id]);
    if (existing.rows.length) return res.status(200).json(existing.rows[0]);

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
    
    // Missing key is a normal state (first run) — return null, not 404,
    // so the client doesn't log it as an error.
    if (result.rows.length === 0) {
      return res.json({ value: null });
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
    const { itemName, price, quantity, unit, store, listId, wasSuggestion, userTyped, category } = req.body;
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

    // Category learning: explicit client category is the strongest signal
    const resolvedCategory = category && category.trim()
      ? canonicalizeCategory(category)
      : detectCategoryForName(itemName) || null;
    if (category && canonicalizeCategory(category) !== 'Other') {
      await learnCategory(itemName, category, 'usage');
    }

    // ── Quality gate ────────────────────────────────────────────────────
    // Per-user writes above are ungated — the user's own list always works.
    // Anything reaching the GLOBAL catalog / global autocomplete passes the
    // gate first: junk is rejected, suspicious data is quarantined until a
    // second distinct user confirms it or an admin approves it.
    let submission = null;
    let gateStatus = 'accept';
    let rate = { seedOk: true, queueOk: true, untrusted: false };
    try {
      submission = await mdlQuality.assessSubmission({
        itemName: itemName.trim(), price, category: resolvedCategory,
        icon: req.body.icon, isAdmin: !!req.user.isAdmin
      });
      gateStatus = submission.status;
      // Per-user caps on global side-effects — flooding can't spam the
      // catalog or the queue, and repeat offenders get throttled to pending
      rate = await mdlQuality.checkRateLimit(req.user.id, !!req.user.isAdmin);
      if (['accept', 'known'].includes(gateStatus) && !rate.seedOk) {
        gateStatus = 'pending';
      } else if (gateStatus === 'pending' && !rate.queueOk) {
        gateStatus = 'rate_limited';
      }
    } catch (e) {
      console.warn('Quality gate failed — treating as pending:', e.message);
      gateStatus = 'pending';
    }

    const seedAllowed = ['accept', 'known'].includes(gateStatus);
    const priceClean = seedAllowed && submission && submission.price != null
      && !submission.flags.some((f) => f.startsWith('price_'));

    // Learned icon — an explicit icon in the track call is the strongest
    // signal; once it passes the gate it becomes the registry's
    // predicted_icon so autocomplete/suggestions/shortcuts keep showing it
    // after the list item is removed.
    if (seedAllowed && req.body.icon) {
      try {
        await db.query(
          'UPDATE mdl_item_names SET predicted_icon = $2 WHERE id = $1',
          [itemNameId, req.body.icon]
        );
      } catch (e) {
        console.warn('predicted_icon update skipped:', e.message);
      }
    }

    if (seedAllowed) {
      try {
        const slug = submission.cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const upsert = await db.query(
          `INSERT INTO product_master_data
             (product_name, slug, category, average_price, icon_emoji, times_purchased, last_price_update)
           VALUES ($1, $2, $3, $4, $5, 1, NOW())
           ON CONFLICT (product_name) DO UPDATE SET
             times_purchased = product_master_data.times_purchased + 1,
             category = CASE
               WHEN product_master_data.category IN ('uncategorized', 'Other')
                 THEN COALESCE(EXCLUDED.category, product_master_data.category)
               ELSE product_master_data.category END,
             average_price = COALESCE(product_master_data.average_price, EXCLUDED.average_price),
             icon_emoji = COALESCE(product_master_data.icon_emoji, EXCLUDED.icon_emoji),
             last_price_update = NOW()
           RETURNING id`,
          [submission.cleanName, slug, resolvedCategory || 'Other',
           submission.price, req.body.icon || null]
        );

        // Record the price observation and recompute the product average.
        // Without this, mdl_price_history only ever got admin-entered rows
        // and average_price stayed frozen at whatever was written first.
        if (priceClean && upsert.rows[0]?.id) {
          const productId = upsert.rows[0].id;
          await db.query(
            'INSERT INTO mdl_price_history (product_id, price, store, source) VALUES ($1, $2, $3, $4)',
            [productId, submission.price, store || null, 'track_item']
          );
          await db.query(
            `UPDATE product_master_data
             SET average_price = (SELECT AVG(price) FROM mdl_price_history WHERE product_id = $1),
                 last_price_update = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [productId]
          );
        }
      } catch (e) {
        console.warn('Product catalog upsert failed (non-fatal):', e.message);
      }
    }

    if (gateStatus === 'pending' && submission) {
      try {
        const q = await mdlQuality.quarantine({
          userId: req.user.id, submission,
          category: resolvedCategory, icon: req.body.icon,
          quantity, unit, store, source: req.body.source || 'track_item'
        });
        if (q.promoted) gateStatus = 'auto_confirmed';
      } catch (e) {
        console.warn('Quarantine insert skipped:', e.message);
      }
    }

    if (gateStatus === 'rate_limited' && submission) {
      try {
        await db.query(
          `INSERT INTO mdl_review_queue
             (user_id, raw_name, normalized_name, price, store, reason, status,
              source, quality_score, flags)
           VALUES ($1,$2,$3,$4,$5,$6,'rejected',$7,$8,$9)`,
          [req.user.id, submission.cleanName, submission.normalizedName,
           submission.price, store || null, 'rate_limited',
           req.body.source || 'track_item', submission.score,
           JSON.stringify([...submission.flags, 'rate_limited'])]
        );
      } catch (e) {
        console.warn('Rate-limit log skipped:', e.message);
      }
    }

    if ((gateStatus === 'reject' || gateStatus === 'blocked') && submission) {
      try {
        await db.query(
          `INSERT INTO mdl_review_queue
             (user_id, raw_name, normalized_name, price, store, reason, status,
              source, quality_score, flags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [req.user.id, submission.cleanName, submission.normalizedName,
           submission.price, store || null, submission.reason.slice(0, 50),
           gateStatus === 'blocked' ? 'blocked' : 'rejected',
           req.body.source || 'track_item', submission.score,
           JSON.stringify(submission.flags)]
        );
        // Hard junk also flags the registry name out of autocomplete
        if (submission.flags.includes('profanity') || submission.flags.includes('url_or_email')) {
          await db.query(
            `INSERT INTO mdl_blocked_names (normalized_name, reason, blocked_by)
             VALUES ($1, $2, $3) ON CONFLICT (normalized_name) DO NOTHING`,
            [submission.normalizedName, submission.reason.slice(0, 100), req.user.id]
          );
          await db.query(
            'UPDATE mdl_item_names SET is_flagged = TRUE WHERE normalized_name = $1',
            [submission.normalizedName]
          );
        }
      } catch (e) {
        console.warn('Reject log skipped:', e.message);
      }
    }

    // Location-aware price aggregation (state-level) — only clean prices
    if (priceClean && userState) {
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
        [itemNameId, userState, submission.price]
      );
    }

    res.status(201).json({
      tracked: true,
      itemNameId,
      // 'accept'|'known' seeded globally now; 'pending' awaits a second
      // user's confirmation or admin review; 'rejected'/'blocked' was dropped
      quality: gateStatus
    });
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

    // Catalog default — if this source is unavailable, return 'none'
    // rather than 500 so the UI still gets a valid estimate shape.
    let catalog = { rows: [] };
    try {
      catalog = await db.query(
      `SELECT average_price, price_confidence FROM product_master_data
       WHERE LOWER(product_name) = LOWER($1) OR slug = $2 LIMIT 1`,
      [itemName.trim(), itemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')]
      );
    } catch (e) {
      console.warn('price catalog fallback:', e.message);
    }
    res.json({
      price: catalog.rows[0]?.average_price || null,
      confidence: (catalog.rows[0]?.price_confidence || 0) / 100,
      source: catalog.rows.length ? 'catalog' : 'none'
    });
  } catch (error) {
    console.error('Error getting price estimate:', error);
    // Predictions must not 500 the UI — report 'no estimate' instead.
    res.json({ price: null, confidence: 0, source: 'none' });
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
             MAX(h.added_at) AS last_bought,
             (ARRAY_AGG(h.price    ORDER BY h.added_at DESC))[1] AS last_price,
             (ARRAY_AGG(h.quantity ORDER BY h.added_at DESC))[1] AS last_quantity,
             (ARRAY_AGG(h.unit     ORDER BY h.added_at DESC))[1] AS last_unit
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

    // Typical shop timing for this store — most common day + hour in history
    let shop_time = null;
    const t = await db.query(
      `SELECT MODE() WITHIN GROUP (ORDER BY h.day_of_week) AS dow,
              MODE() WITHIN GROUP (ORDER BY h.hour_of_day) AS hour,
              COUNT(*) AS events
       FROM mdl_user_item_history h
       WHERE h.user_id = $1 AND ($2::text IS NULL OR LOWER(h.store_name) = LOWER($2))`,
      [req.user.id, store || null]
    );
    if (t.rows[0]?.events >= 3) shop_time = t.rows[0];

    res.json({ items: rows, shop_time });
  } catch (error) {
    console.error('Store usuals error:', error);
    // 'Usually buy' is a suggestion panel — degrade to empty instead of 500
    // when history tables/columns aren't present on this DB yet.
    res.json({ items: [], shop_time: null });
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
// COMMUNITY REVIEW FEED — crowd consensus on quarantined submissions.
// Any logged-in user may vote; confirmations count like resubmissions and
// DENY_THRESHOLD denials auto-reject. Votes are rate-limited per user.
// ============================================================================

/**
 * GET /api/mdl/review-feed?limit=25
 * Pending quarantine items open for community voting.
 */
router.get('/review-feed', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT q.id, q.raw_name, q.normalized_name, q.price, q.store,
              q.category, q.icon_emoji, q.reason, q.flags, q.quality_score,
              q.confirmations, q.denials, q.created_at, q.notes,
              u.username AS submitted_by,
              ($2 = ANY(COALESCE(q.confirmed_users, '{}'))) AS i_confirmed,
              ($2 = ANY(COALESCE(q.denied_users, '{}'))) AS i_denied,
              (q.user_id = $2) AS mine
       FROM mdl_review_queue q LEFT JOIN users u ON u.id = q.user_id
       WHERE q.status = 'pending'
       ORDER BY q.created_at DESC
       LIMIT $1`,
      [Math.min(100, parseInt(req.query.limit) || 25), req.user.id]
    );
    res.json({ items: rows });
  } catch (error) {
    console.error('Error fetching review feed:', error);
    res.status(500).json({ error: 'Failed to fetch review feed' });
  }
});

/**
 * POST /api/mdl/review-feed/:id/confirm  { note? }
 * "This looks right" — advisory vote + optional note for the admin.
 */
router.post('/review-feed/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const rate = await mdlQuality.checkRateLimit(req.user.id, !!req.user.isAdmin);
    if (!rate.voteOk) return res.status(429).json({ error: 'Vote limit reached — try later' });
    const result = await mdlQuality.confirmPending(req.params.id, req.user.id, req.body.note);
    res.json(result);
  } catch (error) {
    console.error('Error confirming queue item:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

/**
 * POST /api/mdl/review-feed/:id/deny  { note? }
 * "This looks wrong" — advisory vote + optional note; admin still decides.
 */
router.post('/review-feed/:id/deny', authenticateToken, async (req, res) => {
  try {
    const rate = await mdlQuality.checkRateLimit(req.user.id, !!req.user.isAdmin);
    if (!rate.voteOk) return res.status(429).json({ error: 'Vote limit reached — try later' });
    const result = await mdlQuality.denyPending(req.params.id, req.user.id, req.body.note);
    res.json(result);
  } catch (error) {
    console.error('Error denying queue item:', error);
    res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ============================================================================
// QUALITY GATE — ADMIN REVIEW QUEUE
// Suspect crowd submissions sit in mdl_review_queue until a second distinct
// user confirms them (auto_confirmed) or an admin approves/rejects here.
// ============================================================================

/**
 * GET /api/mdl/admin/pending?status=pending&limit=50&offset=0
 * Quarantined submissions awaiting review, worst-scoring first.
 */
router.get('/admin/pending', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { status = 'pending', limit = 50, offset = 0 } = req.query;
    const [rows, count] = await Promise.all([
      db.query(
        `SELECT q.*, u.username
         FROM mdl_review_queue q LEFT JOIN users u ON u.id = q.user_id
         WHERE q.status = $1
         ORDER BY q.quality_score ASC NULLS LAST, q.created_at DESC
         LIMIT $2 OFFSET $3`,
        [status, Math.min(200, parseInt(limit) || 50), parseInt(offset) || 0]
      ),
      db.query('SELECT COUNT(*)::int AS c FROM mdl_review_queue WHERE status = $1', [status])
    ]);
    res.json({ items: rows.rows, total: count.rows[0].c });
  } catch (error) {
    console.error('Error fetching review queue:', error);
    res.status(500).json({ error: 'Failed to fetch review queue' });
  }
});

/**
 * POST /api/mdl/admin/pending/:id/approve
 * { correctedName?, category?, icon?, price? } — promotes the item into the
 * global catalog and unflags the name so autocomplete can use it.
 */
router.post('/admin/pending/:id/approve', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const q = await db.query('SELECT * FROM mdl_review_queue WHERE id = $1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Queue item not found' });
    const item = q.rows[0];

    const name = (req.body.correctedName || item.corrected_name || item.raw_name || '').trim();
    if (!name) return res.status(400).json({ error: 'Name required to approve' });
    const productId = await mdlQuality.promoteToCatalog({
      name,
      category: req.body.category || item.category,
      price: req.body.price ?? item.price,
      icon: req.body.icon || item.icon_emoji
    });

    await db.query(
      `UPDATE mdl_review_queue SET status='approved', corrected_name=$2,
         promoted_product_id=$3, resolved_by=$4, resolved_at=NOW() WHERE id=$1`,
      [item.id, name !== item.raw_name ? name : null, productId, req.user.id]
    );
    await db.query('UPDATE mdl_item_names SET is_flagged = FALSE WHERE normalized_name = $1',
      [item.normalized_name || name.toLowerCase()]);

    res.json({ approved: true, productId });
  } catch (error) {
    console.error('Error approving queue item:', error);
    res.status(500).json({ error: 'Failed to approve item' });
  }
});

/**
 * POST /api/mdl/admin/pending/:id/reject
 * { block?: boolean } — rejects the submission; block:true also adds the
 * normalized name to mdl_blocked_names so it can never re-enter.
 */
router.post('/admin/pending/:id/reject', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const q = await db.query('SELECT * FROM mdl_review_queue WHERE id = $1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Queue item not found' });
    const item = q.rows[0];

    await db.query(
      `UPDATE mdl_review_queue SET status='rejected', resolved_by=$2, resolved_at=NOW() WHERE id=$1`,
      [item.id, req.user.id]
    );
    if (req.body.block && item.normalized_name) {
      await db.query(
        `INSERT INTO mdl_blocked_names (normalized_name, reason, blocked_by)
         VALUES ($1, $2, $3) ON CONFLICT (normalized_name) DO NOTHING`,
        [item.normalized_name, req.body.reason || 'admin_reject', req.user.id]
      );
      await db.query('UPDATE mdl_item_names SET is_flagged = TRUE WHERE normalized_name = $1',
        [item.normalized_name]);
    }
    res.json({ rejected: true });
  } catch (error) {
    console.error('Error rejecting queue item:', error);
    res.status(500).json({ error: 'Failed to reject item' });
  }
});

/**
 * GET /api/mdl/admin/quality-stats
 * Gate health: queue depth by status + most common rejection flags.
 */
router.get('/admin/quality-stats', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const [byStatus, topFlags, blocked] = await Promise.all([
      db.query(`SELECT status, COUNT(*)::int AS c FROM mdl_review_queue GROUP BY status`),
      db.query(
        `SELECT flag, COUNT(*)::int AS c FROM mdl_review_queue,
           jsonb_array_elements_text(COALESCE(flags, '[]'::jsonb)) AS flag
         GROUP BY flag ORDER BY c DESC LIMIT 10`
      ),
      db.query('SELECT COUNT(*)::int AS c FROM mdl_blocked_names')
    ]);
    res.json({
      byStatus: Object.fromEntries(byStatus.rows.map((r) => [r.status, r.c])),
      topFlags: topFlags.rows,
      blockedNames: blocked.rows[0].c
    });
  } catch (error) {
    console.error('Error fetching quality stats:', error);
    res.status(500).json({ error: 'Failed to fetch quality stats' });
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

// Fresh full-MDL dump streamed straight to the browser — "backup to computer"
router.get('/backups/download', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { dump } = await mdlBackup.buildDump();
    const filename = `mdl-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(dump));
  } catch (error) {
    console.error('Error downloading MDL backup:', error);
    res.status(500).json({ error: 'Download failed' });
  }
});

// Download a stored snapshot file by name
router.get('/backups/:filename/download', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const filename = path.basename(String(req.params.filename));
    if (!/^mdl-backup-[\w.-]+\.json$/.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }
    const filePath = path.join(mdlBackup.BACKUP_DIR, filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    res.download(filePath, filename);
  } catch (error) {
    console.error('Error downloading backup file:', error);
    res.status(500).json({ error: 'Download failed' });
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

// ============================================================================
// Auto-categorization (064)
// ============================================================================

/**
 * GET /api/mdl/categorize/:itemName
 * Best canonical category guess for a name. Sources, in priority order:
 *  learned (mdl_category_learned) -> product db -> past usage -> keyword -> Other
 */
router.get('/categorize/:itemName', authenticateToken, async (req, res) => {
  try {
    const raw = req.params.itemName;
    const normalized = raw.trim().toLowerCase().replace(/\s+/g, ' ');

    // 1. Learned mapping (strongest signal — grows with confirmations)
    const learned = await db.query(
      `SELECT category, confidence, times_seen FROM mdl_category_learned
       WHERE normalized_name = $1
       ORDER BY confidence DESC, times_seen DESC LIMIT 1`,
      [normalized]
    );
    if (learned.rows[0]) {
      return res.json({ category: learned.rows[0].category, confidence: parseFloat(learned.rows[0].confidence), source: 'learned' });
    }

    // 2. Curated product database
    const product = await db.query(
      `SELECT canonical_category(category) AS category FROM product_master_data
       WHERE LOWER(TRIM(product_name)) = $1 AND canonical_category(category) <> 'Other'
       LIMIT 1`,
      [normalized]
    );
    if (product.rows[0]) {
      return res.json({ category: product.rows[0].category, confidence: 0.9, source: 'product' });
    }

    // 3. Majority vote across this user's + global list history
    const usage = await db.query(
      `SELECT canonical_category(category) AS cat, COUNT(*) AS n
       FROM shopping_list_items
       WHERE LOWER(TRIM(item_name)) = $1 AND canonical_category(category) <> 'Other'
       GROUP BY 1 ORDER BY n DESC LIMIT 1`,
      [normalized]
    );
    if (usage.rows[0]) {
      return res.json({ category: usage.rows[0].cat, confidence: Math.min(0.85, 0.5 + usage.rows[0].n / 20), source: 'usage' });
    }

    // 4. Keyword detection
    const detected = detectCategoryForName(raw);
    if (detected) {
      return res.json({ category: detected, confidence: 0.4, source: 'keyword' });
    }

    res.json({ category: 'Other', confidence: 0, source: 'fallback' });
  } catch (err) {
    console.error('Categorize failed:', err);
    res.status(500).json({ error: 'Categorization failed' });
  }
});

/**
 * POST /api/mdl/categorize/learn
 * Teach the system: "this name belongs in this category". Called when a user
 * explicitly picks/corrects a category.
 */
router.post('/categorize/learn', authenticateToken, async (req, res) => {
  try {
    const { itemName, category } = req.body;
    if (!itemName || !category) {
      return res.status(400).json({ error: 'itemName and category are required' });
    }
    await learnCategory(itemName, category, 'usage', 0.80);
    res.json({ learned: true, category: canonicalizeCategory(category) });
  } catch (err) {
    console.error('Categorize learn failed:', err);
    res.status(500).json({ error: 'Learn failed' });
  }
});

/**
 * GET /api/mdl/categorize/pending/list
 * Item names the system has seen but has no confident category for —
 * feeds a future "teach me" UI.
 */
router.get('/categorize/pending/list', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT n.normalized_name, n.total_uses,
              (n.original_variations->>0) AS display_name
       FROM mdl_item_names n
       WHERE (n.predicted_category IS NULL OR COALESCE(n.category_confidence, 0) < 0.5)
         AND EXISTS (
           SELECT 1 FROM mdl_user_item_history h WHERE h.item_name_id = n.id
         )
       ORDER BY n.total_uses DESC
       LIMIT 50`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Pending categorize list failed:', err);
    res.status(500).json({ error: 'Failed to load uncategorized items' });
  }
});

/* =========================================================================
   Custom terms — learned vocabulary (units, item names, store names, …).
   Users teach terms as they use them; they pool as 'pending' (visible to
   the author only) until an admin approves → then they go global in quick
   pickers/autofill. Admin approve/reject/forget lives in the same routes.
   ========================================================================= */

/**
 * POST /api/mdl/terms
 * { kind, term } — teach MDL a custom term. New terms enter 'pending';
 * repeats only bump usage_count. Never trusts client-supplied status.
 */
router.post('/terms', authenticateToken, async (req, res) => {
  try {
    const kind = String(req.body.kind || '').trim().toLowerCase();
    const term = String(req.body.term || '').trim();
    if (!kind || !term || term.length > 120) {
      return res.status(400).json({ error: 'kind and term (≤120 chars) required' });
    }
    const result = await db.query(
      `INSERT INTO mdl_custom_terms (kind, term, status, created_by, usage_count, last_seen_at)
       VALUES ($1, $2, 'pending', $3, 1, NOW())
       ON CONFLICT (kind, term) DO UPDATE SET
         usage_count = mdl_custom_terms.usage_count + 1,
         last_seen_at = NOW()
       RETURNING id, kind, term, status, usage_count`,
      [kind, term, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error learning term:', err);
    res.status(500).json({ error: 'Failed to learn term' });
  }
});

/**
 * GET /api/mdl/terms?kind=unit
 * Autofill source: approved terms for everyone, plus the caller's own
 * pending terms (so a user keeps seeing their custom units).
 */
router.get('/terms', authenticateToken, async (req, res) => {
  try {
    const kind = String(req.query.kind || '').trim().toLowerCase();
    const params = [req.user.id];
    let sql = `SELECT id, kind, term, status, usage_count
               FROM mdl_custom_terms
               WHERE (status = 'approved' OR (status = 'pending' AND created_by = $1))`;
    if (kind) { params.push(kind); sql += ' AND kind = $2'; }
    sql += ' ORDER BY usage_count DESC, term ASC LIMIT 200';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

/**
 * GET /api/mdl/admin/terms?kind=&status=
 * Full review list for the MDL admin panel.
 */
router.get('/admin/terms', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { kind, status = 'pending' } = req.query;
    const params = [];
    let sql = `SELECT t.*, u.username AS created_by_name, a.username AS approved_by_name
               FROM mdl_custom_terms t
               LEFT JOIN users u ON u.id = t.created_by
               LEFT JOIN users a ON a.id = t.approved_by
               WHERE 1=1`;
    if (status) { params.push(status); sql += ` AND t.status = $${params.length}`; }
    if (kind) { params.push(kind); sql += ` AND t.kind = $${params.length}`; }
    sql += ' ORDER BY t.usage_count DESC, t.last_seen_at DESC LIMIT 300';
    const result = await db.query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching admin terms:', err);
    res.status(500).json({ error: 'Failed to fetch terms' });
  }
});

/**
 * POST /api/mdl/admin/terms/:id/status
 * { status: 'approved' | 'rejected' | 'pending' } — approve sends the term
 * global; reject hides it; pending returns it to the queue.
 */
router.post('/admin/terms/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const status = String(req.body.status || '').trim();
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'status must be approved | rejected | pending' });
    }
    const result = await db.query(
      `UPDATE mdl_custom_terms
       SET status = $2, approved_by = $3, approved_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id, status, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Term not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error updating term status:', err);
    res.status(500).json({ error: 'Failed to update term' });
  }
});

/**
 * DELETE /api/mdl/admin/terms/:id
 * "Forget" — hard-deletes the term so autofill never suggests it again.
 */
router.delete('/admin/terms/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const result = await db.query('DELETE FROM mdl_custom_terms WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Term not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error forgetting term:', err);
    res.status(500).json({ error: 'Failed to forget term' });
  }
});

/* ============================================================================
   Admin store locations — view, edit, merge & dedupe store_locations.
   Duplicates accumulated because creates were unconditional inserts.
   ========================================================================= */

// Every FK that points at store_locations.id — discovered live so merges
// cover new tables automatically.
const storeRefColumns = async (client = db) => {
  const r = await client.query(`
    SELECT kcu.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'store_locations'
      AND ccu.column_name = 'id'`);
  return r.rows.filter((c) => /^[a-z_][a-z0-9_]*$/.test(c.table_name) && /^[a-z_][a-z0-9_]*$/.test(c.column_name));
};

// Re-point every referencing row from `fromId` to `keepId`, then delete
// the removed store row. Runs inside a transaction; a savepoint per
// table keeps unique-collision refs (e.g. a user favorited both dupes)
// from aborting the merge — the colliding dup rows are dropped instead.
const mergeStoreInto = async (client, keepId, removeId) => {
  const refs = await storeRefColumns(client);
  for (const { table_name, column_name } of refs) {
    await client.query('SAVEPOINT mdl_store_merge');
    try {
      await client.query(
        `UPDATE ${table_name} SET ${column_name} = $1 WHERE ${column_name} = $2`,
        [keepId, removeId]
      );
      await client.query('RELEASE SAVEPOINT mdl_store_merge');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT mdl_store_merge');
      await client.query(
        `DELETE FROM ${table_name} WHERE ${column_name} = $1`,
        [removeId]
      );
      await client.query('RELEASE SAVEPOINT mdl_store_merge');
    }
  }
  await client.query('DELETE FROM store_locations WHERE id = $1', [removeId]);
};

/**
 * GET /api/mdl/admin/stores
 * Every store row + duplicate flag (shares a normalized name with another
 * row) + reference counts so admins can see the damage before merging.
 */
router.get('/admin/stores', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const refs = await storeRefColumns();
    const countSql = refs.map((c) =>
      `(SELECT COUNT(*) FROM ${c.table_name} r WHERE r.${c.column_name} = s.id)`
    ).join(' + ') || '0';
    const result = await db.query(`
      SELECT s.id, COALESCE(s.name, s.store_name) AS name,
        COALESCE(s.chain, s.chain_name, s.store_chain) AS chain,
        s.city, s.state, s.zip_code, s.is_public, s.user_id, s.created_at,
        u.username AS owner_name,
        (${countSql}) AS ref_count,
        COUNT(*) OVER (PARTITION BY ${STORE_NORM.replace(/name|store_name/g, (m) => `s.${m}`)}) > 1 AS is_dup
      FROM store_locations s
      LEFT JOIN users u ON u.id = s.user_id
      ORDER BY ${STORE_NORM.replace(/name|store_name/g, (m) => `s.${m}`)}, s.created_at ASC`);
    res.json(result.rows);
  } catch (err) {
    console.error('Error listing admin stores:', err);
    res.status(500).json({ error: 'Failed to list stores' });
  }
});

/**
 * PUT /api/mdl/admin/stores/:id — fix name/chain/city/etc. on a row.
 */
router.put('/admin/stores/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const { name, chain, city, state, zip_code, is_public } = req.body;
    const result = await db.query(
      `UPDATE store_locations SET
         name = COALESCE($2, name), store_name = COALESCE($2, store_name),
         chain = $3, chain_name = $3,
         city = $4, state = $5, zip_code = $6,
         is_public = COALESCE($7, is_public)
       WHERE id = $1 RETURNING *`,
      [req.params.id,
       name == null ? null : String(name).trim(),
       chain ?? null, city ?? null, state ?? null, zip_code ?? null,
       typeof is_public === 'boolean' ? is_public : null]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Store not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating store:', err);
    res.status(500).json({ error: 'Failed to update store' });
  }
});

/**
 * POST /api/mdl/admin/stores/merge
 * { keep_id, remove_ids: [..] } — re-points every FK reference to keep_id
 * then deletes the removed rows.
 */
router.post('/admin/stores/merge', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const keepId = parseInt(req.body.keep_id, 10);
    const removeIds = (Array.isArray(req.body.remove_ids) ? req.body.remove_ids : [])
      .map((i) => parseInt(i, 10)).filter((i) => Number.isInteger(i) && i !== keepId);
    if (!Number.isInteger(keepId) || !removeIds.length) {
      return res.status(400).json({ error: 'keep_id and remove_ids required' });
    }
    await client.query('BEGIN');
    for (const rid of removeIds) await mergeStoreInto(client, keepId, rid);
    await client.query('COMMIT');
    res.json({ ok: true, merged: removeIds.length });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error merging stores:', err);
    res.status(500).json({ error: 'Failed to merge stores' });
  } finally {
    client.release();
  }
});

/**
 * POST /api/mdl/admin/stores/dedupe
 * Auto-merge every normalized-name duplicate group — keeps the oldest row
 * per group (or the most-referenced one if refs exist).
 */
router.post('/admin/stores/dedupe', authenticateToken, async (req, res) => {
  const client = await db.pool.connect();
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const refs = await storeRefColumns(client);
    const countSql = refs.map((c) =>
      `(SELECT COUNT(*) FROM ${c.table_name} r WHERE r.${c.column_name} = s.id)`
    ).join(' + ') || '0';
    const groups = await client.query(`
      SELECT ${STORE_NORM.replace(/name|store_name/g, (m) => `s.${m}`)} AS norm,
             array_agg(s.id ORDER BY (${countSql}) DESC, s.created_at ASC) AS ids
      FROM store_locations s
      GROUP BY 1 HAVING COUNT(*) > 1`);
    let merged = 0;
    await client.query('BEGIN');
    for (const g of groups.rows) {
      const [keep, ...rest] = g.ids;
      for (const rid of rest) { await mergeStoreInto(client, keep, rid); merged += 1; }
    }
    await client.query('COMMIT');
    res.json({ ok: true, groups: groups.rows.length, merged });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Error deduping stores:', err);
    res.status(500).json({ error: 'Failed to dedupe stores' });
  } finally {
    client.release();
  }
});

/**
 * DELETE /api/mdl/admin/stores/:id — hard delete a store row (references
 * with ON DELETE SET NULL/CASCADE follow their constraints).
 */
router.delete('/admin/stores/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) return res.status(403).json({ error: 'Admin access required' });
    const result = await db.query('DELETE FROM store_locations WHERE id = $1 RETURNING id', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Store not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error('Error deleting store:', err);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

module.exports = router;
