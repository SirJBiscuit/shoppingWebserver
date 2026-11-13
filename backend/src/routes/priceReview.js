const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ---------------------------------------------------------------------------
// Price-learn review queue
//
// /api/mdl/track-item queues submissions it can't handle cleanly (weird names,
// absurd prices). Admins approve — optionally with a corrected name, which is
// what the learning system keeps — or reject them out of the data.
// ---------------------------------------------------------------------------

// GET /api/price-review/queue?status=pending|approved|rejected
router.get('/queue', authenticateToken, isAdmin, async (req, res) => {
  try {
    const status = ['pending', 'approved', 'rejected'].includes(req.query.status)
      ? req.query.status : 'pending';
    const result = await db.query(
      `SELECT q.*, u.username
       FROM mdl_review_queue q
       LEFT JOIN users u ON q.user_id = u.id
       WHERE q.status = $1
       ORDER BY q.created_at DESC
       LIMIT 200`,
      [status]
    );

    const counts = await db.query(
      `SELECT status, COUNT(*) AS n FROM mdl_review_queue GROUP BY status`
    );

    res.json({
      items: result.rows,
      counts: Object.fromEntries(counts.rows.map((r) => [r.status, parseInt(r.n, 10)])),
    });
  } catch (error) {
    console.error('Error loading review queue:', error);
    res.status(500).json({ error: 'Failed to load review queue' });
  }
});

// POST /api/price-review/:id/approve  { correctedName? }
// Approve learns the (possibly corrected) name into the product catalog.
router.post('/:id/approve', authenticateToken, isAdmin, async (req, res) => {
  try {
    const { correctedName } = req.body;
    const q = await db.query('SELECT * FROM mdl_review_queue WHERE id = $1', [req.params.id]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const item = q.rows[0];

    const finalName = (correctedName || item.corrected_name || item.raw_name).trim();
    if (!finalName) return res.status(400).json({ error: 'A name is required to approve' });

    await db.query(
      `UPDATE mdl_review_queue
       SET status = 'approved', corrected_name = $1, resolved_by = $2, resolved_at = NOW()
       WHERE id = $3`,
      [finalName, req.user.id, item.id]
    );

    // Learn the clean name into the shared product catalog (same pipeline
    // track-item uses) so future autofill/predictions see the good spelling.
    try {
      const slug = finalName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      await db.query(
        `INSERT INTO product_master_data
           (product_name, slug, category, average_price, times_purchased, last_price_update)
         VALUES ($1, $2, 'uncategorized', $3, 1, NOW())
         ON CONFLICT (product_name) DO UPDATE SET
           times_purchased = product_master_data.times_purchased + 1,
           average_price = COALESCE(product_master_data.average_price, EXCLUDED.average_price),
           last_price_update = NOW()`,
        [finalName, slug, item.price]
      );
    } catch (e) {
      console.warn('Approve: catalog upsert skipped —', e.message);
    }

    res.json({ success: true, learnedName: finalName });
  } catch (error) {
    console.error('Error approving review item:', error);
    res.status(500).json({ error: 'Failed to approve item' });
  }
});

// POST /api/price-review/:id/reject
router.post('/:id/reject', authenticateToken, isAdmin, async (req, res) => {
  try {
    const q = await db.query('SELECT * FROM mdl_review_queue WHERE id = $1', [req.params.id]);
    if (q.rows.length === 0) return res.status(404).json({ error: 'Not found' });

    await db.query(
      `UPDATE mdl_review_queue SET status = 'rejected', resolved_by = $1, resolved_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.id]
    );

    // Push the bad name out of the shared catalog if it leaked in
    try {
      await db.query('DELETE FROM product_master_data WHERE product_name = $1', [q.rows[0].raw_name]);
    } catch (e) {
      console.warn('Reject: catalog cleanup skipped —', e.message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error rejecting review item:', error);
    res.status(500).json({ error: 'Failed to reject item' });
  }
});

module.exports = router;
