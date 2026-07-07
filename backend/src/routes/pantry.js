const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get all pantry items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM pantry_inventory p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = $1
      ORDER BY c.sort_order ASC, p.item_name ASC
    `, [req.user.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get pantry error:', error);
    res.status(500).json({ error: 'Failed to fetch pantry' });
  }
});

// Add item to pantry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { item_name, quantity, unit, barcode, category_id, image_url, expiry_date, source } = req.body;
    
    const result = await db.query(`
      INSERT INTO pantry_inventory 
        (user_id, item_name, quantity, unit, barcode, category_id, image_url, expiry_date, source)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, profile_id, item_name) 
      DO UPDATE SET 
        quantity = pantry_inventory.quantity + EXCLUDED.quantity,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `, [req.user.userId, item_name, quantity, unit, barcode, category_id, image_url, expiry_date, source || 'manual']);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add to pantry error:', error);
    res.status(500).json({ error: 'Failed to add item to pantry' });
  }
});

// Add multiple items (from receipt or barcode scan)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { items, source } = req.body;
    
    const addedItems = [];
    for (const item of items) {
      const result = await db.query(`
        INSERT INTO pantry_inventory 
          (user_id, item_name, quantity, unit, barcode, category_id, image_url, source)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (user_id, profile_id, item_name) 
        DO UPDATE SET 
          quantity = pantry_inventory.quantity + EXCLUDED.quantity,
          last_updated = CURRENT_TIMESTAMP
        RETURNING *
      `, [req.user.userId, item.item_name, item.quantity || 1, item.unit, item.barcode, item.category_id, item.image_url, source || 'scan']);
      
      addedItems.push(result.rows[0]);
    }
    
    res.status(201).json({
      message: `Added ${addedItems.length} items to pantry`,
      items: addedItems
    });
  } catch (error) {
    console.error('Bulk add to pantry error:', error);
    res.status(500).json({ error: 'Failed to add items to pantry' });
  }
});

// Update pantry item
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { quantity, unit, expiry_date, category_id } = req.body;
    
    const result = await db.query(`
      UPDATE pantry_inventory 
      SET quantity = COALESCE($1, quantity),
          unit = COALESCE($2, unit),
          expiry_date = COALESCE($3, expiry_date),
          category_id = COALESCE($4, category_id),
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [quantity, unit, expiry_date, category_id, req.params.id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update pantry error:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

// Delete pantry item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      DELETE FROM pantry_inventory WHERE id = $1 AND user_id = $2 RETURNING id
    `, [req.params.id, req.user.userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }
    
    res.json({ message: 'Item removed from pantry' });
  } catch (error) {
    console.error('Delete pantry error:', error);
    res.status(500).json({ error: 'Failed to remove item from pantry' });
  }
});

// Get expiring items
router.get('/expiring', authenticateToken, async (req, res) => {
  try {
    const { days } = req.query;
    const daysAhead = days || 7;
    
    const result = await db.query(`
      SELECT p.*, c.name as category_name, c.icon as category_icon
      FROM pantry_inventory p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.user_id = $1 
        AND p.expiry_date IS NOT NULL
        AND p.expiry_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
      ORDER BY p.expiry_date ASC
    `, [req.user.userId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Get expiring items error:', error);
    res.status(500).json({ error: 'Failed to fetch expiring items' });
  }
});

module.exports = router;
