const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Schema-safe allowlists (migration 044 CHECK constraints)
const VALID_TYPES = ['bug', 'feature', 'idea', 'general'];
const VALID_SEVERITIES = ['critical', 'high', 'medium', 'low'];
const VALID_STATUSES = [
  'new', 'in_progress', 'fixed', 'wont_fix',
  'requested', 'planned', 'in_development', 'released',
  'submitted', 'under_review', 'accepted', 'declined',
];

// Look up the caller's beta_testers row (may not exist for non-beta users)
const getTesterId = async (userId) => {
  const r = await db.query(`SELECT id FROM beta_testers WHERE user_id = $1`, [userId]);
  return r.rows.length ? r.rows[0].id : null;
};

// Submit beta feedback — POST / (mounted at /api/beta/feedback) and /submit alias
const submitHandler = async (req, res) => {
  try {
    const { type, title, description, severity, experienceRating, rating } = req.body;

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid feedback type' });
    }
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const sev = VALID_SEVERITIES.includes(severity) ? severity : null;
    const rate = (r) => (r >= 1 && r <= 5 ? r : null);
    const testerId = await getTesterId(req.user.id);

    const result = await db.query(
      `INSERT INTO beta_feedback (user_id, beta_tester_id, type, title, description, severity, rating)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, testerId, type, title.trim(), description.trim(), sev, rate(experienceRating ?? rating)]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
};
router.post('/', authenticateToken, submitHandler);
router.post('/submit', authenticateToken, submitHandler);

// Get caller's feedback — /my and /my-feedback aliases
const myFeedbackHandler = async (req, res) => {
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
};
router.get('/my', authenticateToken, myFeedbackHandler);
router.get('/my-feedback', authenticateToken, myFeedbackHandler);

// Get all feedback (admin only)
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT bf.*, u.username, bt.display_name AS tester_display_name, bt.country, bt.state
       FROM beta_feedback bf
       LEFT JOIN users u ON bf.user_id = u.id
       LEFT JOIN beta_testers bt ON bf.beta_tester_id = bt.id
       ORDER BY bf.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching all feedback:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Update feedback status (admin only)
router.patch('/admin/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

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
router.patch('/admin/:id/severity', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { severity } = req.body;
    if (!VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: 'Invalid severity' });
    }

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

// Add admin response (admin only) — marks status per feedback type
router.post('/admin/:id/respond', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { response } = req.body;
    if (!response || !response.trim()) {
      return res.status(400).json({ error: 'Response is required' });
    }

    await db.query(
      `UPDATE beta_feedback
       SET admin_response = $1,
           responded_by = $3,
           responded_at = NOW(),
           status = CASE type
                      WHEN 'bug' THEN 'in_progress'
                      WHEN 'feature' THEN 'planned'
                      WHEN 'idea' THEN 'under_review'
                      ELSE status
                    END
       WHERE id = $2`,
      [response.trim(), req.params.id, req.user.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error adding admin response:', error);
    res.status(500).json({ error: 'Failed to add admin response' });
  }
});

// Vote on a feedback item (any user — mainly for feature requests)
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `INSERT INTO feedback_votes (feedback_id, user_id) VALUES ($1, $2)
       ON CONFLICT (feedback_id, user_id) DO NOTHING`,
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error voting on feedback:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// Delete feedback (admin only)
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM beta_feedback WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting feedback:', error);
    res.status(500).json({ error: 'Failed to delete feedback' });
  }
});

module.exports = router;
