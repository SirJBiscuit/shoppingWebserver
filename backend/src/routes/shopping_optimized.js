// Optimized Shopping Routes with Caching and Performance Improvements
const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const shoppingListService = require('../services/shoppingListService');

const router = express.Router();

router.use(authenticateToken);

// Get all lists for user (optimized with materialized view)
router.get('/lists', async (req, res) => {
  try {
    const includeCompleted = req.query.include_completed === 'true';
    const lists = await shoppingListService.getUserLists(req.user.id, includeCompleted);
    
    res.json(lists);
  } catch (error) {
    console.error('Error getting lists:', error);
    res.status(500).json({ error: 'Failed to get shopping lists' });
  }
});

// Get single list with items (with caching and pagination)
router.get('/lists/:id', 
  query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);
      const limit = req.query.limit || 100;
      const offset = req.query.offset || 0;

      const list = await shoppingListService.getListWithItems(
        req.user.id,
        listId,
        { limit, offset }
      );

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(list);
    } catch (error) {
      console.error('Error getting list:', error);
      res.status(500).json({ error: 'Failed to get shopping list' });
    }
  }
);

// Create new list
router.post('/lists',
  body('name').trim().notEmpty().isLength({ max: 255 }),
  body('store_name').optional().trim().isLength({ max: 255 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const list = await shoppingListService.createList(req.user.id, {
        name: req.body.name,
        store_name: req.body.store_name
      });

      res.status(201).json(list);
    } catch (error) {
      console.error('Error creating list:', error);
      res.status(500).json({ error: 'Failed to create shopping list' });
    }
  }
);

// Update list
router.put('/lists/:id',
  body('name').optional().trim().notEmpty().isLength({ max: 255 }),
  body('store_name').optional().trim().isLength({ max: 255 }),
  body('status').optional().isIn(['active', 'completed', 'archived']),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);
      const updates = {};
      
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.store_name !== undefined) updates.store_name = req.body.store_name;
      if (req.body.status !== undefined) updates.status = req.body.status;

      const list = await shoppingListService.updateList(req.user.id, listId, updates);

      if (!list) {
        return res.status(404).json({ error: 'List not found' });
      }

      res.json(list);
    } catch (error) {
      console.error('Error updating list:', error);
      res.status(500).json({ error: 'Failed to update shopping list' });
    }
  }
);

// Add item(s) to list (supports batch)
router.post('/lists/:id/items',
  body('items').optional().isArray(),
  body('items.*.item_name').trim().notEmpty(),
  body('items.*.quantity').optional().isFloat({ min: 0 }),
  body('item_name').optional().trim().notEmpty(), // Single item support
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const listId = parseInt(req.params.id);
      
      // Support both single item and batch
      const items = req.body.items || [req.body];

      const addedItems = await shoppingListService.addItems(req.user.id, listId, items);

      res.status(201).json(addedItems);
    } catch (error) {
      console.error('Error adding items:', error);
      
      if (error.message === 'List not found or access denied') {
        return res.status(404).json({ error: error.message });
      }
      
      res.status(500).json({ error: 'Failed to add items' });
    }
  }
);

// Update item
router.put('/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const itemId = parseInt(req.params.itemId);

    const allowedUpdates = [
      'item_name', 'quantity', 'unit', 'price', 'category',
      'item_icon', 'aisle_number', 'notes', 'purchased'
    ];

    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    const item = await shoppingListService.updateItem(req.user.id, listId, itemId, updates);

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    
    if (error.message === 'Item not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete item
router.delete('/lists/:listId/items/:itemId', async (req, res) => {
  try {
    const listId = parseInt(req.params.listId);
    const itemId = parseInt(req.params.itemId);

    await shoppingListService.deleteItem(req.user.id, listId, itemId);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting item:', error);
    
    if (error.message === 'Item not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Get cache statistics (admin only)
router.get('/admin/cache-stats', async (req, res) => {
  try {
    // TODO: Add admin check middleware
    const stats = shoppingListService.getCacheStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting cache stats:', error);
    res.status(500).json({ error: 'Failed to get cache stats' });
  }
});

module.exports = router;
