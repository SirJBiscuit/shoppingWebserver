const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

// Submit beta feedback
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { type, title, description, severity, category } = req.body;

    const result = await db.query(
      `INSERT INTO beta_feedback (user_id, type, title, description, severity, category)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, type, title, description, severity || 'medium', category]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's feedback
router.get('/my-feedback', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT * FROM beta_feedback
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get all feedback (admin only)
router.get('/admin/all', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await db.query(
      `SELECT bf.*, u.username
       FROM beta_feedback bf
       LEFT JOIN users u ON bf.user_id = u.id
       ORDER BY bf.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status (admin only)
router.patch('/admin/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status } = req.body;

    await db.query(
      `UPDATE beta_feedback SET status = $1 WHERE id = $2`,
      [status, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Failed to update feedback status' });
  }
});

// Update feedback severity (admin only)
router.patch('/admin/:id/severity', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { severity } = req.body;

    await db.query(
      `UPDATE beta_feedback SET severity = $1 WHERE id = $2`,
      [severity, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating feedback severity:', error);
    res.status(500).json({ error: 'Failed to update feedback severity' });
  }
});

// Add admin response (admin only)
router.post('/admin/:id/respond', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { response } = req.body;

    await db.query(
      `UPDATE beta_feedback 
       SET admin_response = $1, admin_response_at = NOW(), status = 'reviewed'
       WHERE id = $2`,
      [response, req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({ error: 'Failed to add admin response' });
  }
});

// Delete feedback (admin only)
router.delete('/admin/:id', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await db.query(`DELETE FROM beta_feedback WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
