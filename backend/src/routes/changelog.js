const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const execFileP = promisify(execFile);

// ---------------------------------------------------------------------------
// Commit history
//
// The backend container has no .git dir (and exec'ing git crashed prod before),
// so commit history comes from changelog.txt — generated on the host by
// update-quick.sh next to version.json. In local dev we fall back to a safe,
// short-timeout git execFile.
// ---------------------------------------------------------------------------

const ROOT = path.join(__dirname, '..', '..', '..');
const CACHE_MS = 10 * 60 * 1000;
let commitsCache = { at: 0, commits: [] };

const parseGitLog = (text) =>
  text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [hash, date, ...rest] = line.split('|');
      const author = rest.pop() || '';
      const message = rest.join('|').trim();
      if (!hash || !message) return null;
      return { hash: hash.trim(), date: (date || '').trim(), message, author: author.trim() };
    })
    .filter(Boolean);

const loadCommits = async () => {
  if (Date.now() - commitsCache.at < CACHE_MS) return commitsCache.commits;

  // 1. Exported file from the deploy host (production path)
  for (const p of [path.join(ROOT, 'changelog.txt'), '/opt/cloudmc-shop/changelog.txt']) {
    try {
      const text = await fs.readFile(p, 'utf8');
      const commits = parseGitLog(text);
      commitsCache = { at: Date.now(), commits };
      return commits;
    } catch { /* not there — try next */ }
  }

  // 2. Local dev fallback: git in-process (short timeout, never throws)
  try {
    const { stdout } = await execFileP(
      'git',
      ['log', '--no-merges', '-n', '600', '--pretty=format:%H|%ai|%s|%an'],
      { cwd: ROOT, timeout: 5000, maxBuffer: 4 * 1024 * 1024 }
    );
    const commits = parseGitLog(stdout);
    commitsCache = { at: Date.now(), commits };
    return commits;
  } catch (err) {
    console.warn('changelog: git unavailable —', err.message);
    commitsCache = { at: Date.now(), commits: [] };
    return [];
  }
};

// GET /api/changelog — everything the viewer needs in one call
router.get('/', authenticateToken, async (req, res) => {
  try {
    const [commits, features, user] = await Promise.all([
      loadCommits(),
      db.query(
        `SELECT f.id, f.title, f.description, f.category, f.status, f.priority, f.target_date,
                f.released_at, f.beta_only, f.sort_order, f.created_at, f.progress, f.voting_enabled,
                COALESCE(v.vote_count, 0)::int AS vote_count,
                (my.user_id IS NOT NULL) AS my_vote
         FROM changelog_features f
         LEFT JOIN (
           SELECT feature_id, COUNT(*) AS vote_count FROM changelog_feature_votes GROUP BY feature_id
         ) v ON v.feature_id = f.id
         LEFT JOIN changelog_feature_votes my
           ON my.feature_id = f.id AND my.user_id = $1
         WHERE f.is_hidden = FALSE
         ORDER BY f.status ASC, f.sort_order ASC, f.created_at DESC`,
        [req.user.id]
      ),
      db.query('SELECT is_beta_tester, is_admin FROM users WHERE id = $1', [req.user.id]),
    ]);

    const isBeta = user.rows[0]?.is_beta_tester === true;
    const isAdminUser = user.rows[0]?.is_admin === true;
    // beta_only entries are only visible to beta testers (and admins)
    const visible = features.rows.filter((f) => !f.beta_only || isBeta || isAdminUser);
    const sortUpcoming = (rows) => rows.sort((a, b) => (a.sort_order - b.sort_order) || (new Date(b.created_at) - new Date(a.created_at)));

    res.json({
      commits,
      upcoming: sortUpcoming(visible.filter((f) => f.status !== 'released')),
      entries: visible.filter((f) => f.status === 'released'),
      total: commits.length,
    });
  } catch (error) {
    console.error('Error loading changelog:', error);
    res.json({ commits: [], upcoming: [], entries: [], total: 0 });
  }
});

// Toggle a vote on an upcoming feature — one vote per user per feature
router.post('/features/:id/vote', authenticateToken, async (req, res) => {
  try {
    const feature = await db.query(
      `SELECT id, status, beta_only, voting_enabled FROM changelog_features
       WHERE id = $1 AND is_hidden = FALSE`,
      [req.params.id]
    );
    if (feature.rows.length === 0) return res.status(404).json({ error: 'Feature not found' });

    const f = feature.rows[0];
    if (f.status === 'released') return res.status(400).json({ error: 'Cannot vote on released features' });
    if (f.voting_enabled === false) return res.status(403).json({ error: 'Voting is disabled for this feature' });

    // beta_only features can only be voted on by beta testers / admins
    if (f.beta_only) {
      const u = await db.query('SELECT is_beta_tester, is_admin FROM users WHERE id = $1', [req.user.id]);
      if (!u.rows[0]?.is_beta_tester && !u.rows[0]?.is_admin) {
        return res.status(403).json({ error: 'Beta testers only' });
      }
    }

    const existing = await db.query(
      'SELECT id FROM changelog_feature_votes WHERE feature_id = $1 AND user_id = $2',
      [f.id, req.user.id]
    );

    let voted;
    if (existing.rows.length > 0) {
      await db.query('DELETE FROM changelog_feature_votes WHERE id = $1', [existing.rows[0].id]);
      voted = false;
    } else {
      await db.query(
        'INSERT INTO changelog_feature_votes (feature_id, user_id) VALUES ($1, $2)',
        [f.id, req.user.id]
      );
      voted = true;
    }

    const { rows } = await db.query(
      'SELECT COUNT(*)::int AS count FROM changelog_feature_votes WHERE feature_id = $1',
      [f.id]
    );
    res.json({ voted, vote_count: rows[0].count });
  } catch (error) {
    console.error('Error toggling vote:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// ============================ ADMIN ============================

// Add an upcoming feature (shown to users in "Coming Soon")
router.post('/admin/features', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, category = 'feature', target_date, status = 'planned', beta_only = false, priority = 'medium' } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const result = await db.query(
      `INSERT INTO changelog_features (title, description, category, status, target_date, beta_only, priority, sort_order, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7,
               COALESCE((SELECT MAX(sort_order) FROM changelog_features WHERE status != 'released'), 0) + 1, $8)
       RETURNING *`,
      [title.trim(), description || null, category, status, target_date || null, beta_only === true, priority, req.user.id]
    );
    res.status(201).json({ feature: result.rows[0] });
  } catch (error) {
    console.error('Error adding changelog feature:', error);
    res.status(500).json({ error: 'Failed to add feature' });
  }
});

// List every feature (upcoming + released) for the admin panel
router.get('/admin/features', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT f.id, f.title, f.description, f.category, f.status, f.priority, f.sort_order,
              f.is_hidden, f.target_date, f.released_at, f.beta_only, f.notify_on_release,
              f.progress, f.voting_enabled, f.created_at, f.updated_at,
              COALESCE(v.vote_count, 0)::int AS vote_count
       FROM changelog_features f
       LEFT JOIN (
         SELECT feature_id, COUNT(*) AS vote_count FROM changelog_feature_votes GROUP BY feature_id
       ) v ON v.feature_id = f.id
       ORDER BY CASE WHEN f.status = 'released' THEN 1 ELSE 0 END, f.sort_order ASC, f.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing changelog features:', error);
    res.status(500).json({ error: 'Failed to list features' });
  }
});

// Update a feature — flipping status to 'released' can notify every user
router.patch('/admin/features/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, status, target_date, notify_on_release, beta_only, priority, sort_order, is_hidden, progress, voting_enabled } = req.body;

    const fields = { title, description, category, status, target_date, notify_on_release, beta_only, priority, sort_order, is_hidden, progress, voting_enabled };
    const updates = [];
    const values = [];
    let n = 1;
    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${col} = $${n++}`);
        values.push(col === 'title' && typeof val === 'string' ? val.trim() : val);
      }
    }
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

    if (status === 'released') {
      updates.push(`released_at = COALESCE(released_at, NOW())`);
      if (req.body.progress === undefined) updates.push(`progress = 100`);
    }
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await db.query(
      `UPDATE changelog_features SET ${updates.join(', ')} WHERE id = $${n} RETURNING *`,
      values
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Feature not found' });

    const feature = result.rows[0];

    // Newly released + wants a notification -> fan out to every user
    let notified = 0;
    if (status === 'released' && feature.notify_on_release) {
      const ins = await db.query(
        `INSERT INTO user_notifications (user_id, type, title, message, data)
         SELECT id, 'feature_release', $1, $2, $3 FROM users
         ${feature.beta_only ? 'WHERE is_beta_tester = TRUE' : ''}`,
        [
          `New feature released: ${feature.title}`,
          feature.description || 'A new feature just went live — check the changelog!',
          JSON.stringify({ changelog_feature_id: feature.id }),
        ]
      );
      notified = ins.rowCount;
    }

    res.json({ feature, notified });
  } catch (error) {
    console.error('Error updating changelog feature:', error);
    res.status(500).json({ error: 'Failed to update feature' });
  }
});

// Persist drag-sort order for upcoming features — body: { ids: [id1, id2, ...] }
router.post('/admin/features/reorder', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const cases = ids.map((id, i) => `WHEN id = ${parseInt(id, 10) || 0} THEN ${i + 1}`).join(' ');
    await db.query(
      `UPDATE changelog_features SET sort_order = CASE ${cases} END
       WHERE id = ANY($1::int[])`,
      [ids.map((id) => parseInt(id, 10) || 0)]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error reordering changelog features:', error);
    res.status(500).json({ error: 'Failed to reorder features' });
  }
});

// Bulk-release upcoming features with ONE compressed patch-note notification.
// body: { ids: [..], summary?: string }
router.post('/admin/features/bulk-release', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ids, summary } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required' });
    }
    const intIds = ids.map((id) => parseInt(id, 10) || 0).filter(Boolean);

    const updated = await db.query(
      `UPDATE changelog_features
       SET status = 'released', released_at = COALESCE(released_at, NOW()), updated_at = NOW()
       WHERE id = ANY($1::int[]) AND status != 'released'
       RETURNING id, title, description, beta_only, notify_on_release`,
      [intIds]
    );
    const released = updated.rows;
    if (released.length === 0) return res.json({ released: 0, notified: 0 });

    // One compressed notification per audience, not one-per-feature.
    let notified = 0;
    const notifyable = released.filter((f) => f.notify_on_release !== false);
    if (notifyable.length > 0) {
      const titles = notifyable.map((f) => `• ${f.title}`).join('\n');
      const body = summary?.trim() || `Just shipped:\n${titles}`;
      const notifyBeta = notifyable.some((f) => f.beta_only);
      const notifyAll = notifyable.some((f) => !f.beta_only);
      for (const betaOnly of [false, true]) {
        if (betaOnly && !notifyBeta) continue;
        if (!betaOnly && !notifyAll) continue;
        const ins = await db.query(
          `INSERT INTO user_notifications (user_id, type, title, message, data)
           SELECT id, 'feature_release', $1, $2, $3 FROM users
           ${betaOnly ? 'WHERE is_beta_tester = TRUE' : ''}`,
          [
            `Update released: ${notifyable.length} new feature${notifyable.length === 1 ? '' : 's'}`,
            body,
            JSON.stringify({ changelog_feature_ids: notifyable.map((f) => f.id) }),
          ]
        );
        notified += ins.rowCount;
      }
    }

    res.json({ released: released.length, notified });
  } catch (error) {
    console.error('Error bulk-releasing changelog features:', error);
    res.status(500).json({ error: 'Failed to bulk release features' });
  }
});

router.delete('/admin/features/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM changelog_features WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting changelog feature:', error);
    res.status(500).json({ error: 'Failed to delete feature' });
  }
});

module.exports = router;
