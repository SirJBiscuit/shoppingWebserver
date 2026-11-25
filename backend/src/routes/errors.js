const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const errorLog = require('../services/errorLog');

// Client-side error reports — any logged-in user can report (their own
// crashes feed the admin diagnostics view alongside server errors).
router.post('/report', authenticateToken, async (req, res) => {
  try {
    const { message, stack, path, meta } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });
    await errorLog.record({
      source: 'client', message, stack, path,
      method: 'UI', userId: req.user.id, meta,
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'report failed' });
  }
});

// Admin: recent errors — ?limit=, ?source=, ?user_id=
router.get('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const conds = [];
    const vals = [];
    if (req.query.source) { conds.push(`source = $${vals.push(String(req.query.source))}`); }
    if (req.query.user_id) { conds.push(`user_id = $${vals.push(parseInt(req.query.user_id, 10) || 0)}`); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const r = await db.query(
      `SELECT e.*, u.username FROM app_error_log e
       LEFT JOIN users u ON u.id = e.user_id
       ${where} ORDER BY e.created_at DESC LIMIT ${limit}`, vals
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: 'Failed to load error log' });
  }
});

// Admin: grouped summary — what keeps breaking
router.get('/admin/summary', authenticateToken, isAdmin, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT source, message, path, COUNT(*)::int AS count,
              MAX(created_at) AS last_seen
       FROM app_error_log
       WHERE created_at > NOW() - INTERVAL '7 days'
       GROUP BY source, message, path
       ORDER BY count DESC, last_seen DESC LIMIT 50`
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: 'Failed to summarize errors' });
  }
});

router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM app_error_log WHERE id = $1', [parseInt(req.params.id, 10) || 0]);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

router.delete('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('TRUNCATE app_error_log');
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to clear log' });
  }
});

module.exports = router;
