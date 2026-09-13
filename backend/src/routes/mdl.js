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

// Get user preferences for a product
router.get('/preferences/:productId', authenticateToken, async (req, res) => {
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

module.exports = router;
