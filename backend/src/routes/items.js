const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getItemPreferences, getItemPreference } = require('../services/itemPreferences');
const db = require('../database/db');

const router = express.Router();

router.use(authenticateToken);

// Upsert an item in the user's items dictionary — the "train this item"
// write used by the lab pantry picker and the Lab List. Accepts
// { name, icon, category, price, quantity, unit, storage_location }.
// A trained storage_location is saved as the item's preferred location and
// propagated to any inventory rows for the item, so a fix made in the
// trainer takes effect in Home Inventory immediately.
router.post('/', async (req, res) => {
  try {
    const { name, icon, category, price, quantity, unit, storage_location } = req.body;
    const n = (name || '').trim();
    if (!n) return res.status(400).json({ error: 'name required' });

    const existing = await db.query(
      'SELECT id FROM items WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [req.user.id, n]
    );

    let item;
    if (existing.rows.length) {
      const result = await db.query(`
        UPDATE items SET
          preferred_icon = COALESCE($2, preferred_icon),
          category = COALESCE($3, category),
          average_price = COALESCE($4, average_price),
          preferred_unit = COALESCE($5, preferred_unit),
          preferred_storage_location = COALESCE($6, preferred_storage_location)
        WHERE id = $1
        RETURNING *
      `, [existing.rows[0].id, icon ?? null, category ?? null,
          price != null && price !== '' ? parseFloat(price) : null, unit || null,
          storage_location || null]);
      item = result.rows[0];
    } else {
      const result = await db.query(`
        INSERT INTO items (user_id, name, preferred_icon, category, average_price, preferred_quantity, preferred_unit, preferred_storage_location, purchase_count, last_purchased)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, CURRENT_TIMESTAMP)
        RETURNING *
      `, [req.user.id, n, icon || '📦', category || 'Other',
          price != null && price !== '' ? parseFloat(price) : null,
          quantity ?? null, unit || null, storage_location || null]);
      item = result.rows[0];
    }

    // Trained location applies to existing inventory rows for this item
    if (storage_location && item?.id) {
      try {
        await db.query(
          'UPDATE inventory SET storage_location = $1, last_updated = CURRENT_TIMESTAMP WHERE user_id = $2 AND item_id = $3',
          [storage_location, req.user.id, item.id]
        );
      } catch (locErr) {
        console.error('Error propagating storage location:', locErr);
      }
    }

    res.status(existing.rows.length ? 200 : 201).json(item);
  } catch (error) {
    console.error('Error upserting item:', error);
    res.status(500).json({ error: 'Failed to save item' });
  }
});

// Get all item preferences for the user
router.get('/preferences', async (req, res) => {
  try {
    const { search } = req.query;
    const items = await getItemPreferences(req.user.id, search);
    res.json(items);
  } catch (error) {
    console.error('Error getting item preferences:', error);
    res.status(500).json({ error: 'Failed to get item preferences' });
  }
});

// Get specific item preference
router.get('/preferences/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const item = await getItemPreference(req.user.id, name);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(item);
  } catch (error) {
    console.error('Error getting item preference:', error);
    res.status(500).json({ error: 'Failed to get item preference' });
  }
});

module.exports = router;
