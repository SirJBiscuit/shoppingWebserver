const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Get user's custom layouts
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM user_layouts WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

// Get a specific layout
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM user_layouts WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// Create a new layout
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, layout_data, page } = req.body;
    
    const result = await db.query(
      `INSERT INTO user_layouts (user_id, name, layout_data, page)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, name, JSON.stringify(layout_data), page]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating layout:', error);
    res.status(500).json({ error: 'Failed to create layout' });
  }
});

// Update a layout
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, layout_data, page } = req.body;
    
    const result = await db.query(
      `UPDATE user_layouts 
       SET name = $1, layout_data = $2, page = $3, updated_at = NOW()
       WHERE id = $4 AND user_id = $5
       RETURNING *`,
      [name, JSON.stringify(layout_data), page, req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating layout:', error);
    res.status(500).json({ error: 'Failed to update layout' });
  }
});

// Delete a layout
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM user_layouts WHERE id = $1 AND user_id = $2 RETURNING *`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

// Set active layout for a page
router.post('/set-active', authenticateToken, async (req, res) => {
  try {
    const { layout_id, page } = req.body;
    
    // Deactivate all layouts for this page
    await db.query(
      `UPDATE user_layouts SET is_active = false WHERE user_id = $1 AND page = $2`,
      [req.user.id, page]
    );
    
    // Activate the selected layout
    const result = await db.query(
      `UPDATE user_layouts 
       SET is_active = true 
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [layout_id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error setting active layout:', error);
    res.status(500).json({ error: 'Failed to set active layout' });
  }
});

// Get active layout for a page
router.get('/active/:page', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM user_layouts 
       WHERE user_id = $1 AND page = $2 AND is_active = true
       LIMIT 1`,
      [req.user.id, req.params.page]
    );
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active layout:', error);
    res.status(500).json({ error: 'Failed to fetch active layout' });
  }
});

module.exports = router;
