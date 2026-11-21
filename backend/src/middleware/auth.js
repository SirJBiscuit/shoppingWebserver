const jwt = require('jsonwebtoken');
const db = require('../database/db');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Normalize userId to id for consistency (support both old and new token formats)
    req.user = {
      id: user.userId || user.id,
      username: user.username,
      isAdmin: user.isAdmin || false,
      isBetaTester: user.isBetaTester || false
    };
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * isQuickLoginEligible — quick login is opt-in for admins AND beta testers.
 * Beta status isn't in the JWT claims, so it's checked against the live row.
 */
const isQuickLoginEligible = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT is_admin, is_beta_tester FROM users WHERE id = $1',
      [req.user?.id]
    );
    const row = result.rows[0];
    if (!row || !(row.is_admin || row.is_beta_tester)) {
      return res.status(403).json({ error: 'Quick login is not available for this account' });
    }
    next();
  } catch {
    res.status(500).json({ error: 'Access check failed' });
  }
};

module.exports = { authenticateToken, isAdmin, isQuickLoginEligible };
