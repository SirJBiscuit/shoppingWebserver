const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get weekly deals for a store
router.get('/stores/:storeId/deals', async (req, res) => {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      `SELECT * FROM store_deals 
       WHERE store_id = $1 
       AND valid_until > NOW()
       ORDER BY savings DESC, valid_until ASC`,
      [storeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Get digital coupons for a store
router.get('/stores/:storeId/coupons', async (req, res) => {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      `SELECT dc.*, 
       EXISTS(SELECT 1 FROM user_coupons WHERE user_id = $1 AND coupon_id = dc.id) as clipped
       FROM digital_coupons dc
       WHERE dc.store_id = $2 
       AND dc.valid_until > NOW()
       ORDER BY dc.discount_amount DESC`,
      [req.user.userId, storeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Clip a coupon to user's wallet
router.post('/coupons/:couponId/clip', async (req, res) => {
  const { couponId } = req.params;

  try {
    await db.query(
      `INSERT INTO user_coupons (user_id, coupon_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, coupon_id) DO NOTHING`,
      [req.user.userId, couponId]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error clipping coupon:', error);
    res.status(500).json({ error: 'Failed to clip coupon' });
  }
});

// Get user's clipped coupons
router.get('/coupons/my-wallet', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT dc.*, uc.clipped_at, uc.used_at, sl.name as store_name
       FROM user_coupons uc
       JOIN digital_coupons dc ON uc.coupon_id = dc.id
       JOIN store_locations sl ON dc.store_id = sl.id
       WHERE uc.user_id = $1 
       AND dc.valid_until > NOW()
       AND uc.used_at IS NULL
       ORDER BY dc.valid_until ASC`,
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Find nearest stores with deals
router.get('/stores/nearby', async (req, res) => {
  const { latitude, longitude, radius = 25 } = req.query;

  if (!latitude || !longitude) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  try {
    // Using Haversine formula to calculate distance
    const result = await db.query(
      `SELECT sl.*, 
       COUNT(DISTINCT sd.id) as deal_count,
       COUNT(DISTINCT dc.id) as coupon_count,
       (3959 * acos(
         cos(radians($1)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians($2)) + 
         sin(radians($1)) * sin(radians(latitude))
       )) AS distance
       FROM store_locations sl
       LEFT JOIN store_deals sd ON sl.id = sd.store_id AND sd.valid_until > NOW()
       LEFT JOIN digital_coupons dc ON sl.id = dc.store_id AND dc.valid_until > NOW()
       WHERE sl.latitude IS NOT NULL 
       AND sl.longitude IS NOT NULL
       GROUP BY sl.id
       HAVING (3959 * acos(
         cos(radians($1)) * cos(radians(latitude)) * 
         cos(radians(longitude) - radians($2)) + 
         sin(radians($1)) * sin(radians(latitude))
       )) < $3
       ORDER BY distance ASC
       LIMIT 20`,
      [parseFloat(latitude), parseFloat(longitude), parseFloat(radius)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error finding nearby stores:', error);
    res.status(500).json({ error: 'Failed to find stores' });
  }
});

// Match shopping list items with deals
router.get('/lists/:listId/deal-matches', async (req, res) => {
  const { listId } = req.params;

  try {
    // Get list items
    const itemsResult = await db.query(
      'SELECT * FROM shopping_list_items WHERE shopping_list_id = $1',
      [listId]
    );

    // Get store for this list
    const listResult = await db.query(
      'SELECT store_id FROM shopping_lists WHERE id = $1',
      [listId]
    );

    if (!listResult.rows[0]?.store_id) {
      return res.json({ items: itemsResult.rows, matches: [] });
    }

    const storeId = listResult.rows[0].store_id;

    // Find matching deals
    const dealsResult = await db.query(
      `SELECT sd.*, sli.id as item_id, sli.item_name as list_item_name
       FROM store_deals sd
       JOIN shopping_list_items sli ON (
         LOWER(sd.item_name) LIKE '%' || LOWER(sli.item_name) || '%' OR
         LOWER(sli.item_name) LIKE '%' || LOWER(sd.item_name) || '%' OR
         sd.category = sli.category
       )
       WHERE sd.store_id = $1 
       AND sli.shopping_list_id = $2
       AND sd.valid_until > NOW()
       ORDER BY sd.savings DESC`,
      [storeId, listId]
    );

    res.json({
      items: itemsResult.rows,
      matches: dealsResult.rows,
      totalSavings: dealsResult.rows.reduce((sum, deal) => sum + parseFloat(deal.savings || 0), 0)
    });
  } catch (error) {
    console.error('Error matching deals:', error);
    res.status(500).json({ error: 'Failed to match deals' });
  }
});

module.exports = router;
