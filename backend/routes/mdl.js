const express = require('express');
const router = express.Router();
const pool = require('../db');
const { authenticateToken, isAdmin } = require('../middleware/auth');

// ============================================================================
// ITEM TRACKING
// ============================================================================

// Track item usage
router.post('/track-item', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      itemName,
      price,
      quantity,
      unit,
      store,
      listId
    } = req.body;
    
    const userId = req.user.id;
    const now = new Date();
    
    await client.query('BEGIN');
    
    // 1. Get or create item in name registry
    const itemResult = await client.query(
      'SELECT get_or_create_item_name($1) as item_id',
      [itemName]
    );
    const itemNameId = itemResult.rows[0].item_id;
    
    // 2. Get user location
    const locationResult = await client.query(
      'SELECT state, city FROM user_locations WHERE user_id = $1',
      [userId]
    );
    const userLocation = locationResult.rows[0] || {};
    
    // 3. Record this specific entry
    await client.query(`
      INSERT INTO mdl_user_item_history (
        user_id, item_name_id, added_at,
        day_of_week, hour_of_day, week_of_month, month, season,
        quantity, unit, price, store_name, list_id,
        user_state, user_city
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, get_season($3::date), $8, $9, $10, $11, $12, $13, $14)
    `, [
      userId,
      itemNameId,
      now,
      now.getDay(),
      now.getHours(),
      Math.ceil(now.getDate() / 7),
      now.getMonth() + 1,
      quantity,
      unit,
      price,
      store,
      listId,
      userLocation.state,
      userLocation.city
    ]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      itemNameId,
      message: 'Item tracked successfully'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error tracking item:', error);
    res.status(500).json({ error: 'Failed to track item' });
  } finally {
    client.release();
  }
});

// Get user patterns for an item
router.get('/patterns/:itemName', authenticateToken, async (req, res) => {
  try {
    const { itemName } = req.params;
    const userId = req.user.id;
    
    const normalized = itemName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    const result = await pool.query(`
      SELECT p.*, i.normalized_name, i.predicted_category, i.predicted_icon
      FROM mdl_user_patterns p
      JOIN mdl_item_names i ON p.item_name_id = i.id
      WHERE p.user_id = $1 AND i.normalized_name = $2
    `, [userId, normalized]);
    
    if (result.rows.length === 0) {
      return res.json({ pattern: null });
    }
    
    res.json({ pattern: result.rows[0] });
  } catch (error) {
    console.error('Error getting pattern:', error);
    res.status(500).json({ error: 'Failed to get pattern' });
  }
});

// Get suggestions based on patterns
router.get('/suggestions', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const currentDay = now.getDay();
    const currentMonth = now.getMonth() + 1;
    
    const suggestions = await pool.query(`
      SELECT 
        p.*,
        i.normalized_name as item_name,
        i.predicted_icon,
        i.predicted_category,
        CURRENT_DATE - p.next_predicted_date as days_overdue
      FROM mdl_user_patterns p
      JOIN mdl_item_names i ON p.item_name_id = i.id
      WHERE p.user_id = $1
        AND p.next_predicted_date <= CURRENT_DATE + INTERVAL '3 days'
        AND p.prediction_confidence > 0.5
        AND p.total_times_added >= 3
      ORDER BY p.prediction_confidence DESC, p.total_times_added DESC
      LIMIT 10
    `, [userId]);
    
    res.json({ suggestions: suggestions.rows });
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// ============================================================================
// PRICE PREDICTIONS
// ============================================================================

// Get price estimate for item
router.get('/price/:itemName', authenticateToken, async (req, res) => {
  try {
    const { itemName } = req.params;
    const userId = req.user.id;
    
    const normalized = itemName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Get item ID
    const itemResult = await pool.query(
      'SELECT id FROM mdl_item_names WHERE normalized_name = $1',
      [normalized]
    );
    
    if (itemResult.rows.length === 0) {
      return res.json({ price: null, confidence: 0, source: 'none' });
    }
    
    const itemNameId = itemResult.rows[0].id;
    
    // Get user location
    const locationResult = await pool.query(
      'SELECT state, city FROM user_locations WHERE user_id = $1',
      [userId]
    );
    const userLocation = locationResult.rows[0] || {};
    
    // Try state-level price
    if (userLocation.state) {
      const priceResult = await pool.query(`
        SELECT average_price, confidence_score, sample_size
        FROM mdl_location_prices
        WHERE item_name_id = $1 
          AND state = $2
          AND sample_size >= 3
        ORDER BY confidence_score DESC
        LIMIT 1
      `, [itemNameId, userLocation.state]);
      
      if (priceResult.rows.length > 0) {
        return res.json({
          price: parseFloat(priceResult.rows[0].average_price),
          confidence: parseFloat(priceResult.rows[0].confidence_score),
          source: 'state',
          sampleSize: priceResult.rows[0].sample_size
        });
      }
    }
    
    // Fallback to national average
    const nationalResult = await pool.query(`
      SELECT AVG(average_price) as avg_price, SUM(sample_size) as total_samples
      FROM mdl_location_prices
      WHERE item_name_id = $1
        AND sample_size >= 3
    `, [itemNameId]);
    
    if (nationalResult.rows[0].avg_price) {
      return res.json({
        price: parseFloat(nationalResult.rows[0].avg_price),
        confidence: 0.3,
        source: 'national',
        sampleSize: nationalResult.rows[0].total_samples
      });
    }
    
    res.json({ price: null, confidence: 0, source: 'none' });
  } catch (error) {
    console.error('Error getting price:', error);
    res.status(500).json({ error: 'Failed to get price' });
  }
});

// ============================================================================
// AISLE PREDICTIONS
// ============================================================================

// Report aisle location
router.post('/aisle/report', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  
  try {
    const { itemName, aisleNumber, storeId, wasCorrect } = req.body;
    const userId = req.user.id;
    
    const normalized = itemName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    await client.query('BEGIN');
    
    // Get or create item
    const itemResult = await client.query(
      'SELECT get_or_create_item_name($1) as item_id',
      [itemName]
    );
    const itemNameId = itemResult.rows[0].item_id;
    
    // Record the report
    await client.query(`
      INSERT INTO mdl_aisle_reports (
        user_id, item_name_id, store_id, aisle_number, 
        was_prediction_correct, reported_at
      ) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
    `, [userId, itemNameId, storeId, aisleNumber, wasCorrect]);
    
    // Update aggregated aisle data
    const reportCount = await client.query(`
      SELECT COUNT(*) as count
      FROM mdl_aisle_reports
      WHERE item_name_id = $1 
        AND store_id = $2
        AND aisle_number = $3
    `, [itemNameId, storeId, aisleNumber]);
    
    const count = parseInt(reportCount.rows[0].count);
    let confidence = 0.60;
    if (count >= 10) confidence = 0.95;
    else if (count >= 5) confidence = 0.85;
    else if (count >= 3) confidence = 0.75;
    
    await client.query(`
      INSERT INTO mdl_location_aisles (
        item_name_id, specific_store_id, aisle_number, 
        report_count, confidence_score
      ) VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (item_name_id, specific_store_id)
      DO UPDATE SET
        aisle_number = EXCLUDED.aisle_number,
        report_count = EXCLUDED.report_count,
        confidence_score = EXCLUDED.confidence_score,
        last_updated = CURRENT_TIMESTAMP
    `, [itemNameId, storeId, aisleNumber, count, confidence]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: 'Aisle location recorded',
      confidence: confidence
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error reporting aisle:', error);
    res.status(500).json({ error: 'Failed to report aisle' });
  } finally {
    client.release();
  }
});

// Get aisle prediction
router.get('/aisle/:itemName/:storeId', authenticateToken, async (req, res) => {
  try {
    const { itemName, storeId } = req.params;
    const normalized = itemName.toLowerCase().trim().replace(/\s+/g, ' ');
    
    // Get item ID
    const itemResult = await pool.query(
      'SELECT id, predicted_category FROM mdl_item_names WHERE normalized_name = $1',
      [normalized]
    );
    
    if (itemResult.rows.length === 0) {
      return res.json({ aisle: null, confidence: 0, source: 'none' });
    }
    
    const { id: itemNameId, predicted_category } = itemResult.rows[0];
    
    // Try direct mapping
    const directResult = await pool.query(`
      SELECT aisle_number, confidence_score, report_count
      FROM mdl_location_aisles
      WHERE item_name_id = $1 
        AND specific_store_id = $2
        AND report_count >= 2
      ORDER BY confidence_score DESC
      LIMIT 1
    `, [itemNameId, storeId]);
    
    if (directResult.rows.length > 0) {
      return res.json({
        aisle: directResult.rows[0].aisle_number,
        confidence: parseFloat(directResult.rows[0].confidence_score),
        source: 'direct_mapping',
        reports: directResult.rows[0].report_count
      });
    }
    
    // Try category mapping
    if (predicted_category) {
      const categoryResult = await pool.query(`
        SELECT aisle_number, item_count
        FROM mdl_category_aisles
        WHERE category = $1 
          AND store_id = $2
        ORDER BY item_count DESC
        LIMIT 1
      `, [predicted_category, storeId]);
      
      if (categoryResult.rows.length > 0) {
        return res.json({
          aisle: categoryResult.rows[0].aisle_number,
          confidence: Math.min(0.7, categoryResult.rows[0].item_count / 10),
          source: 'category_mapping',
          category: predicted_category
        });
      }
    }
    
    res.json({ aisle: null, confidence: 0, source: 'none' });
  } catch (error) {
    console.error('Error getting aisle prediction:', error);
    res.status(500).json({ error: 'Failed to get aisle prediction' });
  }
});

// ============================================================================
// USER LOCATION
// ============================================================================

// Set user location
router.post('/location', authenticateToken, async (req, res) => {
  try {
    const { state, city, zipCode, metroArea, sharingLevel } = req.body;
    const userId = req.user.id;
    
    await pool.query(`
      INSERT INTO user_locations (
        user_id, state, city, zip_code, metro_area, location_sharing_level
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id)
      DO UPDATE SET
        state = EXCLUDED.state,
        city = EXCLUDED.city,
        zip_code = EXCLUDED.zip_code,
        metro_area = EXCLUDED.metro_area,
        location_sharing_level = EXCLUDED.location_sharing_level,
        updated_at = CURRENT_TIMESTAMP
    `, [userId, state, city, zipCode, metroArea, sharingLevel || 'state']);
    
    res.json({ success: true, message: 'Location updated' });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
});

// Get user location
router.get('/location', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await pool.query(
      'SELECT * FROM user_locations WHERE user_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json({ location: null });
    }
    
    res.json({ location: result.rows[0] });
  } catch (error) {
    console.error('Error getting location:', error);
    res.status(500).json({ error: 'Failed to get location' });
  }
});

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

// Get items needing training
router.get('/admin/training-queue', authenticateToken, isAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        q.*,
        i.normalized_name,
        i.total_uses,
        i.user_count
      FROM mdl_training_queue q
      JOIN mdl_item_names i ON q.item_name_id = i.id
      WHERE q.status = 'pending'
      ORDER BY q.priority DESC, q.created_at ASC
      LIMIT 50
    `);
    
    res.json({ queue: result.rows });
  } catch (error) {
    console.error('Error getting training queue:', error);
    res.status(500).json({ error: 'Failed to get training queue' });
  }
});

// Get MDL statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM mdl_item_names) as total_items,
        (SELECT COUNT(*) FROM mdl_item_names WHERE is_trained = true) as trained_items,
        (SELECT COUNT(*) FROM mdl_user_item_history) as total_entries,
        (SELECT COUNT(DISTINCT user_id) FROM mdl_user_item_history) as active_users,
        (SELECT COUNT(*) FROM mdl_aisle_reports) as aisle_reports,
        (SELECT COUNT(*) FROM user_locations) as users_with_location
    `);
    
    res.json({ stats: stats.rows[0] });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

module.exports = router;
