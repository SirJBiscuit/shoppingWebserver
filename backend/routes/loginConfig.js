const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

/**
 * Login Screen Configuration API Routes
 * 
 * Endpoints for managing login screen customization
 */

// GET /api/login-config/active - Get active login configuration (public)
router.get('/active', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM login_screen_config WHERE is_active = true LIMIT 1'
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No active configuration found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching active config:', error);
    res.status(500).json({ error: 'Failed to fetch login configuration' });
  }
});

// GET /api/login-config - Get all configurations (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM login_screen_config ORDER BY created_at DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching configs:', error);
    res.status(500).json({ error: 'Failed to fetch configurations' });
  }
});

// GET /api/login-config/:id - Get single configuration (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM login_screen_config WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// POST /api/login-config - Create new configuration (admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      config_name,
      logo_url,
      background_type = 'gradient',
      background_value,
      welcome_title,
      welcome_subtitle,
      primary_color,
      secondary_color,
      show_social_login = true,
      footer_text,
      custom_css,
      is_active = false
    } = req.body;
    
    if (!config_name) {
      return res.status(400).json({ error: 'Configuration name is required' });
    }
    
    const result = await pool.query(
      `INSERT INTO login_screen_config 
       (config_name, logo_url, background_type, background_value, welcome_title, 
        welcome_subtitle, primary_color, secondary_color, show_social_login, 
        footer_text, custom_css, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        config_name, logo_url, background_type, background_value, welcome_title,
        welcome_subtitle, primary_color, secondary_color, show_social_login,
        footer_text, custom_css, is_active
      ]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating config:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

// PATCH /api/login-config/:id - Update configuration (admin only)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'config_name', 'logo_url', 'background_type', 'background_value',
      'welcome_title', 'welcome_subtitle', 'primary_color', 'secondary_color',
      'show_social_login', 'footer_text', 'custom_css', 'is_active'
    ];
    
    const setClause = [];
    const values = [];
    let paramCount = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }
    
    if (setClause.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    values.push(id);
    
    const result = await pool.query(
      `UPDATE login_screen_config 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// DELETE /api/login-config/:id - Delete configuration (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's the active config
    const checkResult = await pool.query(
      'SELECT is_active FROM login_screen_config WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    if (checkResult.rows[0].is_active) {
      return res.status(403).json({ error: 'Cannot delete active configuration' });
    }
    
    await pool.query('DELETE FROM login_screen_config WHERE id = $1', [id]);
    
    res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    console.error('Error deleting config:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// POST /api/login-config/:id/activate - Activate configuration (admin only)
router.post('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `UPDATE login_screen_config 
       SET is_active = true
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Configuration not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating config:', error);
    res.status(500).json({ error: 'Failed to activate configuration' });
  }
});

module.exports = router;
