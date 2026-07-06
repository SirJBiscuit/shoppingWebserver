const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT inv.*, i.name as item_name, i.category, i.typical_unit
       FROM inventory inv
       JOIN items i ON inv.item_id = i.id
       WHERE inv.user_id = $1
       ORDER BY inv.percentage_left ASC, i.name`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
});

router.patch('/:itemId',
  body('percentageLeft').optional().isInt({ min: 0, max: 100 }),
  body('currentQuantity').optional().isFloat({ min: 0 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemId } = req.params;
    const { percentageLeft, currentQuantity } = req.body;

    try {
      const updates = [];
      const values = [];
      let paramCount = 1;

      if (percentageLeft !== undefined) {
        updates.push(`percentage_left = $${paramCount++}`);
        values.push(percentageLeft);
      }
      if (currentQuantity !== undefined) {
        updates.push(`current_quantity = $${paramCount++}`);
        values.push(currentQuantity);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'No updates provided' });
      }

      updates.push(`last_updated = CURRENT_TIMESTAMP`);
      values.push(req.user.userId, itemId);

      const result = await db.query(
        `UPDATE inventory
         SET ${updates.join(', ')}
         WHERE user_id = $${paramCount++} AND item_id = $${paramCount++}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Inventory item not found' });
      }

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating inventory:', error);
      res.status(500).json({ error: 'Failed to update inventory' });
    }
  }
);

router.get('/history', async (req, res) => {
  const { itemId, limit = 20 } = req.query;

  try {
    let query;
    let params;

    if (itemId) {
      query = `SELECT ph.*, i.name as item_name, i.category
               FROM purchase_history ph
               LEFT JOIN items i ON ph.item_id = i.id
               WHERE ph.user_id = $1 AND ph.item_id = $2
               ORDER BY ph.purchased_at DESC
               LIMIT $3`;
      params = [req.user.userId, itemId, limit];
    } else {
      query = `SELECT ph.*, i.name as item_name, i.category
               FROM purchase_history ph
               LEFT JOIN items i ON ph.item_id = i.id
               WHERE ph.user_id = $1
               ORDER BY ph.purchased_at DESC
               LIMIT $2`;
      params = [req.user.userId, limit];
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch purchase history' });
  }
});

router.get('/statistics', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT stats.*, i.name as item_name, i.category
       FROM item_statistics stats
       JOIN items i ON stats.item_id = i.id
       WHERE stats.user_id = $1
       ORDER BY stats.total_purchases DESC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
