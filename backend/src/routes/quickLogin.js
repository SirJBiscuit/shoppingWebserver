const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');
const ipGuard = require('../services/ipGuard');

const router = express.Router();

/**
 * Admin quick login — shoulder-surf resistant.
 *
 * Two methods, both server-verified, both under the same brute-force lockout
 * (5 failures -> 15 min):
 *
 * 1. Symbol challenge ("Simon-says"): the admin stores an ordered sequence of
 *    8-12 symbols from a 16-symbol set. Each challenge signs a fresh shuffled
 *    grid + 3 random positions into a short-lived JWT — the server asks for
 *    e.g. positions 2,5,7 only, so an observer learns a fraction of the secret
 *    and the grid layout is useless next attempt.
 *
 * 2. One-time backup codes: bcrypt-hashed, burn on use.
 *
 * Nothing here can mint a token without knowing the secret: verify just
 * re-runs the normal jwt.sign() path after the checks pass.
 */

const SYMBOL_SET = ['🍎','🚀','🌵','🎧','🐙','🍕','⚡','🎲','🌙','🔥','🍇','🎯','🐸','🌈','🍩','⭐'];
const SEQ_MIN = 8;
const SEQ_MAX = 12;
const CHALLENGE_PICKS = 3;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const CHALLENGE_TTL = '2m';
const CODE_COUNT = 10;

const ENC_KEY = crypto
  .createHash('sha256')
  .update(process.env.QUICK_LOGIN_SECRET || process.env.JWT_SECRET || '')
  .digest();

const encryptSeq = (seq) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(seq), 'utf8'), cipher.final()]);
  return `${iv.toString('base64')}.${cipher.getAuthTag().toString('base64')}.${data.toString('base64')}`;
};

const decryptSeq = (blob) => {
  const [iv, tag, data] = blob.split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv, { authTagLength: 16 });
  decipher.setAuthTag(tag);
  const plain = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(plain.toString('utf8'));
};

// Returns the decoded sequence or null when the stored blob is unreadable
// (key rotation, partial/legacy write). Callers treat null like "not set up"
// but tell the admin to re-save instead of erroring the whole request.
const tryDecryptSeq = (blob) => {
  if (!blob) return null;
  try {
    const seq = decryptSeq(blob);
    return Array.isArray(seq) && seq.every((s) => SYMBOL_SET.includes(s)) ? seq : null;
  } catch {
    return null;
  }
};

const RESETUP_MSG = 'Sequence data unreadable — save a new sequence in Admin → Security';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const pickPositions = (len) => {
  const count = Math.min(CHALLENGE_PICKS, len);
  const set = new Set();
  while (set.size < count) set.add(crypto.randomInt(len));
  return [...set].sort((a, b) => a - b);
};

const newCode = () => crypto.randomBytes(4).toString('hex').replace(/(.{4})(.{4})/, '$1-$2');

const issueSession = (user) => {
  const token = jwt.sign(
    { userId: user.id, username: user.username, isAdmin: true },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: true,
      is_admin: true,
      isBetaTester: user.is_beta_tester || false,
    },
  };
};

const isLocked = (row) =>
  row.quick_locked_until && new Date(row.quick_locked_until) > new Date();

const lockedResponse = (res, row) =>
  res.status(429).json({
    error: `Too many attempts — quick login is locked until ${new Date(row.quick_locked_until).toLocaleTimeString()}`,
    lockedUntil: row.quick_locked_until,
  });

const recordFail = async (userId, fails) => {
  const next = fails + 1;
  if (next >= MAX_FAILS) {
    await db.query(
      'UPDATE users SET quick_failed = 0, quick_locked_until = NOW() + ($2 || \' minutes\')::interval WHERE id = $1',
      [userId, String(LOCK_MINUTES)]
    );
    return true;
  }
  await db.query('UPDATE users SET quick_failed = $2 WHERE id = $1', [userId, next]);
  return false;
};

// ---------- admin-only management ----------

router.get('/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const u = await db.query(
      'SELECT quick_seq, quick_locked_until, quick_login_mode FROM users WHERE id = $1',
      [req.user.id]
    );
    const row = u.rows[0] || {};
    const codes = await db.query(
      'SELECT COUNT(*)::int AS n FROM quick_login_codes WHERE user_id = $1 AND used_at IS NULL',
      [req.user.id]
    );
    const seq = tryDecryptSeq(row.quick_seq);
    res.json({
      enabled: !!seq,
      needsReset: !!row.quick_seq && !seq,
      seqLength: seq ? seq.length : 0,
      codesLeft: codes.rows[0]?.n || 0,
      lockedUntil: isLocked(row) ? row.quick_locked_until : null,
      mode: row.quick_login_mode === 'full' ? 'full' : 'partial',
    });
  } catch (error) {
    console.error('Quick login status error:', error);
    res.status(500).json({ error: 'Failed to load quick login status' });
  }
});

router.post('/setup', authenticateToken, isAdmin, async (req, res) => {
  const { sequence } = req.body || {};
  if (!Array.isArray(sequence) ||
      sequence.length < SEQ_MIN || sequence.length > SEQ_MAX ||
      sequence.some((s) => !SYMBOL_SET.includes(s))) {
    return res.status(400).json({
      error: `Sequence must be ${SEQ_MIN}-${SEQ_MAX} symbols from the allowed set`,
    });
  }
  try {
    const result = await db.query(
      'UPDATE users SET quick_seq = $1, quick_failed = 0, quick_locked_until = NULL WHERE id = $2 AND is_admin = true',
      [encryptSeq(sequence), req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    res.json({ message: 'Quick login enabled' });
  } catch (error) {
    console.error('Quick login setup error:', error);
    res.status(500).json({ error: 'Failed to save sequence' });
  }
});

// Challenge mode: 'partial' (few positions, safer in public) or 'full'
// (enter the whole sequence from memory — faster, but an observer sees it all).
router.post('/mode', authenticateToken, isAdmin, async (req, res) => {
  const { mode } = req.body || {};
  if (mode !== 'partial' && mode !== 'full') {
    return res.status(400).json({ error: 'Mode must be partial or full' });
  }
  try {
    const result = await db.query(
      'UPDATE users SET quick_login_mode = $1 WHERE id = $2 AND is_admin = true',
      [mode, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    res.json({ mode });
  } catch (error) {
    console.error('Quick login setup error:', error);
    res.status(500).json({ error: 'Failed to save sequence' });
  }
});

router.delete('/', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET quick_seq = NULL, quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
      [req.user.id]
    );
    await db.query('DELETE FROM quick_login_codes WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Quick login disabled' });
  } catch (error) {
    console.error('Quick login disable error:', error);
    res.status(500).json({ error: 'Failed to disable quick login' });
  }
});

router.post('/codes/generate', authenticateToken, isAdmin, async (req, res) => {
  try {
    const codes = Array.from({ length: CODE_COUNT }, newCode);
    await db.query('DELETE FROM quick_login_codes WHERE user_id = $1', [req.user.id]);
    for (const code of codes) {
      const hash = await bcrypt.hash(code, 10);
      await db.query(
        'INSERT INTO quick_login_codes (user_id, code_hash) VALUES ($1, $2)',
        [req.user.id, hash]
      );
    }
    // Plaintext is returned exactly once — only hashes are stored.
    res.json({ codes });
  } catch (error) {
    console.error('Quick login code generation error:', error);
    res.status(500).json({ error: 'Failed to generate codes' });
  }
});

// ---------- public login flow ----------

router.post('/challenge', async (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') {
    return res.status(400).json({ error: 'Username required' });
  }
  try {
    const result = await db.query(
      'SELECT id, quick_seq, quick_locked_until, quick_login_mode FROM users WHERE LOWER(username) = LOWER($1) AND is_admin = true',
      [username.trim()]
    );
    const user = result.rows[0];
    // Same message for unknown user / non-admin / not set up — no enumeration.
    if (!user || !user.quick_seq) {
      return res.status(400).json({ error: 'Quick login is not available for this account' });
    }
    if (isLocked(user)) return lockedResponse(res, user);

    const seqLen = tryDecryptSeq(user.quick_seq)?.length;
    if (!seqLen) {
      return res.status(400).json({ error: RESETUP_MSG });
    }
    const mode = user.quick_login_mode === 'full' ? 'full' : 'partial';
    // Full mode asks for every position in order — the verify check is
    // identical (pos[i] vs seq[pos[i]]), just with pos = 0..seqLen-1.
    const positions = mode === 'full'
      ? Array.from({ length: seqLen }, (_, i) => i)
      : pickPositions(seqLen);
    const grid = shuffle(SYMBOL_SET);
    const challengeToken = jwt.sign(
      { t: 'qlc', uid: user.id, pos: positions, grid },
      process.env.JWT_SECRET,
      { expiresIn: CHALLENGE_TTL }
    );
    res.json({ challengeToken, grid, positions: positions.map((p) => p + 1), mode });
  } catch (error) {
    console.error('Quick login challenge error:', error);
    res.status(500).json({ error: 'Failed to start quick login' });
  }
});

router.post('/verify', async (req, res) => {
  const { challengeToken, taps } = req.body || {};
  if (!challengeToken || !Array.isArray(taps)) {
    return res.status(400).json({ error: 'Invalid challenge' });
  }
  let payload;
  try {
    payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: 'Challenge expired — start again' });
  }
  if (payload.t !== 'qlc') return res.status(400).json({ error: 'Invalid challenge' });

  try {
    const result = await db.query(
      'SELECT id, username, is_beta_tester, quick_seq, quick_failed, quick_locked_until FROM users WHERE id = $1 AND is_admin = true',
      [payload.uid]
    );
    const user = result.rows[0];
    if (!user || !user.quick_seq) {
      return res.status(400).json({ error: 'Quick login is not available for this account' });
    }
    if (isLocked(user)) return lockedResponse(res, user);

    const seq = tryDecryptSeq(user.quick_seq);
    if (!seq) {
      return res.status(400).json({ error: RESETUP_MSG });
    }
    const { pos, grid } = payload;
    const validShape =
      Array.isArray(pos) && Array.isArray(grid) &&
      taps.length === pos.length &&
      taps.every((i) => Number.isInteger(i) && i >= 0 && i < grid.length);
    const correct = validShape &&
      pos.every((p, i) => p < seq.length && grid[taps[i]] === seq[p]);

    if (correct) {
      await db.query(
        'UPDATE users SET quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
        [user.id]
      );
      return res.json(issueSession(user));
    }

    const locked = await recordFail(user.id, user.quick_failed || 0);
    ipGuard.recordFailure(req.ip, 'failed admin quick-login');
    res.status(401).json({
      error: locked
        ? `Too many attempts — locked for ${LOCK_MINUTES} minutes`
        : 'Incorrect sequence',
    });
  } catch (error) {
    console.error('Quick login verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/code', async (req, res) => {
  const { username, code } = req.body || {};
  if (!username || !code || typeof username !== 'string' || typeof code !== 'string') {
    return res.status(400).json({ error: 'Username and code required' });
  }
  try {
    const result = await db.query(
      'SELECT id, username, is_beta_tester, quick_failed, quick_locked_until FROM users WHERE LOWER(username) = LOWER($1) AND is_admin = true',
      [username.trim()]
    );
    const user = result.rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Quick login is not available for this account' });
    }
    if (isLocked(user)) return lockedResponse(res, user);

    const codes = await db.query(
      'SELECT id, code_hash FROM quick_login_codes WHERE user_id = $1 AND used_at IS NULL',
      [user.id]
    );
    let matched = null;
    for (const row of codes.rows) {
      if (await bcrypt.compare(code.trim(), row.code_hash)) { matched = row; break; }
    }

    if (matched) {
      await db.query('UPDATE quick_login_codes SET used_at = NOW() WHERE id = $1', [matched.id]);
      await db.query(
        'UPDATE users SET quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
        [user.id]
      );
      return res.json(issueSession(user));
    }

    const locked = await recordFail(user.id, user.quick_failed || 0);
    ipGuard.recordFailure(req.ip, 'failed admin backup-code');
    res.status(401).json({
      error: locked
        ? `Too many attempts — locked for ${LOCK_MINUTES} minutes`
        : 'Invalid code',
    });
  } catch (error) {
    console.error('Quick login code error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

module.exports = router;
