const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const ntfy = require('../services/ntfyService');

// Notification types a user can toggle. Anything missing counts as ON.
const USER_TYPES = ['expiry', 'feature_release', 'broadcast'];
// Alert types the admin topic can receive.
const ADMIN_TYPES = ['changelog', 'beta_signup', 'beta_feedback'];

const cleanTypes = (obj, allowed) => {
  const out = {};
  if (obj && typeof obj === 'object') {
    for (const k of allowed) {
      if (typeof obj[k] === 'boolean') out[k] = obj[k];
    }
  }
  return out;
};

// ============ USER ============

// GET /api/ntfy/settings — current user's ntfy config (defaults if unset)
router.get('/settings', authenticateToken, async (req, res) => {
  try {
    const s = await ntfy.getUserSettings(req.user.id);
    res.json({
      topic: s?.topic || '',
      enabled: s?.enabled === true,
      types: s?.types || {},
      availableTypes: USER_TYPES,
    });
  } catch (error) {
    console.error('Error loading ntfy settings:', error);
    res.status(500).json({ error: 'Failed to load ntfy settings' });
  }
});

// PUT /api/ntfy/settings — save topic / enabled / per-type toggles
router.put('/settings', authenticateToken, async (req, res) => {
  try {
    const { topic = '', enabled = false, types = {} } = req.body;
    const safeTopic = typeof topic === 'string' ? topic.trim() : '';
    if (safeTopic && !ntfy.sanitizeTopic(safeTopic)) {
      return res.status(400).json({ error: 'Topic may only contain letters, numbers, dashes and underscores' });
    }

    const result = await db.query(
      `INSERT INTO ntfy_user_settings (user_id, topic, enabled, types, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (user_id) DO UPDATE SET
         topic = EXCLUDED.topic,
         enabled = EXCLUDED.enabled,
         types = EXCLUDED.types,
         updated_at = NOW()
       RETURNING topic, enabled, types`,
      [req.user.id, safeTopic, enabled === true, JSON.stringify(cleanTypes(types, USER_TYPES))]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving ntfy settings:', error);
    res.status(500).json({ error: 'Failed to save ntfy settings' });
  }
});

// POST /api/ntfy/test — send a test ping to the user's own topic
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const s = await ntfy.getUserSettings(req.user.id);
    if (!s || !s.topic) return res.status(400).json({ error: 'Save a topic first' });
    const ok = await ntfy.publish(s.topic, 'Listzy test 🎉', 'Push notifications are working!', { tags: 'tada', priority: 4 });
    if (!ok) return res.status(502).json({ error: 'Could not reach ntfy — check the topic name' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending ntfy test:', error);
    res.status(500).json({ error: 'Failed to send test' });
  }
});

// ============ ADMIN ============

// GET /api/ntfy/admin/settings
router.get('/admin/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const s = await ntfy.getAdminSettings();
    res.json({
      topic: s?.topic || '',
      enabled: s?.enabled === true,
      types: s?.types || {},
      availableTypes: ADMIN_TYPES,
    });
  } catch (error) {
    console.error('Error loading admin ntfy settings:', error);
    res.status(500).json({ error: 'Failed to load admin ntfy settings' });
  }
});

// PUT /api/ntfy/admin/settings
router.put('/admin/settings', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { topic = '', enabled = false, types = {} } = req.body;
    const safeTopic = typeof topic === 'string' ? topic.trim() : '';
    if (safeTopic && !ntfy.sanitizeTopic(safeTopic)) {
      return res.status(400).json({ error: 'Topic may only contain letters, numbers, dashes and underscores' });
    }

    const result = await db.query(
      `INSERT INTO ntfy_admin_settings (id, topic, enabled, types, updated_at)
       VALUES (1, $1, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET
         topic = EXCLUDED.topic,
         enabled = EXCLUDED.enabled,
         types = EXCLUDED.types,
         updated_at = NOW()
       RETURNING topic, enabled, types`,
      [safeTopic, enabled === true, JSON.stringify(cleanTypes(types, ADMIN_TYPES))]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving admin ntfy settings:', error);
    res.status(500).json({ error: 'Failed to save admin ntfy settings' });
  }
});

// POST /api/ntfy/admin/test — ping the admin topic
router.post('/admin/test', authenticateToken, isAdmin, async (req, res) => {
  try {
    const s = await ntfy.getAdminSettings();
    if (!s || !s.topic) return res.status(400).json({ error: 'Save an admin topic first' });
    const ok = await ntfy.publish(s.topic, 'Listzy admin test 🛡️', 'Admin alerts are working!', { tags: 'shield', priority: 4 });
    if (!ok) return res.status(502).json({ error: 'Could not reach ntfy — check the topic name' });
    res.json({ success: true });
  } catch (error) {
    console.error('Error sending admin ntfy test:', error);
    res.status(500).json({ error: 'Failed to send test' });
  }
});

module.exports = router;
