/**
 * App-wide error capture — one table (app_error_log, migration 117) fed by
 * the Express error middleware, process hooks, and client reports. Powers
 * the admin "what broke / what caused it" view next to the backup save
 * points. Best-effort: logging must never crash the thing it's logging.
 */

const db = require('../database/db');

const MAX_ROWS = 2000;
let disabled = false; // table missing → stop hammering

const record = async ({ source = 'server', message, stack, path, method, userId, meta }) => {
  if (disabled || !message) return;
  try {
    await db.query(
      `INSERT INTO app_error_log (source, message, stack, path, method, user_id, meta)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [String(source).slice(0, 20), String(message).slice(0, 2000),
       stack ? String(stack).slice(0, 8000) : null,
       path ? String(path).slice(0, 500) : null,
       method ? String(method).slice(0, 10) : null,
       Number.isFinite(userId) ? userId : null,
       meta ? JSON.stringify(meta).slice(0, 4000) : null]
    );
  } catch (e) {
    // If the table doesn't exist yet (pre-migration), disable until restart
    if (/does not exist|undefined/.test(e.message)) disabled = true;
  }
};

// Occasional prune — keeps the log a "recent problems" view, not a landfill
let lastPrune = 0;
const prune = async () => {
  if (Date.now() - lastPrune < 60 * 60 * 1000) return;
  lastPrune = Date.now();
  try {
    await db.query(
      `DELETE FROM app_error_log WHERE id NOT IN
         (SELECT id FROM app_error_log ORDER BY created_at DESC LIMIT $1)`,
      [MAX_ROWS]
    );
  } catch { /* fine */ }
};

const recordRouteError = (err, req) => {
  record({
    source: 'route',
    message: err?.message || 'Internal server error',
    stack: err?.stack,
    path: req?.originalUrl,
    method: req?.method,
    userId: req?.user?.id,
  }).then(prune);
};

const installProcessHooks = () => {
  process.on('unhandledRejection', (reason) => {
    record({
      source: 'process',
      message: `unhandledRejection: ${reason?.message || reason}`,
      stack: reason?.stack,
    });
  });
  process.on('uncaughtException', (err) => {
    record({ source: 'process', message: `uncaughtException: ${err.message}`, stack: err.stack });
  });
};

module.exports = { record, recordRouteError, installProcessHooks };
