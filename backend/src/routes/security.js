/**
 * Admin security endpoints — view and manage IP bans created by ipGuard.
 * Mounted at /api/admin/security; all routes require an admin token.
 */
const express = require('express');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const ipGuard = require('../services/ipGuard');

const router = express.Router();

router.use(authenticateToken, isAdmin);

// Active bans (with reason + expiry) for the admin panel
router.get('/bans', async (_req, res) => {
  try {
    res.json(await ipGuard.listBans());
  } catch {
    res.status(500).json({ error: 'Failed to list bans' });
  }
});

// Manually ban an IP — e.g. an attacker spotted in logs before they trip
// the automatic threshold. { ip, reason?, hours? }
router.post('/bans', async (req, res) => {
  const { ip, reason, hours } = req.body || {};
  if (!ip || typeof ip !== 'string' || ip.length > 60) {
    return res.status(400).json({ error: 'ip required' });
  }
  const ttl = Math.min(Math.max(Number(hours) || 24, 1), 24 * 30) * 3600000;
  await ipGuard.ban(ip, reason || `manual ban by ${req.user.username}`, ttl);
  res.status(201).json({ banned: ip });
});

// Lift a ban early
router.delete('/bans/:ip', async (req, res) => {
  try {
    await ipGuard.unban(req.params.ip);
    res.json({ unbanned: req.params.ip });
  } catch {
    res.status(500).json({ error: 'Failed to unban' });
  }
});

module.exports = router;
