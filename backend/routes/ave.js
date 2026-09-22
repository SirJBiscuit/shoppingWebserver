const express = require('express');
const router = express.Router();
const pool = require('../src/db');
const { authenticateToken } = require('../src/middleware/auth');

/**
 * AES (Admin Editor System) API Routes
 * 
 * Handles:
 * - Layout saving/loading
 * - Snapshot management
 * - Version control
 */

// ============================================
// LAYOUTS
// ============================================

/**
 * GET /api/aes/layouts/:userId
 * Load user's current layout
 */
router.get('/layouts/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can access this layout
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `SELECT layout, version, updated_at 
       FROM aes_layouts 
       WHERE user_id = $1 
       ORDER BY updated_at DESC 
       LIMIT 1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No layout found' });
    }
    
    res.json({
      layout: result.rows[0].layout,
      version: result.rows[0].version,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error loading layout:', error);
    res.status(500).json({ error: 'Failed to load layout' });
  }
});

/**
 * POST /api/aes/layouts
 * Save user's layout
 */
router.post('/layouts', authenticateToken, async (req, res) => {
  try {
    const { userId, layout, version } = req.body;
    
    // Verify user can save this layout
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Validate layout structure
    if (!layout.dashboard || !layout.sidebar || !layout.metadata) {
      return res.status(400).json({ error: 'Invalid layout structure' });
    }
    
    // Check if layout exists
    const existing = await pool.query(
      'SELECT id FROM aes_layouts WHERE user_id = $1',
      [userId]
    );
    
    let result;
    
    if (existing.rows.length > 0) {
      // Update existing layout
      result = await pool.query(
        `UPDATE aes_layouts 
         SET layout = $1, version = $2, updated_at = NOW() 
         WHERE user_id = $3 
         RETURNING id, updated_at`,
        [JSON.stringify(layout), version, userId]
      );
    } else {
      // Insert new layout
      result = await pool.query(
        `INSERT INTO aes_layouts (user_id, layout, version) 
         VALUES ($1, $2, $3) 
         RETURNING id, created_at, updated_at`,
        [userId, JSON.stringify(layout), version]
      );
    }
    
    res.json({
      success: true,
      id: result.rows[0].id,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('Error saving layout:', error);
    res.status(500).json({ error: 'Failed to save layout' });
  }
});

/**
 * DELETE /api/aes/layouts/:userId
 * Delete user's layout (reset to default)
 */
router.delete('/layouts/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Verify user can delete this layout
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await pool.query('DELETE FROM aes_layouts WHERE user_id = $1', [userId]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

// ============================================
// SNAPSHOTS
// ============================================

/**
 * GET /api/aes/snapshots
 * Get all snapshots for a user
 */
router.get('/snapshots', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Verify user can access these snapshots
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    const result = await pool.query(
      `SELECT id, name, created_at, created_by 
       FROM aes_snapshots 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading snapshots:', error);
    res.status(500).json({ error: 'Failed to load snapshots' });
  }
});

/**
 * GET /api/aes/snapshots/:id
 * Get specific snapshot
 */
router.get('/snapshots/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT s.*, u.username as created_by_username
       FROM aes_snapshots s
       LEFT JOIN users u ON s.created_by = u.id
       WHERE s.id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    
    const snapshot = result.rows[0];
    
    // Verify user can access this snapshot
    if (req.user.id !== snapshot.user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    res.json(snapshot);
  } catch (error) {
    console.error('Error loading snapshot:', error);
    res.status(500).json({ error: 'Failed to load snapshot' });
  }
});

/**
 * POST /api/aes/snapshots
 * Create new snapshot
 */
router.post('/snapshots', authenticateToken, async (req, res) => {
  try {
    const { id, name, layout, userId } = req.body;
    
    // Verify user can create this snapshot
    if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    // Validate snapshot
    if (!layout || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const result = await pool.query(
      `INSERT INTO aes_snapshots (id, user_id, name, layout, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, created_at`,
      [id, userId, name, JSON.stringify(layout), req.user.id]
    );
    
    res.json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error creating snapshot:', error);
    res.status(500).json({ error: 'Failed to create snapshot' });
  }
});

/**
 * DELETE /api/aes/snapshots/:id
 * Delete snapshot
 */
router.delete('/snapshots/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get snapshot to verify ownership
    const snapshot = await pool.query(
      'SELECT user_id FROM aes_snapshots WHERE id = $1',
      [id]
    );
    
    if (snapshot.rows.length === 0) {
      return res.status(404).json({ error: 'Snapshot not found' });
    }
    
    // Verify user can delete this snapshot
    if (req.user.id !== snapshot.rows[0].user_id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    
    await pool.query('DELETE FROM aes_snapshots WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting snapshot:', error);
    res.status(500).json({ error: 'Failed to delete snapshot' });
  }
});

// ============================================
// TEMPLATES (Shared Layouts)
// ============================================

/**
 * GET /api/aes/templates
 * Get all public templates
 */
router.get('/templates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT t.*, u.username as created_by_username
       FROM aes_templates t
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.is_public = true
       ORDER BY t.downloads DESC, t.created_at DESC`
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error loading templates:', error);
    res.status(500).json({ error: 'Failed to load templates' });
  }
});

/**
 * POST /api/aes/templates
 * Create new template (admin only)
 */
router.post('/templates', authenticateToken, async (req, res) => {
  try {
    // Only admins can create templates
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const { name, description, layout, isPublic } = req.body;
    
    const result = await pool.query(
      `INSERT INTO aes_templates (name, description, layout, is_public, created_by) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, created_at`,
      [name, description, JSON.stringify(layout), isPublic, req.user.id]
    );
    
    res.json({
      success: true,
      id: result.rows[0].id,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

/**
 * POST /api/aes/templates/:id/download
 * Track template download
 */
router.post('/templates/:id/download', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query(
      'UPDATE aes_templates SET downloads = downloads + 1 WHERE id = $1',
      [id]
    );
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error tracking download:', error);
    res.status(500).json({ error: 'Failed to track download' });
  }
});

// ============================================
// VALIDATION
// ============================================

/**
 * POST /api/aes/validate
 * Validate layout without saving
 */
router.post('/validate', authenticateToken, async (req, res) => {
  try {
    const { layout } = req.body;
    
    const errors = [];
    
    // Check required fields
    if (!layout.dashboard) errors.push('Dashboard configuration missing');
    if (!layout.sidebar) errors.push('Sidebar configuration missing');
    if (!layout.metadata) errors.push('Metadata missing');
    
    // Check for duplicate widget IDs
    const allWidgets = [
      ...(layout.dashboard?.widgets || []),
      ...(layout.sidebar?.widgets || [])
    ];
    const ids = allWidgets.map(w => w.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate widget IDs: ${duplicates.join(', ')}`);
    }
    
    res.json({
      valid: errors.length === 0,
      errors
    });
  } catch (error) {
    console.error('Error validating layout:', error);
    res.status(500).json({ error: 'Failed to validate layout' });
  }
});

module.exports = router;
