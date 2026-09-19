const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// ============================================================================
// FEEDBACK SUBMISSION (Beta Testers)
// ============================================================================

// Submit new feedback
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { type, title, description, severity, rating } = req.body;
    const userId = req.user.id;

    // Validate required fields
    if (!type || !title || !description) {
      return res.status(400).json({ error: 'Type, title, and description are required' });
    }

    // Validate type
    if (!['bug', 'feature', 'idea', 'general'].includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }

    // Get beta tester ID
    const betaTesterResult = await pool.query(
      'SELECT id FROM beta_testers WHERE user_id = $1',
      [userId]
    );

    if (betaTesterResult.rows.length === 0) {
      return res.status(403).json({ error: 'Only beta testers can submit feedback' });
    }

    const betaTesterId = betaTesterResult.rows[0].id;

    // Insert feedback
    const result = await pool.query(
      `INSERT INTO beta_feedback (
        user_id, beta_tester_id, type, title, description, severity, rating, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        userId,
        betaTesterId,
        type,
        title,
        description,
        severity || null,
        rating || null,
        'new'
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Get user's own feedback
router.get('/my-feedback', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT 
        bf.*,
        u.username as responded_by_username
       FROM beta_feedback bf
       LEFT JOIN users u ON bf.responded_by = u.id
       WHERE bf.user_id = $1
       ORDER BY bf.created_at DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Vote on feature request
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if feedback is a feature request
    const feedbackCheck = await pool.query(
      'SELECT type FROM beta_feedback WHERE id = $1',
      [id]
    );

    if (feedbackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (feedbackCheck.rows[0].type !== 'feature') {
      return res.status(400).json({ error: 'Can only vote on feature requests' });
    }

    // Check if already voted
    const voteCheck = await pool.query(
      'SELECT id FROM feedback_votes WHERE feedback_id = $1 AND user_id = $2',
      [id, userId]
    );

    if (voteCheck.rows.length > 0) {
      // Remove vote
      await pool.query(
        'DELETE FROM feedback_votes WHERE feedback_id = $1 AND user_id = $2',
        [id, userId]
      );
      return res.json({ message: 'Vote removed', voted: false });
    } else {
      // Add vote
      await pool.query(
        'INSERT INTO feedback_votes (feedback_id, user_id) VALUES ($1, $2)',
        [id, userId]
      );
      return res.json({ message: 'Vote added', voted: true });
    }
  } catch (error) {
    console.error('Error voting on feedback:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// ============================================================================
// FEEDBACK MANAGEMENT (Admin Only)
// ============================================================================

// Get all feedback with filters
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { type, status, severity, betaTester } = req.query;

    let query = `
      SELECT 
        bf.*,
        bt.beta_username,
        bt.display_name as beta_tester_display_name,
        u.username as user_username,
        resp.username as responded_by_username
      FROM beta_feedback bf
      JOIN beta_testers bt ON bf.beta_tester_id = bt.id
      JOIN users u ON bf.user_id = u.id
      LEFT JOIN users resp ON bf.responded_by = resp.id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    if (type) {
      query += ` AND bf.type = $${paramCount++}`;
      values.push(type);
    }

    if (status) {
      query += ` AND bf.status = $${paramCount++}`;
      values.push(status);
    }

    if (severity) {
      query += ` AND bf.severity = $${paramCount++}`;
      values.push(severity);
    }

    if (betaTester) {
      query += ` AND bt.beta_username ILIKE $${paramCount++}`;
      values.push(`%${betaTester}%`);
    }

    query += ' ORDER BY bf.created_at DESC';

    const result = await pool.query(query, values);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get single feedback with details
router.get('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        bf.*,
        bt.beta_username,
        bt.display_name as beta_tester_display_name,
        bt.country,
        bt.state,
        u.username as user_username,
        resp.username as responded_by_username
       FROM beta_feedback bf
       JOIN beta_testers bt ON bf.beta_tester_id = bt.id
       JOIN users u ON bf.user_id = u.id
       LEFT JOIN users resp ON bf.responded_by = resp.id
       WHERE bf.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    // Get attachments
    const attachments = await pool.query(
      'SELECT * FROM feedback_attachments WHERE feedback_id = $1',
      [id]
    );

    res.json({
      ...result.rows[0],
      attachments: attachments.rows
    });
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status
router.patch('/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const result = await pool.query(
      'UPDATE beta_feedback SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating feedback status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Add admin response to feedback
router.post('/admin/:id/respond', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { response, notes } = req.body;
    const adminId = req.user.id;

    if (!response) {
      return res.status(400).json({ error: 'Response is required' });
    }

    const result = await pool.query(
      `UPDATE beta_feedback 
       SET admin_response = $1, admin_notes = $2, responded_by = $3, responded_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [response, notes || null, adminId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error responding to feedback:', error);
    res.status(500).json({ error: 'Failed to respond' });
  }
});

// Update feedback severity
router.patch('/admin/:id/severity', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { severity } = req.body;

    if (!severity || !['critical', 'high', 'medium', 'low'].includes(severity)) {
      return res.status(400).json({ error: 'Valid severity is required' });
    }

    const result = await pool.query(
      'UPDATE beta_feedback SET severity = $1 WHERE id = $2 RETURNING *',
      [severity, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating severity:', error);
    res.status(500).json({ error: 'Failed to update severity' });
  }
});

// Delete feedback
router.delete('/admin/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query('DELETE FROM beta_feedback WHERE id = $1', [id]);

    res.json({ message: 'Feedback deleted successfully' });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

// Get feedback statistics
router.get('/admin/stats/overview', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const stats = await pool.query('SELECT * FROM get_feedback_stats()');

    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching feedback stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get top voted features
router.get('/admin/stats/top-features', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await pool.query(
      'SELECT * FROM get_top_voted_features($1)',
      [limit]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching top features:', error);
    res.status(500).json({ error: 'Failed to fetch top features' });
  }
});

// Get critical bugs
router.get('/admin/stats/critical-bugs', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM get_critical_bugs()');

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching critical bugs:', error);
    res.status(500).json({ error: 'Failed to fetch critical bugs' });
  }
});

// ============================================================================
// THANK YOU MESSAGES
// ============================================================================

// Send thank you message (Admin)
router.post('/admin/thank-you/:betaTesterId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { betaTesterId } = req.params;
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await pool.query(
      `INSERT INTO beta_thank_you_messages (beta_tester_id, sent_by, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [betaTesterId, adminId, message]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error sending thank you message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get thank you messages for current user (Beta Tester)
router.get('/thank-you/my-messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get beta tester ID
    const betaTesterResult = await pool.query(
      'SELECT id FROM beta_testers WHERE user_id = $1',
      [userId]
    );

    if (betaTesterResult.rows.length === 0) {
      return res.json([]);
    }

    const betaTesterId = betaTesterResult.rows[0].id;

    const result = await pool.query(
      `SELECT 
        btm.*,
        u.username as sent_by_username
       FROM beta_thank_you_messages btm
       LEFT JOIN users u ON btm.sent_by = u.id
       WHERE btm.beta_tester_id = $1
       ORDER BY btm.sent_at DESC`,
      [betaTesterId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching thank you messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark thank you message as read
router.patch('/thank-you/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify message belongs to user
    const result = await pool.query(
      `UPDATE beta_thank_you_messages btm
       SET is_read = true
       FROM beta_testers bt
       WHERE btm.id = $1 AND btm.beta_tester_id = bt.id AND bt.user_id = $2
       RETURNING btm.*`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;
