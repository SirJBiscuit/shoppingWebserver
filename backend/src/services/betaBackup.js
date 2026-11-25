/**
 * Beta program backup service
 * JSON export of beta tester accounts + all beta program data so tester
 * accounts/data are never lost. Supports manual saves (admin route) and
 * an interval scheduler configured via the beta_backup_settings row.
 *
 * Files land in backend/backups/beta/ unless the settings row (or
 * BETA_BACKUP_DIR env) points elsewhere.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const db = require('../database/db');

// Snapshots are gzip'd on disk — a full-DB JSON dump compresses ~10x,
// so writes, reads and storage stay cheap. Downloads are decompressed
// on the fly so admins still get plain .json files.
const gzip = (buf) => zlib.gzipSync(buf, { level: 6 });
const gunzip = (buf) => zlib.gunzipSync(buf);

const DEFAULT_DIR = process.env.BETA_BACKUP_DIR || path.join(__dirname, '../../backups/beta');
const TICK_MS = 60 * 1000; // check the schedule once a minute

// Auth/session rows are never restored — a point-in-time account restore
// must not resurrect old sessions or lockouts. These tables are also
// skipped when dumping (volatile, regenerable) so snapshots stay small.
const RESTORE_SKIP_TABLES = /session|token|jwt|refresh|login_attempt|ip_ban|schema_migrations/i;

// Self-restore extras — these carry admin-controlled privilege state
// (feature grants, BTCS fields) and must never be user-writable through
// an uploaded file. beta_testers is admin-owned state too.
const SELF_SKIP_TABLES = /feature_overrides|feature_flags|^beta_testers$/;

// Every public table that carries user-owned rows — discovered live so
// new tables are automatically covered by snapshots and restores.
const discoverUserTables = async (client = db) => {
  const r = await client.query(
    `SELECT DISTINCT table_name FROM information_schema.columns
     WHERE table_schema = 'public' AND column_name = 'user_id'`
  );
  return r.rows.map((row) => row.table_name).filter((t) => /^[a-z_][a-z0-9_]*$/.test(t));
};

const listPublicTables = async () => {
  const r = await db.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
     ORDER BY table_name`
  );
  return r.rows.map((row) => row.table_name);
};

const getSettings = async () => {
  try {
    const r = await db.query('SELECT * FROM beta_backup_settings WHERE id = TRUE');
    return r.rows[0] || { enabled: false, interval_minutes: 1440, directory: null, keep: 20 };
  } catch {
    return { enabled: false, interval_minutes: 1440, directory: null, keep: 20 };
  }
};

const backupDir = (settings) => (settings?.directory || DEFAULT_DIR);

const listBackups = async () => {
  const dir = backupDir(await getSettings());
  if (!fs.existsSync(dir)) return { dir, files: [] };
  const files = fs.readdirSync(dir)
    .filter((f) => f.startsWith('beta-backup-') && (f.endsWith('.json') || f.endsWith('.json.gz')))
    .map((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return { filename: f, size_bytes: stat.size, created_at: stat.mtime };
    })
    .sort((a, b) => b.created_at - a.created_at);
  return { dir, files };
};

const resolveBackupPath = async (filename) => {
  // basename-only — no directory traversal via the download/delete routes
  const safe = path.basename(filename || '');
  if (!/^beta-backup-[\w.-]+\.json(\.gz)?$/.test(safe)) return null;
  return path.join(backupDir(await getSettings()), safe);
};

const buildBackup = async ({ userId = null } = {}) => {
  const dump = {
    version: 2,
    exported_at: new Date().toISOString(),
    scope: userId != null ? 'user' : 'full',
    tables: {},
  };

  let tables = [];
  try { tables = await listPublicTables(); } catch (e) {
    dump.tables._error = { error: e.message };
    return dump;
  }
  tables = tables.filter((t) => !RESTORE_SKIP_TABLES.test(t));

  if (userId != null) {
    // Per-user save point — instant even at scale: only this account's
    // rows in users + every user-scoped table. The restore path treats
    // it exactly like a full dump filtered to that user.
    const userTables = await discoverUserTables();
    for (const t of tables) {
      if (t === 'users') {
        try {
          const r = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
          dump.tables.users = r.rows;
        } catch (e) { dump.tables.users = { error: e.message }; }
        continue;
      }
      if (!userTables.includes(t)) continue; // shared tables don't belong to one user
      try {
        const r = await db.query(`SELECT * FROM "${t}" WHERE user_id = $1`, [userId]);
        dump.tables[t] = r.rows;
      } catch (e) { dump.tables[t] = { error: e.message }; }
    }
    return dump;
  }

  // FULL — every public table, every row. Parallel reads (8 at a time) —
  // the dump is I/O-bound and a serial crawl is the slow part.
  const CONCURRENCY = 8;
  for (let i = 0; i < tables.length; i += CONCURRENCY) {
    const batch = tables.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map((t) => db.query(`SELECT * FROM "${t}"`).then(
        (r) => [t, r.rows],
        (e) => [t, { error: e.message }]
      ))
    );
    for (const [t, rows] of results) dump.tables[t] = rows;
  }
  return dump;
};

const runBackup = async (createdBy = 'auto', { userId = null } = {}) => {
  const settings = await getSettings();
  const dir = backupDir(settings);
  fs.mkdirSync(dir, { recursive: true });

  const dump = await buildBackup({ userId });
  // Random suffix — two saves in the same millisecond must not overwrite
  const scope = userId != null ? `user-${userId}-` : '';
  const filename = `beta-backup-${scope}${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 7)}.json.gz`;
  const payload = gzip(Buffer.from(JSON.stringify(dump)));
  const sha256 = require('crypto').createHash('sha256').update(payload).digest('hex');
  fs.writeFileSync(path.join(dir, filename), payload);

  const counts = Object.fromEntries(
    Object.entries(dump.tables).map(([k, v]) => [k, Array.isArray(v) ? v.length : -1])
  );
  try {
    await db.query(
      'INSERT INTO beta_backup_log (filename, table_counts, created_by, sha256) VALUES ($1, $2, $3, $4)',
      [filename, JSON.stringify(counts), createdBy, sha256]
    );
    await db.query('UPDATE beta_backup_settings SET last_run_at = NOW() WHERE id = TRUE');
  } catch (e) {
    console.warn('Beta backup log write failed:', e.message);
  }

  // Retention — keep the newest N
  const keep = Math.max(1, settings.keep || 20);
  const { files } = await listBackups();
  files.slice(keep).forEach((f) => {
    try { fs.unlinkSync(path.join(dir, f.filename)); }
    catch (e) { console.warn('Beta backup prune failed:', f.filename, e.message); }
  });

  console.log(`📦 Beta backup complete: ${filename}`);
  return { filename, counts, dir, sha256 };
};

/**
 * Interval scheduler — reads the settings row every minute; when enabled
 * and interval_minutes has elapsed since last_run_at, runs a backup.
 */
const startScheduler = () => {
  const tick = async () => {
    const s = await getSettings();
    if (!s.enabled) return;
    const interval = Math.max(15, s.interval_minutes || 1440) * 60 * 1000;
    const last = s.last_run_at ? new Date(s.last_run_at).getTime() : 0;
    if (Date.now() - last < interval) return;
    try {
      await runBackup('auto-interval');
    } catch (e) {
      console.error('Beta auto-backup failed:', e.message);
    }
  };
  setTimeout(tick, 45 * 1000); // first check shortly after boot
  setInterval(tick, TICK_MS).unref();
  console.log('📦 Beta auto-backup scheduler started (checks every minute)');
};

/**
 * Read + parse a server snapshot file back into a dump object.
 */
const readBackupFile = async (filename) => {
  const p = await resolveBackupPath(filename);
  if (!p || !fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p);
    const buf = p.endsWith('.gz') ? gunzip(raw) : raw;
    return JSON.parse(buf.toString('utf8'));
  } catch {
    return null;
  }
};

const IDENT = /^[a-z_][a-z0-9_]*$/i;

// One restore at a time — concurrent restores would interleave
// delete/reinsert passes across the same tables.
let restoreLock = Promise.resolve();
const withRestoreLock = (fn) => {
  const run = restoreLock.then(fn, fn);
  restoreLock = run.catch(() => {});
  return run;
};

/**
 * Restore a dump (v2 {tables:{…}} or v1 {testers, feature_overrides}).
 *
 * Per-user semantics are TRUE point-in-time: for the user(s) in scope we
 * delete their current rows in every user_id-scoped table and reinsert
 * exactly what the snapshot held — lists, items, pantry, prefs,
 * customizations, recipes, pins, all of it. Non-user tables are restored
 * additively (missing rows reinserted, nothing deleted) on full restores.
 * Auth/session-shaped tables are always skipped. One transaction.
 */
const restoreDump = (dump, adminId, opts) => withRestoreLock(() => restoreDumpInner(dump, adminId, opts));

const restoreDumpInner = async (dump, adminId, { onlyUserId = null, selfService = false } = {}) => {
  const tbl = dump?.tables || {};
  const allUsers = Array.isArray(tbl.users) ? tbl.users : [];
  // v1 fallback payloads
  const v1Testers = Array.isArray(tbl.beta_testers) ? tbl.beta_testers
    : (Array.isArray(dump?.testers) ? dump.testers : []);
  const v1Overrides = Array.isArray(tbl.beta_tester_feature_overrides) ? tbl.beta_tester_feature_overrides
    : (Array.isArray(dump?.feature_overrides) ? dump.feature_overrides : []);

  const users = onlyUserId != null ? allUsers.filter((u) => u.id === onlyUserId) : allUsers;
  const hasV2Data = users.length > 0;

  const client = await db.pool.connect();
  let usersRestored = 0, userRows = 0, sharedRows = 0, restored = 0, skipped = 0;
  const touchedTables = new Set();

  // Batched multi-row INSERT — group rows by column signature, then send
  // 100 rows per statement instead of one round-trip per row.
  const insertRows = async (table, rows) => {
    const groups = new Map(); // column-signature → {cols, rows[]}
    for (const row of rows.slice(0, 50000)) {
      const cols = Object.keys(row).filter((c) => IDENT.test(c));
      if (!cols.length) continue;
      const sig = cols.join(',');
      (groups.get(sig) || groups.set(sig, { cols, rows: [] }).get(sig)).rows.push(row);
    }
    let n = 0;
    for (const { cols, rows: batch } of groups.values()) {
      const colList = cols.map((c) => `"${c}"`).join(', ');
      for (let i = 0; i < batch.length; i += 100) {
        const chunk = batch.slice(i, i + 100);
        const values = [];
        const placeholders = chunk.map((row) => {
          const ph = cols.map((c) => {
            values.push(row[c]);
            return `$${values.length}`;
          });
          return `(${ph.join(', ')})`;
        });
        await client.query(
          `INSERT INTO "${table}" (${colList}) VALUES ${placeholders.join(', ')}
           ON CONFLICT DO NOTHING`,
          values
        );
        n += chunk.length;
      }
    }
    return n;
  };

  try {
    await client.query('BEGIN');
    // Best-effort FK suspension for this transaction (needs superuser;
    // if it fails, deletes still run — user tables rarely cross-reference
    // other users' rows).
    try { await client.query(`SET LOCAL session_replication_role = 'replica'`); } catch { /* not superuser */ }

    const userTables = await discoverUserTables(client);
    // Skip tables the dump references but the live schema doesn't have
    // (renamed/dropped since the snapshot) — a phantom insert would kill
    // the whole transaction.
    const liveTables = new Set((await client.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
    )).rows.map((r) => r.table_name));

    const restoreAccount = async (u) => {
      // Self-service restores never touch the account row — a tampered
      // file must not be able to grant is_admin/is_beta_tester/tier or
      // swap in a chosen password_hash. Data tables restore fully.
      if (selfService) {
        usersRestored++;
      } else {
      // Account row first — child rows need it to exist.
      await client.query(
        `INSERT INTO users (id, username, email, password_hash, display_name,
           is_beta_tester, is_admin, is_guest, account_type,
           subscription_tier, subscription_status, created_at, last_login_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
                 COALESCE($12, NOW()), $13)
         ON CONFLICT (id) DO UPDATE SET
           username = EXCLUDED.username,
           email = EXCLUDED.email,
           password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
           display_name = EXCLUDED.display_name,
           is_beta_tester = COALESCE(EXCLUDED.is_beta_tester, users.is_beta_tester),
           is_admin = COALESCE(EXCLUDED.is_admin, users.is_admin),
           is_guest = COALESCE(EXCLUDED.is_guest, users.is_guest),
           account_type = COALESCE(EXCLUDED.account_type, users.account_type),
           subscription_tier = COALESCE(EXCLUDED.subscription_tier, users.subscription_tier),
           subscription_status = COALESCE(EXCLUDED.subscription_status, users.subscription_status)`,
        [u.id, u.username, u.email || null, u.password_hash || null,
         u.display_name || null, u.is_beta_tester ?? null, u.is_admin ?? null,
         u.is_guest ?? null, u.account_type || null, u.subscription_tier || null,
         u.subscription_status || null, u.created_at || null, u.last_login_at || null]
      );
      usersRestored++;
      }

      // Roll their data back to the snapshot: wipe current rows, replay
      // exactly what existed at backup time.
      for (const t of userTables) {
        if (RESTORE_SKIP_TABLES.test(t) || !liveTables.has(t) || !Array.isArray(tbl[t])) continue;
        if (selfService && SELF_SKIP_TABLES.test(t)) continue;
        const snapRows = tbl[t].filter((r) => r.user_id === u.id);
        await client.query(`DELETE FROM "${t}" WHERE user_id = $1`, [u.id]);
        userRows += await insertRows(t, snapRows);
        touchedTables.add(t);
      }
    };

    for (const u of users.slice(0, 20000)) {
      if (!u.id || !u.username) continue;
      await restoreAccount(u);
    }

    // v1 dumps have no tables map — replay tester + override rows directly.
    if (!hasV2Data) {
      const testers = onlyUserId != null ? v1Testers.filter((t) => t.user_id === onlyUserId) : v1Testers;
      const overrides = onlyUserId != null ? v1Overrides.filter((o) => o.user_id === onlyUserId) : v1Overrides;
      for (const t of testers.slice(0, 5000)) {
        const exists = await client.query('SELECT 1 FROM users WHERE id = $1', [t.user_id]);
        if (!exists.rows.length) { skipped++; continue; }
        await client.query(
          `INSERT INTO beta_testers (user_id, display_name, beta_username, admin_notes,
             suspended, beta_expires_at, pin_limit, score_bonus, can_chat, registered_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, COALESCE($10, NOW()))
           ON CONFLICT (user_id) DO UPDATE SET
             display_name = EXCLUDED.display_name, beta_username = EXCLUDED.beta_username,
             admin_notes = EXCLUDED.admin_notes, suspended = EXCLUDED.suspended,
             beta_expires_at = EXCLUDED.beta_expires_at, pin_limit = EXCLUDED.pin_limit,
             score_bonus = EXCLUDED.score_bonus, can_chat = EXCLUDED.can_chat`,
          [t.user_id, t.display_name || null, t.beta_username || null, t.admin_notes || null,
           !!t.suspended, t.beta_expires_at || null, t.pin_limit ?? null,
           parseInt(t.score_bonus, 10) || 0, t.can_chat !== false, t.registered_at || null]
        );
        restored++;
      }
      for (const o of overrides.slice(0, 5000)) {
        if (!o.user_id || !/^[\w.-]{1,100}$/.test(o.feature_key || '')) continue;
        await client.query(
          `INSERT INTO beta_tester_feature_overrides (user_id, feature_key, allowed, granted_by, reason, updated_at)
           VALUES ($1,$2,$3,$4,$5, NOW())
           ON CONFLICT (user_id, feature_key) DO UPDATE SET allowed = EXCLUDED.allowed`,
          [o.user_id, o.feature_key, o.allowed === true, adminId, o.reason || 'restored from backup']
        );
      }
    }

    // Full restore only: shared (non-user) tables get missing rows back —
    // additive, never deletes anything created after the snapshot.
    if (onlyUserId == null && hasV2Data) {
      for (const [t, rows] of Object.entries(tbl)) {
        if (!Array.isArray(rows) || RESTORE_SKIP_TABLES.test(t) || !liveTables.has(t)) continue;
        if (t === 'users' || userTables.includes(t) || !IDENT.test(t)) continue;
        sharedRows += await insertRows(t, rows);
        touchedTables.add(t);
      }
    }

    // Admin self-preservation — a restore must never leave the system
    // with zero admins, and the admin performing it keeps their flag no
    // matter what an old snapshot says.
    try {
      await client.query('UPDATE users SET is_admin = TRUE WHERE id = $1', [adminId]);
      const admins = await client.query('SELECT COUNT(*)::int AS n FROM users WHERE is_admin = TRUE');
      if (!admins.rows[0].n) {
        await client.query(
          `UPDATE users SET is_admin = TRUE WHERE id = (
             SELECT id FROM users ORDER BY created_at ASC LIMIT 1)`
        );
      }
    } catch { /* guard failed — transaction still commits */ }

    // Repair sequences after explicit-id inserts so new rows don't collide.
    for (const t of touchedTables) {
      try {
        await client.query(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'),
                         GREATEST(COALESCE((SELECT MAX(id) FROM "${t}"), 0), 1))`
        );
      } catch { /* no serial pk on this table */ }
    }

    await client.query('COMMIT');
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch { /* already rolled back */ }
    throw e;
  } finally {
    client.release();
  }
  return { restored, skipped, usersRestored, userRows, sharedRows };
};

/**
 * Diff a snapshot against the live DB. With userId, compares only that
 * user's rows per user-scoped table. Returns per-table counts plus
 * added/removed row ids — "what changed since this save point".
 */
const diffSnapshot = async (dump, { userId = null } = {}) => {
  const tbl = dump?.tables || {};
  const userTables = await discoverUserTables();
  const out = [];
  for (const [t, rows] of Object.entries(tbl)) {
    if (!Array.isArray(rows) || !IDENT.test(t)) continue;
    if (userId != null && !userTables.includes(t) && t !== 'users') continue;
    const snap = userId != null && t !== 'users'
      ? rows.filter((r) => r.user_id === userId)
      : (t === 'users' && userId != null ? rows.filter((r) => r.id === userId) : rows);
    let live = [];
    try {
      const q = userId != null && t !== 'users'
        ? await db.query(`SELECT * FROM "${t}" WHERE user_id = $1`, [userId])
        : (t === 'users' && userId != null
          ? await db.query('SELECT * FROM users WHERE id = $1', [userId])
          : await db.query(`SELECT * FROM "${t}"`));
      live = q.rows;
    } catch {
      out.push({ table: t, error: 'table missing live' });
      continue;
    }
    const snapIds = new Set(snap.map((r) => r.id).filter((v) => v != null));
    const liveIds = new Set(live.map((r) => r.id).filter((v) => v != null));
    const added = live.filter((r) => r.id != null && !snapIds.has(r.id)).length;
    const removed = snap.filter((r) => r.id != null && !liveIds.has(r.id)).length;
    const changed = live.filter((r) => snapIds.has(r.id)
      && JSON.stringify(snap.find((s) => s.id === r.id)) !== JSON.stringify(r)).length;
    if (added || removed || changed) {
      out.push({ table: t, snapshot_rows: snap.length, live_rows: live.length, added, removed, changed });
    }
  }
  return out.sort((a, b) => (b.added + b.removed + b.changed) - (a.added + a.removed + a.changed));
};

module.exports = { buildBackup, runBackup, listBackups, resolveBackupPath, getSettings, startScheduler, readBackupFile, restoreDump, diffSnapshot };
