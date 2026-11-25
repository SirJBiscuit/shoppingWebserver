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

// ============================================================================
// CHATROOM — one shared room for admins + beta testers.
// Testers need beta_testers.can_chat (admins always can). Admins see
// beta_username/display_name; testers only ever see plain usernames.
// ============================================================================

const roomGate = async (userId, isAdmin) => {
  if (isAdmin) return { allowed: true, canChat: true };
  const { rows } = await db.query(
    `SELECT u.is_beta_tester,
            COALESCE(bt.can_chat, TRUE) AS can_chat,
            COALESCE(bt.suspended, FALSE) AS suspended
     FROM users u LEFT JOIN beta_testers bt ON bt.user_id = u.id
     WHERE u.id = $1`,
    [userId]
  );
  const r = rows[0];
  if (!r?.is_beta_tester) return { allowed: false, msg: 'The beta chatroom is for beta testers' };
  if (r.suspended) return { allowed: false, msg: 'Suspended testers cannot use the chatroom' };
  return { allowed: true, canChat: r.can_chat === true };
};

// GET /api/beta/messages/room?after=<id> — room history, oldest first.
router.get('/room', authenticateToken, async (req, res) => {
  try {
    const gate = await roomGate(req.user.id, req.user.isAdmin);
    if (!gate.allowed) return res.status(403).json({ error: gate.msg });

    const after = parseInt(req.query.after, 10);
    const params = [];
    let sql = `SELECT m.id, m.body, m.created_at, m.sender_id,
                      s.username AS sender_username, s.is_admin AS sender_is_admin,
                      bt.beta_username, bt.display_name
               FROM beta_chatroom_messages m
               LEFT JOIN users s ON s.id = m.sender_id
               LEFT JOIN beta_testers bt ON bt.user_id = m.sender_id
               WHERE m.deleted_at IS NULL`;
    if (Number.isFinite(after)) {
      params.push(after);
      sql += ` AND m.id > $${params.length}`;
    }
    sql += ' ORDER BY m.id ASC LIMIT 300';
    const { rows } = await db.query(sql, params);

    if (!req.user.isAdmin) {
      rows.forEach((m) => { delete m.beta_username; delete m.display_name; });
    }
    res.json({ messages: rows, canChat: gate.canChat });
  } catch (e) {
    console.error('Beta chatroom fetch error:', e);
    res.status(500).json({ error: 'Failed to load chatroom' });
  }
});

// POST /api/beta/messages/room { body } — post to the room.
router.post('/room', authenticateToken, async (req, res) => {
  try {
    const gate = await roomGate(req.user.id, req.user.isAdmin);
    if (!gate.allowed) return res.status(403).json({ error: gate.msg });
    if (!gate.canChat) {
      return res.status(403).json({ error: 'Chat access has been disabled for your account' });
    }
    const body = String(req.body?.body || '').trim();
    if (!body || body.length > 2000) {
      return res.status(400).json({ error: 'Message required (max 2000 chars)' });
    }
    const { rows } = await db.query(
      'INSERT INTO beta_chatroom_messages (sender_id, body) VALUES ($1, $2) RETURNING *',
      [req.user.id, body]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Beta chatroom send error:', e);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// DELETE /api/beta/messages/room/:id — soft-delete. Sender may remove their
// own; admins may remove anyone's (moderation).
router.delete('/room/:id', authenticateToken, async (req, res) => {
  try {
    const mid = parseInt(req.params.id, 10);
    if (!Number.isFinite(mid)) return res.status(400).json({ error: 'Invalid message id' });
    const { rows } = await db.query(
      'SELECT sender_id FROM beta_chatroom_messages WHERE id = $1 AND deleted_at IS NULL',
      [mid]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });
    if (!req.user.isAdmin && rows[0].sender_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only remove your own messages' });
    }
    await db.query(
      'UPDATE beta_chatroom_messages SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1',
      [mid, req.user.id]
    );
    res.json({ deleted: true });
  } catch (e) {
    console.error('Beta chatroom delete error:', e);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
