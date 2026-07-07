const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all categories with shopping order
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM categories ORDER BY sort_order ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get common items (for autofill)
router.get('/common-items', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT im.*, c.name as category_name, c.icon as category_icon
      FROM item_metadata im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE im.is_common = true
      ORDER BY im.name ASC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get common items error:', error);
    res.status(500).json({ error: 'Failed to fetch common items' });
  }
});

// Search items (for autofill)
router.get('/search-items', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }
    
    const result = await db.query(`
      SELECT DISTINCT ON (im.name) 
        im.*, 
        c.name as category_name, 
        c.icon as category_icon
      FROM item_metadata im
      LEFT JOIN categories c ON im.category_id = c.id
      WHERE 
        im.name ILIKE $1 
        OR $2 = ANY(im.aliases)
      ORDER BY im.name, im.is_common DESC
      LIMIT 20
    `, [`%${q}%`, q]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Search items error:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

// Get item by name or barcode
router.get('/item-lookup', authenticateToken, async (req, res) => {
  try {
    const { name, barcode } = req.query;
    
    let result;
    if (barcode) {
      result = await db.query(`
        SELECT im.*, c.name as category_name, c.icon as category_icon
        FROM item_metadata im
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE im.barcode = $1
      `, [barcode]);
    } else if (name) {
      result = await db.query(`
        SELECT im.*, c.name as category_name, c.icon as category_icon
        FROM item_metadata im
        LEFT JOIN categories c ON im.category_id = c.id
        WHERE im.name ILIKE $1
        LIMIT 1
      `, [name]);
    } else {
      return res.status(400).json({ error: 'Name or barcode required' });
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Item lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup item' });
  }
});

// Add custom item to metadata (user-specific)
router.post('/custom-item', authenticateToken, async (req, res) => {
  try {
    const { name, category_id, icon, barcode } = req.body;
    
    const result = await db.query(`
      INSERT INTO item_metadata (name, category_id, icon, barcode, is_common)
      VALUES ($1, $2, $3, $4, false)
      ON CONFLICT DO NOTHING
      RETURNING *
    `, [name, category_id, icon, barcode]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add custom item error:', error);
    res.status(500).json({ error: 'Failed to add custom item' });
  }
});

// Save user's icon/tag preference for an item
router.post('/item-preference', authenticateToken, async (req, res) => {
  try {
    const { item_name, barcode, custom_icon, custom_tags, category_id } = req.body;
    
    const result = await db.query(`
      INSERT INTO user_item_preferences (user_id, item_name, barcode, custom_icon, custom_tags, category_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, item_name) 
      DO UPDATE SET 
        custom_icon = EXCLUDED.custom_icon,
        custom_tags = EXCLUDED.custom_tags,
        category_id = EXCLUDED.category_id,
        barcode = COALESCE(EXCLUDED.barcode, user_item_preferences.barcode),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.userId, item_name, barcode, custom_icon, custom_tags, category_id]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Save item preference error:', error);
    res.status(500).json({ error: 'Failed to save item preference' });
  }
});

// Get user's item preferences
router.get('/item-preferences', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM user_item_preferences WHERE user_id = $1
    `, [req.user.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get item preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch item preferences' });
  }
});

// Get user preferences (dark mode, etc.)
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    let result = await db.query(`
      SELECT * FROM user_preferences WHERE user_id = $1
    `, [req.user.userId]);
    
    // Create default preferences if they don't exist
    if (result.rows.length === 0) {
      result = await db.query(`
        INSERT INTO user_preferences (user_id, dark_mode, auto_sort_by_aisle, packing_mode)
        VALUES ($1, true, true, 'smart')
        RETURNING *
      `, [req.user.userId]);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

// Update user preferences
router.post('/preferences', authenticateToken, async (req, res) => {
  try {
    const { dark_mode, default_store, auto_sort_by_aisle, show_prices, show_item_images, packing_mode, preferences } = req.body;
    
    const result = await db.query(`
      INSERT INTO user_preferences (
        user_id, dark_mode, default_store, auto_sort_by_aisle, 
        show_prices, show_item_images, packing_mode, preferences
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (user_id) 
      DO UPDATE SET 
        dark_mode = COALESCE($2, user_preferences.dark_mode),
        default_store = COALESCE($3, user_preferences.default_store),
        auto_sort_by_aisle = COALESCE($4, user_preferences.auto_sort_by_aisle),
        show_prices = COALESCE($5, user_preferences.show_prices),
        show_item_images = COALESCE($6, user_preferences.show_item_images),
        packing_mode = COALESCE($7, user_preferences.packing_mode),
        preferences = COALESCE($8, user_preferences.preferences),
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.userId, dark_mode, default_store, auto_sort_by_aisle, show_prices, show_item_images, packing_mode, preferences]);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get preference for specific item (by name or barcode)
router.get('/item-preference', authenticateToken, async (req, res) => {
  try {
    const { item_name, barcode } = req.query;
    
    let result;
    if (barcode) {
      result = await db.query(`
        SELECT * FROM user_item_preferences 
        WHERE user_id = $1 AND barcode = $2
      `, [req.user.userId, barcode]);
    } else if (item_name) {
      result = await db.query(`
        SELECT * FROM user_item_preferences 
        WHERE user_id = $1 AND LOWER(item_name) = LOWER($2)
      `, [req.user.userId, item_name]);
    } else {
      return res.status(400).json({ error: 'item_name or barcode required' });
    }
    
    if (result.rows.length === 0) {
      // Try to find from common items
      const commonResult = await db.query(`
        SELECT icon, tags, category_id FROM item_metadata 
        WHERE LOWER(name) = LOWER($1) OR barcode = $2
        LIMIT 1
      `, [item_name, barcode]);
      
      if (commonResult.rows.length > 0) {
        return res.json({
          custom_icon: commonResult.rows[0].icon,
          custom_tags: commonResult.rows[0].tags,
          category_id: commonResult.rows[0].category_id,
          is_preset: true
        });
      }
      
      return res.status(404).json({ error: 'No preference found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get item preference error:', error);
    res.status(500).json({ error: 'Failed to fetch item preference' });
  }
});

module.exports = router;
