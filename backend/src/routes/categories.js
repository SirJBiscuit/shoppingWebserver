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

module.exports = router;
