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

module.exports = router;
