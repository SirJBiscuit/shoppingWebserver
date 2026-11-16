const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const VOTES = ['yes', 'no'];
// Progress-style lifecycle: open (voting) → thinking → in_progress →
// working → shipped, or dropped. shipped/dropped are terminal.
const STATUSES = ['open', 'thinking', 'in_progress', 'working', 'shipped', 'dropped'];
const TERMINAL = ['shipped', 'dropped'];

const TALLY = `
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id AND v.vote = 'yes') AS yes_votes,
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id AND v.vote = 'no') AS no_votes,
  (SELECT COUNT(*)::int FROM beta_feature_poll_votes v
    WHERE v.poll_id = p.id) AS total_votes`;

// Per-option counts for multi-choice polls: {"0": 3, "2": 1, ...}
const OPTION_TALLY = `
  (SELECT COALESCE(jsonb_object_agg(v.option_index::text, v.cnt), '{}'::jsonb)
   FROM (SELECT option_index, COUNT(*)::int AS cnt
         FROM beta_feature_poll_votes
         WHERE poll_id = p.id AND option_index IS NOT NULL
         GROUP BY option_index) v) AS option_tally`;

// Validate/sanitize a client-supplied options array (2-6 strings ≤120 chars)
const cleanOptions = (opts) => {
  if (!Array.isArray(opts)) return null;
  const list = opts
    .map((o) => (typeof o === 'string' ? o.trim().slice(0, 120) : ''))
    .filter(Boolean)
    .slice(0, 6);
  return list.length >= 2 ? list : null;
};

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
      `SELECT p.id, p.title, p.description, p.status, p.created_at, p.options, p.text_color, p.icon,
              ${TALLY}, ${OPTION_TALLY},
              mv.vote AS my_vote, mv.note AS my_note, mv.option_index AS my_option
       FROM beta_feature_polls p
       LEFT JOIN beta_feature_poll_votes mv
         ON mv.poll_id = p.id AND mv.user_id = $1
       WHERE p.status IN ('open','thinking','in_progress','working')
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
 * POST /api/beta/polls/:id/vote  { vote: 'yes'|'no', optionIndex?, note? }
 * Cast or change a vote. Votes are advisory demand signal, not decisions.
 */
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { vote, optionIndex, note } = req.body;
    const poll = await db.query(
      `SELECT status, options FROM beta_feature_polls WHERE id = $1`, [req.params.id]
    );
    if (!poll.rows.length) return res.status(404).json({ error: 'Poll not found' });
    if (poll.rows[0].status !== 'open') {
      return res.status(400).json({ error: 'Poll is closed' });
    }

    const options = cleanOptions(poll.rows[0].options);
    const idx = Number.isInteger(optionIndex) ? optionIndex : null;
    if (options) {
      if (idx === null || idx < 0 || idx >= options.length) {
        return res.status(400).json({ error: 'optionIndex required' });
      }
    } else if (!VOTES.includes(vote)) {
      return res.status(400).json({ error: 'vote must be yes|no' });
    }

    await db.query(
      `INSERT INTO beta_feature_poll_votes (poll_id, user_id, vote, note, option_index)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (poll_id, user_id)
       DO UPDATE SET vote = EXCLUDED.vote, note = EXCLUDED.note, option_index = EXCLUDED.option_index`,
      [req.params.id, req.user.id, options ? 'option' : vote, note?.trim()?.slice(0, 500) || null, options ? idx : null]
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
      `SELECT p.*, ${TALLY}, ${OPTION_TALLY}, u.username AS created_by_name
       FROM beta_feature_polls p
       LEFT JOIN users u ON u.id = p.created_by
       ORDER BY p.created_at DESC LIMIT 100`
    );
    const notes = await db.query(
      `SELECT v.poll_id, v.vote, v.option_index, v.note, u.username, v.created_at
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
 * POST /api/beta/polls/admin  { title, description?, options? }
 * options: array of 2-6 choices — testers pick one. Omit for yes/no.
 */
router.post('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, options, textColor, icon } = req.body;
    if (!title || !title.trim() || title.length > 255) {
      return res.status(400).json({ error: 'Title required (max 255 chars)' });
    }
    const opts = cleanOptions(options);
    const { rows } = await db.query(
      `INSERT INTO beta_feature_polls (title, description, options, text_color, icon, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [title.trim(), description?.trim() || null, opts ? JSON.stringify(opts) : null,
       textColor?.trim()?.slice(0, 20) || null,
       icon?.trim()?.slice(0, 30) || null, req.user.id]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Error creating poll:', e);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

/**
 * PATCH /api/beta/polls/admin/:id — edit title / description / options /
 * text_color. Omitting a field leaves it unchanged; options: [] clears
 * the multi-choice list back to a yes/no poll.
 */
router.patch('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, options, textColor, icon } = req.body;
    if (title !== undefined && (!title.trim() || title.length > 255)) {
      return res.status(400).json({ error: 'Title required (max 255 chars)' });
    }
    const hasOptions = options !== undefined;
    const opts = hasOptions && Array.isArray(options) && options.length
      ? cleanOptions(options)
      : null;
    if (hasOptions && Array.isArray(options) && options.length > 0 && !opts) {
      return res.status(400).json({ error: 'Options must be 2–6 choices' });
    }
    const { rowCount } = await db.query(
      `UPDATE beta_feature_polls SET
         title      = COALESCE($2, title),
         description = COALESCE($3, description),
         text_color = COALESCE($4, text_color),
         options    = CASE WHEN $5::boolean THEN $6 ELSE options END,
         icon       = CASE WHEN $7::boolean THEN $8 ELSE icon END
       WHERE id = $1`,
      [req.params.id,
       title?.trim() || null,
       description === undefined ? null : (description?.trim() || null),
       textColor?.trim()?.slice(0, 20) || null,
       hasOptions,
       hasOptions ? JSON.stringify(opts) : null,
       icon !== undefined,
       icon === undefined ? null : (icon?.trim()?.slice(0, 30) || null)]
    );
    if (!rowCount) return res.status(404).json({ error: 'Poll not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error editing poll:', e);
    res.status(500).json({ error: 'Failed to edit poll', detail: e.message });
  }
});

/**
 * POST /api/beta/polls/admin/:id/status  { status }
 * Progress lifecycle: open → thinking → in_progress → working → shipped,
 * or dropped. shipped/dropped mark resolved_at; 'open' keeps voting live.
 */
router.post('/admin/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    // Boolean param — comparing $2 to literals inside the CASE would deduce
    // it as text and conflict with the column's own type (same $2 bug as pins).
    const terminal = TERMINAL.includes(status);
    const { rowCount } = await db.query(
      `UPDATE beta_feature_polls SET status = $2,
         resolved_at = CASE WHEN $3::boolean THEN NOW() ELSE resolved_at END
       WHERE id = $1`,
      [req.params.id, status, terminal]
    );
    if (!rowCount) return res.status(404).json({ error: 'Poll not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error updating poll status:', e);
    res.status(500).json({ error: 'Failed to update poll', detail: e.message });
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
