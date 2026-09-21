const express = require('express');
const router = express.Router();
const db = require('../database/db');
const auth = require('../middleware/auth');
const crypto = require('crypto');

// Generate beta code (admin only)
router.post('/codes/generate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { expiresIn, maxUses, notes } = req.body;
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    const expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);

    const result = await db.query(
      `INSERT INTO beta_codes (code, expires_at, max_uses, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, expiresAt, maxUses, notes, req.user.userId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating beta code:', error);
    res.status(500).json({ error: 'Failed to generate beta code' });
  }
});

// Get all beta codes (admin only)
router.get('/codes', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT bc.*, u.username as created_by_username
       FROM beta_codes bc
       LEFT JOIN users u ON bc.created_by = u.id
       ORDER BY bc.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beta codes:', error);
    res.status(500).json({ error: 'Failed to fetch beta codes' });
  }
});

// Validate and use beta code
router.post('/codes/validate', async (req, res) => {
  try {
    const { code } = req.body;

    const result = await db.query(
      `SELECT * FROM beta_codes WHERE code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid beta code' });
    }

    const betaCode = result.rows[0];

    if (!betaCode.is_active) {
      return res.status(400).json({ error: 'Beta code is inactive' });
    }

    if (new Date(betaCode.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Beta code has expired' });
    }

    if (betaCode.current_uses >= betaCode.max_uses) {
      return res.status(400).json({ error: 'Beta code has reached maximum uses' });
    }

    res.json({ valid: true, code: betaCode });
  } catch (error) {
    console.error('Error validating beta code:', error);
    res.status(500).json({ error: 'Failed to validate beta code' });
  }
});

// Deactivate beta code (admin only)
router.post('/codes/:id/deactivate', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.query(
      `UPDATE beta_codes SET is_active = false WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating beta code:', error);
    res.status(500).json({ error: 'Failed to deactivate beta code' });
  }
});

// Delete beta code (admin only)
router.delete('/codes/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const checkResult = await db.query(
      `SELECT current_uses FROM beta_codes WHERE id = $1`,
      [req.params.id]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    if (checkResult.rows[0].current_uses > 0) {
      return res.status(400).json({ error: 'Cannot delete code that has been used' });
    }

    await db.query(`DELETE FROM beta_codes WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting beta code:', error);
    res.status(500).json({ error: 'Failed to delete beta code' });
  }
});

// Get all beta testers (admin only)
router.get('/admin/testers', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT u.id, u.username, u.created_at, u.is_beta_tester,
              bc.code as beta_code,
              COUNT(DISTINCT bf.id) as feedback_count,
              MAX(bf.created_at) as last_feedback_at
       FROM users u
       LEFT JOIN beta_codes bc ON u.beta_code_id = bc.id
       LEFT JOIN beta_feedback bf ON bf.user_id = u.id
       WHERE u.is_beta_tester = true
       GROUP BY u.id, u.username, u.created_at, u.is_beta_tester, bc.code
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beta testers:', error);
    res.status(500).json({ error: 'Failed to fetch beta testers' });
  }
});

// Convert beta tester to full user (admin only)
router.post('/admin/testers/:id/convert', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.query(
      `UPDATE users SET is_beta_tester = false WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error converting beta tester:', error);
    res.status(500).json({ error: 'Failed to convert beta tester' });
  }
});

// Remove beta tester (admin only)
router.delete('/admin/testers/:id', auth, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing beta tester:', error);
    res.status(500).json({ error: 'Failed to remove beta tester' });
  }
});

module.exports = router;
