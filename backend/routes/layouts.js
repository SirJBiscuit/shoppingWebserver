const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ============================================================================
// LAYOUT RETRIEVAL (All Authenticated Users)
// ============================================================================

// Get active layout for user's role
router.get('/active/:role', authenticateToken, async (req, res) => {
  try {
    const { role } = req.params;

    // Validate role
    if (!['user', 'beta', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Get active layout using helper function
    const result = await pool.query(
      'SELECT get_active_layout($1) as config_data',
      [role]
    );

    if (!result.rows[0].config_data) {
      return res.status(404).json({ 
        error: 'No active layout found for this role',
        role 
      });
    }

    res.json({
      role,
      config_data: result.rows[0].config_data
    });
  } catch (error) {
    console.error('Error fetching active layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// Get active layout for current user
router.get('/active', authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role || 'user';
    
    // Check if user is beta tester
    const betaCheck = await pool.query(
      'SELECT is_beta_tester FROM users WHERE id = $1',
      [req.user.id]
    );

    const isBeta = betaCheck.rows[0]?.is_beta_tester;
    const effectiveRole = isBeta ? 'beta' : userRole;

    // Get active layout
    const result = await pool.query(
      'SELECT get_active_layout($1) as config_data',
      [effectiveRole]
    );

    if (!result.rows[0].config_data) {
      return res.status(404).json({ 
        error: 'No active layout found',
        role: effectiveRole 
      });
    }

    res.json({
      role: effectiveRole,
      config_data: result.rows[0].config_data
    });
  } catch (error) {
    console.error('Error fetching active layout:', error);
    res.status(500).json({ error: 'Failed to fetch layout' });
  }
});

// ============================================================================
// LAYOUT MANAGEMENT (Admin Only)
// ============================================================================

// Get all layouts
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.query;

    let query = `
      SELECT 
        lc.*,
        u.username as creator_username
      FROM layout_configurations lc
      LEFT JOIN users u ON lc.created_by = u.id
    `;

    const values = [];

    if (role) {
      query += ' WHERE lc.role = $1';
      values.push(role);
    }

    query += ' ORDER BY lc.role, lc.is_active DESC, lc.created_at DESC';

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching layouts:', error);
    res.status(500).json({ error: 'Failed to fetch layouts' });
  }
});

// Get single layout
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        lc.*,
        u.username as creator_username
       FROM layout_configurations lc
       LEFT JOIN users u ON lc.created_by = u.id
       WHERE lc.id = $1`,
      [id]
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

// Create new layout
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, role, configData, isActive = false } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!name || !role || !configData) {
      return res.status(400).json({ 
        error: 'Name, role, and configData are required' 
      });
    }

    // Validate role
    if (!['user', 'beta', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Validate configData is valid JSON
    if (typeof configData !== 'object') {
      return res.status(400).json({ error: 'configData must be a valid JSON object' });
    }

    const result = await pool.query(
      `INSERT INTO layout_configurations (name, description, role, config_data, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, description, role, JSON.stringify(configData), isActive, adminId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating layout:', error);
    
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ 
        error: 'A layout with this name already exists for this role' 
      });
    }
    
    res.status(500).json({ error: 'Failed to create layout' });
  }
});

// Update layout
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, configData, isActive } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (configData !== undefined) {
      updates.push(`config_data = $${paramCount++}`);
      values.push(JSON.stringify(configData));
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE layout_configurations 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
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

// Activate layout (deactivates others for same role)
router.post('/:id/activate', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get layout role
    const layoutResult = await client.query(
      'SELECT role FROM layout_configurations WHERE id = $1',
      [id]
    );

    if (layoutResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Layout not found' });
    }

    const role = layoutResult.rows[0].role;

    // Deactivate all layouts for this role
    await client.query(
      'UPDATE layout_configurations SET is_active = false WHERE role = $1',
      [role]
    );

    // Activate this layout
    const result = await client.query(
      'UPDATE layout_configurations SET is_active = true WHERE id = $1 RETURNING *',
      [id]
    );

    await client.query('COMMIT');

    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error activating layout:', error);
    res.status(500).json({ error: 'Failed to activate layout' });
  } finally {
    client.release();
  }
});

// Clone layout
router.post('/:id/clone', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const adminId = req.user.id;

    // Get original layout
    const originalResult = await pool.query(
      'SELECT * FROM layout_configurations WHERE id = $1',
      [id]
    );

    if (originalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const original = originalResult.rows[0];
    const cloneName = name || `${original.name} (Copy)`;

    // Create clone
    const result = await pool.query(
      `INSERT INTO layout_configurations (name, description, role, config_data, is_active, created_by)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING *`,
      [
        cloneName,
        original.description,
        original.role,
        original.config_data,
        adminId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error cloning layout:', error);
    res.status(500).json({ error: 'Failed to clone layout' });
  }
});

// Delete layout
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if layout is active
    const layoutCheck = await pool.query(
      'SELECT is_active, role FROM layout_configurations WHERE id = $1',
      [id]
    );

    if (layoutCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    if (layoutCheck.rows[0].is_active) {
      return res.status(400).json({ 
        error: 'Cannot delete active layout. Activate another layout first.' 
      });
    }

    await pool.query('DELETE FROM layout_configurations WHERE id = $1', [id]);

    res.json({ message: 'Layout deleted successfully' });
  } catch (error) {
    console.error('Error deleting layout:', error);
    res.status(500).json({ error: 'Failed to delete layout' });
  }
});

// Export layout
router.get('/:id/export', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'SELECT name, description, role, config_data FROM layout_configurations WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Layout not found' });
    }

    const layout = result.rows[0];

    // Return as downloadable JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${layout.name}.json"`);
    res.json({
      name: layout.name,
      description: layout.description,
      role: layout.role,
      config_data: layout.config_data,
      exported_at: new Date().toISOString(),
      version: '1.0'
    });
  } catch (error) {
    console.error('Error exporting layout:', error);
    res.status(500).json({ error: 'Failed to export layout' });
  }
});

// Import layout
router.post('/import', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, description, role, config_data } = req.body;
    const adminId = req.user.id;

    // Validate required fields
    if (!name || !role || !config_data) {
      return res.status(400).json({ 
        error: 'Name, role, and config_data are required' 
      });
    }

    // Validate role
    if (!['user', 'beta', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const result = await pool.query(
      `INSERT INTO layout_configurations (name, description, role, config_data, is_active, created_by)
       VALUES ($1, $2, $3, $4, false, $5)
       RETURNING *`,
      [name, description, role, JSON.stringify(config_data), adminId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error importing layout:', error);
    res.status(500).json({ error: 'Failed to import layout' });
  }
});

// Get layout statistics
router.get('/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_layouts,
        COUNT(*) FILTER (WHERE is_active = true) as active_layouts,
        COUNT(*) FILTER (WHERE role = 'user') as user_layouts,
        COUNT(*) FILTER (WHERE role = 'beta') as beta_layouts,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_layouts
      FROM layout_configurations
    `);

    // Get layouts by role
    const byRole = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM layout_configurations
      GROUP BY role
      ORDER BY role
    `);

    res.json({
      ...stats.rows[0],
      byRole: byRole.rows
    });
  } catch (error) {
    console.error('Error fetching layout stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
