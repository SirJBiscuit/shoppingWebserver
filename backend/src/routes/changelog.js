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
        `SELECT id, title, description, category, status, target_date, released_at, beta_only, created_at
         FROM changelog_features ORDER BY created_at DESC`
      ),
      db.query('SELECT is_beta_tester, is_admin FROM users WHERE id = $1', [req.user.id]),
    ]);

    const isBeta = user.rows[0]?.is_beta_tester === true;
    const isAdminUser = user.rows[0]?.is_admin === true;
    // beta_only entries are only visible to beta testers (and admins)
    const visible = features.rows.filter((f) => !f.beta_only || isBeta || isAdminUser);

    res.json({
      commits,
      upcoming: visible.filter((f) => f.status !== 'released'),
      entries: visible.filter((f) => f.status === 'released'),
      total: commits.length,
    });
  } catch (error) {
    console.error('Error loading changelog:', error);
    res.json({ commits: [], upcoming: [], entries: [], total: 0 });
  }
});

// ============================ ADMIN ============================

// Add an upcoming feature (shown to users in "Coming Soon")
router.post('/admin/features', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { title, description, category = 'feature', target_date, status = 'planned', beta_only = false } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

    const result = await db.query(
      `INSERT INTO changelog_features (title, description, category, status, target_date, beta_only, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [title.trim(), description || null, category, status, target_date || null, beta_only === true, req.user.id]
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
      `SELECT id, title, description, category, status, target_date, released_at, beta_only, notify_on_release, created_at, updated_at
       FROM changelog_features ORDER BY created_at DESC`
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
    const { title, description, category, status, target_date, notify_on_release, beta_only } = req.body;

    const fields = { title, description, category, status, target_date, notify_on_release, beta_only };
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

    if (status === 'released') updates.push(`released_at = COALESCE(released_at, NOW())`);
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
