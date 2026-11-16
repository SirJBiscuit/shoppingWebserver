/**
 * mdlQuality — data-quality gate for crowd-sourced MDL submissions.
 *
 * Every user-submitted item name/price that would reach the GLOBAL catalog
 * (product_master_data, global autocomplete tier) passes through
 * assessSubmission() first. Verdicts:
 *
 *   'known'   — already in the catalog (or pending); safe to proceed
 *   'accept'  — clean data, seeds the global catalog immediately
 *   'pending' — suspicious; quarantined in mdl_review_queue until a second
 *               distinct user confirms it (auto_confirm) or an admin approves
 *   'reject'  — junk (gibberish/profanity/noise); logged, never seeded
 *   'blocked' — on the admin blocklist; silently dropped
 *
 * Design rules:
 *  - Per-user data (history, patterns) is NOT gated — a user's own list
 *    always works. Only global learning is protected.
 *  - The gate never throws to its caller; a failed assessment defaults to
 *    'pending' so erring is always toward review, never pollution.
 */

const db = require('../database/db');

const CONFIRM_THRESHOLD = 2;   // distinct users needed to self-promote a pending name
const DENY_THRESHOLD = 3;      // distinct denials => auto-reject a pending name

// ── Rate limiting (global side-effects only — per-user tracking stays free) ─
const SEED_CAP_PER_HOUR = 15;      // new names a user may seed per hour
const QUEUE_CAP_PER_HOUR = 30;     // quarantine entries a user may file per hour
const ABUSE_REJECT_LIMIT = 5;      // rejected/blocked rows in 24h => untrusted
const VOTE_CAP_PER_HOUR = 40;      // community votes per user per hour
const HOUR_MS = 60 * 60 * 1000;

const windows = { seed: new Map(), queue: new Map(), vote: new Map() };

const pruneAndCount = (map, key, limit) => {
  const now = Date.now();
  const list = (map.get(key) || []).filter((t) => now - t < HOUR_MS);
  if (list.length >= limit) { map.set(key, list); return false; }
  list.push(now);
  map.set(key, list);
  return true;
};

/**
 * Rate-limit check for GLOBAL side-effects. Per-user history/patterns are
 * never limited — only catalog seeding, queue filing, and voting.
 * @returns {Promise<{seedOk:boolean, queueOk:boolean, voteOk:boolean,
 *   untrusted:boolean}>}
 */
const checkRateLimit = async (userId, isAdmin) => {
  const ok = { seedOk: true, queueOk: true, voteOk: true, untrusted: false };
  if (isAdmin) return ok;
  try {
    const recent = await db.query(
      `SELECT COUNT(*)::int AS c FROM mdl_review_queue
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
         AND status IN ('rejected','blocked')`,
      [userId]
    );
    ok.untrusted = recent.rows[0].c >= ABUSE_REJECT_LIMIT;
  } catch (e) {
    console.warn('Rate-limit abuse check failed:', e.message);
  }
  ok.seedOk = !ok.untrusted && pruneAndCount(windows.seed, userId, SEED_CAP_PER_HOUR);
  ok.queueOk = !ok.untrusted && pruneAndCount(windows.queue, userId, QUEUE_CAP_PER_HOUR);
  ok.voteOk = pruneAndCount(windows.vote, userId, VOTE_CAP_PER_HOUR);
  return ok;
};

// ── Name checks ──────────────────────────────────────────────────────

// Quantity/unit junk that should never be part of an item NAME
// ("1 and 1/4 ground beef", "2lbs chicken", "1 1/2 cups flour")
const QUANTITY_PREFIX = /^[\d\s.,\/]+(?:and\s+[\d\/\s.,]+)?\s*(?:cups?|tbsp?|tsp?|tablespoons?|teaspoons?|lbs?|pounds?|oz|ounces?|kg|g|grams?|ml|l|liters?|gallons?|quarts?|pints?|cans?|bags?|boxes?|packs?|pkg|ct|count|x)?\s*/i;
const LEADING_NUMBER = /^\s*[\d\s.\/,]+(?:and)?\s*[\d\/]*\s*/;

const BAD_WORDS = new Set([
  'fuck', 'shit', 'bitch', 'asshole', 'cunt', 'dick', 'porn', 'sex', 'nude',
  'test123', 'asdf', 'qwerty', 'poop', 'penis', 'vagina', 'boob', 'nigger',
  'faggot', 'whore', 'slut', 'cock', 'pussy', 'xxx'
]);

const normalize = (s) => (s || '')
  .toLowerCase()
  .replace(/[''ʼ]/g, "'")
  .replace(/[^\w\s'&.\/-]/g, '')
  .replace(/\s+/g, ' ')
  .trim();

/**
 * Strip a leading quantity fragment from a typed name.
 * Returns { clean, stripped } — stripped is what was removed ('' if none).
 */
const stripQuantityPrefix = (raw) => {
  const m = raw.match(LEADING_NUMBER);
  if (!m) return { clean: raw, stripped: '' };
  const rest = raw.slice(m[0].length).trim();
  // Only treat as a prefix if real words remain after it
  if (rest.length < 2 || !/[a-zA-Z]{2,}/.test(rest)) {
    return { clean: raw, stripped: '' };
  }
  return { clean: rest, stripped: m[0].trim() };
};

const scoreName = (raw) => {
  const flags = [];
  let score = 100;

  const letters = (raw.match(/[a-zA-Z]/g) || []).length;
  const digits = (raw.match(/\d/g) || []).length;
  const specials = (raw.match(/[^a-zA-Z0-9\s&'().,\/-]/g) || []).length;

  if (!raw || raw.trim().length < 2) { flags.push('too_short'); score -= 80; }
  if (raw.length > 60) { flags.push('long_name'); score -= 40; }
  if (letters === 0) { flags.push('no_letters'); score -= 90; }
  else if (digits > letters * 2 && digits > 4) { flags.push('excessive_digits'); score -= 35; }
  if (specials > 0) { flags.push('special_chars'); score -= Math.min(40, specials * 10); }
  if (/https?:\/\/|www\.|\.com|\.net|@/i.test(raw)) { flags.push('url_or_email'); score -= 70; }
  if (/(.)\1{3,}/.test(raw.toLowerCase())) { flags.push('repeated_chars'); score -= 45; }
  if (/\b(\w+)\s+\1\b/i.test(raw)) { flags.push('repeated_word'); score -= 20; }
  if (raw === raw.toUpperCase() && letters > 4) { flags.push('shouting'); score -= 10; }

  // Gibberish heuristic: 5+ consonant runs or near-zero vowels in a long word
  const words = raw.toLowerCase().split(/\s+/).filter((w) => w.length >= 5 && /^[a-z]+$/.test(w));
  for (const w of words) {
    const vowels = (w.match(/[aeiou]/g) || []).length;
    if (/[bcdfghjklmnpqrstvwxz]{5,}/.test(w) || vowels / w.length < 0.15) {
      flags.push('gibberish'); score -= 40; break;
    }
  }

  const { stripped } = stripQuantityPrefix(raw);
  if (stripped) { flags.push('quantity_prefix'); score -= 25; }

  const norm = normalize(raw);
  const tokens = norm.replace(/[^a-z\s]/g, ' ').split(/\s+/);
  if (tokens.some((tk) => BAD_WORDS.has(tk))) { flags.push('profanity'); score -= 100; }

  return { score: Math.max(0, score), flags, norm };
};

// ── Price checks ─────────────────────────────────────────────────────

const scorePrice = async (price, normName, matchAvg) => {
  const flags = [];
  let score = 0; // deductions only
  const p = price == null || price === '' ? null : parseFloat(price);
  if (p == null || Number.isNaN(p)) return { score, flags, price: null };

  if (p <= 0) { flags.push('price_invalid'); score -= 60; }
  else if (p < 0.05) { flags.push('price_tiny'); score -= 30; }
  else if (p > 10000) { flags.push('price_absurd'); score -= 70; }
  else if (p > 2000) { flags.push('price_extreme'); score -= 35; }

  // Outlier vs the catalog's learned average for this item
  if (p > 0 && matchAvg != null) {
    const avg = parseFloat(matchAvg);
    if (avg > 0 && (p > avg * 4 || p < avg * 0.25)) {
      flags.push('price_outlier'); score -= 35;
    }
  }
  return { score, flags, price: p };
};

// ── Main assessment ──────────────────────────────────────────────────

const findCatalogMatch = async (normName) => {
  if (!normName) return null;
  const exact = await db.query(
    `SELECT id, product_name, average_price FROM product_master_data
     WHERE LOWER(product_name) = $1 LIMIT 1`,
    [normName]
  );
  if (exact.rows.length) return { ...exact.rows[0], exact: true };

  // Loose containment for near-misses ("bananas" vs "banana bunch")
  const loose = await db.query(
    `SELECT id, product_name, average_price FROM product_master_data
     WHERE LOWER(product_name) ILIKE $1 OR $2 ILIKE '%' || LOWER(product_name) || '%'
     ORDER BY LENGTH(product_name) ASC LIMIT 3`,
    [`%${normName}%`, normName]
  );
  return loose.rows.length ? { ...loose.rows[0], exact: false } : null;
};

/**
 * Assess a submission. Never throws.
 * @returns {Promise<{status:string, score:number, flags:string[],
 *   normalizedName:string, cleanName:string, price:number|null,
 *   match:object|null, reason:string}>}
 */
const assessSubmission = async ({ itemName, price, category, icon, isAdmin }) => {
  const raw = (itemName || '').trim();
  try {
    const { score: nameScore, flags, norm } = scoreName(raw);
    const blocked = norm
      ? await db.query('SELECT 1 FROM mdl_blocked_names WHERE normalized_name = $1', [norm])
      : { rows: [] };
    if (blocked.rows.length) {
      return { status: 'blocked', score: 0, flags: ['blocked'], normalizedName: norm, cleanName: raw, price: null, match: null, reason: 'blocked' };
    }

    // Quantity-prefixed junk like "1 and 1/4 ground beef" → assess the
    // stripped remainder; the raw string still flags for review.
    const { clean } = stripQuantityPrefix(raw);
    const assessName = clean !== raw ? clean : raw;
    const { norm: cleanNorm } = scoreName(assessName);

    const match = await findCatalogMatch(cleanNorm || norm);
    const { score: pricePenalty, flags: priceFlags, price: p } =
      await scorePrice(price, cleanNorm || norm, match?.average_price);

    const allFlags = [...flags, ...priceFlags];
    const score = Math.max(0, nameScore + pricePenalty);

    // Admins are curators — they always pass, but flags are still recorded.
    if (isAdmin) {
      return { status: match?.exact ? 'known' : 'accept', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: 'admin' };
    }
    if (flags.includes('profanity') || flags.includes('url_or_email') || score < 25) {
      return { status: 'reject', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: allFlags.join(',') || 'low_score' };
    }
    if (match?.exact) {
      // Known product — only price outliers need review
      if (priceFlags.length) {
        return { status: 'pending', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: priceFlags.join(',') };
      }
      return { status: 'known', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: 'catalog_match' };
    }
    if (score >= 75 && !match) {
      return { status: 'accept', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: 'clean_new' };
    }
    if (match && !match.exact && score >= 75) {
      return { status: 'pending', score, flags: [...allFlags, 'possible_duplicate'], normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: 'possible_duplicate' };
    }
    return { status: 'pending', score, flags: allFlags, normalizedName: cleanNorm || norm, cleanName: assessName, price: p, match, reason: allFlags.join(',') || 'low_score' };
  } catch (e) {
    console.warn('mdlQuality assessment failed — defaulting to pending:', e.message);
    return { status: 'pending', score: 50, flags: ['assessment_error'], normalizedName: normalize(raw), cleanName: raw, price: price || null, match: null, reason: 'assessment_error' };
  }
};

// ── Quarantine write / auto-confirmation ─────────────────────────────

const PROMOTE_SQL = `
  INSERT INTO product_master_data
    (product_name, slug, category, average_price, icon_emoji, times_purchased, last_price_update)
  VALUES ($1, $2, $3, $4, $5, 1, NOW())
  ON CONFLICT (product_name) DO UPDATE SET
    times_purchased = product_master_data.times_purchased + 1,
    category = CASE
      WHEN product_master_data.category IN ('uncategorized', 'Other')
        THEN COALESCE(EXCLUDED.category, product_master_data.category)
        ELSE product_master_data.category END,
    average_price = COALESCE(product_master_data.average_price, EXCLUDED.average_price),
    icon_emoji = COALESCE(product_master_data.icon_emoji, EXCLUDED.icon_emoji),
    last_price_update = NOW()
  RETURNING id`;

const slugify = (n) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 120);

const unflagName = async (normName) => {
  await db.query('UPDATE mdl_item_names SET is_flagged = FALSE WHERE normalized_name = $1', [normName]);
};

/**
 * Upsert a verified name into the global catalog. Gap-fills only — never
 * overwrites a learned average_price, icon, or a real category.
 * Returns the product row id.
 */
const promoteToCatalog = async ({ name, category, price, icon }) => {
  const ins = await db.query(PROMOTE_SQL, [
    name, slugify(name), category || 'Other', price ?? null, icon || null
  ]);
  return ins.rows[0]?.id || null;
};

/**
 * File a submission into the quarantine. If a pending row already exists for
 * the same normalized name, this COUNTS AS A CONFIRMATION from a distinct
 * user — at CONFIRM_THRESHOLD the item self-promotes to the catalog.
 * Returns { promoted:boolean, queueStatus:string }.
 */
const quarantine = async ({ userId, submission, category, icon, quantity, unit, store, source }) => {
  const norm = submission.normalizedName;
  const existing = await db.query(
    `SELECT id, confirmations, confirmed_users FROM mdl_review_queue
     WHERE normalized_name = $1 AND status = 'pending' LIMIT 1`,
    [norm]
  );

  if (existing.rows.length) {
    const row = existing.rows[0];
    const alreadyConfirmed = (row.confirmed_users || []).includes(userId);
    const confirmations = alreadyConfirmed ? row.confirmations : row.confirmations + 1;
    const confirmedUsers = alreadyConfirmed ? row.confirmed_users : [...row.confirmed_users, userId];

    if (confirmations >= CONFIRM_THRESHOLD) {
      const productId = await promoteToCatalog({
        name: submission.cleanName, category, price: submission.price, icon
      });
      await db.query(
        `UPDATE mdl_review_queue SET status='auto_confirmed', confirmations=$2,
           confirmed_users=$3, promoted_product_id=$4, resolved_at=NOW() WHERE id=$1`,
        [row.id, confirmations, confirmedUsers, productId]
      );
      await unflagName(norm);
      return { promoted: true, queueStatus: 'auto_confirmed' };
    }

    await db.query(
      `UPDATE mdl_review_queue SET confirmations=$2, confirmed_users=$3,
         price=COALESCE(price,$4) WHERE id=$1`,
      [row.id, confirmations, confirmedUsers, submission.price]
    );
    return { promoted: false, queueStatus: 'confirming' };
  }

  await db.query(
    `INSERT INTO mdl_review_queue
       (user_id, raw_name, normalized_name, price, store, reason, status,
        category, icon_emoji, quantity, unit, source, quality_score, flags,
        confirmations, confirmed_users)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11,$12,$13,1,$14)`,
    [userId, submission.cleanName, norm, submission.price, store || null,
     submission.reason.slice(0, 50), category || null, icon || null,
     quantity || null, unit || null, source || 'track_item',
     submission.score, JSON.stringify(submission.flags), [userId]]
  );

  // Keep the name out of global autocomplete while it sits in quarantine
  await db.query('UPDATE mdl_item_names SET is_flagged = TRUE WHERE normalized_name = $1', [norm]);
  return { promoted: false, queueStatus: 'pending' };
};

const appendQueueNote = async (queueId, entry) => {
  await db.query(
    `UPDATE mdl_review_queue
     SET notes = COALESCE(notes, '[]'::jsonb) || $2::jsonb
     WHERE id = $1`,
    [queueId, JSON.stringify([entry])]
  );
};

/**
 * Community CONFIRM — advisory, not decisive. Records the vote + optional
 * note so the admin sees crowd sentiment; the item stays pending until an
 * admin approves it (or a second user organically submits the same name,
 * which self-confirms via quarantine()). Returns { status }.
 */
const confirmPending = async (queueId, userId, note = null) => {
  const q = await db.query(
    `SELECT * FROM mdl_review_queue WHERE id = $1 AND status = 'pending'`, [queueId]
  );
  if (!q.rows.length) return { status: 'gone' };
  const row = q.rows[0];
  if ((row.confirmed_users || []).includes(userId)) return { status: 'already_voted' };

  const ops = [];
  const confirmations = (row.confirmations || 1) + 1;
  const confirmedUsers = [...(row.confirmed_users || []), userId];
  // Flip a previous deny into a confirm
  const deniedUsers = (row.denied_users || []).filter((id) => id !== userId);
  const denials = row.denied_users?.includes(userId)
    ? Math.max(0, (row.denials || 0) - 1) : (row.denials || 0);

  ops.push(db.query(
    `UPDATE mdl_review_queue SET confirmations=$2, confirmed_users=$3,
       denials=$4, denied_users=$5 WHERE id=$1`,
    [queueId, confirmations, confirmedUsers, denials, deniedUsers]
  ));
  if (note && note.trim()) {
    ops.push(appendQueueNote(queueId, {
      kind: 'confirm', user_id: userId, note: note.trim().slice(0, 500),
      at: new Date().toISOString()
    }));
  }
  await Promise.all(ops);
  return { status: 'noted', confirmations };
};

/**
 * Community DENY — advisory, not decisive. Records the vote + optional note
 * for the admin; denials never auto-reject (a tester can't bury a valid
 * submission, and crowd votes can't veto). Returns { status }.
 */
const denyPending = async (queueId, userId, note = null) => {
  const q = await db.query(
    `SELECT * FROM mdl_review_queue WHERE id = $1 AND status = 'pending'`, [queueId]
  );
  if (!q.rows.length) return { status: 'gone' };
  const row = q.rows[0];
  if (row.user_id === userId) return { status: 'own_item' };
  if ((row.denied_users || []).includes(userId)) return { status: 'already_voted' };

  const ops = [];
  const denials = (row.denials || 0) + 1;
  const deniedUsers = [...(row.denied_users || []), userId];
  const confirmedUsers = (row.confirmed_users || []).filter((id) => id !== userId);
  const confirmations = row.confirmed_users?.includes(userId)
    ? Math.max(1, (row.confirmations || 1) - 1) : (row.confirmations || 1);

  ops.push(db.query(
    `UPDATE mdl_review_queue SET denials=$2, denied_users=$3,
       confirmations=$4, confirmed_users=$5 WHERE id=$1`,
    [queueId, denials, deniedUsers, confirmations, confirmedUsers]
  ));
  if (note && note.trim()) {
    ops.push(appendQueueNote(queueId, {
      kind: 'deny', user_id: userId, note: note.trim().slice(0, 500),
      at: new Date().toISOString()
    }));
  }
  await Promise.all(ops);
  return { status: 'noted', denials };
};

module.exports = {
  assessSubmission, quarantine, promoteToCatalog, stripQuantityPrefix,
  normalize, checkRateLimit, confirmPending, denyPending,
  CONFIRM_THRESHOLD, DENY_THRESHOLD
};
