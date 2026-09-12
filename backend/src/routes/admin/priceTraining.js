const express = require('express');
const router = express.Router();
const db = require('../../config/database');
const { authenticateToken, requireAdmin } = require('../../middleware/auth');

// Apply authentication and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all price training data with statistics
router.get('/training-data', async (req, res) => {
  const { item_name, store_name, status, limit = 100, offset = 0 } = req.query;
  
  try {
    let query = `
      SELECT 
        ph.*,
        u.username,
        u.email,
        (SELECT AVG(price) FROM price_history WHERE item_name = ph.item_name AND status = 'active') as avg_price,
        (SELECT COUNT(*) FROM price_history WHERE item_name = ph.item_name AND status = 'active') as total_entries,
        (SELECT STDDEV(price) FROM price_history WHERE item_name = ph.item_name AND status = 'active') as price_stddev
      FROM price_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (item_name) {
      query += ` AND ph.item_name ILIKE $${paramCount}`;
      params.push(`%${item_name}%`);
      paramCount++;
    }
    
    if (store_name) {
      query += ` AND ph.store_name ILIKE $${paramCount}`;
      params.push(`%${store_name}%`);
      paramCount++;
    }
    
    if (status) {
      query += ` AND ph.status = $${paramCount}`;
      params.push(status);
      paramCount++;
    }
    
    query += ` ORDER BY ph.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);
    
    const result = await db.query(query, params);
    
    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM price_history ph WHERE 1=1';
    const countParams = [];
    let countParamCount = 1;
    
    if (item_name) {
      countQuery += ` AND ph.item_name ILIKE $${countParamCount}`;
      countParams.push(`%${item_name}%`);
      countParamCount++;
    }
    
    if (store_name) {
      countQuery += ` AND ph.store_name ILIKE $${countParamCount}`;
      countParams.push(`%${store_name}%`);
      countParamCount++;
    }
    
    if (status) {
      countQuery += ` AND ph.status = $${countParamCount}`;
      countParams.push(status);
    }
    
    const countResult = await db.query(countQuery, countParams);
    
    res.json({
      data: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching training data:', error);
    res.status(500).json({ error: 'Failed to fetch training data' });
  }
});

// Get all unique items with their price statistics
router.get('/items-summary', async (req, res) => {
  const { search, sort = 'item_name', order = 'ASC' } = req.query;
  
  try {
    let query = `
      SELECT 
        item_name,
        COUNT(*) as entry_count,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as price_stddev,
        COUNT(DISTINCT store_name) as store_count,
        COUNT(DISTINCT user_id) as user_count,
        MAX(created_at) as last_updated,
        COUNT(CASE WHEN is_outlier = true THEN 1 END) as outlier_count,
        COUNT(CASE WHEN status = 'invalid' THEN 1 END) as invalid_count
      FROM price_history
      WHERE status = 'active'
    `;
    
    const params = [];
    
    if (search) {
      query += ` AND item_name ILIKE $1`;
      params.push(`%${search}%`);
    }
    
    query += ` GROUP BY item_name`;
    
    // Validate sort column
    const validSortColumns = ['item_name', 'entry_count', 'avg_price', 'min_price', 'max_price', 'last_updated'];
    const sortColumn = validSortColumns.includes(sort) ? sort : 'item_name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;
    
    const result = await db.query(query, params);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching items summary:', error);
    res.status(500).json({ error: 'Failed to fetch items summary' });
  }
});

// Get detailed price history for a specific item
router.get('/item/:itemName/history', async (req, res) => {
  const { itemName } = req.params;
  
  try {
    const result = await db.query(
      `SELECT 
        ph.*,
        u.username,
        u.email,
        (SELECT AVG(price) FROM price_history WHERE item_name = ph.item_name AND status = 'active') as avg_price
      FROM price_history ph
      LEFT JOIN users u ON ph.user_id = u.id
      WHERE ph.item_name = $1
      ORDER BY ph.created_at DESC`,
      [itemName]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching item history:', error);
    res.status(500).json({ error: 'Failed to fetch item history' });
  }
});

// Update price entry (mark as invalid, outlier, etc.)
router.patch('/entry/:id', async (req, res) => {
  const { id } = req.params;
  const { status, is_outlier, notes } = req.body;
  
  try {
    const updates = [];
    const params = [];
    let paramCount = 1;
    
    if (status) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    
    if (typeof is_outlier === 'boolean') {
      updates.push(`is_outlier = $${paramCount}`);
      params.push(is_outlier);
      paramCount++;
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    params.push(id);
    
    const result = await db.query(
      `UPDATE price_history 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price entry not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating price entry:', error);
    res.status(500).json({ error: 'Failed to update price entry' });
  }
});

// Delete price entry
router.delete('/entry/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await db.query(
      'DELETE FROM price_history WHERE id = $1 RETURNING *',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price entry not found' });
    }
    
    res.json({ success: true, deleted: result.rows[0] });
  } catch (error) {
    console.error('Error deleting price entry:', error);
    res.status(500).json({ error: 'Failed to delete price entry' });
  }
});

// Bulk update entries (e.g., mark all outliers as invalid)
router.post('/bulk-update', async (req, res) => {
  const { ids, status, is_outlier, notes } = req.body;
  
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'IDs array is required' });
  }
  
  try {
    const updates = [];
    const params = [ids];
    let paramCount = 2;
    
    if (status) {
      updates.push(`status = $${paramCount}`);
      params.push(status);
      paramCount++;
    }
    
    if (typeof is_outlier === 'boolean') {
      updates.push(`is_outlier = $${paramCount}`);
      params.push(is_outlier);
      paramCount++;
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount}`);
      params.push(notes);
      paramCount++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`updated_at = NOW()`);
    
    const result = await db.query(
      `UPDATE price_history 
       SET ${updates.join(', ')}
       WHERE id = ANY($1)
       RETURNING *`,
      params
    );
    
    res.json({ 
      success: true, 
      updated: result.rows.length,
      entries: result.rows 
    });
  } catch (error) {
    console.error('Error bulk updating entries:', error);
    res.status(500).json({ error: 'Failed to bulk update entries' });
  }
});

// Add manual price entry
router.post('/manual-entry', async (req, res) => {
  const { item_name, price, quantity, store_name, notes } = req.body;
  
  if (!item_name || !price) {
    return res.status(400).json({ error: 'Item name and price are required' });
  }
  
  try {
    const result = await db.query(
      `INSERT INTO price_history 
       (user_id, item_name, price, quantity, store_name, notes, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
       RETURNING *`,
      [req.user.id, item_name, parseFloat(price), quantity || 1, store_name || 'Admin Entry', notes || 'Manual admin entry']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error adding manual entry:', error);
    res.status(500).json({ error: 'Failed to add manual entry' });
  }
});

// Approve training data and push to MDL system
router.post('/approve-to-mdl', async (req, res) => {
  const { item_name } = req.body;
  
  if (!item_name) {
    return res.status(400).json({ error: 'Item name is required' });
  }
  
  try {
    // Get approved price statistics
    const statsResult = await db.query(
      `SELECT 
        item_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as price_stddev,
        COUNT(*) as sample_count,
        array_agg(DISTINCT store_name) as stores
      FROM price_history
      WHERE item_name = $1 AND status = 'active' AND is_outlier = false
      GROUP BY item_name`,
      [item_name]
    );
    
    if (statsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No valid price data found for this item' });
    }
    
    const stats = statsResult.rows[0];
    
    // Check if item exists in MDL
    const mdlCheck = await db.query(
      'SELECT id FROM product_master_data WHERE product_name ILIKE $1',
      [item_name]
    );
    
    if (mdlCheck.rows.length > 0) {
      // Update existing MDL entry
      await db.query(
        `UPDATE product_master_data 
         SET 
           avg_price = $1,
           min_price = $2,
           max_price = $3,
           price_confidence = $4,
           last_price_update = NOW(),
           updated_at = NOW()
         WHERE id = $5`,
        [
          parseFloat(stats.avg_price),
          parseFloat(stats.min_price),
          parseFloat(stats.max_price),
          Math.min(100, stats.sample_count * 10), // Confidence based on sample count
          mdlCheck.rows[0].id
        ]
      );
      
      res.json({ 
        success: true, 
        message: 'MDL entry updated',
        action: 'updated',
        stats 
      });
    } else {
      // Create new MDL entry
      const slug = item_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      
      await db.query(
        `INSERT INTO product_master_data 
         (product_name, slug, avg_price, min_price, max_price, price_confidence, last_price_update)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [
          item_name,
          slug,
          parseFloat(stats.avg_price),
          parseFloat(stats.min_price),
          parseFloat(stats.max_price),
          Math.min(100, stats.sample_count * 10)
        ]
      );
      
      res.json({ 
        success: true, 
        message: 'MDL entry created',
        action: 'created',
        stats 
      });
    }
  } catch (error) {
    console.error('Error approving to MDL:', error);
    res.status(500).json({ error: 'Failed to approve to MDL' });
  }
});

// Auto-approve all items with sufficient data
router.post('/auto-approve-all', async (req, res) => {
  const { min_samples = 5, max_stddev_percent = 30 } = req.body;
  
  try {
    // Find items with enough good data
    const itemsResult = await db.query(
      `SELECT 
        item_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        STDDEV(price) as price_stddev,
        COUNT(*) as sample_count
      FROM price_history
      WHERE status = 'active' AND is_outlier = false
      GROUP BY item_name
      HAVING COUNT(*) >= $1 
        AND (STDDEV(price) / AVG(price) * 100) < $2
      ORDER BY sample_count DESC`,
      [min_samples, max_stddev_percent]
    );
    
    const approved = [];
    const failed = [];
    
    for (const item of itemsResult.rows) {
      try {
        // Check if exists in MDL
        const mdlCheck = await db.query(
          'SELECT id FROM product_master_data WHERE product_name ILIKE $1',
          [item.item_name]
        );
        
        const confidence = Math.min(100, item.sample_count * 10);
        
        if (mdlCheck.rows.length > 0) {
          // Update
          await db.query(
            `UPDATE product_master_data 
             SET 
               avg_price = $1,
               min_price = $2,
               max_price = $3,
               price_confidence = $4,
               last_price_update = NOW(),
               updated_at = NOW()
             WHERE id = $5`,
            [
              parseFloat(item.avg_price),
              parseFloat(item.min_price),
              parseFloat(item.max_price),
              confidence,
              mdlCheck.rows[0].id
            ]
          );
        } else {
          // Create
          const slug = item.item_name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
          await db.query(
            `INSERT INTO product_master_data 
             (product_name, slug, avg_price, min_price, max_price, price_confidence, last_price_update)
             VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              item.item_name,
              slug,
              parseFloat(item.avg_price),
              parseFloat(item.min_price),
              parseFloat(item.max_price),
              confidence
            ]
          );
        }
        
        approved.push(item.item_name);
      } catch (err) {
        console.error(`Failed to approve ${item.item_name}:`, err);
        failed.push(item.item_name);
      }
    }
    
    res.json({
      success: true,
      approved: approved.length,
      failed: failed.length,
      approved_items: approved,
      failed_items: failed
    });
  } catch (error) {
    console.error('Error auto-approving items:', error);
    res.status(500).json({ error: 'Failed to auto-approve items' });
  }
});

// Get training statistics
router.get('/statistics', async (req, res) => {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) as total_entries,
        COUNT(DISTINCT item_name) as unique_items,
        COUNT(DISTINCT user_id) as contributing_users,
        COUNT(DISTINCT store_name) as unique_stores,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_entries,
        COUNT(CASE WHEN status = 'invalid' THEN 1 END) as invalid_entries,
        COUNT(CASE WHEN is_outlier = true THEN 1 END) as outlier_entries,
        AVG(price) as overall_avg_price,
        MIN(created_at) as first_entry,
        MAX(created_at) as last_entry
      FROM price_history
    `);
    
    const mdlStats = await db.query(`
      SELECT 
        COUNT(*) as mdl_items,
        COUNT(CASE WHEN avg_price IS NOT NULL THEN 1 END) as items_with_prices,
        AVG(price_confidence) as avg_confidence
      FROM product_master_data
    `);
    
    res.json({
      training: stats.rows[0],
      mdl: mdlStats.rows[0]
    });
  } catch (error) {
    console.error('Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
