const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * GET /api/expiration/estimate
 * Get estimated expiration date for an item
 */
router.get('/estimate', async (req, res) => {
  try {
    const { itemName, storageLocation = 'pantry', purchaseDate } = req.query;
    const userId = req.user.userId;

    if (!itemName) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const purchase = purchaseDate ? new Date(purchaseDate) : new Date();

    // 1. Check user's learned preferences first
    const userPrefResult = await db.query(
      `SELECT learned_shelf_life_days, confidence_score 
       FROM user_expiration_preferences 
       WHERE user_id = $1 AND $2 ILIKE '%' || item_pattern || '%'
       ORDER BY confidence_score DESC, sample_count DESC
       LIMIT 1`,
      [userId, itemName]
    );

    if (userPrefResult.rows.length > 0 && userPrefResult.rows[0].confidence_score > 0.6) {
      const shelfLife = userPrefResult.rows[0].learned_shelf_life_days;
      const expiryDate = new Date(purchase);
      expiryDate.setDate(expiryDate.getDate() + shelfLife);

      return res.json({
        estimated_expiry: expiryDate.toISOString().split('T')[0],
        shelf_life_days: shelfLife,
        source: 'learned',
        confidence: userPrefResult.rows[0].confidence_score
      });
    }

    // 2. Check default expiration data
    const defaultResult = await db.query(
      `SELECT shelf_life_days, shelf_life_days_frozen, freshness_check, storage_location
       FROM expiration_defaults 
       WHERE $1 ILIKE item_pattern
       ORDER BY LENGTH(item_pattern) DESC
       LIMIT 1`,
      [itemName]
    );

    if (defaultResult.rows.length > 0) {
      const data = defaultResult.rows[0];
      const shelfLife = storageLocation === 'freezer' && data.shelf_life_days_frozen
        ? data.shelf_life_days_frozen
        : data.shelf_life_days;

      const expiryDate = new Date(purchase);
      expiryDate.setDate(expiryDate.getDate() + shelfLife);

      return res.json({
        estimated_expiry: expiryDate.toISOString().split('T')[0],
        shelf_life_days: shelfLife,
        freshness_check: data.freshness_check,
        recommended_storage: data.storage_location,
        source: 'default'
      });
    }

    // 3. Fallback: generic estimate based on storage location
    const fallbackDays = {
      'freezer': 90,
      'fridge': 7,
      'pantry': 30
    };

    const shelfLife = fallbackDays[storageLocation] || 7;
    const expiryDate = new Date(purchase);
    expiryDate.setDate(expiryDate.getDate() + shelfLife);

    res.json({
      estimated_expiry: expiryDate.toISOString().split('T')[0],
      shelf_life_days: shelfLife,
      source: 'fallback',
      message: 'No specific data found. Using generic estimate.'
    });

  } catch (error) {
    console.error('Error estimating expiration:', error);
    res.status(500).json({ error: 'Failed to estimate expiration' });
  }
});

/**
 * POST /api/expiration/learn
 * Record user feedback to improve predictions
 */
router.post('/learn', async (req, res) => {
  try {
    const userId = req.user.userId;
    const {
      itemName,
      purchaseDate,
      estimatedExpiry,
      actualExpiry,
      expiredEarly = false,
      stillGoodAfter = false,
      discarded = false,
      discardReason
    } = req.body;

    if (!itemName || !purchaseDate) {
      return res.status(400).json({ error: 'Item name and purchase date are required' });
    }

    // Record in history
    await db.query(
      `INSERT INTO expiration_history 
       (user_id, item_name, purchase_date, estimated_expiry, actual_expiry, 
        expired_early, still_good_after, discarded, discard_reason)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [userId, itemName, purchaseDate, estimatedExpiry, actualExpiry,
       expiredEarly, stillGoodAfter, discarded, discardReason]
    );

    // Update learned preferences
    const actualShelfLife = actualExpiry
      ? Math.ceil((new Date(actualExpiry) - new Date(purchaseDate)) / (1000 * 60 * 60 * 24))
      : null;

    if (actualShelfLife) {
      // Get current preference or create new one
      const existing = await db.query(
        `SELECT learned_shelf_life_days, sample_count, confidence_score
         FROM user_expiration_preferences
         WHERE user_id = $1 AND item_pattern = $2`,
        [userId, itemName.toLowerCase()]
      );

      if (existing.rows.length > 0) {
        // Update existing preference with weighted average
        const current = existing.rows[0];
        const newCount = current.sample_count + 1;
        const newAvg = Math.round(
          (current.learned_shelf_life_days * current.sample_count + actualShelfLife) / newCount
        );
        const newConfidence = Math.min(0.95, 0.5 + (newCount * 0.05));

        await db.query(
          `UPDATE user_expiration_preferences
           SET learned_shelf_life_days = $1, sample_count = $2, confidence_score = $3
           WHERE user_id = $4 AND item_pattern = $5`,
          [newAvg, newCount, newConfidence, userId, itemName.toLowerCase()]
        );
      } else {
        // Create new preference
        await db.query(
          `INSERT INTO user_expiration_preferences 
           (user_id, item_pattern, learned_shelf_life_days, sample_count, confidence_score)
           VALUES ($1, $2, $3, 1, 0.5)`,
          [userId, itemName.toLowerCase(), actualShelfLife]
        );
      }
    }

    res.json({ success: true, message: 'Feedback recorded and preferences updated' });

  } catch (error) {
    console.error('Error learning from feedback:', error);
    res.status(500).json({ error: 'Failed to record feedback' });
  }
});

/**
 * GET /api/expiration/history/:itemName
 * Get purchase history for an item
 */
router.get('/history/:itemName', async (req, res) => {
  try {
    const userId = req.user.userId;
    const { itemName } = req.params;

    const history = await db.query(
      `SELECT * FROM expiration_history
       WHERE user_id = $1 AND item_name ILIKE $2
       ORDER BY purchase_date DESC
       LIMIT 10`,
      [userId, `%${itemName}%`]
    );

    // Calculate statistics
    const stats = await db.query(
      `SELECT 
         COUNT(*) as times_purchased,
         AVG(EXTRACT(DAY FROM (actual_expiry - purchase_date))) as avg_shelf_life,
         MAX(purchase_date) as last_purchase
       FROM expiration_history
       WHERE user_id = $1 AND item_name ILIKE $2 AND actual_expiry IS NOT NULL`,
      [userId, `%${itemName}%`]
    );

    res.json({
      history: history.rows,
      stats: stats.rows[0]
    });

  } catch (error) {
    console.error('Error fetching history:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * GET /api/expiration/defaults
 * Get all default expiration data (for admin/reference)
 */
router.get('/defaults', async (req, res) => {
  try {
    const { category, search } = req.query;

    let query = 'SELECT * FROM expiration_defaults WHERE 1=1';
    const params = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      query += ` AND item_pattern ILIKE $${params.length}`;
    }

    query += ' ORDER BY category, item_pattern';

    const result = await db.query(query, params);
    res.json(result.rows);

  } catch (error) {
    console.error('Error fetching defaults:', error);
    res.status(500).json({ error: 'Failed to fetch defaults' });
  }
});

/**
 * GET /api/expiration/status/:days
 * Get expiration status color code
 */
router.get('/status/:days', (req, res) => {
  const daysUntilExpiry = parseInt(req.params.days);

  let status, color, message;

  if (daysUntilExpiry > 7) {
    status = 'fresh';
    color = 'green';
    message = 'Fresh & Good';
  } else if (daysUntilExpiry >= 3) {
    status = 'use_soon';
    color = 'yellow';
    message = 'Use This Week';
  } else if (daysUntilExpiry >= 1) {
    status = 'urgent';
    color = 'orange';
    message = 'Use Today/Tomorrow';
  } else if (daysUntilExpiry === 0) {
    status = 'expired';
    color = 'red';
    message = 'Check Before Using';
  } else {
    status = 'discard';
    color = 'black';
    message = 'Throw Out - Unsafe';
  }

  res.json({ status, color, message, days: daysUntilExpiry });
});

module.exports = router;
