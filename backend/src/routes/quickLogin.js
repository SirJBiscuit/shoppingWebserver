const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database/db');
const { authenticateToken, isQuickLoginEligible } = require('../middleware/auth');
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

const PIN_MIN = 8;
const PIN_MAX = 64; // multi-pass swipes over the pad stack into long PINs

/**
 * padOrderFor — deterministic per-account digit arrangement for the swipe pad.
 * Seeded from the user id, so the owner's scattered-ring layout is identical
 * every login (muscle memory) but different for every account — an observer
 * can't lean on standard numpad positions.
 */
const padOrderFor = (uid) => {
  const digest = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`quick-pad:${uid}`)
    .digest();
  let seed = digest.readUInt32BE(0);
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const a = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;

// Seeded default layout — the account's digits on a golden-angle scatter.
const padLayoutFor = (uid) =>
  padOrderFor(uid).map((d, i) => {
    const angle = i * GOLDEN_ANGLE;
    const r = 7 + 29 * Math.sqrt((i + 0.5) / 10);
    return {
      d,
      x: Math.round((50 + r * Math.cos(angle)) * 10) / 10,
      y: Math.round((50 + r * Math.sin(angle)) * 10) / 10,
    };
  });

// A stored layout must be exactly ten unique digits, each with x/y in 0-100%.
const validLayout = (arr) => {
  if (!Array.isArray(arr) || arr.length !== 10) return false;
  const seen = new Set();
  return arr.every((c) => {
    if (
      !c || typeof c.d !== 'string' || c.d.length !== 1 ||
      c.d < '0' || c.d > '9' || seen.has(c.d) ||
      typeof c.x !== 'number' || typeof c.y !== 'number' ||
      c.x < 0 || c.x > 100 || c.y < 0 || c.y > 100
    ) return false;
    seen.add(c.d);
    return true;
  });
};

const parseLayout = (value) => {
  try {
    const arr = JSON.parse(value);
    return validLayout(arr) ? arr : null;
  } catch {
    return null;
  }
};

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

const RESETUP_MSG = 'Sequence data unreadable — save a new sequence in Settings → Quick Login';

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
  const isAdminUser = !!user.is_admin;
  const token = jwt.sign(
    { userId: user.id, username: user.username, isAdmin: isAdminUser },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  return {
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      username: user.username,
      isAdmin: isAdminUser,
      is_admin: isAdminUser,
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

// ---------- quick-login management (admins + beta testers) ----------

router.get('/status', authenticateToken, isQuickLoginEligible, async (req, res) => {
  try {
    const u = await db.query(
      'SELECT quick_seq, quick_locked_until, quick_login_mode, quick_login_reshuffle, quick_pin, quick_pin_pad FROM users WHERE id = $1',
      [req.user.id]
    );
    const row = u.rows[0] || {};
    const codes = await db.query(
      'SELECT COUNT(*)::int AS n FROM quick_login_codes WHERE user_id = $1 AND used_at IS NULL',
      [req.user.id]
    );
    const seq = tryDecryptSeq(row.quick_seq);
    res.json({
      enabled: !!seq || !!row.quick_pin,
      needsReset: !!row.quick_seq && !seq,
      seqLength: seq ? seq.length : 0,
      codesLeft: codes.rows[0]?.n || 0,
      lockedUntil: isLocked(row) ? row.quick_locked_until : null,
      mode: ['partial', 'full', 'pin'].includes(row.quick_login_mode) ? row.quick_login_mode : 'partial',
      reshuffle: row.quick_login_reshuffle !== false,
      pinSet: !!row.quick_pin,
      pinPad: parseLayout(row.quick_pin_pad) || padLayoutFor(req.user.id),
      pinPadCustom: !!parseLayout(row.quick_pin_pad),
    });
  } catch (error) {
    console.error('Quick login status error:', error);
    res.status(500).json({ error: 'Failed to load quick login status' });
  }
});

router.post('/setup', authenticateToken, isQuickLoginEligible, async (req, res) => {
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
      'UPDATE users SET quick_seq = $1, quick_failed = 0, quick_locked_until = NULL WHERE id = $2 AND (is_admin = true OR is_beta_tester = true)',
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

// Challenge prefs: mode 'partial' (few positions, safer in public) or 'full'
// (whole sequence from memory — faster, observer sees it all); reshuffle
// controls whether the grid re-scatters after every tap.
router.post('/mode', authenticateToken, isQuickLoginEligible, async (req, res) => {
  const { mode, reshuffle } = req.body || {};
  if (mode !== undefined && !['partial', 'full', 'pin'].includes(mode)) {
    return res.status(400).json({ error: 'Mode must be partial, full, or pin' });
  }
  if (reshuffle !== undefined && typeof reshuffle !== 'boolean') {
    return res.status(400).json({ error: 'reshuffle must be a boolean' });
  }
  if (mode === undefined && reshuffle === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  try {
    const result = await db.query(
      `UPDATE users SET
         quick_login_mode = COALESCE($1, quick_login_mode),
         quick_login_reshuffle = COALESCE($2, quick_login_reshuffle)
       WHERE id = $3 AND (is_admin = true OR is_beta_tester = true)
       RETURNING quick_login_mode, quick_login_reshuffle`,
      [mode ?? null, reshuffle ?? null, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    const row = result.rows[0];
    res.json({
      mode: ['partial', 'full', 'pin'].includes(row.quick_login_mode) ? row.quick_login_mode : 'partial',
      reshuffle: row.quick_login_reshuffle !== false,
    });
  } catch (error) {
    console.error('Quick login setup error:', error);
    res.status(500).json({ error: 'Failed to save sequence' });
  }
});

// Numeric PIN mode — long digit password stored as bcrypt. Whole-string
// verify means no plaintext is needed, unlike the symbol sequence.
router.post('/pin', authenticateToken, isQuickLoginEligible, async (req, res) => {
  const { pin } = req.body || {};
  if (typeof pin !== 'string' || !/^\d+$/.test(pin) ||
      pin.length < PIN_MIN || pin.length > PIN_MAX) {
    return res.status(400).json({ error: `PIN must be ${PIN_MIN}-${PIN_MAX} digits` });
  }
  try {
    const result = await db.query(
      'UPDATE users SET quick_pin = $1, quick_pin_len = $2 WHERE id = $3 AND (is_admin = true OR is_beta_tester = true)',
      [await bcrypt.hash(pin, 10), pin.length, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    res.json({ message: 'PIN saved' });
  } catch (error) {
    console.error('Quick login pin error:', error);
    res.status(500).json({ error: 'Failed to save PIN' });
  }
});

// POST /pad — save a custom bubble layout ({d,x,y}[] in 0-100% space).
// null layout resets to the seeded default scatter.
router.post('/pad', authenticateToken, isQuickLoginEligible, async (req, res) => {
  const { layout } = req.body || {};
  if (layout != null && !validLayout(layout)) {
    return res.status(400).json({ error: 'Layout must contain all ten digits with 0-100 positions' });
  }
  try {
    const result = await db.query(
      'UPDATE users SET quick_pin_pad = $1 WHERE id = $2 AND (is_admin = true OR is_beta_tester = true)',
      [layout == null ? null : JSON.stringify(layout), req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an eligible account' });
    }
    res.json({
      pad: layout == null ? padLayoutFor(req.user.id) : layout,
      custom: layout != null,
    });
  } catch (error) {
    console.error('Quick login pad error:', error);
    res.status(500).json({ error: 'Failed to save pad layout' });
  }
});

router.delete('/', authenticateToken, isQuickLoginEligible, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET quick_seq = NULL, quick_pin = NULL, quick_pin_len = NULL, quick_pin_pad = NULL, quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
      [req.user.id]
    );
    await db.query('DELETE FROM quick_login_codes WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'Quick login disabled' });
  } catch (error) {
    console.error('Quick login disable error:', error);
    res.status(500).json({ error: 'Failed to disable quick login' });
  }
});

router.post('/codes/generate', authenticateToken, isQuickLoginEligible, async (req, res) => {
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
      'SELECT id, quick_seq, quick_pin, quick_pin_len, quick_pin_pad, quick_locked_until, quick_login_mode, quick_login_reshuffle FROM users WHERE LOWER(username) = LOWER($1) AND (is_admin = true OR is_beta_tester = true)',
      [username.trim()]
    );
    const user = result.rows[0];
    // Same message for unknown user / non-admin — no enumeration.
    if (!user) {
      return res.status(400).json({ error: 'Quick login is not available for this account' });
    }
    if (isLocked(user)) return lockedResponse(res, user);

    const mode = ['partial', 'full', 'pin'].includes(user.quick_login_mode)
      ? user.quick_login_mode
      : 'partial';

    // PIN mode — no symbol grid at all, just a short-lived marker the
    // client pairs with the typed digits on /verify.
    if (mode === 'pin') {
      if (!user.quick_pin) {
        return res.status(400).json({ error: 'PIN not set — create one in Settings → Quick Login' });
      }
      const challengeToken = jwt.sign(
        { t: 'qlp', uid: user.id },
        process.env.JWT_SECRET,
        { expiresIn: CHALLENGE_TTL }
      );
      return res.json({
        challengeToken,
        mode: 'pin',
        pinLen: user.quick_pin_len || PIN_MIN,
        pad: parseLayout(user.quick_pin_pad) || padLayoutFor(user.id),
      });
    }

    if (!user.quick_seq) {
      return res.status(400).json({ error: 'Quick login is not available for this account' });
    }
    const seqLen = tryDecryptSeq(user.quick_seq)?.length;
    if (!seqLen) {
      return res.status(400).json({ error: RESETUP_MSG });
    }
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
    res.json({
      challengeToken,
      grid,
      positions: positions.map((p) => p + 1),
      mode,
      reshuffle: user.quick_login_reshuffle !== false,
    });
  } catch (error) {
    console.error('Quick login challenge error:', error);
    res.status(500).json({ error: 'Failed to start quick login' });
  }
});

router.post('/verify', async (req, res) => {
  const { challengeToken, taps, pin } = req.body || {};
  if (!challengeToken) {
    return res.status(400).json({ error: 'Invalid challenge' });
  }
  let payload;
  try {
    payload = jwt.verify(challengeToken, process.env.JWT_SECRET);
  } catch {
    return res.status(400).json({ error: 'Challenge expired — start again' });
  }

  // PIN mode — swipe-path digits, verified whole against bcrypt.
  if (payload.t === 'qlp') {
    if (typeof pin !== 'string' || !/^\d+$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid PIN' });
    }
    try {
      const result = await db.query(
        'SELECT id, username, is_admin, is_beta_tester, quick_pin, quick_failed, quick_locked_until FROM users WHERE id = $1 AND (is_admin = true OR is_beta_tester = true)',
        [payload.uid]
      );
      const user = result.rows[0];
      if (!user || !user.quick_pin) {
        return res.status(400).json({ error: 'Quick login is not available for this account' });
      }
      if (isLocked(user)) return lockedResponse(res, user);

      if (await bcrypt.compare(pin, user.quick_pin)) {
        await db.query(
          'UPDATE users SET quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
          [user.id]
        );
        return res.json(issueSession(user));
      }
      const locked = await recordFail(user.id, user.quick_failed || 0);
      ipGuard.recordFailure(req.ip, 'failed admin quick-login');
      return res.status(401).json({
        error: locked
          ? `Too many attempts — locked for ${LOCK_MINUTES} minutes`
          : 'Incorrect PIN',
      });
    } catch (error) {
      console.error('Quick login pin verify error:', error);
      return res.status(500).json({ error: 'Verification failed' });
    }
  }

  if (payload.t !== 'qlc' || !Array.isArray(taps)) {
    return res.status(400).json({ error: 'Invalid challenge' });
  }

  try {
    const result = await db.query(
      'SELECT id, username, is_admin, is_beta_tester, quick_seq, quick_failed, quick_locked_until FROM users WHERE id = $1 AND (is_admin = true OR is_beta_tester = true)',
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
      'SELECT id, username, is_admin, is_beta_tester, quick_failed, quick_locked_until FROM users WHERE LOWER(username) = LOWER($1) AND (is_admin = true OR is_beta_tester = true)',
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
