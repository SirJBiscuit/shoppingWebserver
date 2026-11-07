/**
 * MDL Backup Service
 * Daily JSON export of all MDL/training/product tables so learning data
 * is never lost again. Retains the last N backups (default 14).
 *
 * Files land in backend/backups/mdl/ (override with MDL_BACKUP_DIR).
 */

const fs = require('fs');
const path = require('path');
const db = require('../database/db');

const BACKUP_DIR = process.env.MDL_BACKUP_DIR || path.join(__dirname, '../../backups/mdl');
const RETENTION_DAYS = parseInt(process.env.MDL_BACKUP_RETENTION_DAYS || '14', 10);
const DAY_MS = 24 * 60 * 60 * 1000;

const TABLES = [
  'mdl_item_names',
  'mdl_user_item_history',
  'mdl_user_patterns',
  'mdl_location_prices',
  'mdl_location_aisles',
  'mdl_aisle_reports',
  'mdl_category_aisles',
  'mdl_training_queue',
  'mdl_user_preferences',
  'mdl_price_history',
  'product_master_data',
  'user_product_preferences',
  'user_locations',
  'store_locations',
  'user_store_layouts',
  'item_training_submissions'
];

const listBackupFiles = () => {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('mdl-backup-') && f.endsWith('.json'))
    .map(f => {
      const stat = fs.statSync(path.join(BACKUP_DIR, f));
      return { filename: f, size_bytes: stat.size, created_at: stat.mtime };
    })
    .sort((a, b) => b.created_at - a.created_at);
};

const pruneOldBackups = () => {
  const files = listBackupFiles();
  files.slice(RETENTION_DAYS).forEach(f => {
    try { fs.unlinkSync(path.join(BACKUP_DIR, f.filename)); }
    catch (e) { console.warn('MDL backup prune failed:', f.filename, e.message); }
  });
};

/**
 * Export all MDL tables to a single timestamped JSON file.
 * Tables that don't exist yet are recorded as errors, not thrown.
 */
const runBackup = async (createdBy = 'auto') => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const dump = { created_at: new Date().toISOString(), tables: {} };
  const counts = {};

  for (const table of TABLES) {
    try {
      const result = await db.query(`SELECT * FROM ${table}`);
      dump.tables[table] = result.rows;
      counts[table] = result.rows.length;
    } catch (error) {
      dump.tables[table] = { error: error.message };
      counts[table] = -1;
    }
  }

  const filename = `mdl-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(dump));

  // Log in DB too (best-effort)
  try {
    await db.query(
      'INSERT INTO mdl_backup_log (filename, table_counts, created_by) VALUES ($1, $2, $3)',
      [filename, JSON.stringify(counts), createdBy]
    );
  } catch (e) {
    console.warn('MDL backup log insert failed:', e.message);
  }

  pruneOldBackups();
  console.log(`✅ MDL backup complete: ${filename} (${JSON.stringify(counts)})`);
  return { filename, counts };
};

/**
 * Schedule a daily backup. Called once from server startup after migrations.
 */
const startDailyBackup = () => {
  // Run one shortly after boot (30s delay lets migrations finish)
  setTimeout(() => {
    runBackup('auto-boot').catch(e => console.error('MDL boot backup failed:', e.message));
  }, 30 * 1000);

  setInterval(() => {
    runBackup('auto-daily').catch(e => console.error('MDL daily backup failed:', e.message));
  }, DAY_MS).unref();

  console.log(`📦 MDL auto-backup scheduled (daily, keeping last ${RETENTION_DAYS})`);
};

module.exports = { runBackup, startDailyBackup, listBackupFiles };
