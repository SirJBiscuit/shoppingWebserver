const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { updateItemPreferences } = require('../services/itemPreferences');
const { recordItemCheckOff, getPersonalizedSortOrder } = require('../services/sortingLearning');

const router = express.Router();

// Auto-determine storage location based on item name and category
function determineStorageLocation(itemName, category) {
  const name = (itemName || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // Freezer items
  const freezerKeywords = ['frozen', 'ice cream', 'popsicle', 'ice', 'freezer'];
  const freezerCategories = ['frozen', 'ice cream'];

  // Fridge items
  const fridgeKeywords = ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'fresh', 'meat', 'chicken', 'beef', 'fish', 'juice', 'soda'];
  const fridgeCategories = ['dairy', 'produce', 'fruits', 'vegetables', 'meat', 'deli', 'seafood', 'beverages'];

  // Check freezer
  if (freezerCategories.includes(cat) || freezerKeywords.some(k => name.includes(k))) {
    return 'freezer';
  }

  // Check fridge
  if (fridgeCategories.includes(cat) || fridgeKeywords.some(k => name.includes(k))) {
    return 'fridge';
  }

  // Default to pantry
  return 'pantry';
}

router.use(authenticateToken);

router.get('/lists', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sl.*, COUNT(sli.id) as item_count, 
       COALESCE(SUM(sli.price * sli.quantity), 0) as total_cost
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
       WHERE sl.user_id = $1 AND (sl.status = 'active' OR sl.status IS NULL)
       GROUP BY sl.id
       ORDER BY sl.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching lists:', error);
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
  }
});

// Get completed/archived shopping lists
router.get('/lists/history/completed', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sl.*, COUNT(sli.id) as item_count, 
       COALESCE(SUM(sli.price * sli.quantity), 0) as total_cost
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
       WHERE sl.user_id = $1 AND sl.status = 'completed'
       GROUP BY sl.id
       ORDER BY sl.completed_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching completed lists:', error);
    res.status(500).json({ error: 'Failed to fetch completed lists' });
  }
});

// Restore a completed list (create new list with same items)
router.post('/lists/:id/restore', async (req, res) => {
  try {
    const oldListId = req.params.id;
    
    // Get the old list details
    const oldListResult = await db.query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [oldListId, req.user.userId]
    );
    
    if (oldListResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }
    
    const oldList = oldListResult.rows[0];
    
    // Create new list with same name
    const newListResult = await db.query(
      `INSERT INTO shopping_lists (user_id, name, status)
       VALUES ($1, $2, 'active')
       RETURNING *`,
      [req.user.userId, `${oldList.name} (Restored)`]
    );
    
    const newList = newListResult.rows[0];
    
    // Copy all items from old list to new list
    await db.query(
      `INSERT INTO shopping_list_items (
        shopping_list_id, item_name, quantity, unit, price, 
        category, item_icon, notes, is_checked
      )
      SELECT $1, item_name, quantity, unit, price, 
        category, item_icon, notes, false
      FROM shopping_list_items
      WHERE shopping_list_id = $2`,
      [newList.id, oldListId]
    );
    
    // Get the new list with item count
    const result = await db.query(
      `SELECT sl.*, COUNT(sli.id) as item_count
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
       WHERE sl.id = $1
       GROUP BY sl.id`,
      [newList.id]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error restoring list:', error);
    res.status(500).json({ error: 'Failed to restore shopping list' });
  }
});

router.get('/lists/:id', async (req, res) => {
  try {
    const listResult = await db.query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    const itemsResult = await db.query(
      `SELECT sli.*, 
              i.is_recurring, 
              i.recurrence_days,
              COALESCE(sli.item_icon, im.icon) as item_icon,
              im.image_url as item_image,
              c.name as category_name,
              c.icon as category_icon,
              c.shopping_order as category_order
       FROM shopping_list_items sli
       LEFT JOIN items i ON sli.item_id = i.id
       LEFT JOIN item_metadata im ON LOWER(sli.item_name) = LOWER(im.name)
       LEFT JOIN categories c ON im.category_id = c.id OR sli.category = c.name
       WHERE sli.shopping_list_id = $1
       ORDER BY COALESCE(c.shopping_order, 999), sli.category, sli.sort_order, sli.item_name`,
      [req.params.id]
    );

    // Log icons and notes for debugging
    console.log('GET /lists/:id - Returning items with icons and notes:');
    itemsResult.rows.forEach(item => {
      console.log(`  ${item.item_name}: icon="${item.item_icon}", notes="${item.notes || 'none'}"`);
    });

    res.json({
      list: listResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error('Error fetching list:', error);
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
});

router.post('/lists', async (req, res) => {
  const { name, profileId, store_name, list_type, notes } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO shopping_lists (user_id, profile_id, name, store_name, list_type, notes) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        req.user.userId, 
        profileId || null, 
        name || 'Shopping List',
        store_name || null,
        list_type || 'general',
        notes || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating list:', error);
    res.status(500).json({ error: 'Failed to create shopping list' });
  }
});

router.post('/lists/:id/items',
  body('itemName').trim().notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { itemName, quantity, unit, price, category, icon, notes, aisleNumber, aisleName, upc, isOnSale, originalPrice } = req.body;
    const listId = req.params.id;

    try {
      const listCheck = await db.query(
        'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
        [listId, req.user.userId]
      );

      if (listCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const itemResult = await db.query(
        'SELECT id FROM items WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
        [req.user.userId, itemName]
      );

      let itemId = null;
      if (itemResult.rows.length > 0) {
        itemId = itemResult.rows[0].id;
      } else {
        const newItem = await db.query(
          'INSERT INTO items (user_id, name, category, typical_quantity, typical_unit) VALUES ($1, $2, $3, $4, $5) RETURNING id',
          [req.user.userId, itemName, category, quantity, unit]
        );
        itemId = newItem.rows[0].id;
      }

      const result = await db.query(
        `INSERT INTO shopping_list_items 
         (shopping_list_id, item_id, item_name, quantity, unit, price, category, item_icon, notes, aisle_number, aisle_name, upc, is_on_sale, original_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [listId, itemId, itemName, quantity, unit, price, category, icon, notes, aisleNumber, aisleName, upc, isOnSale, originalPrice]
      );

      // Update item preferences
      try {
        await updateItemPreferences(req.user.userId, {
          item_name: itemName,
          item_icon: icon,
          category: category,
          price: price,
          quantity: quantity,
          unit: unit
        });
      } catch (prefError) {
        console.error('Error updating preferences:', prefError);
      }

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding item:', error);
      res.status(500).json({ error: 'Failed to add item' });
    }
  }
);

router.patch('/lists/:listId/items/:itemId', async (req, res) => {
  const { listId, itemId } = req.params;
  const { quantity, price, isChecked, item_name, item_icon, notes, category, unit, package_count, count_per_package } = req.body;

  console.log('PATCH /lists/:listId/items/:itemId - Request body:', req.body);
  console.log('Icon received:', item_icon);

  try {
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (item_name !== undefined) {
      updates.push(`item_name = $${paramCount++}`);
      values.push(item_name);
    }
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }
    if (unit !== undefined) {
      updates.push(`unit = $${paramCount++}`);
      values.push(unit);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (item_icon !== undefined) {
      updates.push(`item_icon = $${paramCount++}`);
      values.push(item_icon);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (package_count !== undefined) {
      updates.push(`package_count = $${paramCount++}`);
      values.push(package_count);
    }
    if (count_per_package !== undefined) {
      updates.push(`count_per_package = $${paramCount++}`);
      values.push(count_per_package);
    }
    if (isChecked !== undefined) {
      updates.push(`is_checked = $${paramCount++}`);
      values.push(isChecked);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(itemId, listId, req.user.userId);

    const result = await db.query(
      `UPDATE shopping_list_items sli
       SET ${updates.join(', ')}
       FROM shopping_lists sl
       WHERE sli.id = $${paramCount++} 
       AND sli.shopping_list_id = $${paramCount++}
       AND sl.id = sli.shopping_list_id
       AND sl.user_id = $${paramCount++}
       RETURNING sli.*`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Update item preferences in the database
    const updatedItem = result.rows[0];
    console.log('Updated item from DB:', updatedItem);
    console.log('Icon in DB after update:', updatedItem.item_icon);
    try {
      await updateItemPreferences(req.user.userId, {
        item_name: updatedItem.item_name,
        item_icon: updatedItem.item_icon,
        category: updatedItem.category,
        price: updatedItem.price,
        quantity: updatedItem.quantity,
        unit: updatedItem.unit
      });
    } catch (prefError) {
      console.error('Error updating preferences:', prefError);
      // Don't fail the request if preference update fails
    }

    res.json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

router.delete('/lists/:listId/items/:itemId', async (req, res) => {
  const { listId, itemId } = req.params;

  try {
    const result = await db.query(
      `DELETE FROM shopping_list_items sli
       USING shopping_lists sl
       WHERE sli.id = $1 
       AND sli.shopping_list_id = $2
       AND sl.id = sli.shopping_list_id
       AND sl.user_id = $3
       RETURNING sli.id`,
      [itemId, listId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Update shopping list
router.put('/lists/:id', async (req, res) => {
  const listId = req.params.id;
  const { name, store_name, list_type, notes } = req.body;

  console.log('PUT /lists/:id - Request:', { listId, name, store_name, list_type, notes });

  try {
    // Build dynamic update query - only update name for now to avoid column issues
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    
    // Only add store_name if it's provided (we'll handle missing column gracefully)
    if (store_name !== undefined) {
      updates.push(`store_name = $${paramCount++}`);
      values.push(store_name);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    values.push(listId);
    values.push(req.user.userId);

    const query = `UPDATE shopping_lists 
                   SET ${updates.join(', ')}
                   WHERE id = $${paramCount++} AND user_id = $${paramCount++}
                   RETURNING *`;

    console.log('Update query:', query);
    console.log('Values:', values);

    let result;
    try {
      result = await db.query(query, values);
    } catch (dbError) {
      // If store_name column doesn't exist, try again with just name
      if (dbError.code === '42703' && store_name !== undefined) {
        console.log('store_name column does not exist, updating name only');
        const fallbackQuery = `UPDATE shopping_lists 
                               SET name = $1
                               WHERE id = $2 AND user_id = $3
                               RETURNING *`;
        result = await db.query(fallbackQuery, [name, listId, req.user.userId]);
      } else {
        throw dbError;
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    console.log('Update successful:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating list:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to update shopping list', details: error.message });
  }
});

// Delete shopping list
router.delete('/lists/:id', async (req, res) => {
  const listId = req.params.id;

  try {
    const result = await db.query(
      `DELETE FROM shopping_lists 
       WHERE id = $1 AND user_id = $2
       RETURNING id`,
      [listId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    console.error('Error deleting list:', error);
    res.status(500).json({ error: 'Failed to delete shopping list' });
  }
});

router.post('/lists/:id/complete', async (req, res) => {
  const listId = req.params.id;

  try {
    const client = await db.pool.connect();
    
    try {
      await client.query('BEGIN');

      const listResult = await client.query(
        'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
        [listId, req.user.userId]
      );

      if (listResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Shopping list not found' });
      }

      const itemsResult = await client.query(
        'SELECT * FROM shopping_list_items WHERE shopping_list_id = $1',
        [listId]
      );

      for (const item of itemsResult.rows) {
        await client.query(
          `INSERT INTO purchase_history (user_id, item_id, item_name, quantity, unit, price)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [req.user.userId, item.item_id, item.item_name, item.quantity, item.unit, item.price]
        );

        if (item.item_id) {
          const statsResult = await client.query(
            'SELECT * FROM item_statistics WHERE user_id = $1 AND item_id = $2',
            [req.user.userId, item.item_id]
          );

          if (statsResult.rows.length > 0) {
            const stats = statsResult.rows[0];
            const daysSinceLastPurchase = stats.last_purchase_date
              ? Math.floor((new Date() - new Date(stats.last_purchase_date)) / (1000 * 60 * 60 * 24))
              : null;

            const newAvgDays = daysSinceLastPurchase
              ? (stats.average_days_between_purchases * stats.total_purchases + daysSinceLastPurchase) / (stats.total_purchases + 1)
              : stats.average_days_between_purchases;

            await client.query(
              `UPDATE item_statistics 
               SET total_purchases = total_purchases + 1,
                   average_days_between_purchases = $1,
                   preferred_quantity = $2,
                   preferred_unit = $3,
                   last_purchase_date = CURRENT_TIMESTAMP
               WHERE user_id = $4 AND item_id = $5`,
              [newAvgDays, item.quantity, item.unit, req.user.userId, item.item_id]
            );
          } else {
            await client.query(
              `INSERT INTO item_statistics 
               (user_id, item_id, total_purchases, preferred_quantity, preferred_unit, last_purchase_date)
               VALUES ($1, $2, 1, $3, $4, CURRENT_TIMESTAMP)`,
              [req.user.userId, item.item_id, item.quantity, item.unit]
            );
          }

          // Determine storage location based on category
          const storageLocation = determineStorageLocation(item.item_name, item.category);
          
          await client.query(
            `INSERT INTO inventory (user_id, item_id, current_quantity, unit, percentage_left, last_purchased, storage_location)
             VALUES ($1, $2, $3, $4, 100, CURRENT_TIMESTAMP, $5)
             ON CONFLICT (user_id, profile_id, item_id) 
             DO UPDATE SET current_quantity = $3, percentage_left = 100, last_purchased = CURRENT_TIMESTAMP, last_updated = CURRENT_TIMESTAMP, storage_location = $5`,
            [req.user.userId, item.item_id, item.quantity, item.unit, storageLocation]
          );
        }
      }

      await client.query(
        'UPDATE shopping_lists SET status = $1, completed_at = CURRENT_TIMESTAMP WHERE id = $2',
        ['completed', listId]
      );

      await client.query('COMMIT');

      res.json({ message: 'Shopping list completed successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error completing list:', error);
    res.status(500).json({ error: 'Failed to complete shopping list' });
  }
});

// Learning and Personalization Routes

// Record item check-off for learning
router.post('/lists/:listId/items/:itemId/check', async (req, res) => {
  const { listId, itemId } = req.params;
  const { checkOffOrder } = req.body;

  try {
    await recordItemCheckOff(req.user.userId, listId, itemId, checkOffOrder);
    res.json({ success: true });
  } catch (error) {
    console.error('Error recording check-off:', error);
    res.status(500).json({ error: 'Failed to record check-off' });
  }
});

// Get personalized sort order
router.get('/personalized-sort', async (req, res) => {
  const { storeId } = req.query;

  try {
    const sortOrder = await getPersonalizedSortOrder(req.user.userId, storeId || null);
    res.json(sortOrder);
  } catch (error) {
    console.error('Error getting personalized sort:', error);
    res.status(500).json({ error: 'Failed to get sort order' });
  }
});

// Template Management Routes

// Get user's templates
router.get('/templates', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*, COUNT(ti.id) as item_count
       FROM shopping_templates t
       LEFT JOIN template_items ti ON t.id = ti.template_id
       WHERE t.user_id = $1
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Create template
router.post('/templates', async (req, res) => {
  const { name, items } = req.body;

  if (!name || !items || items.length === 0) {
    return res.status(400).json({ error: 'Template name and items required' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Create template
    const templateResult = await client.query(
      'INSERT INTO shopping_templates (user_id, name) VALUES ($1, $2) RETURNING *',
      [req.user.userId, name]
    );
    const template = templateResult.rows[0];

    // Add items to template
    for (const item of items) {
      await client.query(
        `INSERT INTO template_items (template_id, item_name, quantity, unit, category, item_icon)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [template.id, item.item_name, item.quantity || 1, item.unit || '', item.category || '', item.item_icon || '']
      );
    }

    await client.query('COMMIT');
    res.json(template);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  } finally {
    client.release();
  }
});

// Rename template
router.put('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Template name required' });
  }

  try {
    const result = await db.query(
      'UPDATE shopping_templates SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error renaming template:', error);
    res.status(500).json({ error: 'Failed to rename template' });
  }
});

// Delete template
router.delete('/templates/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM shopping_templates WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Get template items
router.get('/templates/:id/items', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT ti.* FROM template_items ti
       JOIN shopping_templates t ON ti.template_id = t.id
       WHERE t.id = $1 AND t.user_id = $2
       ORDER BY ti.created_at`,
      [id, req.user.userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching template items:', error);
    res.status(500).json({ error: 'Failed to fetch template items' });
  }
});

module.exports = router;
