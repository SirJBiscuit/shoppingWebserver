const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const VOTES = ['yes', 'no'];
const STATUSES = ['open', 'planned', 'released', 'declined'];

const TALLY = `
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id AND v.vote = 'yes') AS yes_votes,
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id AND v.vote = 'no') AS no_votes,
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id) AS total_votes`;

// ---------------------------------------------------------------------------
// TESTER SIDE — browse open polls + vote
// ---------------------------------------------------------------------------

/**
 * GET /api/beta/polls
 * Open polls (+recently resolved) with tallies and the caller's own vote.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.id, p.title, p.description, p.status, p.created_at, ${TALLY},
              mv.vote AS my_vote, mv.note AS my_note
       FROM beta_feature_polls p
       LEFT JOIN beta_feature_poll_votes mv
         ON mv.poll_id = p.id AND mv.user_id = $1
       WHERE p.status IN ('open','planned')
          OR p.resolved_at > NOW() - INTERVAL '14 days'
       ORDER BY (p.status = 'open') DESC, p.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    res.json({ polls: rows });
  } catch (e) {
    console.error('Error fetching polls:', e);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

/**
 * POST /api/beta/polls/:id/vote  { vote: 'yes'|'no', note? }
 * Cast or change a vote. Votes are advisory demand signal, not decisions.
 */
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { vote, note } = req.body;
    if (!VOTES.includes(vote)) {
      return res.status(400).json({ error: 'vote must be yes|no' });
    }
    const poll = await db.query(
      `SELECT status FROM beta_feature_polls WHERE id = $1`, [req.params.id]
    );
    if (!poll.rows.length) return res.status(404).json({ error: 'Poll not found' });
    if (poll.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Poll is closed' });
    }
    await db.query(
      `INSERT INTO beta_feature_poll_votes (poll_id, user_id, vote, note)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (poll_id, user_id)
       DO UPDATE SET vote = EXCLUDED.vote, note = EXCLUDED.note`,
      [req.params.id, req.user.id, vote, note?.trim()?.slice(0, 500) || null]
    );
    res.json({ voted: true });
  } catch (e) {
    console.error('Error voting on poll:', e);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN SIDE — create polls, watch tallies, resolve
// ---------------------------------------------------------------------------

/**
 * GET /api/beta/polls/admin/all — every poll with tallies + vote notes.
 */
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, ${TALLY}, u.username AS created_by_name
       FROM beta_feature_polls p
       LEFT JOIN users u ON u.id = p.created_by
       ORDER BY p.created_at DESC LIMIT 100`
    );
    const notes = await db.query(
      `SELECT v.poll_id, v.vote, v.note, u.username, v.created_at
       FROM beta_feature_poll_votes v
       LEFT JOIN users u ON u.id = v.user_id
       WHERE v.note IS NOT NULL
       ORDER BY v.created_at DESC LIMIT 200`
    );
    res.json({ polls: rows, notes: notes.rows });
  } catch (e) {
    console.error('Error fetching admin polls:', e);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

/**
 * POST /api/beta/polls/admin  { title, description? }
 */
router.post('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title || !title.trim() || title.length > 255) {
      return res.status(400).json({ error: 'Title required (max 255 chars)' });
    }
    const { rows } = await db.query(
      `INSERT INTO beta_feature_polls (title, description, created_by)
       VALUES ($1,$2,$3) RETURNING *`,
      [title.trim(), description?.trim() || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Error creating poll:', e);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

/**
 * POST /api/beta/polls/admin/:id/status  { status }
 * open → planned → released, or declined. Closing stops new votes.
 */
router.post('/admin/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rowCount } = await db.query(
      `UPDATE beta_feature_polls SET status = $2,
         resolved_at = CASE WHEN $2 IN ('released','declined') THEN NOW() ELSE resolved_at END
       WHERE id = $1`,
      [req.params.id, status]
    );
    if (!rowCount) return res.status(404).json({ error: 'Poll not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error updating poll status:', e);
    res.status(500).json({ error: 'Failed to update poll' });
  }
});

/**
 * DELETE /api/beta/polls/admin/:id — deletes poll + votes (cascade).
 */
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM beta_feature_polls WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('Error deleting poll:', e);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

module.exports = router;
