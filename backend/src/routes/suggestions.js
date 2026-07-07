const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

router.get('/smart-suggestions', async (req, res) => {
  try {
    const suggestions = [];

    const recurringItems = await db.query(
      `SELECT i.*, inv.percentage_left, inv.last_purchased, 
       stats.average_days_between_purchases, stats.preferred_quantity, stats.preferred_unit
       FROM items i
       LEFT JOIN inventory inv ON i.id = inv.item_id AND inv.user_id = $1
       LEFT JOIN item_statistics stats ON i.id = stats.item_id AND stats.user_id = $1
       WHERE i.user_id = $1 AND i.is_recurring = true`,
      [req.user.userId]
    );

    for (const item of recurringItems.rows) {
      if (item.last_purchased && item.average_days_between_purchases) {
        const daysSinceLastPurchase = Math.floor(
          (new Date() - new Date(item.last_purchased)) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastPurchase >= item.average_days_between_purchases * 0.8) {
          suggestions.push({
            type: 'recurring',
            item: item.name,
            itemId: item.id,
            reason: `You usually buy this every ${Math.round(item.average_days_between_purchases)} days. Last purchased ${daysSinceLastPurchase} days ago.`,
            quantity: item.preferred_quantity || item.typical_quantity,
            unit: item.preferred_unit || item.typical_unit,
            priority: daysSinceLastPurchase >= item.average_days_between_purchases ? 'high' : 'medium',
          });
        }
      }
    }

    const lowInventory = await db.query(
      `SELECT i.*, inv.percentage_left, inv.current_quantity, inv.unit
       FROM inventory inv
       JOIN items i ON inv.item_id = i.id
       WHERE inv.user_id = $1 AND inv.percentage_left <= 25
       ORDER BY inv.percentage_left ASC`,
      [req.user.userId]
    );

    for (const item of lowInventory.rows) {
      suggestions.push({
        type: 'low_inventory',
        item: item.name,
        itemId: item.id,
        reason: `Only ${item.percentage_left}% remaining (${item.current_quantity} ${item.unit})`,
        quantity: item.typical_quantity,
        unit: item.typical_unit,
        priority: item.percentage_left <= 10 ? 'high' : 'medium',
      });
    }

    const frequentItems = await db.query(
      `SELECT i.*, stats.total_purchases, stats.preferred_quantity, stats.preferred_unit,
       stats.last_purchase_date, stats.average_days_between_purchases
       FROM item_statistics stats
       JOIN items i ON stats.item_id = i.id
       WHERE stats.user_id = $1 
       AND stats.total_purchases >= 3
       AND stats.last_purchase_date < CURRENT_TIMESTAMP - INTERVAL '1 day' * stats.average_days_between_purchases
       ORDER BY stats.total_purchases DESC
       LIMIT 10`,
      [req.user.userId]
    );

    for (const item of frequentItems.rows) {
      const daysSinceLastPurchase = Math.floor(
        (new Date() - new Date(item.last_purchase_date)) / (1000 * 60 * 60 * 24)
      );

      if (!suggestions.find(s => s.itemId === item.id)) {
        suggestions.push({
          type: 'frequent',
          item: item.name,
          itemId: item.id,
          reason: `You've bought this ${item.total_purchases} times. Last purchase was ${daysSinceLastPurchase} days ago.`,
          quantity: item.preferred_quantity,
          unit: item.preferred_unit,
          priority: 'low',
        });
      }
    }

    suggestions.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q || q.length < 2) {
    return res.status(400).json({ error: 'Search query too short' });
  }

  try {
    const result = await db.query(
      `SELECT DISTINCT ON (LOWER(i.name)) i.*, 
       stats.total_purchases, stats.preferred_quantity, stats.preferred_unit,
       i.average_price, i.icon, i.category
       FROM items i
       LEFT JOIN item_statistics stats ON i.id = stats.item_id AND stats.user_id = $1
       WHERE i.user_id = $1 AND LOWER(i.name) LIKE LOWER($2)
       ORDER BY LOWER(i.name), stats.total_purchases DESC NULLS LAST
       LIMIT 10`,
      [req.user.userId, `%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching items:', error);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

// Delete item from user's history
router.delete('/:itemId', async (req, res) => {
  try {
    // Delete from items table (this will cascade to item_statistics)
    const result = await db.query(
      `DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.itemId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted from history' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

module.exports = router;
