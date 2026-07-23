const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');
const { 
  calculateExpiration, 
  recordExpirationFeedback,
  getExpirationStatus,
  extendExpiration
} = require('../services/expirationService');

const router = express.Router();

// ============================================
// CUSTOM STORAGE LOCATIONS
// ============================================

// Get all storage locations (default + custom)
router.get('/locations', authenticateToken, async (req, res) => {
  try {
    // Get custom locations
    const customResult = await db.query(`
      SELECT id, name, icon, color, sort_order, created_at
      FROM custom_storage_locations
      WHERE user_id = $1
      ORDER BY sort_order ASC, name ASC
    `, [req.user.id]);
    
    // Default locations
    const defaultLocations = [
      { id: 'pantry', name: 'Pantry', icon: '🥫', color: '#8B4513', sort_order: 0, isDefault: true },
      { id: 'fridge', name: 'Fridge', icon: '🧊', color: '#60A5FA', sort_order: 1, isDefault: true },
      { id: 'freezer', name: 'Freezer', icon: '❄️', color: '#3B82F6', sort_order: 2, isDefault: true }
    ];
    
    res.json({
      default: defaultLocations,
      custom: customResult.rows
    });
  } catch (error) {
    console.error('Error fetching storage locations:', error);
    res.status(500).json({ error: 'Failed to fetch storage locations' });
  }
});

// Create custom storage location
router.post('/locations', authenticateToken, async (req, res) => {
  try {
    const { name, icon, color, sort_order } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Location name is required' });
    }
    
    const result = await db.query(`
      INSERT INTO custom_storage_locations (user_id, name, icon, color, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [req.user.id, name, icon || '📦', color || '#6B7280', sort_order || 0]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating storage location:', error);
    res.status(500).json({ error: 'Failed to create storage location' });
  }
});

// Update custom storage location
router.patch('/locations/:id', authenticateToken, async (req, res) => {
  try {
    const { name, icon, color, sort_order } = req.body;
    
    const result = await db.query(`
      UPDATE custom_storage_locations
      SET name = COALESCE($1, name),
          icon = COALESCE($2, icon),
          color = COALESCE($3, color),
          sort_order = COALESCE($4, sort_order),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5 AND user_id = $6
      RETURNING *
    `, [name, icon, color, sort_order, req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage location not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating storage location:', error);
    res.status(500).json({ error: 'Failed to update storage location' });
  }
});

// Delete custom storage location
router.delete('/locations/:id', authenticateToken, async (req, res) => {
  try {
    // Check if any items are using this location
    const itemsResult = await db.query(`
      SELECT COUNT(*) as count
      FROM inventory
      WHERE custom_location_id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (parseInt(itemsResult.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete location with items',
        itemCount: itemsResult.rows[0].count
      });
    }
    
    const result = await db.query(`
      DELETE FROM custom_storage_locations
      WHERE id = $1 AND user_id = $2
      RETURNING id
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Storage location not found' });
    }
    
    res.json({ message: 'Storage location deleted successfully' });
  } catch (error) {
    console.error('Error deleting storage location:', error);
    res.status(500).json({ error: 'Failed to delete storage location' });
  }
});

// Reorder storage locations
router.post('/locations/reorder', authenticateToken, async (req, res) => {
  try {
    const { locations } = req.body; // Array of { id, sort_order }
    
    if (!Array.isArray(locations)) {
      return res.status(400).json({ error: 'Locations must be an array' });
    }
    
    // Update sort order for each location
    for (const loc of locations) {
      await db.query(`
        UPDATE custom_storage_locations
        SET sort_order = $1
        WHERE id = $2 AND user_id = $3
      `, [loc.sort_order, loc.id, req.user.id]);
    }
    
    res.json({ message: 'Locations reordered successfully' });
  } catch (error) {
    console.error('Error reordering locations:', error);
    res.status(500).json({ error: 'Failed to reorder locations' });
  }
});

// ============================================
// ENHANCED INVENTORY
// ============================================

// Get all inventory items with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { 
      storage_location, 
      custom_location_id,
      category,
      expiring_soon, // true/false
      search,
      sort_by, // name, expiry, date_added, category
      sort_order // asc, desc
    } = req.query;
    
    let query = `
      SELECT 
        i.*,
        it.name as item_name,
        it.preferred_icon as item_icon,
        it.preferred_category as category,
        csl.name as custom_location_name,
        csl.icon as custom_location_icon
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.user_id = $1
    `;
    
    const params = [req.user.id];
    let paramCount = 2;
    
    // Filters
    if (storage_location) {
      query += ` AND i.storage_location = $${paramCount}`;
      params.push(storage_location);
      paramCount++;
    }
    
    if (custom_location_id) {
      query += ` AND i.custom_location_id = $${paramCount}`;
      params.push(custom_location_id);
      paramCount++;
    }
    
    if (category) {
      query += ` AND i.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }
    
    if (search) {
      query += ` AND LOWER(it.name) LIKE LOWER($${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (expiring_soon === 'true') {
      query += ` AND i.estimated_expiry_date <= CURRENT_DATE + INTERVAL '7 days'`;
      query += ` AND i.estimated_expiry_date >= CURRENT_DATE`;
    }
    
    // Sorting
    const sortColumn = {
      'name': 'it.name',
      'expiry': 'i.estimated_expiry_date',
      'date_added': 'i.last_purchased',
      'category': 'it.preferred_category'
    }[sort_by] || 'i.sort_order';
    
    const sortDir = sort_order === 'desc' ? 'DESC' : 'ASC';
    query += ` ORDER BY ${sortColumn} ${sortDir}, it.name ASC`;
    
    const result = await db.query(query, params);
    
    // Add expiration status to each item
    const items = result.rows.map(item => ({
      ...item,
      expirationStatus: getExpirationStatus(item.estimated_expiry_date)
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch inventory', details: error.message });
  }
});

// Get single inventory item
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        it.preferred_icon as item_icon,
        it.preferred_category as category,
        csl.name as custom_location_name,
        csl.icon as custom_location_icon
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.id = $1 AND i.user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = result.rows[0];
    item.expirationStatus = getExpirationStatus(item.estimated_expiry_date);
    
    res.json(item);
  } catch (error) {
    console.error('Error fetching item:', error);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
});

// Add item to inventory
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      item_name,
      storage_location,
      custom_location_id,
      category,
      quantity,
      unit,
      bought_date,
      opened_date,
      is_opened,
      manual_expiry_date,
      barcode,
      image_url,
      price,
      store,
      notes
    } = req.body;
    
    if (!item_name) {
      return res.status(400).json({ error: 'Item name is required' });
    }
    
    // Find or create item in items table
    let itemResult = await db.query(`
      SELECT id FROM items WHERE user_id = $1 AND LOWER(name) = LOWER($2)
    `, [req.user.id, item_name]);
    
    let item_id;
    if (itemResult.rows.length === 0) {
      // Create new item
      const newItem = await db.query(`
        INSERT INTO items (user_id, name, preferred_category, preferred_icon)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `, [req.user.id, item_name, category, image_url || '📦']);
      item_id = newItem.rows[0].id;
    } else {
      item_id = itemResult.rows[0].id;
    }
    
    // Calculate expiration if not manually set
    let estimatedExpiryDate = manual_expiry_date;
    let expiryConfidence = 100; // Manual = 100% confidence
    
    if (!manual_expiry_date && bought_date) {
      const expiration = await calculateExpiration({
        itemName: item_name,
        storageLocation: storage_location || 'pantry',
        boughtDate: bought_date || new Date(),
        openedDate: opened_date,
        userId: req.user.id
      });
      
      estimatedExpiryDate = expiration.estimatedExpiryDate;
      expiryConfidence = expiration.confidence;
    }
    
    const result = await db.query(`
      INSERT INTO inventory (
        user_id, item_id, storage_location, custom_location_id,
        current_quantity, unit, bought_date, opened_date,
        is_opened, manual_expiry_date, estimated_expiry_date,
        expiry_confidence, barcode, image_url, price, store, notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `, [
      req.user.id,
      item_id,
      storage_location || 'pantry',
      custom_location_id || null,
      quantity || 1,
      unit,
      bought_date || new Date(),
      opened_date,
      is_opened || false,
      manual_expiry_date,
      estimatedExpiryDate,
      expiryConfidence,
      barcode,
      image_url,
      price,
      store,
      notes
    ]);
    
    // Get full item with joined data
    const fullItem = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        it.preferred_icon as item_icon,
        it.preferred_category as category,
        csl.name as custom_location_name,
        csl.icon as custom_location_icon
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.id = $1
    `, [result.rows[0].id]);
    
    const item = fullItem.rows[0];
    item.expirationStatus = getExpirationStatus(item.estimated_expiry_date);
    
    res.status(201).json(item);
  } catch (error) {
    console.error('Error adding item:', error);
    console.error('Stack:', error.stack);
    res.status(500).json({ error: 'Failed to add item', details: error.message });
  }
});

// Update inventory item
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const {
      item_name,
      storage_location,
      custom_location_id,
      category,
      quantity,
      unit,
      bought_date,
      opened_date,
      is_opened,
      manual_expiry_date,
      barcode,
      image_url,
      price,
      store,
      notes,
      sort_order
    } = req.body;
    
    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (item_name !== undefined) {
      updates.push(`item_name = $${paramCount++}`);
      values.push(item_name);
    }
    if (storage_location !== undefined) {
      updates.push(`storage_location = $${paramCount++}`);
      values.push(storage_location);
    }
    if (custom_location_id !== undefined) {
      updates.push(`custom_location_id = $${paramCount++}`);
      values.push(custom_location_id);
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount++}`);
      values.push(category);
    }
    if (quantity !== undefined) {
      updates.push(`current_quantity = $${paramCount++}`);
      values.push(quantity);
    }
    if (unit !== undefined) {
      updates.push(`unit = $${paramCount++}`);
      values.push(unit);
    }
    if (bought_date !== undefined) {
      updates.push(`bought_date = $${paramCount++}`);
      values.push(bought_date);
    }
    if (opened_date !== undefined) {
      updates.push(`opened_date = $${paramCount++}`);
      values.push(opened_date);
    }
    if (is_opened !== undefined) {
      updates.push(`is_opened = $${paramCount++}`);
      values.push(is_opened);
    }
    if (manual_expiry_date !== undefined) {
      updates.push(`manual_expiry_date = $${paramCount++}`);
      values.push(manual_expiry_date);
      updates.push(`estimated_expiry_date = $${paramCount++}`);
      values.push(manual_expiry_date);
      updates.push(`expiry_confidence = $${paramCount++}`);
      values.push(100);
    }
    if (barcode !== undefined) {
      updates.push(`barcode = $${paramCount++}`);
      values.push(barcode);
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(image_url);
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    if (store !== undefined) {
      updates.push(`store = $${paramCount++}`);
      values.push(store);
    }
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    if (sort_order !== undefined) {
      updates.push(`sort_order = $${paramCount++}`);
      values.push(sort_order);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push(`last_updated = CURRENT_TIMESTAMP`);
    values.push(req.params.id, req.user.id);
    
    const result = await db.query(`
      UPDATE inventory
      SET ${updates.join(', ')}
      WHERE id = $${paramCount++} AND user_id = $${paramCount++}
      RETURNING *
    `, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = result.rows[0];
    item.expirationStatus = getExpirationStatus(item.estimated_expiry_date);
    
    res.json(item);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
});

// Delete inventory item
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Get item details before deleting (for history)
    const itemResult = await db.query(`
      SELECT * FROM inventory WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    
    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const item = itemResult.rows[0];
    
    // Add to history
    await db.query(`
      INSERT INTO inventory_history (
        user_id, item_name, storage_location, custom_location_id,
        category, quantity, unit, bought_date, opened_date,
        expiry_date, removed_date, removal_reason, price, store
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, 'deleted', $11, $12)
    `, [
      req.user.id,
      item.item_name,
      item.storage_location,
      item.custom_location_id,
      item.category,
      item.current_quantity,
      item.unit,
      item.bought_date,
      item.opened_date,
      item.estimated_expiry_date,
      item.price,
      item.store
    ]);
    
    // Delete the item
    await db.query(`
      DELETE FROM inventory WHERE id = $1 AND user_id = $2
    `, [req.params.id, req.user.id]);
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
});

// Move item to different location
router.post('/:id/move', authenticateToken, async (req, res) => {
  try {
    const { storage_location, custom_location_id } = req.body;
    
    const result = await db.query(`
      UPDATE inventory
      SET storage_location = $1,
          custom_location_id = $2,
          last_updated = CURRENT_TIMESTAMP
      WHERE id = $3 AND user_id = $4
      RETURNING *
    `, [storage_location, custom_location_id, req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error moving item:', error);
    res.status(500).json({ error: 'Failed to move item' });
  }
});

// Mark item as "still good" (extends expiration)
router.post('/:id/still-good', authenticateToken, async (req, res) => {
  try {
    const { extension_days } = req.body;
    const result = await extendExpiration(req.params.id, extension_days || 3);
    res.json(result);
  } catch (error) {
    console.error('Error extending expiration:', error);
    res.status(500).json({ error: 'Failed to extend expiration' });
  }
});

// Mark item as "went bad" (learns from it)
router.post('/:id/went-bad', authenticateToken, async (req, res) => {
  try {
    const { actual_expiry_date } = req.body;
    
    const result = await recordExpirationFeedback({
      userId: req.user.id,
      inventoryId: req.params.id,
      actualExpiryDate: actual_expiry_date || new Date(),
      feedback: 'went_bad'
    });
    
    // Move to history
    const itemResult = await db.query(`
      SELECT * FROM inventory WHERE id = $1
    `, [req.params.id]);
    
    if (itemResult.rows.length > 0) {
      const item = itemResult.rows[0];
      await db.query(`
        INSERT INTO inventory_history (
          user_id, item_name, storage_location, custom_location_id,
          category, quantity, unit, bought_date, opened_date,
          expiry_date, removed_date, removal_reason, price, store
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_DATE, 'expired', $11, $12)
      `, [
        req.user.id,
        item.item_name,
        item.storage_location,
        item.custom_location_id,
        item.category,
        item.current_quantity,
        item.unit,
        item.bought_date,
        item.opened_date,
        item.estimated_expiry_date,
        item.price,
        item.store
      ]);
      
      // Delete from inventory
      await db.query(`DELETE FROM inventory WHERE id = $1`, [req.params.id]);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Error recording went bad:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

// Mark item as opened
router.post('/:id/opened', authenticateToken, async (req, res) => {
  try {
    const result = await db.query(`
      UPDATE inventory
      SET is_opened = true,
          opened_date = CURRENT_DATE
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [req.params.id, req.user.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking as opened:', error);
    res.status(500).json({ error: 'Failed to mark as opened' });
  }
});

// Reorder items (custom sort)
router.post('/reorder', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body; // Array of { id, sort_order }
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }
    
    for (const item of items) {
      await db.query(`
        UPDATE inventory
        SET sort_order = $1
        WHERE id = $2 AND user_id = $3
      `, [item.sort_order, item.id, req.user.id]);
    }
    
    res.json({ message: 'Items reordered successfully' });
  } catch (error) {
    console.error('Error reordering items:', error);
    res.status(500).json({ error: 'Failed to reorder items' });
  }
});

// ============================================
// EXPIRATION & ANALYTICS
// ============================================

// Get items expiring soon
router.get('/expiring-soon', authenticateToken, async (req, res) => {
  try {
    const { days } = req.query; // Default 7 days
    const daysAhead = parseInt(days) || 7;
    
    const result = await db.query(`
      SELECT 
        i.*,
        csl.name as custom_location_name
      FROM inventory i
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.user_id = $1
        AND i.estimated_expiry_date <= CURRENT_DATE + INTERVAL '${daysAhead} days'
        AND i.estimated_expiry_date >= CURRENT_DATE
      ORDER BY i.estimated_expiry_date ASC
    `, [req.user.id]);
    
    const items = result.rows.map(item => ({
      ...item,
      expirationStatus: getExpirationStatus(item.estimated_expiry_date)
    }));
    
    res.json(items);
  } catch (error) {
    console.error('Error fetching expiring items:', error);
    res.status(500).json({ error: 'Failed to fetch expiring items' });
  }
});

// Get inventory statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN estimated_expiry_date <= CURRENT_DATE + INTERVAL '7 days' 
                   AND estimated_expiry_date >= CURRENT_DATE THEN 1 END) as expiring_soon,
        COUNT(CASE WHEN estimated_expiry_date < CURRENT_DATE THEN 1 END) as expired,
        COUNT(CASE WHEN is_opened = true THEN 1 END) as opened_items,
        COUNT(DISTINCT storage_location) as storage_locations_used,
        SUM(price * current_quantity) as total_value
      FROM inventory
      WHERE user_id = $1
    `, [req.user.id]);
    
    res.json(stats.rows[0]);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get inventory history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { limit, offset } = req.query;
    
    const result = await db.query(`
      SELECT *
      FROM inventory_history
      WHERE user_id = $1
      ORDER BY removed_date DESC
      LIMIT $2 OFFSET $3
    `, [req.user.id, parseInt(limit) || 50, parseInt(offset) || 0]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
