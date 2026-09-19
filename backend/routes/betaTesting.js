const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ============================================================================
// BETA CODE MANAGEMENT (Admin Only)
// ============================================================================

// Generate new beta code
router.post('/codes/generate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { expiresAt, maxUses = 1, notes } = req.body;
    const adminId = req.user.id;

    // Generate unique code
    const codeResult = await pool.query('SELECT generate_beta_code() as code');
    const code = codeResult.rows[0].code;

    // Insert code
    const result = await pool.query(
      `INSERT INTO beta_testing_codes (code, created_by, expires_at, max_uses, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, adminId, expiresAt, maxUses, notes]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating beta code:', error);
    res.status(500).json({ error: 'Failed to generate beta code' });
  }
});

// Get all beta codes
router.get('/codes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        bc.*,
        u.username as creator_username,
        COUNT(bt.id) as tester_count
       FROM beta_testing_codes bc
       LEFT JOIN users u ON bc.created_by = u.id
       LEFT JOIN beta_testers bt ON bc.id = bt.beta_code_id
       GROUP BY bc.id, u.username
       ORDER BY bc.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beta codes:', error);
    res.status(500).json({ error: 'Failed to fetch beta codes' });
  }
});

// Get single beta code
router.get('/codes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        bc.*,
        u.username as creator_username,
        COUNT(bt.id) as tester_count
       FROM beta_testing_codes bc
       LEFT JOIN users u ON bc.created_by = u.id
       LEFT JOIN beta_testers bt ON bc.id = bt.beta_code_id
       WHERE bc.id = $1
       GROUP BY bc.id, u.username`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching beta code:', error);
    res.status(500).json({ error: 'Failed to fetch beta code' });
  }
});

// Update beta code
router.patch('/codes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { expiresAt, maxUses, notes, isActive } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (expiresAt !== undefined) {
      updates.push(`expires_at = $${paramCount++}`);
      values.push(expiresAt);
    }
    if (maxUses !== undefined) {
      updates.push(`max_uses = $${paramCount++}`);
      values.push(maxUses);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
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
      `UPDATE beta_testing_codes 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating beta code:', error);
    res.status(500).json({ error: 'Failed to update beta code' });
  }
});

// Deactivate beta code
router.post('/codes/:id/deactivate', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `UPDATE beta_testing_codes 
       SET is_active = false
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deactivating beta code:', error);
    res.status(500).json({ error: 'Failed to deactivate beta code' });
  }
});

// Delete beta code
router.delete('/codes/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if code has been used
    const usageCheck = await pool.query(
      'SELECT current_uses FROM beta_testing_codes WHERE id = $1',
      [id]
    );

    if (usageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    if (usageCheck.rows[0].current_uses > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete code that has been used. Deactivate it instead.' 
      });
    }

    await pool.query('DELETE FROM beta_testing_codes WHERE id = $1', [id]);

    res.json({ message: 'Beta code deleted successfully' });
  } catch (error) {
    console.error('Error deleting beta code:', error);
    res.status(500).json({ error: 'Failed to delete beta code' });
  }
});

// Get beta code statistics
router.get('/codes/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_codes,
        COUNT(*) FILTER (WHERE is_active = true AND expires_at > CURRENT_TIMESTAMP) as active_codes,
        COUNT(*) FILTER (WHERE expires_at < CURRENT_TIMESTAMP) as expired_codes,
        SUM(current_uses) as total_uses,
        SUM(max_uses) as total_max_uses,
        (SELECT COUNT(*) FROM beta_testers) as total_beta_testers
      FROM beta_testing_codes
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching beta code stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// ============================================================================
// BETA REGISTRATION (Public)
// ============================================================================

// Verify beta code
router.post('/verify-code', async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Code is required' });
    }

    // Check if code is valid
    const validResult = await pool.query(
      'SELECT is_beta_code_valid($1) as is_valid',
      [code]
    );

    if (!validResult.rows[0].is_valid) {
      return res.status(400).json({ 
        error: 'Invalid or expired beta code',
        valid: false 
      });
    }

    // Get code details
    const codeResult = await pool.query(
      `SELECT id, code, expires_at, max_uses, current_uses
       FROM beta_testing_codes
       WHERE code = $1`,
      [code]
    );

    const codeData = codeResult.rows[0];

    res.json({
      valid: true,
      code: codeData.code,
      expiresAt: codeData.expires_at,
      usesRemaining: codeData.max_uses - codeData.current_uses
    });
  } catch (error) {
    console.error('Error verifying beta code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Register beta tester
router.post('/register', async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { 
      code, 
      username, 
      password, 
      betaUsername,
      country, 
      state, 
      acceptedDataPolicy 
    } = req.body;

    // Validate required fields
    if (!code || !username || !password || !betaUsername || !country || !state) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (!acceptedDataPolicy) {
      return res.status(400).json({ error: 'You must accept the data usage policy' });
    }

    await client.query('BEGIN');

    // Verify code is still valid
    const validResult = await client.query(
      'SELECT is_beta_code_valid($1) as is_valid',
      [code]
    );

    if (!validResult.rows[0].is_valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired beta code' });
    }

    // Get code ID
    const codeResult = await client.query(
      'SELECT id FROM beta_testing_codes WHERE code = $1',
      [code]
    );
    const codeId = codeResult.rows[0].id;

    // Check if username already exists
    const userCheck = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (userCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user account
    const userResult = await client.query(
      `INSERT INTO users (username, password, role, is_beta_tester, account_type)
       VALUES ($1, $2, 'user', true, 'beta')
       RETURNING id, username, role`,
      [username, hashedPassword]
    );

    const userId = userResult.rows[0].id;

    // Create beta tester record
    await client.query(
      `INSERT INTO beta_testers (
        user_id, beta_code_id, beta_username, country, state, accepted_data_policy
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, codeId, betaUsername, country, state, acceptedDataPolicy]
    );

    // Increment code usage
    await client.query(
      'SELECT increment_beta_code_usage($1)',
      [code]
    );

    await client.query('COMMIT');

    // Generate JWT token
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { id: userId, username, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Beta account created successfully',
      user: userResult.rows[0],
      token
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error registering beta tester:', error);
    res.status(500).json({ error: 'Failed to register beta tester' });
  } finally {
    client.release();
  }
});

// Get data policy
router.get('/data-policy', async (req, res) => {
  res.json({
    policy: {
      title: 'Beta Testing Data Usage Policy',
      sections: [
        {
          title: 'How We Use Your Data',
          content: 'Your location data (country and state) will ONLY be used for training our store location database, improving aisle predictions, and providing accurate pricing information.'
        },
        {
          title: 'What We Collect',
          items: [
            'Country and state/province',
            'Shopping patterns and preferences',
            'Feedback and suggestions',
            'App usage statistics'
          ]
        },
        {
          title: 'What We Do NOT Do',
          items: [
            'Share your data with third parties',
            'Use it for advertising purposes',
            'Track your exact location',
            'Sell your information'
          ]
        },
        {
          title: 'Your Rights',
          content: 'You can request to export or delete all your data at any time by contacting us.'
        }
      ]
    }
  });
});

// ============================================================================
// BETA TESTER MANAGEMENT (Admin Only)
// ============================================================================

// Get all beta testers
router.get('/testers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        bt.*,
        u.username,
        u.created_at as user_created_at,
        bc.code as beta_code,
        bc.expires_at as code_expires_at
       FROM beta_testers bt
       JOIN users u ON bt.user_id = u.id
       LEFT JOIN beta_testing_codes bc ON bt.beta_code_id = bc.id
       ORDER BY bt.registered_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beta testers:', error);
    res.status(500).json({ error: 'Failed to fetch beta testers' });
  }
});

// Get single beta tester
router.get('/testers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        bt.*,
        u.username,
        u.email,
        u.created_at as user_created_at,
        bc.code as beta_code
       FROM beta_testers bt
       JOIN users u ON bt.user_id = u.id
       LEFT JOIN beta_testing_codes bc ON bt.beta_code_id = bc.id
       WHERE bt.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching beta tester:', error);
    res.status(500).json({ error: 'Failed to fetch beta tester' });
  }
});

// Update beta tester
router.patch('/testers/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { feedbackCount } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (feedbackCount !== undefined) {
      updates.push(`feedback_count = $${paramCount++}`);
      values.push(feedbackCount);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(id);

    const result = await pool.query(
      `UPDATE beta_testers 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating beta tester:', error);
    res.status(500).json({ error: 'Failed to update beta tester' });
  }
});

// Promote beta tester to full user
router.post('/testers/:id/promote', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get user_id from beta_testers
    const testerResult = await client.query(
      'SELECT user_id FROM beta_testers WHERE id = $1',
      [id]
    );

    if (testerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    const userId = testerResult.rows[0].user_id;

    // Update user account
    await client.query(
      `UPDATE users 
       SET is_beta_tester = false, account_type = 'user'
       WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Beta tester promoted to full user successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error promoting beta tester:', error);
    res.status(500).json({ error: 'Failed to promote beta tester' });
  } finally {
    client.release();
  }
});

// Remove beta tester
router.delete('/testers/:id', authenticateToken, requireAdmin, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    // Get user_id
    const testerResult = await client.query(
      'SELECT user_id FROM beta_testers WHERE id = $1',
      [id]
    );

    if (testerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    const userId = testerResult.rows[0].user_id;

    // Delete user (cascade will delete beta_testers record)
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    res.json({ message: 'Beta tester removed successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing beta tester:', error);
    res.status(500).json({ error: 'Failed to remove beta tester' });
  } finally {
    client.release();
  }
});

// Get beta tester statistics
router.get('/testers/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        COUNT(*) as total_testers,
        COUNT(*) FILTER (WHERE last_active > CURRENT_TIMESTAMP - INTERVAL '7 days') as active_last_week,
        COUNT(*) FILTER (WHERE last_active > CURRENT_TIMESTAMP - INTERVAL '30 days') as active_last_month,
        SUM(feedback_count) as total_feedback,
        COUNT(DISTINCT country) as countries_count,
        COUNT(DISTINCT state) as states_count
      FROM beta_testers
    `);

    // Get location distribution
    const locationDist = await pool.query(`
      SELECT country, state, COUNT(*) as count
      FROM beta_testers
      GROUP BY country, state
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json({
      ...stats.rows[0],
      topLocations: locationDist.rows
    });
  } catch (error) {
    console.error('Error fetching beta tester stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
