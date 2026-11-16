const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const SEVERITIES = ['critical', 'annoying', 'minor', 'weird'];
const STATUSES = ['open', 'in_progress', 'fixed', 'hidden', 'removed'];

// ---------------------------------------------------------------------------
// TESTER SIDE — create + view pins
// ---------------------------------------------------------------------------

/**
 * POST /api/beta/pins
 * Drop a pin on the current page. Any authenticated user may pin; beta
 * testers are the intended authors (admins can pin for marking too).
 * { pagePath, x, y, severity, note, isPrivate?, selector?, offX?, offY? }
 * isPrivate (admin only): pin is a private admin reminder — testers can't
 * see it. Admins pin problem spots for themselves with the same controls.
 * selector/offX/offY: DOM element the pin was dropped on + offset inside
 * its rect, so the pin tracks the element instead of a page percentage.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pagePath, x, y, severity, note, isPrivate, selector, offX, offY } = req.body;
    if (!pagePath || typeof pagePath !== 'string' || pagePath.length > 255) {
      return res.status(400).json({ error: 'pagePath required' });
    }
    const px = parseFloat(x); const py = parseFloat(y);
    if (!(px >= 0 && px <= 100 && py >= 0 && py <= 100)) {
      return res.status(400).json({ error: 'x/y must be percentages 0-100' });
    }
    if (!note || !note.trim() || note.length > 2000) {
      return res.status(400).json({ error: 'Note required (max 2000 chars)' });
    }
    const sev = SEVERITIES.includes(severity) ? severity : 'minor';

    // Optional element anchor — validated loosely; it's a hint, not a key
    const sel = typeof selector === 'string' && selector.length > 0 && selector.length <= 500
      ? selector : null;
    const ox = Number.isFinite(parseFloat(offX)) ? Math.min(1, Math.max(0, parseFloat(offX))) : null;
    const oy = Number.isFinite(parseFloat(offY)) ? Math.min(1, Math.max(0, parseFloat(offY))) : null;
    const anchor = sel && ox !== null && oy !== null;

    // Light flood protection: 30 open pins per user per page max
    const open = await db.query(
      `SELECT COUNT(*)::int AS c FROM beta_pins
       WHERE user_id = $1 AND page_path = $2 AND status = 'open'`,
      [req.user.id, pagePath]
    );
    if (open.rows[0].c >= 30 && !req.user.isAdmin) {
      return res.status(429).json({ error: 'Pin limit on this page — wait for admin triage' });
    }

    const { rows } = await db.query(
      `INSERT INTO beta_pins (user_id, page_path, x_pct, y_pct, severity, note, is_private,
        element_selector, offset_x, offset_y)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [req.user.id, pagePath, px, py, sev, note.trim(), req.user.isAdmin && isPrivate === true,
       anchor ? sel : null, anchor ? ox : null, anchor ? oy : null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error('Error creating pin:', e);
    res.status(500).json({ error: 'Failed to create pin' });
  }
});

/**
 * GET /api/beta/pins?page=/pantry
 * Pins for a page. Everyone sees open/in_progress/fixed pins; 'hidden' and
 * 'removed' are admin-only. The caller's own pins are always returned.
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = req.query.page || '/';
    const mineOnly = req.query.mine === '1';
    const clauses = ['p.page_path = $1'];
    const params = [page];

    if (!req.user.isAdmin) {
      // Non-admins see live pins + their own (even if hidden by admin);
      // private admin pins are never visible to testers
      clauses.push(`p.is_private = FALSE`);
      clauses.push(`(p.status IN ('open','in_progress','fixed') OR p.user_id = $2)`);
      params.push(req.user.id);
    } else if (req.query.status && STATUSES.includes(req.query.status)) {
      clauses.push(`p.status = $${params.length + 1}`);
      params.push(req.query.status);
    }
    if (mineOnly) {
      clauses.push(`p.user_id = $${params.length + 1}`);
      params.push(req.user.id);
    }

    const { rows } = await db.query(
      `SELECT p.*, u.username
       FROM beta_pins p LEFT JOIN users u ON u.id = p.user_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT 200`,
      params
    );
    res.json({ pins: rows });
  } catch (e) {
    console.error('Error fetching pins:', e);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

/**
 * PATCH /api/beta/pins/:id
 * Author may edit note/severity while the pin is still open.
 */
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { note, severity, isPrivate, adminNote } = req.body;
    const q = await db.query('SELECT * FROM beta_pins WHERE id = $1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Pin not found' });
    const pin = q.rows[0];
    if (pin.user_id !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Not your pin' });
    }
    if (pin.status !== 'open' && !req.user.isAdmin) {
      return res.status(400).json({ error: 'Pin already triaged — edits locked' });
    }
    await db.query(
      `UPDATE beta_pins SET
         note = COALESCE($2, note),
         severity = COALESCE($3, severity),
         is_private = CASE WHEN $4::boolean IS NULL THEN is_private ELSE $4 END,
         admin_note = COALESCE($5, admin_note),
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id,
       note && note.trim() ? note.trim().slice(0, 2000) : null,
       SEVERITIES.includes(severity) ? severity : null,
       req.user.isAdmin && typeof isPrivate === 'boolean' ? isPrivate : null,
       req.user.isAdmin && adminNote ? adminNote.trim().slice(0, 1000) : null]
    );
    res.json({ updated: true });
  } catch (e) {
    console.error('Error updating pin:', e);
    res.status(500).json({ error: 'Failed to update pin' });
  }
});

// ---------------------------------------------------------------------------
// ADMIN SIDE — triage, bulk controls, cross-page view
// ---------------------------------------------------------------------------

/**
 * GET /api/beta/pins/admin/all?status=open&page=/pantry
 * Every pin with author, for the admin viewer panel.
 */
router.get('/admin/all', authenticateToken, isAdmin, async (req, res) => {
  try {
    const clauses = ['1=1'];
    const params = [];
    if (req.query.status && STATUSES.includes(req.query.status)) {
      params.push(req.query.status);
      clauses.push(`p.status = $${params.length}`);
    }
    if (req.query.page) {
      params.push(req.query.page);
      clauses.push(`p.page_path = $${params.length}`);
    }
    const { rows } = await db.query(
      `SELECT p.*, u.username
       FROM beta_pins p LEFT JOIN users u ON u.id = p.user_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.created_at DESC
       LIMIT 500`,
      params
    );
    const counts = await db.query(
      `SELECT page_path, COUNT(*)::int AS c FROM beta_pins
       WHERE status IN ('open','in_progress') GROUP BY page_path ORDER BY c DESC`
    );
    res.json({ pins: rows, byPage: counts.rows });
  } catch (e) {
    console.error('Error fetching admin pins:', e);
    res.status(500).json({ error: 'Failed to fetch pins' });
  }
});

/**
 * POST /api/beta/pins/admin/:id/status
 * { status, adminNote? } — triage a pin.
 */
router.post('/admin/:id/status', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const { rowCount } = await db.query(
      `UPDATE beta_pins SET status = $2,
         admin_note = COALESCE($3, admin_note),
         resolved_by = $4,
         resolved_at = CASE WHEN $2 IN ('fixed','hidden','removed') THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, status, adminNote || null, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pin not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error setting pin status:', e);
    res.status(500).json({ error: 'Failed to update pin' });
  }
});

/**
 * POST /api/beta/pins/admin/bulk
 * { ids: number[], action: 'hide'|'remove'|'fixed'|'open' } — mass triage.
 */
router.post('/admin/bulk', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ids, action } = req.body;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500) {
      return res.status(400).json({ error: 'ids array required (max 500)' });
    }
    const map = { hide: 'hidden', remove: 'removed', fixed: 'fixed', open: 'open', in_progress: 'in_progress' };
    const cleanIds = ids.map(Number).filter(Number.isFinite);

    // 'private'/'unprivate' flip is_private instead of status
    if (action === 'private' || action === 'unprivate') {
      const { rowCount } = await db.query(
        `UPDATE beta_pins SET is_private = $2, updated_at = NOW() WHERE id = ANY($1)`,
        [cleanIds, action === 'private']
      );
      return res.json({ updated: rowCount });
    }

    const status = map[action];
    if (!status) return res.status(400).json({ error: 'action: hide|remove|fixed|open|private|unprivate' });

    const { rowCount } = await db.query(
      `UPDATE beta_pins SET status = $2, resolved_by = $3,
         resolved_at = CASE WHEN $2 <> 'open' THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
       WHERE id = ANY($1)`,
      [cleanIds, status, req.user.id]
    );
    res.json({ updated: rowCount });
  } catch (e) {
    console.error('Error bulk-updating pins:', e);
    res.status(500).json({ error: 'Failed to update pins' });
  }
});

/**
 * POST /api/beta/pins/admin/:id/move
 * { x, y, selector?, offX?, offY? } — reposition a pin and re-anchor it to
 * the element under the drop point (same anchor semantics as create).
 */
router.post('/admin/:id/move', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { x, y, selector, offX, offY } = req.body;
    const px = parseFloat(x); const py = parseFloat(y);
    if (!(px >= 0 && px <= 100 && py >= 0 && py <= 100)) {
      return res.status(400).json({ error: 'x/y must be percentages 0-100' });
    }
    const sel = typeof selector === 'string' && selector.length > 0 && selector.length <= 500
      ? selector : null;
    const ox = Number.isFinite(parseFloat(offX)) ? Math.min(1, Math.max(0, parseFloat(offX))) : null;
    const oy = Number.isFinite(parseFloat(offY)) ? Math.min(1, Math.max(0, parseFloat(offY))) : null;
    const anchor = sel && ox !== null && oy !== null;

    const { rowCount } = await db.query(
      `UPDATE beta_pins SET
         x_pct = $2, y_pct = $3,
         element_selector = $4, offset_x = $5, offset_y = $6,
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, px, py, anchor ? sel : null, anchor ? ox : null, anchor ? oy : null]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pin not found' });
    res.json({ moved: true });
  } catch (e) {
    console.error('Error moving pin:', e);
    res.status(500).json({ error: 'Failed to move pin' });
  }
});

/**
 * GET /api/beta/pins/admin/export
 * Ordered markdown bug list of live pins (open + in_progress).
 * Order: critical → annoying → minor → weird, grouped by page.
 * Private admin pins are included and flagged.
 */
router.get('/admin/export', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT p.*, u.username
       FROM beta_pins p LEFT JOIN users u ON u.id = p.user_id
       WHERE p.status IN ('open','in_progress')`
    );

    const sevOrder = { critical: 0, annoying: 1, minor: 2, weird: 3 };
    rows.sort((a, b) =>
      (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
      || String(a.page_path).localeCompare(String(b.page_path))
      || new Date(a.created_at) - new Date(b.created_at)
    );

    let md = `# Bug List — ${new Date().toISOString().slice(0, 10)}\n\n`;
    md += `Ordered: critical → annoying → minor → weird. Work top-down per page.\n\n`;
    let page = null;
    let n = 0;
    for (const p of rows) {
      if (p.page_path !== page) {
        page = p.page_path;
        md += `\n## ${page === '/' ? 'Dashboard (/)' : page}\n\n`;
      }
      n++;
      md += `${n}. **[${p.severity.toUpperCase()}]** ${String(p.note).replace(/\n+/g, ' ')}${p.is_private ? ' 🔒' : ''}\n`;
      md += `   - ${p.username || 'unknown'} · ${p.status} · ${new Date(p.created_at).toISOString().slice(0, 10)}`;
      if (p.admin_note) md += ` · admin: ${String(p.admin_note).replace(/\n+/g, ' ')}`;
      md += `\n\n`;
    }
    if (!rows.length) md += '_No open pins._\n';

    res.json({ markdown: md, count: rows.length });
  } catch (e) {
    console.error('Error exporting pins:', e);
    res.status(500).json({ error: 'Failed to export pins' });
  }
});

/**
 * DELETE /api/beta/pins/admin/:id
 * Hard-delete a pin (bulk 'remove' normally suffices — this is for abuse).
 */
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    await db.query('DELETE FROM beta_pins WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('Error deleting pin:', e);
    res.status(500).json({ error: 'Failed to delete pin' });
  }
});

module.exports = router;
