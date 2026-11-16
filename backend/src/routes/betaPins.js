const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

const SEVERITIES = [
  'critical', 'problem', 'annoying', 'needs_tweak',
  'minor', 'low_priority', 'weird', 'look'
];
const STATUSES = ['open', 'in_progress', 'fixed', 'hidden', 'removed'];
const PIN_ICONS = ['pin', 'flag', 'bug', 'idea', 'warn', 'question', 'star', 'eye'];
// Pin purpose — 'bug' pins feed the export list; 'note'/'idea' are exempt.
const PIN_KINDS = ['bug', 'note', 'idea'];

// ---------------------------------------------------------------------------
// TESTER SIDE — create + view pins
// ---------------------------------------------------------------------------

/**
 * POST /api/beta/pins
 * Drop a pin on the current page. Any authenticated user may pin; beta
 * testers are the intended authors (admins can pin for marking too).
 * { pagePath, x, y, severity, note, isPrivate?, selector?, offX?, offY?,
 *   elementLabel?, viewport? }
 * isPrivate (admin only): pin is a private admin reminder — testers can't
 * see it. Admins pin problem spots for themselves with the same controls.
 * selector/offX/offY: DOM element the pin was dropped on + offset inside
 * its rect, so the pin tracks the element instead of a page percentage.
 * elementLabel: human-readable description of that element for the export.
 * viewport: 'WxH' screen size at drop time — helps reproduce layout bugs.
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { pagePath, x, y, severity, note, isPrivate, selector, offX, offY,
      elementLabel, viewport, icon, kind } = req.body;
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
    const pinIcon = PIN_ICONS.includes(icon) ? icon : 'pin';
    const pinKind = PIN_KINDS.includes(kind) ? kind : 'bug';

    // Optional element anchor — validated loosely; it's a hint, not a key
    const sel = typeof selector === 'string' && selector.length > 0 && selector.length <= 500
      ? selector : null;
    const ox = Number.isFinite(parseFloat(offX)) ? Math.min(1, Math.max(0, parseFloat(offX))) : null;
    const oy = Number.isFinite(parseFloat(offY)) ? Math.min(1, Math.max(0, parseFloat(offY))) : null;
    const anchor = sel && ox !== null && oy !== null;
    const label = typeof elementLabel === 'string' && elementLabel.length <= 300
      ? elementLabel.trim() : null;
    const vp = typeof viewport === 'string' && /^\d{2,5}x\d{2,5}$/.test(viewport)
      ? viewport : null;

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
        element_selector, offset_x, offset_y, element_label, viewport, icon, kind)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, pagePath, px, py, sev, note.trim(), req.user.isAdmin && isPrivate === true,
       anchor ? sel : null, anchor ? ox : null, anchor ? oy : null,
       anchor ? label : null, vp, pinIcon, pinKind]
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
    const { note, severity, isPrivate, adminNote, icon, kind } = req.body;
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
         icon = COALESCE($6, icon),
         kind = COALESCE($7, kind),
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id,
       note && note.trim() ? note.trim().slice(0, 2000) : null,
       SEVERITIES.includes(severity) ? severity : null,
       req.user.isAdmin && typeof isPrivate === 'boolean' ? isPrivate : null,
       req.user.isAdmin && adminNote ? adminNote.trim().slice(0, 1000) : null,
       // Icon/kind are author-chosen at create — don't gate edits behind
       // isAdmin or a tester's change silently reverts.
       PIN_ICONS.includes(icon) ? icon : null,
       PIN_KINDS.includes(kind) ? kind : null]
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
      `SELECT p.*, u.username,
              u.is_admin AS author_is_admin,
              u.is_beta_tester AS author_is_beta
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
    // resolved_by is INTEGER — a non-integer token id must not 500 the update
    const resolverId = Number.isFinite(Number(req.user.id)) ? Number(req.user.id) : null;
    // Resolved-state passed as a boolean: comparing $2 against string
    // literals inside the CASE would deduce $2 as text and conflict with
    // the column's own type (status is an enum on some DBs).
    const isResolved = ['fixed', 'hidden', 'removed'].includes(status);
    const { rowCount } = await db.query(
      `UPDATE beta_pins SET status = $2,
         admin_note = COALESCE($3, admin_note),
         resolved_by = $4,
         resolved_at = CASE WHEN $5::boolean THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, status, adminNote || null, resolverId, isResolved]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pin not found' });
    res.json({ updated: true });
  } catch (e) {
    console.error('Error setting pin status:', e);
    res.status(500).json({ error: 'Failed to update pin', detail: e.message });
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

    const resolverId = Number.isFinite(Number(req.user.id)) ? Number(req.user.id) : null;
    const { rowCount } = await db.query(
      `UPDATE beta_pins SET status = $2, resolved_by = $3,
         resolved_at = CASE WHEN $2 <> 'open' THEN NOW() ELSE resolved_at END,
         updated_at = NOW()
       WHERE id = ANY($1)`,
      [cleanIds, status, resolverId]
    );
    res.json({ updated: rowCount });
  } catch (e) {
    console.error('Error bulk-updating pins:', e);
    res.status(500).json({ error: 'Failed to update pins', detail: e.message });
  }
});

/**
 * POST /api/beta/pins/admin/:id/move
 * { x, y, selector?, offX?, offY?, elementLabel? } — reposition a pin and
 * re-anchor it to the element under the drop point (same anchor semantics
 * as create).
 */
router.post('/admin/:id/move', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { x, y, selector, offX, offY, elementLabel } = req.body;
    const px = parseFloat(x); const py = parseFloat(y);
    if (!(px >= 0 && px <= 100 && py >= 0 && py <= 100)) {
      return res.status(400).json({ error: 'x/y must be percentages 0-100' });
    }
    const sel = typeof selector === 'string' && selector.length > 0 && selector.length <= 500
      ? selector : null;
    const ox = Number.isFinite(parseFloat(offX)) ? Math.min(1, Math.max(0, parseFloat(offX))) : null;
    const oy = Number.isFinite(parseFloat(offY)) ? Math.min(1, Math.max(0, parseFloat(offY))) : null;
    const anchor = sel && ox !== null && oy !== null;
    const label = typeof elementLabel === 'string' && elementLabel.length <= 300
      ? elementLabel.trim() : null;

    const { rowCount } = await db.query(
      `UPDATE beta_pins SET
         x_pct = $2, y_pct = $3,
         element_selector = $4, offset_x = $5, offset_y = $6,
         element_label = $7,
         updated_at = NOW()
       WHERE id = $1`,
      [req.params.id, px, py, anchor ? sel : null, anchor ? ox : null, anchor ? oy : null,
       anchor ? label : null]
    );
    if (!rowCount) return res.status(404).json({ error: 'Pin not found' });
    res.json({ moved: true });
  } catch (e) {
    console.error('Error moving pin:', e);
    res.status(500).json({ error: 'Failed to move pin', detail: e.message });
  }
});

// Snapshot a pin row into beta_pin_history before destructive actions.
// Best-effort: a history write failure must not block the delete itself.
const snapshotPin = async (pin, event, actorId) => {
  try {
    await db.query(
      `INSERT INTO beta_pin_history (pin_id, event, actor_id, snapshot)
       VALUES ($1, $2, $3, $4)`,
      [pin.id, event, actorId, JSON.stringify(pin)]
    );
  } catch (e) {
    console.error('Pin history snapshot failed:', e.message);
  }
};

/**
 * DELETE /api/beta/pins/admin/:id — really delete a pin (admin).
 * 'Remove' means gone from beta_pins; the row survives as a history
 * snapshot for the pin-history viewer.
 */
router.delete('/admin/:id', authenticateToken, isAdmin, async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM beta_pins WHERE id = $1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'Pin not found' });
    await snapshotPin(q.rows[0], 'deleted', req.user.id);
    await db.query('DELETE FROM beta_pins WHERE id = $1', [req.params.id]);
    res.json({ deleted: true });
  } catch (e) {
    console.error('Error deleting pin:', e);
    res.status(500).json({ error: 'Failed to delete pin', detail: e.message });
  }
});

/**
 * POST /api/beta/pins/admin/bulk-delete
 * { ids: number[] } — snapshot then hard-delete each pin.
 */
router.post('/admin/bulk-delete', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || !ids.length || ids.length > 500) {
      return res.status(400).json({ error: 'ids array required (max 500)' });
    }
    const cleanIds = ids.map(Number).filter(Number.isFinite);
    const { rows } = await db.query(
      'SELECT * FROM beta_pins WHERE id = ANY($1)', [cleanIds]
    );
    for (const pin of rows) await snapshotPin(pin, 'deleted', req.user.id);
    const { rowCount } = await db.query(
      'DELETE FROM beta_pins WHERE id = ANY($1)', [cleanIds]
    );
    res.json({ deleted: rowCount });
  } catch (e) {
    console.error('Error bulk-deleting pins:', e);
    res.status(500).json({ error: 'Failed to delete pins', detail: e.message });
  }
});

/**
 * GET /api/beta/pins/admin/history
 * Deleted/restored pin snapshots for the history viewer (newest first).
 */
router.get('/admin/history', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT h.*, u.username AS actor_name
       FROM beta_pin_history h LEFT JOIN users u ON u.id = h.actor_id
       ORDER BY h.created_at DESC LIMIT 300`
    );
    res.json({ history: rows });
  } catch (e) {
    console.error('Error fetching pin history:', e);
    res.status(500).json({ error: 'Failed to fetch history', detail: e.message });
  }
});

/**
 * POST /api/beta/pins/admin/history/:id/restore
 * Re-create a pin from its deleted snapshot (status 'open', new id).
 */
router.post('/admin/history/:id/restore', authenticateToken, isAdmin, async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM beta_pin_history WHERE id = $1', [req.params.id]);
    if (!q.rows.length) return res.status(404).json({ error: 'History entry not found' });
    const snap = q.rows[0].snapshot;
    const { rows } = await db.query(
      `INSERT INTO beta_pins
         (user_id, page_path, x_pct, y_pct, severity, note, is_private,
          element_selector, offset_x, offset_y, element_label, viewport,
          icon, kind, status, admin_note)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'open',$15)
       RETURNING *`,
      [snap.user_id, snap.page_path, snap.x_pct, snap.y_pct,
       SEVERITIES.includes(snap.severity) ? snap.severity : 'minor',
       snap.note, snap.is_private === true,
       snap.element_selector || null, snap.offset_x ?? null, snap.offset_y ?? null,
       snap.element_label || null, snap.viewport || null,
       PIN_ICONS.includes(snap.icon) ? snap.icon : 'pin',
       PIN_KINDS.includes(snap.kind) ? snap.kind : 'bug',
       snap.admin_note || null]
    );
    // Record against the ORIGINAL pin_id so the history viewer can tell a
    // deleted pin was restored (new row id is inside the snapshot).
    await db.query(
      `INSERT INTO beta_pin_history (pin_id, event, actor_id, snapshot)
       VALUES ($1, 'restored', $2, $3)`,
      [snap.id, req.user.id, JSON.stringify(rows[0])]
    );
    res.json({ pin: rows[0] });
  } catch (e) {
    console.error('Error restoring pin:', e);
    res.status(500).json({ error: 'Failed to restore pin', detail: e.message });
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
       WHERE p.status IN ('open','in_progress') AND p.kind = 'bug'`
    );

    const sevOrder = {
      critical: 0, problem: 1, annoying: 2, needs_tweak: 3,
      minor: 4, low_priority: 5, weird: 6, look: 7
    };
    rows.sort((a, b) =>
      (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9)
      || String(a.page_path).localeCompare(String(b.page_path))
      || new Date(a.created_at) - new Date(b.created_at)
    );

    let md = `# Bug List — ${new Date().toISOString().slice(0, 10)}\n\n`;
    md += `Ordered: critical → problem → annoying → needs_tweak → minor → low_priority → weird → look. Work top-down per page.\n\n`;
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
      md += `\n`;
      // Debug context — which element was pinned, where inside it, screen size
      if (p.element_label) md += `   - element: ${String(p.element_label).replace(/\n+/g, ' ')}\n`;
      if (p.element_selector) {
        const ox = p.offset_x !== null ? Math.round(Number(p.offset_x) * 100) : '?';
        const oy = p.offset_y !== null ? Math.round(Number(p.offset_y) * 100) : '?';
        md += `   - selector: \`${p.element_selector}\` (at ${ox}%, ${oy}%)\n`;
      } else {
        md += `   - position: page-space ${Math.round(Number(p.x_pct))}%, ${Math.round(Number(p.y_pct))}% (no element anchor)\n`;
      }
      if (p.viewport) md += `   - viewport: ${p.viewport}\n`;
      md += `\n`;
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
