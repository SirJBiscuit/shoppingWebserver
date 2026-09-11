const express = require('express');
const router = express.Router();
const db = require('../../database/db');
const { authenticateToken } = require('../../middleware/auth');

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Apply auth and admin check to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// ============================================================================
// PRICE TRAINING ENDPOINTS
// ============================================================================

// Get pending price reviews
router.get('/prices/pending', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await db.query(
      `SELECT * FROM price_history_pending 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await db.query(
      `SELECT COUNT(*) FROM price_history WHERE status = 'pending'`
    );
    
    res.json({
      prices: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching pending prices:', error);
    res.status(500).json({ error: 'Failed to fetch pending prices' });
  }
});

// Get outlier prices
router.get('/prices/outliers', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const result = await db.query(
      `SELECT * FROM price_history_outliers 
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    
    const countResult = await db.query(
      `SELECT COUNT(*) FROM price_history WHERE is_outlier = true`
    );
    
    res.json({
      outliers: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Error fetching outliers:', error);
    res.status(500).json({ error: 'Failed to fetch outliers' });
  }
});

// Get price statistics
router.get('/prices/stats', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM price_history_stats');
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error('Error fetching price stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get recent price submissions
router.get('/prices/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    const result = await db.query(
      `SELECT 
        ph.*,
        u.username,
        u.email
       FROM price_history ph
       LEFT JOIN users u ON ph.user_id = u.id
       ORDER BY ph.created_at DESC
       LIMIT $1`,
      [limit]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent prices:', error);
    res.status(500).json({ error: 'Failed to fetch recent prices' });
  }
});

// Approve a price
router.post('/prices/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const result = await db.query(
      `UPDATE price_history 
       SET status = 'approved',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [req.user.id, notes, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price not found' });
    }
    
    res.json({ 
      message: 'Price approved successfully',
      price: result.rows[0]
    });
  } catch (error) {
    console.error('Error approving price:', error);
    res.status(500).json({ error: 'Failed to approve price' });
  }
});

// Reject a price
router.post('/prices/:id/reject', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    const result = await db.query(
      `UPDATE price_history 
       SET status = 'rejected',
           reviewed_by = $1,
           reviewed_at = CURRENT_TIMESTAMP,
           rejection_reason = $2
       WHERE id = $3
       RETURNING *`,
      [req.user.id, reason, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price not found' });
    }
    
    res.json({ 
      message: 'Price rejected successfully',
      price: result.rows[0]
    });
  } catch (error) {
    console.error('Error rejecting price:', error);
    res.status(500).json({ error: 'Failed to reject price' });
  }
});

// Edit a price
router.put('/prices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { price, quantity, notes } = req.body;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (price !== undefined) {
      updates.push(`price = $${paramCount++}`);
      values.push(price);
    }
    
    if (quantity !== undefined) {
      updates.push(`quantity = $${paramCount++}`);
      values.push(quantity);
    }
    
    if (notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }
    
    updates.push(`reviewed_by = $${paramCount++}`);
    values.push(req.user.id);
    
    updates.push(`reviewed_at = CURRENT_TIMESTAMP`);
    
    values.push(id);
    
    const result = await db.query(
      `UPDATE price_history 
       SET ${updates.join(', ')}
       WHERE id = $${paramCount}
       RETURNING *`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price not found' });
    }
    
    res.json({ 
      message: 'Price updated successfully',
      price: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Run outlier detection
router.post('/prices/detect-outliers', async (req, res) => {
  try {
    // Get all approved prices grouped by item
    const itemsResult = await db.query(
      `SELECT DISTINCT item_name FROM price_history WHERE status = 'approved'`
    );
    
    let totalOutliers = 0;
    
    for (const item of itemsResult.rows) {
      const pricesResult = await db.query(
        `SELECT id, price FROM price_history 
         WHERE item_name = $1 AND status = 'approved'
         ORDER BY price`,
        [item.item_name]
      );
      
      const prices = pricesResult.rows;
      
      if (prices.length < 4) continue; // Need at least 4 data points
      
      // Calculate IQR (Interquartile Range)
      const q1Index = Math.floor(prices.length * 0.25);
      const q3Index = Math.floor(prices.length * 0.75);
      const q1 = parseFloat(prices[q1Index].price);
      const q3 = parseFloat(prices[q3Index].price);
      const iqr = q3 - q1;
      const lowerBound = q1 - (1.5 * iqr);
      const upperBound = q3 + (1.5 * iqr);
      const median = parseFloat(prices[Math.floor(prices.length / 2)].price);
      
      // Flag outliers
      for (const priceEntry of prices) {
        const price = parseFloat(priceEntry.price);
        const isOutlier = price < lowerBound || price > upperBound;
        
        if (isOutlier) {
          const deviation = Math.abs(price - median);
          const outlierScore = (deviation / median) * 100;
          
          await db.query(
            `UPDATE price_history 
             SET is_outlier = true, outlier_score = $1
             WHERE id = $2`,
            [outlierScore.toFixed(2), priceEntry.id]
          );
          
          totalOutliers++;
        }
      }
    }
    
    res.json({ 
      message: 'Outlier detection complete',
      outliersFound: totalOutliers
    });
  } catch (error) {
    console.error('Error detecting outliers:', error);
    res.status(500).json({ error: 'Failed to detect outliers' });
  }
});

// ============================================================================
// UTILITY ENDPOINTS
// ============================================================================

// Get price history for a specific item
router.get('/items/:itemName/prices', async (req, res) => {
  try {
    const { itemName } = req.params;
    
    const result = await db.query(
      `SELECT 
        ph.*,
        u.username
       FROM price_history ph
       LEFT JOIN users u ON ph.user_id = u.id
       WHERE ph.item_name = $1
       ORDER BY ph.created_at DESC`,
      [itemName]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching item prices:', error);
    res.status(500).json({ error: 'Failed to fetch item prices' });
  }
});

module.exports = router;
