require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

/**
 * Tracked migration runner — the single place schema changes get applied.
 *
 * - Auto-scans ../migrations/*.sql: drop a new numbered file in and it runs
 *   on the next boot/deploy — no registration needed.
 * - Every file runs exactly once; applied files are recorded in the
 *   schema_migrations table. This matters because several older files
 *   contain UPDATE statements that would stomp admin choices (feature
 *   toggles) if they re-ran on every boot/deploy.
 * - Called by server.js on startup and by deploy scripts via
 *   `docker exec shop_backend node src/database/runMigrations.js`.
 */

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

// Unnumbered files sort before numbered ones (preserves the old order in
// which 'add_sound_system.sql' ran before the numbered series).
const fileSortKey = (name) => {
  const n = parseInt(name, 10);
  return Number.isNaN(n) ? -1 : n;
};

async function runMigrations({ quiet = false } = {}) {
  const log = (...a) => { if (!quiet) console.log(...a); };

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    log('No migrations directory found, skipping');
    return { applied: 0, skipped: 0, failed: 0 };
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort((a, b) => fileSortKey(a) - fileSortKey(b) || a.localeCompare(b));

  await db.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    file VARCHAR(160) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  const { rows } = await db.query('SELECT file FROM schema_migrations');
  const done = new Set(rows.map((r) => r.file));

  let applied = 0; let skipped = 0; let failed = 0;

  for (const file of files) {
    if (done.has(file)) { skipped += 1; continue; }
    log(`Running migration: ${file}`);
    try {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await db.query(sql);
      await db.query(
        'INSERT INTO schema_migrations (file) VALUES ($1) ON CONFLICT DO NOTHING',
        [file]
      );
      applied += 1;
      log(`  ✓ ${file}`);
    } catch (error) {
      if (error.message && error.message.includes('already exists')) {
        log(`  ℹ ${file}: already applied (${error.message})`);
        try {
          await db.query(
            'INSERT INTO schema_migrations (file) VALUES ($1) ON CONFLICT DO NOTHING',
            [file]
          );
          applied += 1;
        } catch { /* tracking is best-effort */ }
      } else {
        failed += 1;
        console.warn(`  ⚠ ${file} failed: ${error.message}`);
      }
    }
  }

  log(`Migrations: ${applied} applied, ${skipped} already applied, ${failed} failed`);
  return { applied, skipped, failed };
}

module.exports = { runMigrations };

// CLI: `node src/database/runMigrations.js`
if (require.main === module) {
  runMigrations()
    .then(({ failed }) => process.exit(failed ? 1 : 0))
    .catch((e) => { console.error('Migration run failed:', e); process.exit(1); });
}
