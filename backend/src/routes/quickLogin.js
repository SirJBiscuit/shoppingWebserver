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

// Nodes are single chars — digits for small pads, letters beyond ten so a
// larger glyph pad still labels cleanly. The stored "PIN" is just the
// sequence of node chars the swipe crossed.
const NODE_IDS = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
const NODE_MIN = 6;   // fewer than 6 nodes makes patterns too guessable
const NODE_MAX = 25;  // beyond ~25 nodes a 280px pad gets too crowded to hit
const DEFAULT_NODE_COUNT = 10;

/**
 * padOrderFor — deterministic per-account node arrangement for the swipe pad.
 * Seeded from the user id, so the owner's scattered-ring layout is identical
 * every login (muscle memory) but different for every account — an observer
 * can't lean on standard numpad positions.
 */
const padOrderFor = (uid, ids = NODE_IDS.slice(0, DEFAULT_NODE_COUNT)) => {
  const digest = crypto
    .createHmac('sha256', process.env.JWT_SECRET)
    .update(`quick-pad:${uid}`)
    .digest();
  let seed = digest.readUInt32BE(0);
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;

// Seeded default layout — the account's nodes on a golden-angle scatter.
const padLayoutFor = (uid, count = DEFAULT_NODE_COUNT) => {
  const n = Math.min(Math.max(count, NODE_MIN), NODE_MAX);
  return padOrderFor(uid, NODE_IDS.slice(0, n)).map((d, i) => {
    const angle = i * GOLDEN_ANGLE;
    const r = 7 + 29 * Math.sqrt((i + 0.5) / n);
    return {
      d,
      x: Math.round((50 + r * Math.cos(angle)) * 10) / 10,
      y: Math.round((50 + r * Math.sin(angle)) * 10) / 10,
    };
  });
};

// Default glyph pad — an N×N lattice (the classic pattern-lock look).
// Short last rows stay centred so the grid reads evenly at any count.
const gridLayoutFor = (count = DEFAULT_NODE_COUNT) => {
  const n = Math.min(Math.max(count, NODE_MIN), NODE_MAX);
  const cols = Math.ceil(Math.sqrt(n));
  const rows = Math.ceil(n / cols);
  const spacing = cols === 1 ? 0 : 72 / (cols - 1);
  return NODE_IDS.slice(0, n).map((d, i) => {
    const row = Math.floor(i / cols);
    const rowNodes = Math.min(cols, n - row * cols);
    const rowWidth = spacing * (rowNodes - 1);
    return {
      d,
      x: Math.round((50 - rowWidth / 2 + spacing * (i % cols)) * 10) / 10,
      y: Math.round((rows === 1 ? 50 : 14 + (72 * row) / (rows - 1)) * 10) / 10,
    };
  });
};

// A stored layout is NODE_MIN..NODE_MAX unique node ids, x/y in 0-100% space.
const validLayout = (arr) => {
  if (!Array.isArray(arr) || arr.length < NODE_MIN || arr.length > NODE_MAX) return false;
  const seen = new Set();
  return arr.every((c) => {
    if (
      !c || typeof c.d !== 'string' || c.d.length !== 1 ||
      !NODE_IDS.includes(c.d) || seen.has(c.d) ||
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
      'SELECT quick_seq, quick_locked_until, quick_login_mode, quick_login_reshuffle, quick_pin, quick_glyph, quick_glyph_len, quick_pin_pad, quick_glyph_pad, quick_pad_mode FROM users WHERE id = $1',
      [req.user.id]
    );
    const row = u.rows[0] || {};
    const codes = await db.query(
      'SELECT COUNT(*)::int AS n FROM quick_login_codes WHERE user_id = $1 AND used_at IS NULL',
      [req.user.id]
    );
    const seq = tryDecryptSeq(row.quick_seq);
    res.json({
      enabled: !!seq || !!row.quick_pin || !!row.quick_glyph,
      needsReset: !!row.quick_seq && !seq,
      seqLength: seq ? seq.length : 0,
      codesLeft: codes.rows[0]?.n || 0,
      lockedUntil: isLocked(row) ? row.quick_locked_until : null,
      mode: ['partial', 'full', 'pin'].includes(row.quick_login_mode) ? row.quick_login_mode : 'partial',
      reshuffle: row.quick_login_reshuffle !== false,
      pinSet: !!row.quick_pin,
      glyphSet: !!row.quick_glyph,
      glyphLen: row.quick_glyph_len || 0,
      pinPad: parseLayout(row.quick_pin_pad) || padLayoutFor(req.user.id),
      pinPadCustom: !!parseLayout(row.quick_pin_pad),
      glyphPad: parseLayout(row.quick_glyph_pad) ||
        gridLayoutFor((parseLayout(row.quick_pin_pad) || []).length || DEFAULT_NODE_COUNT),
      glyphPadCustom: !!parseLayout(row.quick_glyph_pad),
      padMode: row.quick_pad_mode === 'glyph' ? 'glyph' : 'bubble',
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
  const { mode, reshuffle, padMode } = req.body || {};
  if (mode !== undefined && !['partial', 'full', 'pin'].includes(mode)) {
    return res.status(400).json({ error: 'Mode must be partial, full, or pin' });
  }
  if (reshuffle !== undefined && typeof reshuffle !== 'boolean') {
    return res.status(400).json({ error: 'reshuffle must be a boolean' });
  }
  if (padMode !== undefined && !['bubble', 'glyph'].includes(padMode)) {
    return res.status(400).json({ error: 'padMode must be bubble or glyph' });
  }
  if (mode === undefined && reshuffle === undefined && padMode === undefined) {
    return res.status(400).json({ error: 'Nothing to update' });
  }
  try {
    const result = await db.query(
      `UPDATE users SET
         quick_login_mode = COALESCE($1, quick_login_mode),
         quick_login_reshuffle = COALESCE($2, quick_login_reshuffle),
         quick_pad_mode = COALESCE($3, quick_pad_mode)
       WHERE id = $4 AND (is_admin = true OR is_beta_tester = true)
       RETURNING quick_login_mode, quick_login_reshuffle, quick_pad_mode`,
      [mode ?? null, reshuffle ?? null, padMode ?? null, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    const row = result.rows[0];
    res.json({
      mode: ['partial', 'full', 'pin'].includes(row.quick_login_mode) ? row.quick_login_mode : 'partial',
      reshuffle: row.quick_login_reshuffle !== false,
      padMode: row.quick_pad_mode === 'glyph' ? 'glyph' : 'bubble',
    });
  } catch (error) {
    console.error('Quick login setup error:', error);
    res.status(500).json({ error: 'Failed to save sequence' });
  }
});

// Node-sequence secrets — a drawn design stored as bcrypt (whole-string
// verify, no plaintext). Two independent credentials: the bubble PIN on the
// labeled pad (`which:'bubble'`) and the glyph on the anonymous pad
// (`which:'glyph'`). Chars are limited to the target pad's own node ids so
// a saved design is always enterable on that layout.
router.post('/pin', authenticateToken, isQuickLoginEligible, async (req, res) => {
  const { pin, which } = req.body || {};
  if (which !== undefined && !['bubble', 'glyph'].includes(which)) {
    return res.status(400).json({ error: 'which must be bubble or glyph' });
  }
  const isGlyph = which === 'glyph';
  if (typeof pin !== 'string' || !/^[0-9a-z]+$/.test(pin) ||
      pin.length < PIN_MIN || pin.length > PIN_MAX) {
    return res.status(400).json({ error: `Pattern must be ${PIN_MIN}-${PIN_MAX} nodes` });
  }
  try {
    const existing = await db.query(
      'SELECT quick_pin_pad, quick_glyph_pad FROM users WHERE id = $1', [req.user.id]
    );
    const bubblePad = parseLayout(existing.rows[0]?.quick_pin_pad) || padLayoutFor(req.user.id);
    const glyphPad = parseLayout(existing.rows[0]?.quick_glyph_pad) || gridLayoutFor(bubblePad.length);
    const nodeSet = new Set((isGlyph ? glyphPad : bubblePad).map((c) => c.d));
    if (![...pin].every((ch) => nodeSet.has(ch))) {
      return res.status(400).json({ error: 'Pattern uses nodes that are not on that pad' });
    }
    const result = await db.query(
      `UPDATE users SET ${isGlyph ? 'quick_glyph = $1, quick_glyph_len = $2' : 'quick_pin = $1, quick_pin_len = $2'} WHERE id = $3 AND (is_admin = true OR is_beta_tester = true)`,
      [await bcrypt.hash(pin, 10), pin.length, req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an admin account' });
    }
    res.json({ message: isGlyph ? 'Glyph saved' : 'PIN saved' });
  } catch (error) {
    console.error('Quick login pin error:', error);
    res.status(500).json({ error: 'Failed to save PIN' });
  }
});

// POST /pad — save a custom pad layout ({d,x,y}[] in 0-100% space).
// `which` picks the column: 'bubble' (labeled pin pad, seeded-scatter
// default) or 'glyph' (anonymous node pad, N×N grid default). A null
// layout resets that pad to its default.
router.post('/pad', authenticateToken, isQuickLoginEligible, async (req, res) => {
  const { layout, which } = req.body || {};
  if (which !== undefined && !['bubble', 'glyph'].includes(which)) {
    return res.status(400).json({ error: 'which must be bubble or glyph' });
  }
  if (layout != null && !validLayout(layout)) {
    return res.status(400).json({ error: `Layout must contain ${NODE_MIN}-${NODE_MAX} unique nodes with 0-100 positions` });
  }
  const isGlyph = which === 'glyph';
  const column = isGlyph ? 'quick_glyph_pad' : 'quick_pin_pad';
  try {
    const result = await db.query(
      `UPDATE users SET ${column} = $1 WHERE id = $2 AND (is_admin = true OR is_beta_tester = true) RETURNING quick_pin_pad`,
      [layout == null ? null : JSON.stringify(layout), req.user.id]
    );
    if (result.rowCount === 0) {
      return res.status(403).json({ error: 'Quick login requires an eligible account' });
    }
    const bubbleCount = (parseLayout(result.rows[0].quick_pin_pad) || []).length || DEFAULT_NODE_COUNT;
    res.json({
      pad: layout == null
        ? (isGlyph ? gridLayoutFor(bubbleCount) : padLayoutFor(req.user.id))
        : layout,
      custom: layout != null,
      which: isGlyph ? 'glyph' : 'bubble',
    });
  } catch (error) {
    console.error('Quick login pad error:', error);
    res.status(500).json({ error: 'Failed to save pad layout' });
  }
});

router.delete('/', authenticateToken, isQuickLoginEligible, async (req, res) => {
  try {
    await db.query(
      'UPDATE users SET quick_seq = NULL, quick_pin = NULL, quick_pin_len = NULL, quick_glyph = NULL, quick_glyph_len = NULL, quick_pin_pad = NULL, quick_glyph_pad = NULL, quick_pad_mode = \'bubble\', quick_failed = 0, quick_locked_until = NULL WHERE id = $1',
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
      'SELECT id, quick_seq, quick_pin, quick_pin_len, quick_glyph, quick_glyph_len, quick_pin_pad, quick_glyph_pad, quick_pad_mode, quick_locked_until, quick_login_mode, quick_login_reshuffle FROM users WHERE LOWER(username) = LOWER($1) AND (is_admin = true OR is_beta_tester = true)',
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

    // PIN / glyph mode — no symbol grid at all, just a short-lived marker
    // the client pairs with the drawn node sequence on /verify.
    if (mode === 'pin') {
      if (!user.quick_pin && !user.quick_glyph) {
        return res.status(400).json({
          error: 'No swipe pattern on this account — sign in with your password, then set one in Settings → Quick Login',
          needsSetup: true,
        });
      }
      const challengeToken = jwt.sign(
        { t: 'qlp', uid: user.id },
        process.env.JWT_SECRET,
        { expiresIn: CHALLENGE_TTL }
      );
      const bubblePad = parseLayout(user.quick_pin_pad) || padLayoutFor(user.id);
      return res.json({
        challengeToken,
        mode: 'pin',
        pinLen: user.quick_pin_len || 0,
        glyphLen: user.quick_glyph_len || 0,
        hasPin: !!user.quick_pin,
        hasGlyph: !!user.quick_glyph,
        pad: bubblePad,
        glyphPad: parseLayout(user.quick_glyph_pad) || gridLayoutFor(bubblePad.length),
        padMode: user.quick_pad_mode === 'glyph' ? 'glyph' : 'bubble',
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

  // PIN / glyph mode — the drawn node sequence, verified whole against
  // bcrypt. Either stored credential unlocks: the bubble-pad PIN and the
  // glyph-pad glyph are independent secrets.
  if (payload.t === 'qlp') {
    if (typeof pin !== 'string' || !/^[0-9a-z]+$/.test(pin)) {
      return res.status(400).json({ error: 'Invalid pattern' });
    }
    try {
      const result = await db.query(
        'SELECT id, username, is_admin, is_beta_tester, quick_pin, quick_glyph, quick_failed, quick_locked_until FROM users WHERE id = $1 AND (is_admin = true OR is_beta_tester = true)',
        [payload.uid]
      );
      const user = result.rows[0];
      if (!user || (!user.quick_pin && !user.quick_glyph)) {
        return res.status(400).json({ error: 'Quick login is not available for this account' });
      }
      if (isLocked(user)) return lockedResponse(res, user);

      const pinMatch = user.quick_pin ? await bcrypt.compare(pin, user.quick_pin) : false;
      const glyphMatch = !pinMatch && user.quick_glyph
        ? await bcrypt.compare(pin, user.quick_glyph)
        : false;
      if (pinMatch || glyphMatch) {
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
          : 'Incorrect pattern',
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
