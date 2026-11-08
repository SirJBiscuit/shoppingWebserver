const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// Shared code-validation helper (table: beta_testing_codes — migration 043)
const validateCode = async (code) => {
  if (!code || typeof code !== 'string') {
    return { ok: false, status: 400, error: 'Beta code is required' };
  }

  const result = await db.query(
    `SELECT * FROM beta_testing_codes WHERE code = $1`,
    [code.trim().toUpperCase()]
  );

  if (result.rows.length === 0) {
    return { ok: false, status: 404, error: 'Invalid beta code' };
  }

  const betaCode = result.rows[0];
  if (!betaCode.is_active) return { ok: false, status: 400, error: 'Beta code is inactive' };
  if (new Date(betaCode.expires_at) < new Date()) return { ok: false, status: 400, error: 'Beta code has expired' };
  if (betaCode.current_uses >= betaCode.max_uses) return { ok: false, status: 400, error: 'Beta code has reached maximum uses' };

  return { ok: true, betaCode };
};

// Generate beta code (admin only) — COLOR-YEAR-XXXXX via migration-044 generator
router.post('/codes/generate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { expiresAt, expiresIn, maxUses, notes } = req.body;

    // Accept ISO expiresAt (frontend) or expiresIn (days)
    let expiry = expiresAt ? new Date(expiresAt) : new Date(Date.now() + (parseInt(expiresIn, 10) || 30) * 86400000);
    if (isNaN(expiry.getTime())) {
      return res.status(400).json({ error: 'Invalid expiration date' });
    }

    const uses = Math.max(1, Math.min(1000, parseInt(maxUses, 10) || 10));
    const code = (await db.query('SELECT generate_beta_code() AS code')).rows[0].code;

    const result = await db.query(
      `INSERT INTO beta_testing_codes (code, expires_at, max_uses, notes, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [code, expiry, uses, notes || null, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating beta code:', error);
    res.status(500).json({ error: 'Failed to generate beta code' });
  }
});

// Get all beta codes (admin only)
router.get('/codes', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT bc.*, u.username AS created_by_username,
              (SELECT COUNT(*) FROM beta_testers bt WHERE bt.beta_code_id = bc.id) AS tester_count
       FROM beta_testing_codes bc
       LEFT JOIN users u ON bc.created_by = u.id
       ORDER BY bc.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching beta codes:', error);
    res.status(500).json({ error: 'Failed to fetch beta codes' });
  }
});

// Verify a beta code (public — signup step 1)
router.post('/verify-code', async (req, res) => {
  try {
    const check = await validateCode(req.body.code);
    if (!check.ok) return res.status(check.status).json({ valid: false, error: check.error });
    res.json({ valid: true, code: check.betaCode.code });
  } catch (error) {
    console.error('Error verifying beta code:', error);
    res.status(500).json({ error: 'Failed to verify beta code' });
  }
});

// Legacy alias for /verify-code
router.post('/codes/validate', async (req, res) => {
  try {
    const check = await validateCode(req.body.code);
    if (!check.ok) return res.status(check.status).json({ error: check.error });
    res.json({ valid: true, code: check.betaCode });
  } catch (error) {
    console.error('Error validating beta code:', error);
    res.status(500).json({ error: 'Failed to validate beta code' });
  }
});

// Edit a beta code (admin only) — rename, expiry, max uses, notes, active
router.patch('/codes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { code, expiresAt, maxUses, notes, isActive } = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    if (code !== undefined && code !== null && String(code).trim()) {
      const newCode = String(code).trim().toUpperCase();
      const dup = await db.query(
        `SELECT id FROM beta_testing_codes WHERE code = $1 AND id != $2`,
        [newCode, req.params.id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: 'A code with that name already exists' });
      }
      updates.push(`code = $${i++}`); values.push(newCode);
    }
    if (expiresAt !== undefined) {
      const d = new Date(expiresAt);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiration date' });
      updates.push(`expires_at = $${i++}`); values.push(d);
    }
    if (maxUses !== undefined) {
      const uses = parseInt(maxUses, 10);
      if (!Number.isFinite(uses) || uses < 1 || uses > 1000) {
        return res.status(400).json({ error: 'Max uses must be between 1 and 1000' });
      }
      const cur = await db.query(`SELECT current_uses FROM beta_testing_codes WHERE id = $1`, [req.params.id]);
      if (cur.rows.length && uses < cur.rows[0].current_uses) {
        return res.status(400).json({ error: `Max uses cannot be below current uses (${cur.rows[0].current_uses})` });
      }
      updates.push(`max_uses = $${i++}`); values.push(uses);
    }
    if (notes !== undefined) { updates.push(`notes = $${i++}`); values.push(notes || null); }
    if (isActive !== undefined) { updates.push(`is_active = $${i++}`); values.push(!!isActive); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id);
    const result = await db.query(
      `UPDATE beta_testing_codes SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating beta code:', error);
    res.status(500).json({ error: 'Failed to update beta code' });
  }
});

// Extend a code's expiry by N days (admin only)
router.post('/codes/:id/extend', authenticateToken, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return res.status(400).json({ error: 'Days must be between 1 and 3650' });
    }

    // Extend from the later of (current expiry, now) so expired codes revive
    const result = await db.query(
      `UPDATE beta_testing_codes
       SET expires_at = GREATEST(expires_at, NOW()) + ($1 || ' days')::interval
       WHERE id = $2
       RETURNING *`,
      [days, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error extending beta code:', error);
    res.status(500).json({ error: 'Failed to extend beta code' });
  }
});

// Toggle code active state (admin only) — reactivate or deactivate
router.post('/codes/:id/active', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `UPDATE beta_testing_codes SET is_active = $1 WHERE id = $2 RETURNING *`,
      [!!req.body.isActive, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error toggling beta code:', error);
    res.status(500).json({ error: 'Failed to update beta code' });
  }
});

// Deactivate beta code (admin only)
router.post('/codes/:id/deactivate', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query(
      `UPDATE beta_testing_codes SET is_active = false WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deactivating beta code:', error);
    res.status(500).json({ error: 'Failed to deactivate beta code' });
  }
});

// Delete beta code (admin only). Used codes are allowed to delete too —
// beta_testers.beta_code_id is ON DELETE SET NULL so testers are kept.
router.delete('/codes/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM beta_testing_codes WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta code not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting beta code:', error);
    res.status(500).json({ error: 'Failed to delete beta code' });
  }
});

// ============================================================================
// BETA REGISTRATION (public — creates user + beta_testers row, consumes code)
// ============================================================================
router.post('/register', async (req, res) => {
  try {
    const { code, username, password, betaUsername, displayName, country, state, acceptedDataPolicy } = req.body;

    if (!username || !password || !displayName || !country || !state) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (!acceptedDataPolicy) {
      return res.status(400).json({ error: 'Data usage policy must be accepted' });
    }

    const check = await validateCode(code);
    if (!check.ok) return res.status(check.status).json({ error: check.error });

    const existing = await db.query(`SELECT id FROM users WHERE username = $1`, [username]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const userResult = await db.query(
      `INSERT INTO users (username, password_hash, is_beta_tester, account_type)
       VALUES ($1, $2, true, 'beta')
       RETURNING id, username, created_at`,
      [username, passwordHash]
    );
    const user = userResult.rows[0];

    await db.query(
      `INSERT INTO beta_testers (user_id, beta_code_id, beta_username, display_name, country, state, accepted_data_policy)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [user.id, check.betaCode.id, betaUsername || username, displayName, country, state, true]
    );

    await db.query(
      `UPDATE beta_testing_codes SET current_uses = current_uses + 1 WHERE id = $1`,
      [check.betaCode.id]
    );

    // Match the standard register flow — every user gets a default profile
    await db.query(
      `INSERT INTO profiles (user_id, profile_name, is_default) VALUES ($1, $2, $3)`,
      [user.id, 'Default', true]
    );

    const token = jwt.sign(
      { userId: user.id, username: user.username, isAdmin: false },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Beta account created',
      token,
      user: { id: user.id, username: user.username, isBetaTester: true },
    });
  } catch (error) {
    console.error('Error registering beta tester:', error);
    res.status(500).json({ error: 'Failed to create beta account' });
  }
});

// ============================================================================
// BETA TESTER MANAGEMENT (admin)
// ============================================================================

// List beta testers — joins beta_testers + users + their code
router.get('/admin/testers', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.created_at AS user_created_at, u.is_beta_tester,
              bt.id AS beta_tester_id, bt.beta_username, bt.display_name, bt.country, bt.state,
              bt.registered_at, bt.last_active, bt.accepted_data_policy,
              bt.suspended, bt.beta_expires_at, bt.admin_notes,
              bc.code AS beta_code,
              COUNT(DISTINCT bf.id) AS feedback_count,
              MAX(bf.created_at) AS last_feedback_at
       FROM beta_testers bt
       JOIN users u ON bt.user_id = u.id
       LEFT JOIN beta_testing_codes bc ON bt.beta_code_id = bc.id
       LEFT JOIN beta_feedback bf ON bf.user_id = u.id
       GROUP BY u.id, u.username, u.created_at, u.is_beta_tester,
                bt.id, bt.beta_username, bt.display_name, bt.country, bt.state,
                bt.registered_at, bt.last_active, bt.accepted_data_policy,
                bt.suspended, bt.beta_expires_at, bt.admin_notes,
                bc.code
       ORDER BY bt.registered_at DESC`
    );

    // Real MDL contributions: items added (distinct tracked names) + aisle reports per user
    const contrib = await db.query(
      `SELECT h.user_id,
              COUNT(DISTINCT h.item_name_id) AS items_added
       FROM mdl_user_item_history h
       GROUP BY h.user_id`
    ).catch(() => ({ rows: [] }));
    const aisles = await db.query(
      `SELECT user_id, COUNT(*) AS aisles_reported
       FROM mdl_aisle_reports
       GROUP BY user_id`
    ).catch(() => ({ rows: [] }));

    const itemsByUser = Object.fromEntries(contrib.rows.map(r => [r.user_id, parseInt(r.items_added, 10)]));
    const aislesByUser = Object.fromEntries(aisles.rows.map(r => [r.user_id, parseInt(r.aisles_reported, 10)]));

    res.json(result.rows.map((t) => ({
      ...t,
      items_added: itemsByUser[t.id] || 0,
      aisles_reported: aislesByUser[t.id] || 0,
      suspended: t.suspended === true,
      beta_expires_at: t.beta_expires_at || null,
      admin_notes: t.admin_notes || null
    })));
  } catch (error) {
    console.error('Error fetching beta testers:', error);
    res.status(500).json({ error: 'Failed to fetch beta testers' });
  }
});

// Edit tester fields (admin only) — display name, admin notes, suspension
router.patch('/admin/testers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { displayName, adminNotes, suspended, betaExpiresAt } = req.body;
    const updates = [];
    const values = [];
    let i = 1;

    if (displayName !== undefined) { updates.push(`display_name = $${i++}`); values.push(String(displayName).trim() || null); }
    if (adminNotes !== undefined) { updates.push(`admin_notes = $${i++}`); values.push(adminNotes || null); }
    if (suspended !== undefined) { updates.push(`suspended = $${i++}`); values.push(!!suspended); }
    if (betaExpiresAt !== undefined) {
      const d = betaExpiresAt ? new Date(betaExpiresAt) : null;
      if (betaExpiresAt && isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid expiry date' });
      updates.push(`beta_expires_at = $${i++}`); values.push(d);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(req.params.id); // :id = user id
    const result = await db.query(
      `UPDATE beta_testers SET ${updates.join(', ')} WHERE user_id = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating beta tester:', error);
    res.status(500).json({ error: 'Failed to update beta tester' });
  }
});

// Extend a tester's beta access by N days (admin only). :id = user id.
router.post('/admin/testers/:id/extend', authenticateToken, isAdmin, async (req, res) => {
  try {
    const days = parseInt(req.body.days, 10);
    if (!Number.isFinite(days) || days < 1 || days > 3650) {
      return res.status(400).json({ error: 'Days must be between 1 and 3650' });
    }

    // Extend from the later of (current expiry, now) — also revives expired access
    const result = await db.query(
      `UPDATE beta_testers
       SET beta_expires_at = GREATEST(COALESCE(beta_expires_at, NOW()), NOW()) + ($1 || ' days')::interval
       WHERE user_id = $2
       RETURNING beta_expires_at`,
      [days, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    res.json({ success: true, beta_expires_at: result.rows[0].beta_expires_at });
  } catch (error) {
    console.error('Error extending beta access:', error);
    res.status(500).json({ error: 'Failed to extend beta access' });
  }
});

// Convert beta tester to full user (admin only)
router.post('/admin/testers/:id/convert', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query(
      `UPDATE users SET is_beta_tester = false, account_type = 'user' WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error converting beta tester:', error);
    res.status(500).json({ error: 'Failed to convert beta tester' });
  }
});

// Remove beta tester (admin only) — cascades beta_testers/feedback via user FK
router.delete('/admin/testers/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query(`DELETE FROM users WHERE id = $1`, [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error removing beta tester:', error);
    res.status(500).json({ error: 'Failed to remove beta tester' });
  }
});

// Send a thank-you message to a beta tester (admin only). :id = user id.
router.post('/admin/testers/:id/thank-you', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const tester = await db.query(
      `SELECT id FROM beta_testers WHERE user_id = $1`,
      [req.params.id]
    );
    if (tester.rows.length === 0) {
      return res.status(404).json({ error: 'Beta tester not found' });
    }

    await db.query(
      `INSERT INTO beta_thank_you_messages (beta_tester_id, sent_by, message)
       VALUES ($1, $2, $3)`,
      [tester.rows[0].id, req.user.id, message.trim()]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error sending thank-you message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get a tester's thank-you messages — admin, or the tester themselves (:id = user id)
router.get('/admin/testers/:id/messages', authenticateToken, async (req, res) => {
  try {
    if (!req.user.isAdmin && parseInt(req.params.id, 10) !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await db.query(
      `SELECT m.*, u.username AS sent_by_username
       FROM beta_thank_you_messages m
       JOIN beta_testers bt ON m.beta_tester_id = bt.id
       LEFT JOIN users u ON m.sent_by = u.id
       WHERE bt.user_id = $1
       ORDER BY m.sent_at DESC`,
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching thank-you messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Mark all of the caller's thank-you messages read
router.post('/testers/messages/read', authenticateToken, async (req, res) => {
  try {
    await db.query(
      `UPDATE beta_thank_you_messages m SET is_read = true
       FROM beta_testers bt
       WHERE m.beta_tester_id = bt.id AND bt.user_id = $1`,
      [req.user.id]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking messages read:', error);
    res.status(500).json({ error: 'Failed to update messages' });
  }
});

// ============================================================================
// ANALYTICS (admin)
// ============================================================================
router.get('/admin/stats/overview', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [codes, testers, feedback, locations, growth] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE is_active AND expires_at > NOW() AND current_uses < max_uses) AS active,
                       COALESCE(SUM(current_uses), 0) AS total_uses
                FROM beta_testing_codes`),
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE last_active > NOW() - INTERVAL '7 days') AS active_7d,
                       COUNT(*) FILTER (WHERE suspended = true) AS suspended
                FROM beta_testers`),
      db.query(`SELECT COUNT(*) AS total,
                       COUNT(*) FILTER (WHERE type = 'bug') AS bugs,
                       COUNT(*) FILTER (WHERE type = 'feature') AS features,
                       COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS last_7d
                FROM beta_feedback`),
      db.query(`SELECT country, state, COUNT(*) AS count
                FROM beta_testers
                GROUP BY country, state
                ORDER BY count DESC
                LIMIT 8`),
      db.query(`SELECT COUNT(*) AS new_last_week,
                       (SELECT COUNT(*) FROM beta_testers
                         WHERE registered_at > NOW() - INTERVAL '14 days'
                           AND registered_at <= NOW() - INTERVAL '7 days') AS prev_week
                FROM beta_testers
                WHERE registered_at > NOW() - INTERVAL '7 days'`),
    ]);

    const newWeek = parseInt(growth.rows[0].new_last_week, 10);
    const prevWeek = parseInt(growth.rows[0].prev_week, 10);
    const growthPct = prevWeek > 0
      ? Math.round(((newWeek - prevWeek) / prevWeek) * 100)
      : (newWeek > 0 ? 100 : 0);

    // Flat fields the dashboard reads + the grouped shape for compatibility
    res.json({
      total_testers: parseInt(testers.rows[0].total, 10),
      active_last_week: parseInt(testers.rows[0].active_7d, 10),
      suspended_testers: parseInt(testers.rows[0].suspended, 10),
      total_feedback: parseInt(feedback.rows[0].total, 10),
      feedback_last_week: parseInt(feedback.rows[0].last_7d, 10),
      bug_critical: parseInt(feedback.rows[0].bugs, 10),
      feature_requests: parseInt(feedback.rows[0].features, 10),
      total_codes: parseInt(codes.rows[0].total, 10),
      active_codes: parseInt(codes.rows[0].active, 10),
      total_code_uses: parseInt(codes.rows[0].total_uses, 10),
      growth_pct: growthPct,
      topLocations: locations.rows.map(r => ({
        country: r.country,
        state: r.state,
        count: parseInt(r.count, 10)
      })),
      codes: codes.rows[0],
      testers: testers.rows[0],
      feedback: feedback.rows[0],
    });
  } catch (error) {
    console.error('Error fetching beta stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Real MDL coverage metrics for the analytics dashboard
router.get('/admin/stats/mdl-impact', authenticateToken, isAdmin, async (req, res) => {
  try {
    const [names, prices, aisles, stores, feedback] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM mdl_item_names`).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(`SELECT COUNT(*) AS covered, COUNT(DISTINCT item_name_id) AS items
                FROM mdl_location_prices`).catch(() => ({ rows: [{ covered: 0, items: 0 }] })),
      db.query(`SELECT COUNT(DISTINCT item_name_id) AS covered, COUNT(*) AS reports
                FROM mdl_aisle_reports`).catch(() => ({ rows: [{ covered: 0, reports: 0 }] })),
      db.query(`SELECT COUNT(*) AS total FROM store_locations`).catch(() => ({ rows: [{ total: 0 }] })),
      db.query(`SELECT COUNT(*) AS total FROM beta_feedback`).catch(() => ({ rows: [{ total: 0 }] })),
    ]);

    const itemsTotal = parseInt(names.rows[0].total, 10) || 0;
    const priceItems = parseInt(prices.rows[0].items, 10) || 0;
    const aisleItems = parseInt(aisles.rows[0].covered, 10) || 0;
    const storesTotal = parseInt(stores.rows[0].total, 10) || 0;

    res.json({
      itemsCovered: itemsTotal,
      itemsTotal: Math.max(itemsTotal, 1),
      pricesCovered: priceItems,
      pricesTotal: Math.max(itemsTotal, 1),
      priceAccuracy: itemsTotal > 0 ? Math.round((priceItems / itemsTotal) * 100) : 0,
      aislesCovered: aisleItems,
      aislesTotal: Math.max(itemsTotal, 1),
      aisleAccuracy: itemsTotal > 0 ? Math.round((aisleItems / itemsTotal) * 100) : 0,
      storesCovered: storesTotal,
      storesTotal: Math.max(storesTotal, 1),
      aisleReports: parseInt(aisles.rows[0].reports, 10) || 0,
      pricePoints: parseInt(prices.rows[0].covered, 10) || 0,
      totalFeedback: parseInt(feedback.rows[0].total, 10) || 0
    });
  } catch (error) {
    console.error('Error fetching MDL impact:', error);
    res.status(500).json({ error: 'Failed to fetch MDL impact' });
  }
});

module.exports = router;
