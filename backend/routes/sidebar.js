const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const pool = require('../config/database');

/**
 * Sidebar Configuration API Routes
 * 
 * Endpoints for managing sidebar pages and role-based visibility
 */

// GET /api/sidebar/pages - Get all sidebar pages
router.get('/pages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sidebar_pages ORDER BY display_order ASC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching sidebar pages:', error);
    res.status(500).json({ error: 'Failed to fetch sidebar pages' });
  }
});

// GET /api/sidebar/pages/visible - Get visible pages for current user's role
router.get('/pages/visible', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role || 'user';
    
    let query = 'SELECT * FROM sidebar_pages WHERE ';
    
    if (userRole === 'admin') {
      query += 'enabled_for_admin = true';
    } else if (userRole === 'beta') {
      query += 'enabled_for_beta = true';
    } else {
      query += 'enabled_for_user = true';
    }
    
    query += ' ORDER BY display_order ASC';
    
    const result = await pool.query(query);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching visible pages:', error);
    res.status(500).json({ error: 'Failed to fetch visible pages' });
  }
});

// GET /api/sidebar/pages/:id - Get single page
router.get('/pages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT * FROM sidebar_pages WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching page:', error);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

// POST /api/sidebar/pages - Create new page (admin only)
router.post('/pages', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      page_name,
      page_path,
      icon_name,
      display_order,
      enabled_for_user = true,
      enabled_for_beta = true,
      enabled_for_admin = true
    } = req.body;
    
    if (!page_name || !page_path) {
      return res.status(400).json({ error: 'Page name and path are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO sidebar_pages 
       (page_name, page_path, icon_name, display_order, enabled_for_user, enabled_for_beta, enabled_for_admin)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [page_name, page_path, icon_name, display_order || 999, enabled_for_user, enabled_for_beta, enabled_for_admin]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating page:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({ error: 'Page path already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create page' });
  }
});

// PATCH /api/sidebar/pages/:id - Update page (admin only)
router.patch('/pages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic update query
    const allowedFields = [
      'page_name', 'page_path', 'icon_name', 'display_order',
      'enabled_for_user', 'enabled_for_beta', 'enabled_for_admin'
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
      `UPDATE sidebar_pages 
       SET ${setClause.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating page:', error);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

// DELETE /api/sidebar/pages/:id - Delete page (admin only, non-system pages only)
router.delete('/pages/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if it's a system page
    const checkResult = await pool.query(
      'SELECT is_system_page FROM sidebar_pages WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    if (checkResult.rows[0].is_system_page) {
      return res.status(403).json({ error: 'Cannot delete system pages' });
    }
    
    await pool.query('DELETE FROM sidebar_pages WHERE id = $1', [id]);
    
    res.json({ message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting page:', error);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

// POST /api/sidebar/pages/reorder - Reorder pages (admin only)
router.post('/pages/reorder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { pages } = req.body; // Array of { id, order }
    
    if (!Array.isArray(pages)) {
      return res.status(400).json({ error: 'Pages must be an array' });
    }
    
    // Update all pages in a transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const page of pages) {
        await client.query(
          'UPDATE sidebar_pages SET display_order = $1 WHERE id = $2',
          [page.order, page.id]
        );
      }
      
      await client.query('COMMIT');
      
      res.json({ message: 'Pages reordered successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error reordering pages:', error);
    res.status(500).json({ error: 'Failed to reorder pages' });
  }
});

// POST /api/sidebar/pages/:id/toggle-role - Toggle role visibility (admin only)
router.post('/pages/:id/toggle-role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body; // 'user', 'beta', or 'admin'
    
    if (!['user', 'beta', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    const field = `enabled_for_${role}`;
    
    const result = await pool.query(
      `UPDATE sidebar_pages 
       SET ${field} = NOT ${field}
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Page not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling role:', error);
    res.status(500).json({ error: 'Failed to toggle role' });
  }
});

module.exports = router;
