const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { 
  generateRotationSuggestions, 
  saveRotationSuggestions,
  getRotationSuggestions,
  resolveSuggestion,
  getSuggestionsSummary
} = require('../services/rotationService');

// ============================================
// STAGING AREA ROUTES
// ============================================

/**
 * GET /api/staging
 * Get all items in staging area for user
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        sa.*,
        COUNT(rs.id) FILTER (WHERE rs.action_taken = false) as pending_suggestions
      FROM staging_area sa
      LEFT JOIN rotation_suggestions rs ON sa.id = rs.staging_item_id
      WHERE sa.user_id = $1
      GROUP BY sa.id
      ORDER BY sa.storage_location, sa.added_at DESC
    `, [req.user.id]);

    // Group by storage location
    const grouped = {
      fridge: [],
      freezer: [],
      pantry: [],
      custom: []
    };

    result.rows.forEach(item => {
      const location = item.storage_location || 'pantry';
      if (grouped[location]) {
        grouped[location].push(item);
      } else {
        grouped.custom.push(item);
      }
    });

    res.json({
      items: result.rows,
      grouped,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error getting staging area:', error);
    res.status(500).json({ error: 'Failed to get staging area' });
  }
});

/**
 * POST /api/staging/from-shopping-list/:listId
 * Move completed shopping list items to staging area
 */
router.post('/from-shopping-list/:listId', authenticateToken, async (req, res) => {
  const { listId } = req.params;
  
  try {
    // Get checked items from shopping list
    const items = await db.query(`
      SELECT sli.*, sl.store_name
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
      WHERE sl.id = $1 
        AND sl.user_id = $2
        AND sli.is_checked = true
        AND sli.moved_to_staging = false
    `, [listId, req.user.id]);

    if (items.rows.length === 0) {
      return res.json({ message: 'No items to move', count: 0 });
    }

    const movedItems = [];

    // Move each item to staging
    for (const item of items.rows) {
      // Detect storage location based on category
      let storageLocation = 'pantry';
      const category = item.category?.toLowerCase() || '';
      
      if (category.includes('dairy') || category.includes('meat') || 
          category.includes('seafood') || category.includes('produce')) {
        storageLocation = 'fridge';
      } else if (category.includes('frozen')) {
        storageLocation = 'freezer';
      }

      // Insert into staging area
      const stagingResult = await db.query(`
        INSERT INTO staging_area (
          user_id, item_name, quantity, unit, category,
          storage_location, price, store, icon,
          from_shopping_list_id, from_shopping_list_item_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `, [
        req.user.id,
        item.item_name,
        item.quantity || 1,
        item.unit,
        item.category,
        storageLocation,
        item.price,
        item.store_name,
        item.item_icon || '📦',
        listId,
        item.id
      ]);

      const stagingItem = stagingResult.rows[0];

      // Generate rotation suggestions
      const suggestions = await generateRotationSuggestions(req.user.id, stagingItem);
      if (suggestions.length > 0) {
        await saveRotationSuggestions(req.user.id, stagingItem.id, suggestions);
      }

      // Mark shopping list item as moved
      await db.query(`
        UPDATE shopping_list_items
        SET moved_to_staging = true,
            moved_to_staging_at = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [item.id]);

      movedItems.push({
        ...stagingItem,
        suggestions_count: suggestions.length
      });
    }

    res.json({
      message: `Moved ${movedItems.length} items to staging area`,
      items: movedItems,
      count: movedItems.length
    });
  } catch (error) {
    console.error('Error moving items to staging:', error);
    res.status(500).json({ error: 'Failed to move items to staging' });
  }
});

/**
 * GET /api/staging/:id/suggestions
 * Get rotation suggestions for a staging item
 */
router.get('/:id/suggestions', authenticateToken, async (req, res) => {
  try {
    const suggestions = await getRotationSuggestions(req.user.id, req.params.id);
    res.json({ suggestions });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

/**
 * POST /api/staging/:id/put-away
 * Put away item from staging to inventory
 */
router.post('/:id/put-away', authenticateToken, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Get staging item
    const stagingResult = await db.query(`
      SELECT * FROM staging_area
      WHERE id = $1 AND user_id = $2
    `, [id, req.user.id]);

    if (stagingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Staging item not found' });
    }

    const stagingItem = stagingResult.rows[0];

    // Find or create item in items table
    let itemResult = await db.query(`
      SELECT id FROM items 
      WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `, [req.user.id, stagingItem.item_name]);

    let itemId;
    if (itemResult.rows.length === 0) {
      const newItem = await db.query(`
        INSERT INTO items (user_id, name, category, preferred_icon)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [req.user.id, stagingItem.item_name, stagingItem.category, stagingItem.icon]);
      itemId = newItem.rows[0].id;
    } else {
      itemId = itemResult.rows[0].id;
    }

    // Add to inventory
    const inventoryResult = await db.query(`
      INSERT INTO inventory (
        user_id, item_id, storage_location, current_quantity, unit,
        bought_date, price, store, image_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      req.user.id,
      itemId,
      stagingItem.storage_location,
      stagingItem.quantity,
      stagingItem.unit,
      stagingItem.bought_date,
      stagingItem.price,
      stagingItem.store,
      stagingItem.icon
    ]);

    // Delete from staging
    await db.query(`
      DELETE FROM staging_area WHERE id = $1
    `, [id]);

    res.json({
      message: 'Item put away successfully',
      item: inventoryResult.rows[0]
    });
  } catch (error) {
    console.error('Error putting away item:', error);
    res.status(500).json({ error: 'Failed to put away item' });
  }
});

/**
 * POST /api/staging/put-away-all
 * Put away all items from staging to inventory
 */
router.post('/put-away-all', authenticateToken, async (req, res) => {
  try {
    const stagingItems = await db.query(`
      SELECT * FROM staging_area
      WHERE user_id = $1
      ORDER BY storage_location, added_at
    `, [req.user.id]);

    let movedCount = 0;

    for (const stagingItem of stagingItems.rows) {
      try {
        // Find or create item
        let itemResult = await db.query(`
          SELECT id FROM items 
          WHERE user_id = $1 AND LOWER(name) = LOWER($2)
        `, [req.user.id, stagingItem.item_name]);

        let itemId;
        if (itemResult.rows.length === 0) {
          const newItem = await db.query(`
            INSERT INTO items (user_id, name, category, preferred_icon)
            VALUES ($1, $2, $3, $4)
            RETURNING id
          `, [req.user.id, stagingItem.item_name, stagingItem.category, stagingItem.icon]);
          itemId = newItem.rows[0].id;
        } else {
          itemId = itemResult.rows[0].id;
        }

        // Add to inventory
        await db.query(`
          INSERT INTO inventory (
            user_id, item_id, storage_location, current_quantity, unit,
            bought_date, price, store, image_url
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          req.user.id,
          itemId,
          stagingItem.storage_location,
          stagingItem.quantity,
          stagingItem.unit,
          stagingItem.bought_date,
          stagingItem.price,
          stagingItem.store,
          stagingItem.icon
        ]);

        movedCount++;
      } catch (itemError) {
        console.error(`Error moving item ${stagingItem.item_name}:`, itemError);
      }
    }

    // Clear staging area
    await db.query(`
      DELETE FROM staging_area WHERE user_id = $1
    `, [req.user.id]);

    res.json({
      message: `Put away ${movedCount} items`,
      count: movedCount
    });
  } catch (error) {
    console.error('Error putting away all items:', error);
    res.status(500).json({ error: 'Failed to put away items' });
  }
});

/**
 * DELETE /api/staging/:id
 * Remove item from staging (discard)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      DELETE FROM staging_area
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [req.params.id, req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json({ message: 'Item removed from staging' });
  } catch (error) {
    console.error('Error removing staging item:', error);
    res.status(500).json({ error: 'Failed to remove item' });
  }
});

/**
 * POST /api/staging/suggestions/:id/resolve
 * Mark a suggestion as resolved
 */
router.post('/suggestions/:id/resolve', authenticateToken, async (req, res) => {
  const { actionType } = req.body; // 'discarded', 'kept', 'used', 'ignored'
  
  try {
    await resolveSuggestion(req.user.id, req.params.id, actionType);
    res.json({ message: 'Suggestion resolved' });
  } catch (error) {
    console.error('Error resolving suggestion:', error);
    res.status(500).json({ error: 'Failed to resolve suggestion' });
  }
});

/**
 * GET /api/staging/suggestions/summary
 * Get summary of all pending suggestions
 */
router.get('/suggestions/summary', authenticateToken, async (req, res) => {
  try {
    const summary = await getSuggestionsSummary(req.user.id);
    res.json({ summary });
  } catch (error) {
    console.error('Error getting suggestions summary:', error);
    res.status(500).json({ error: 'Failed to get summary' });
  }
});

module.exports = router;
