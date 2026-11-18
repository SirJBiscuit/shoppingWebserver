const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

/**
 * Instant messaging between admins and beta testers.
 *
 * Rules:
 * - An admin may message any user flagged is_beta_tester.
 * - A beta tester may message any admin (no per-tester assignment — whichever
 *   admin is on the viewer sees and answers).
 * - Threads are (admin, tester) pairs. Regular users get 403.
 *
 * The frontend polls GET /thread/:userId?after=<id> every few seconds — the
 * 'after' param makes refreshes tiny and effectively real-time.
 */

const callerIsTester = async (userId) => {
  const { rows } = await db.query('SELECT is_beta_tester FROM users WHERE id = $1', [userId]);
  return rows[0]?.is_beta_tester === true;
};

// Resolve a chat partner: must be an admin↔tester pairing in either direction.
const resolvePeer = async (callerId, callerIsAdmin, peerId) => {
  const { rows } = await db.query(
    `SELECT id, username, is_admin, is_beta_tester FROM users WHERE id = $1`,
    [peerId]
  );
  if (!rows.length) return { error: 404, msg: 'User not found' };
  const peer = rows[0];
  const ok = callerIsAdmin
    ? peer.is_beta_tester === true
    : peer.is_admin === true && (await callerIsTester(callerId));
  if (!ok) return { error: 403, msg: 'Messages are only between admins and beta testers' };
  return { peer };
};

/**
 * GET /api/beta/messages/peers
 * Who the caller can chat with, with unread counts and the last message.
 * Admins see all beta testers; testers see all admins.
 */
router.get('/peers', authenticateToken, async (req, res) => {
  try {
    let rows;
    if (req.user.isAdmin) {
      ({ rows } = await db.query(
        `SELECT u.id, u.username, bt.display_name, bt.beta_username,
                (SELECT COUNT(*)::int FROM beta_messages m
                  WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL) AS unread,
                (SELECT MAX(m.created_at) FROM beta_messages m
                  WHERE (m.sender_id = u.id AND m.recipient_id = $1)
                     OR (m.sender_id = $1 AND m.recipient_id = u.id)) AS last_at
         FROM users u
         LEFT JOIN beta_testers bt ON bt.user_id = u.id
         WHERE u.is_beta_tester = true
         ORDER BY last_at DESC NULLS LAST, u.username`,
        [req.user.id]
      ));
    } else {
      if (!(await callerIsTester(req.user.id))) {
        return res.status(403).json({ error: 'Beta messaging is for beta testers' });
      }
      ({ rows } = await db.query(
        `SELECT u.id, u.username, NULL AS display_name, NULL AS beta_username,
                (SELECT COUNT(*)::int FROM beta_messages m
                  WHERE m.sender_id = u.id AND m.recipient_id = $1 AND m.read_at IS NULL) AS unread,
                (SELECT MAX(m.created_at) FROM beta_messages m
                  WHERE (m.sender_id = u.id AND m.recipient_id = $1)
                     OR (m.sender_id = $1 AND m.recipient_id = u.id)) AS last_at
         FROM users u
         WHERE u.is_admin = true
         ORDER BY last_at DESC NULLS LAST, u.username`,
        [req.user.id]
      ));
    }
    res.json({ peers: rows });
  } catch (e) {
    console.error('Beta messages peers error:', e);
    res.status(500).json({ error: 'Failed to load conversations' });
  }
});

/**
 * GET /api/beta/messages/thread/:userId?after=<messageId>
 * Message thread between the caller and :userId, oldest first.
 * Pass ?after=N to fetch only newer messages (live poll).
 */
router.get('/thread/:userId', authenticateToken, async (req, res) => {
  try {
    const peerId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(peerId)) return res.status(400).json({ error: 'Invalid user id' });
    const { peer, error, msg } = await resolvePeer(req.user.id, req.user.isAdmin, peerId);
    if (error) return res.status(error).json({ error: msg });

    const after = parseInt(req.query.after, 10);
    const params = [req.user.id, peerId];
    let sql = `
      SELECT m.*, s.username AS sender_username
      FROM beta_messages m
      LEFT JOIN users s ON s.id = m.sender_id
      WHERE (m.sender_id = $1 AND m.recipient_id = $2)
         OR (m.sender_id = $2 AND m.recipient_id = $1)`;
    if (Number.isFinite(after)) {
      params.push(after);
      sql += ` AND m.id > $3`;
    }
    sql += ' ORDER BY m.created_at ASC, m.id ASC LIMIT 300';

    const { rows } = await db.query(sql, params);
    res.json({ messages: rows, peer });
  } catch (e) {
    console.error('Beta messages thread error:', e);
    res.status(500).json({ error: 'Failed to load messages' });
  }
});

/**
 * POST /api/beta/messages
 * { to: <userId>, body: string } — send a message.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { to, body } = req.body;
    const peerId = parseInt(to, 10);
    if (!Number.isFinite(peerId)) return res.status(400).json({ error: 'Recipient required' });
    if (!body || !String(body).trim() || String(body).length > 2000) {
      return res.status(400).json({ error: 'Message required (max 2000 chars)' });
    }
    if (peerId === req.user.id) return res.status(400).json({ error: 'Cannot message yourself' });
    const { error, msg } = await resolvePeer(req.user.id, req.user.isAdmin, peerId);
    if (error) return res.status(error).json({ error: msg });

    const { rows } = await db.query(
      `INSERT INTO beta_messages (sender_id, recipient_id, body)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.user.id, peerId, String(body).trim()]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Beta message send error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * POST /api/beta/messages/read/:userId
 * Mark every message FROM :userId TO the caller as read.
 */
router.post('/read/:userId', authenticateToken, async (req, res) => {
  try {
    const peerId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(peerId)) return res.status(400).json({ error: 'Invalid user id' });
    const { rowCount } = await db.query(
      `UPDATE beta_messages SET read_at = NOW()
       WHERE sender_id = $1 AND recipient_id = $2 AND read_at IS NULL`,
      [peerId, req.user.id]
    );
    res.json({ read: rowCount });
  } catch (e) {
    console.error('Beta messages read error:', e);
    res.status(500).json({ error: 'Failed to mark read' });
  }
});

module.exports = router;
