const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// GET /api/notifications — the calling user's notifications, unread first
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { limit = 25 } = req.query;
    const result = await db.query(
      `SELECT id, type, title, message, data, is_read, created_at
       FROM user_notifications
       WHERE user_id = $1
       ORDER BY is_read ASC, created_at DESC
       LIMIT $2`,
      [req.user.id, Math.min(parseInt(limit, 10) || 25, 100)]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count — for the bell badge
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT COUNT(*) AS count FROM user_notifications WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count, 10) });
  } catch (error) {
    console.error('Error counting notifications:', error);
    res.status(500).json({ error: 'Failed to count notifications' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE user_notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification read:', error);
    res.status(500).json({ error: 'Failed to mark notification read' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticateToken, async (req, res) => {
  try {
    await db.query(
      'UPDATE user_notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE',
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

// Admin: broadcast a message to all users (or just beta testers)
router.post('/admin/broadcast', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, message, type = 'announcement', betaOnly = false } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const result = await db.query(
      `INSERT INTO user_notifications (user_id, type, title, message)
       SELECT id, $1, $2, $3 FROM users ${betaOnly ? 'WHERE is_beta_tester = TRUE' : ''}`,
      [type, title.trim(), message || null]
    );
    res.json({ success: true, sent: result.rowCount });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

module.exports = router;
