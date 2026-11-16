const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Private admin ideas board — only admins can see it.
const TAGS = ['idea', 'task', 'note', 'plan', 'investigate', 'risk'];
const STATUSES = ['open', 'in_progress', 'done', 'archived'];

/**
 * GET /api/beta/ideas/admin — all ideas, pinned first, newest first.
 */
router.get('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT i.*, u.username AS created_by_name
       FROM beta_admin_ideas i LEFT JOIN users u ON u.id = i.created_by
       ORDER BY i.is_pinned DESC, i.created_at DESC LIMIT 300`
    );
    res.json({ ideas: rows });
  } catch (e) {
    console.error('Error fetching ideas:', e);
    res.status(500).json({ error: 'Failed to fetch ideas' });
  }
});

/**
 * POST /api/beta/ideas/admin  { title, body?, tag?, color? }
 */
router.post('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, body, tag, color } = req.body;
    if (!title || !title.trim() || title.length > 255) {
      return res.status(400).json({ error: 'Title required (max 255 chars)' });
    }
    const { rows } = await db.query(
      `INSERT INTO beta_admin_ideas (title, body, tag, color, created_by)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [title.trim(), body?.trim() || null,
       TAGS.includes(tag) ? tag : 'idea',
       color?.trim()?.slice(0, 20) || null, req.user.id]
    );
    res.status(201).json({ idea: rows[0] });
  } catch (e) {
    console.error('Error creating idea:', e);
    res.status(500).json({ error: 'Failed to create idea' });
  }
});

/**
 * PATCH /api/beta/ideas/admin/:id — partial update (title/body/tag/
 * status/is_pinned/color). Body can be cleared with an empty string.
 */
router.patch('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, body, tag, status, is_pinned, color } = req.body;
    if (title !== undefined && (!title.trim() || title.length > 255)) {
      return res.status(400).json({ error: 'Title required (max 255 chars)' });
    }
    if (tag !== undefined && !TAGS.includes(tag)) {
      return res.status(400).json({ error: 'Invalid tag' });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rowCount } = await db.query(
      `UPDATE beta_admin_ideas SET
         title     = COALESCE($2, title),
         body      = CASE WHEN $3::boolean THEN $4 ELSE body END,
         tag       = COALESCE($5, tag),
         status    = COALESCE($6, status),
         is_pinned = COALESCE($7, is_pinned),
         color     = COALESCE($8, color),
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id,
       title?.trim() || null,
       body !== undefined, body === undefined ? null : (body?.trim() || null),
       tag || null, status || null,
       typeof is_pinned === 'boolean' ? is_pinned : null,
       color?.trim()?.slice(0, 20) || null]
    );
    if (!rowCount) return res.status(404).json({ error: 'Idea not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error updating idea:', e);
    res.status(500).json({ error: 'Failed to update idea', detail: e.message });
  }
});

/**
 * POST /api/beta/ideas/admin/:id/prioritize
 * Appends the idea to the priority queue — each call takes
 * MAX(priority_rank)+1 so the first idea prioritized is rank 1 (highest)
 * and every later one is lower. Re-prioritizing bumps it to the end.
 * Body { clear: true } removes it from the queue instead.
 */
router.post('/admin/:id/prioritize', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { clear } = req.body;
    const { rows } = await db.query(
      `UPDATE beta_admin_ideas SET
         priority_rank = CASE WHEN $2::boolean THEN NULL
                              ELSE (SELECT COALESCE(MAX(priority_rank), 0) + 1
                                    FROM beta_admin_ideas) END,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, priority_rank`,
      [req.params.id, !!clear]
    );
    if (!rows.length) return res.status(404).json({ error: 'Idea not found' });
    res.json({ id: rows[0].id, priority_rank: rows[0].priority_rank });
  } catch (e) {
    console.error('Error prioritizing idea:', e);
    res.status(500).json({ error: 'Failed to prioritize idea' });
  }
});

/**
 * DELETE /api/beta/ideas/admin/:id
 */
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM beta_admin_ideas WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('Error deleting idea:', e);
    res.status(500).json({ error: 'Failed to delete idea' });
  }
});

module.exports = router;
