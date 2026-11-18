const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

/**
 * /api/pantry — Home Inventory API.
 *
 * This used to read/write the orphan `pantry_inventory` table, which is why
 * Home Inventory showed no icons/categories and never reflected the real
 * inventory. It now sits on the canonical `inventory` + `items` tables (same
 * ones staging put-away, shopping auto-stock, and the labs use) and maps
 * column names to what the frontend expects.
 */
const ITEM_SELECT = `
  SELECT
    i.id,
    i.item_id,
    it.name                                               AS item_name,
    i.current_quantity                                    AS quantity,
    i.unit,
    i.storage_location,
    i.barcode,
    i.image_url,
    COALESCE(i.manual_expiry_date, i.estimated_expiry_date) AS expiry_date,
    COALESCE(it.preferred_icon, c.icon, '📦')             AS item_icon,
    c.id                                                  AS category_id,
    c.name                                                AS category_name,
    c.icon                                                AS category_icon,
    c.sort_order                                          AS category_sort
  FROM inventory i
  JOIN items it ON it.id = i.item_id
  LEFT JOIN categories c ON LOWER(COALESCE(i.category, it.category)) = LOWER(c.name)
`;

// Find an icon + category for a name from the training/metadata tables.
async function guessIconAndCategory(itemName, categoryName) {
  try {
    const pref = await db.query(
      `SELECT preferred_icon, category FROM item_preferences WHERE LOWER(name) = LOWER($1) LIMIT 1`,
      [itemName]
    );
    const meta = await db.query(
      `SELECT im.icon, c.name AS cat_name, c.icon AS cat_icon
         FROM item_metadata im
         LEFT JOIN categories c ON im.category_id = c.id
        WHERE LOWER(im.name) = LOWER($1) OR $1 = ANY(im.aliases)
        LIMIT 1`,
      [itemName]
    );
    const catIcon = categoryName
      ? await db.query(`SELECT icon FROM categories WHERE LOWER(name) = LOWER($1) LIMIT 1`, [categoryName])
      : { rows: [] };
    return {
      icon: pref.rows[0]?.preferred_icon || meta.rows[0]?.icon || catIcon.rows[0]?.icon || '📦',
      category: categoryName || pref.rows[0]?.category || meta.rows[0]?.cat_name || null
    };
  } catch {
    return { icon: '📦', category: categoryName || null };
  }
}

// Resolve a category_id (from PantryModal's <select>) to its display name.
async function categoryNameById(categoryId) {
  if (!categoryId) return null;
  const r = await db.query(`SELECT name FROM categories WHERE id = $1`, [categoryId]);
  return r.rows[0]?.name || null;
}

// Match against the canonical spice library — spices get their own icon,
// a tsp container size as the storage amount, and a rack entry so the
// spice system knows the user owns it.
async function matchSpice(itemName, userId) {
  try {
    const r = await db.query(
      `SELECT s.id, s.icon, COALESCE(r.container_tsp, 12) AS container_tsp
         FROM spices s
         LEFT JOIN user_spice_rack r ON r.spice_id = s.id AND r.user_id = $2
        WHERE LOWER(s.name) = LOWER($1)
        LIMIT 1`,
      [itemName, userId]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

// Feed the MDL system: register the name and record the usage event so
// predictions/suggestions learn from pantry adds. Best-effort — older
// installs may lack the tables/functions.
async function trackMDL(userId, itemName) {
  try {
    const r = await db.query(`SELECT get_or_create_item_name($1) AS id`, [itemName]);
    if (r.rows[0]?.id) {
      await db.query(
        `INSERT INTO mdl_user_item_history (user_id, item_name_id) VALUES ($1, $2)`,
        [userId, r.rows[0].id]
      );
    }
  } catch { /* MDL not installed — ignore */ }
}

// Find-or-create the items row, then upsert an inventory row for it.
async function upsertInventoryItem(userId, { item_name, quantity, unit, barcode, category_id, category_name, image_url, expiry_date, source, storage_location }) {
  const spice = await matchSpice(item_name, userId);
  const catName = category_name || await categoryNameById(category_id)
    || (spice ? 'Condiments & Sauces' : null);
  const { icon, category } = await guessIconAndCategory(item_name, catName);
  const finalIcon = spice?.icon || icon;

  const itemRes = await db.query(
    `INSERT INTO items (user_id, name, category, preferred_icon)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [userId, item_name, category, finalIcon]
  );
  let itemId = itemRes.rows[0]?.id;
  if (!itemId) {
    const found = await db.query(
      `SELECT id FROM items WHERE user_id = $1 AND LOWER(name) = LOWER($2) ORDER BY id LIMIT 1`,
      [userId, item_name]
    );
    itemId = found.rows[0]?.id;
  }
  if (!itemId) throw new Error('could not create item row');

  const invRes = await db.query(
    `INSERT INTO inventory (user_id, item_id, storage_location, current_quantity, unit,
                            barcode, image_url, manual_expiry_date, category)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (user_id, profile_id, item_id) DO UPDATE SET
       current_quantity = COALESCE(EXCLUDED.current_quantity, inventory.current_quantity),
       unit = COALESCE(EXCLUDED.unit, inventory.unit),
       storage_location = COALESCE(EXCLUDED.storage_location, inventory.storage_location),
       manual_expiry_date = COALESCE(EXCLUDED.manual_expiry_date, inventory.manual_expiry_date),
       last_updated = CURRENT_TIMESTAMP
     RETURNING *`,
    [userId, itemId, storage_location || 'pantry',
     quantity ?? spice?.container_tsp ?? 1,
     unit || (spice ? 'tsp' : null),
     barcode || null, image_url || null, expiry_date || null, category]
  );

  // Spice library match → mark it owned in the user's rack + feed MDL
  if (spice) {
    try {
      await db.query(
        `INSERT INTO user_spice_rack (user_id, spice_id)
         VALUES ($1, $2) ON CONFLICT (user_id, spice_id) DO NOTHING`,
        [userId, spice.id]
      );
    } catch { /* spice system not installed — ignore */ }
  }
  await trackMDL(userId, item_name);

  return invRes.rows[0];
}

// Get all pantry items
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      ${ITEM_SELECT}
      WHERE i.user_id = $1
      ORDER BY c.sort_order ASC NULLS LAST, it.name ASC
    `, [req.user.id]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get pantry error:', error);
    res.status(500).json({ error: 'Failed to fetch pantry' });
  }
});

// Add item to pantry
router.post('/', authenticateToken, async (req, res) => {
  try {
    const row = await upsertInventoryItem(req.user.id, req.body);
    const shaped = await db.query(`${ITEM_SELECT} WHERE i.id = $1`, [row.id]);
    res.status(201).json(shaped.rows[0]);
  } catch (error) {
    console.error('Add to pantry error:', error);
    res.status(500).json({ error: 'Failed to add item to pantry' });
  }
});

// Add multiple items (from receipt or barcode scan)
router.post('/bulk', authenticateToken, async (req, res) => {
  try {
    const { items, source } = req.body;

    const addedItems = [];
    for (const item of items) {
      const row = await upsertInventoryItem(req.user.id, { ...item, source: source || 'scan' });
      const shaped = await db.query(`${ITEM_SELECT} WHERE i.id = $1`, [row.id]);
      addedItems.push(shaped.rows[0]);
    }

    res.status(201).json({
      message: `Added ${addedItems.length} items to pantry`,
      items: addedItems
    });
  } catch (error) {
    console.error('Bulk add to pantry error:', error);
    res.status(500).json({ error: 'Failed to add items to pantry' });
  }
});

// Update pantry item
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { quantity, unit, expiry_date, category_id, storage_location } = req.body;
    const catName = await categoryNameById(category_id);

    const result = await db.query(`
      UPDATE inventory
      SET current_quantity   = COALESCE($1, current_quantity),
          unit               = COALESCE($2, unit),
          manual_expiry_date = COALESCE($3, manual_expiry_date),
          category           = COALESCE($4, category),
          storage_location   = COALESCE($5, storage_location),
          last_updated       = CURRENT_TIMESTAMP
      WHERE id = $6 AND user_id = $7
      RETURNING item_id
    `, [quantity, unit, expiry_date, catName, storage_location, req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }

    // Keep the item's category in sync too (drives icons elsewhere)
    if (catName) {
      await db.query(`UPDATE items SET category = $1 WHERE id = $2`, [catName, result.rows[0].item_id]);
    }

    const shaped = await db.query(`${ITEM_SELECT} WHERE i.id = $1`, [req.params.id]);
    res.json(shaped.rows[0]);
  } catch (error) {
    console.error('Update pantry error:', error);
    res.status(500).json({ error: 'Failed to update pantry item' });
  }
});

// Delete pantry item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(
      `DELETE FROM inventory WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pantry item not found' });
    }
    
    res.json({ message: 'Item removed from pantry' });
  } catch (error) {
    console.error('Delete pantry error:', error);
    res.status(500).json({ error: 'Failed to remove item from pantry' });
  }
});

// Get expiring items
router.get('/expiring', authenticateToken, async (req, res) => {
  try {
    const daysAhead = parseInt(req.query.days, 10) || 7;

    const result = await db.query(`
      ${ITEM_SELECT}
      WHERE i.user_id = $1
        AND COALESCE(i.manual_expiry_date, i.estimated_expiry_date) IS NOT NULL
        AND COALESCE(i.manual_expiry_date, i.estimated_expiry_date) <= CURRENT_DATE + ($2 || ' days')::interval
      ORDER BY expiry_date ASC
    `, [req.user.id, daysAhead]);

    res.json(result.rows);
  } catch (error) {
    console.error('Get expiring items error:', error);
    res.status(500).json({ error: 'Failed to fetch expiring items' });
  }
});

module.exports = router;
