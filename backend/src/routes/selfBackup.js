const express = require('express');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const betaBackup = require('../services/betaBackup');

// ============================================================================
// USER SELF-SERVICE BACKUP — the third recovery system.
// Any user can: download their own data as JSON, write a personal save
// point to the server ("cloud"), and restore their account to a save
// point. Scope is ALWAYS req.user.id — a user can never touch anyone
// else's rows, and privileged account fields (is_admin, is_beta_tester,
// password, tier) are never restored through this path.
// ============================================================================

// Cooldown so self-restore can't be hammered (heavy op, serialized anyway)
const lastRestore = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

// Download my data — everything tied to my account as one JSON package.
router.get('/me/download', authenticateToken, async (req, res) => {
  try {
    const dump = await betaBackup.buildBackup({ userId: req.user.id });
    res.setHeader('Content-Disposition',
      `attachment; filename="listzy-backup-${req.user.username || req.user.id}-${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(dump);
  } catch {
    res.status(500).json({ error: 'Failed to build backup' });
  }
});

// Write a personal save point to the server (the "cloud drive" option).
router.post('/me/save', authenticateToken, async (req, res) => {
  try {
    const out = await betaBackup.runBackup(`self:${req.user.id}`, { userId: req.user.id });
    res.json({ filename: out.filename, saved_at: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: 'Failed to save backup' });
  }
});

// List MY save points on the server.
router.get('/me/list', authenticateToken, async (req, res) => {
  try {
    const { files } = await betaBackup.listBackups();
    const prefix = `beta-backup-user-${req.user.id}-`;
    res.json(files.filter((f) => f.filename.startsWith(prefix)));
  } catch {
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

// Restore MY account to a save point — the "like nothing ever changed"
// button. {filename?} — omitted = my most recent save point. Uploaded
// {backup} object also accepted (restore a downloaded file).
router.post('/me/restore', authenticateToken, async (req, res) => {
  try {
    const last = lastRestore.get(req.user.id) || 0;
    if (Date.now() - last < COOLDOWN_MS) {
      return res.status(429).json({ error: 'Restore is on cooldown — try again in a few minutes' });
    }

    let dump = req.body?.backup;
    if (!dump) {
      let file = req.body?.filename;
      if (!file) {
        const { files } = await betaBackup.listBackups();
        file = files.find((f) => f.filename.startsWith(`beta-backup-user-${req.user.id}-`))?.filename;
        if (!file) return res.status(404).json({ error: 'No save point found — create one first' });
      }
      // Users may only read their OWN save point files
      if (!String(file).startsWith(`beta-backup-user-${req.user.id}-`)) {
        return res.status(403).json({ error: 'Not your save point' });
      }
      dump = await betaBackup.readBackupFile(file);
      if (!dump) return res.status(404).json({ error: 'Backup not found' });
    }

    lastRestore.set(req.user.id, Date.now());
    const out = await betaBackup.restoreDump(dump, req.user.id, {
      onlyUserId: req.user.id, selfService: true,
    });
    res.json(out);
  } catch (e) {
    console.error('Self-restore failed:', e);
    res.status(500).json({ error: 'Restore failed' });
  }
});

module.exports = router;
