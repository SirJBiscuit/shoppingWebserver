const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Get user's custom stores
router.get('/user', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM store_locations WHERE created_by = $1 ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user stores:', error);
    res.status(500).json({ error: 'Failed to fetch stores' });
  }
});

// Create a new store
router.post('/', async (req, res) => {
  const { name, chain, area_code, city, state, zip_code } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Store name is required' });
  }

  try {
    const result = await db.query(
      `INSERT INTO store_locations (name, store_name, chain, chain_name, area_code, city, state, zip_code, user_id, created_by)
       VALUES ($1, $1, $2, $2, $3, $4, $5, $6, $7, $7)
       RETURNING *`,
      [name, chain, area_code, city, state, zip_code, req.user.id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error creating store:', error);
    res.status(500).json({ error: 'Failed to create store' });
  }
});

// Delete a store
router.delete('/:storeId', async (req, res) => {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM store_locations WHERE id = $1 AND (user_id = $2 OR created_by = $2) RETURNING id',
      [storeId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Store not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting store:', error);
    res.status(500).json({ error: 'Failed to delete store' });
  }
});

// Search stores by location (GPS coordinates)
router.get('/nearby', async (req, res) => {
  const { lat, lng, radius = 10 } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude and longitude required' });
  }

  try {
    // Calculate distance using Haversine formula in SQL
    // radius is in miles
    const result = await db.query(
      `SELECT *,
              (3959 * acos(
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              )) AS distance
       FROM store_locations
       WHERE (3959 * acos(
                cos(radians($1)) * cos(radians(latitude)) *
                cos(radians(longitude) - radians($2)) +
                sin(radians($1)) * sin(radians(latitude))
              )) <= $3
       ORDER BY distance
       LIMIT 20`,
      [parseFloat(lat), parseFloat(lng), parseFloat(radius)]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching nearby stores:', error);
    res.status(500).json({ error: 'Failed to search stores' });
  }
});

// Search stores by address/ZIP/city
router.get('/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Search query required' });
  }

  try {
    const result = await db.query(
      `SELECT *
       FROM store_locations
       WHERE name ILIKE $1
          OR area_code ILIKE $1
          OR city ILIKE $1
          OR zip_code ILIKE $1
          OR state ILIKE $1
       ORDER BY COALESCE(chain, chain_name, store_chain), name
       LIMIT 50`,
      [`%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching stores:', error);
    res.status(500).json({ error: 'Failed to search stores' });
  }
});

// Get user's favorite stores
router.get('/favorites', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT sl.*, ufs.nickname, ufs.is_default
       FROM user_favorite_stores ufs
       JOIN store_locations sl ON ufs.store_location_id = sl.id
       WHERE ufs.user_id = $1
       ORDER BY ufs.is_default DESC, sl.name`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching favorite stores:', error);
    res.status(500).json({ error: 'Failed to fetch favorites' });
  }
});

// Add store to favorites
router.post('/favorites', async (req, res) => {
  const { store_location_id, nickname, is_default } = req.body;

  try {
    // If setting as default, unset other defaults first
    if (is_default) {
      await db.query(
        'UPDATE user_favorite_stores SET is_default = FALSE WHERE user_id = $1',
        [req.user.id]
      );
    }

    const result = await db.query(
      `INSERT INTO user_favorite_stores (user_id, store_location_id, nickname, is_default)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, store_location_id) 
       DO UPDATE SET nickname = $3, is_default = $4
       RETURNING *`,
      [req.user.id, store_location_id, nickname, is_default || false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error adding favorite store:', error);
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// Remove store from favorites
router.delete('/favorites/:storeLocationId', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM user_favorite_stores WHERE user_id = $1 AND store_location_id = $2',
      [req.user.id, req.params.storeLocationId]
    );

    res.json({ message: 'Store removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// Get item prices for a specific store
router.get('/:storeId/prices', async (req, res) => {
  const { storeId } = req.params;
  const { search } = req.query;

  try {
    let query = `
      SELECT *
      FROM store_item_prices
      WHERE store_location_id = $1
    `;
    const params = [storeId];

    if (search) {
      query += ` AND item_name ILIKE $2`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY item_name LIMIT 100`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching store prices:', error);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Get price for specific item at store
router.get('/:storeId/prices/:itemName', async (req, res) => {
  const { storeId, itemName } = req.params;

  try {
    const result = await db.query(
      `SELECT *
       FROM store_item_prices
       WHERE store_location_id = $1
         AND LOWER(item_name) = LOWER($2)
       ORDER BY last_updated DESC
       LIMIT 1`,
      [storeId, itemName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Price not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching item price:', error);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// Update item price (manual entry or API sync)
router.post('/:storeId/prices', async (req, res) => {
  const { storeId } = req.params;
  const {
    item_name,
    upc,
    price,
    sale_price,
    unit,
    size,
    brand,
    on_sale,
    sale_start_date,
    sale_end_date,
    aisle_number,
    aisle_name,
    in_stock,
    source = 'manual'
  } = req.body;

  try {
    const result = await db.query(
      `INSERT INTO store_item_prices 
       (store_location_id, item_name, upc, price, sale_price, unit, size, brand, 
        on_sale, sale_start_date, sale_end_date, aisle_number, aisle_name, in_stock, source)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       ON CONFLICT (store_location_id, item_name) 
       DO UPDATE SET 
         price = $4,
         sale_price = $5,
         on_sale = $9,
         sale_start_date = $10,
         sale_end_date = $11,
         aisle_number = $12,
         aisle_name = $13,
         in_stock = $14,
         last_updated = CURRENT_TIMESTAMP
       RETURNING *`,
      [storeId, item_name, upc, price, sale_price, unit, size, brand,
       on_sale, sale_start_date, sale_end_date, aisle_number, aisle_name, in_stock, source]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ error: 'Failed to update price' });
  }
});

// Get weekly ad items (on sale)
router.get('/:storeId/weekly-ad', async (req, res) => {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      `SELECT *
       FROM store_item_prices
       WHERE store_location_id = $1
         AND on_sale = TRUE
         AND (sale_end_date IS NULL OR sale_end_date >= CURRENT_DATE)
       ORDER BY sale_price ASC
       LIMIT 100`,
      [storeId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching weekly ad:', error);
    res.status(500).json({ error: 'Failed to fetch weekly ad' });
  }
});

// Get aisles for a specific store
router.get('/:storeId/aisles', async (req, res) => {
  const { storeId } = req.params;

  try {
    const aisles = await db.query(
      `SELECT sa.id, sa.aisle_number, sa.aisle_name, sa.display_order,
              array_agg(ac.category_name) as categories
       FROM store_aisles sa
       LEFT JOIN aisle_categories ac ON sa.id = ac.store_aisle_id
       WHERE sa.store_location_id = $1
       GROUP BY sa.id, sa.aisle_number, sa.aisle_name, sa.display_order
       ORDER BY sa.display_order, sa.aisle_number`,
      [storeId]
    );

    res.json(aisles.rows);
  } catch (error) {
    console.error('Error fetching store aisles:', error);
    res.status(500).json({ error: 'Failed to fetch aisles' });
  }
});

// Add/update aisle for a store
router.post('/:storeId/aisles', async (req, res) => {
  const { storeId } = req.params;
  const { aisle_number, aisle_name, categories, display_order } = req.body;

  try {
    // Insert or update aisle
    const aisleResult = await db.query(
      `INSERT INTO store_aisles (store_location_id, aisle_number, aisle_name, display_order)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (store_location_id, aisle_number)
       DO UPDATE SET aisle_name = $3, display_order = $4
       RETURNING id`,
      [storeId, aisle_number, aisle_name, display_order || 0]
    );

    const aisleId = aisleResult.rows[0].id;

    // Delete existing categories
    await db.query('DELETE FROM aisle_categories WHERE store_aisle_id = $1', [aisleId]);

    // Insert new categories
    if (categories && categories.length > 0) {
      const categoryValues = categories.map((cat, idx) => `($1, $${idx + 2})`).join(',');
      const categoryParams = [aisleId, ...categories];
      await db.query(
        `INSERT INTO aisle_categories (store_aisle_id, category_name) VALUES ${categoryValues}`,
        categoryParams
      );
    }

    res.json({ success: true, aisleId });
  } catch (error) {
    console.error('Error saving aisle:', error);
    res.status(500).json({ error: 'Failed to save aisle' });
  }
});

// Get aisle for a specific category at a store
router.get('/:storeId/category/:categoryName/aisle', async (req, res) => {
  const { storeId, categoryName } = req.params;

  try {
    const result = await db.query(
      `SELECT sa.aisle_number, sa.aisle_name
       FROM store_aisles sa
       JOIN aisle_categories ac ON sa.id = ac.store_aisle_id
       WHERE sa.store_location_id = $1 AND ac.category_name = $2
       LIMIT 1`,
      [storeId, categoryName]
    );

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Aisle not found for category' });
    }
  } catch (error) {
    console.error('Error fetching aisle for category:', error);
    res.status(500).json({ error: 'Failed to fetch aisle' });
  }
});

// ============================================================================
// STORE DEALS + DIGITAL COUPONS
// ============================================================================

// Get active deals for a store (camelCase aliases match the frontend's
// deal.itemName / deal.savings / deal.validUntil shape)
router.get('/:storeId/deals', async (req, res) => {
  const { storeId } = req.params;
  const { includeExpired } = req.query;

  try {
    const result = await db.query(
      `SELECT id, item_name AS "itemName", category,
              original_price AS "originalPrice", sale_price AS "salePrice",
              savings, unit, deal_type AS "dealType",
              valid_from AS "validFrom", valid_until AS "validUntil",
              description, image_url AS "imageUrl"
       FROM store_deals
       WHERE store_id = $1
         ${includeExpired === 'true' ? '' : 'AND valid_until >= NOW()'}
       ORDER BY savings DESC NULLS LAST
       LIMIT 200`,
      [storeId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching store deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// Create/update a deal (store owner or admin only)
router.post('/:storeId/deals', async (req, res) => {
  const { storeId } = req.params;
  const {
    itemName, category, originalPrice, salePrice, unit,
    dealType = 'weekly', validFrom, validUntil, description, imageUrl
  } = req.body;

  if (!itemName || !salePrice || !validUntil) {
    return res.status(400).json({ error: 'itemName, salePrice, and validUntil are required' });
  }

  try {
    const store = await db.query(
      'SELECT user_id, created_by FROM store_locations WHERE id = $1', [storeId]
    );
    if (!store.rows[0]) {
      return res.status(404).json({ error: 'Store not found' });
    }
    const owner = store.rows[0].user_id || store.rows[0].created_by;
    if (owner !== req.user.id && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only the store owner can add deals' });
    }

    const savings = originalPrice != null ? +(originalPrice - salePrice).toFixed(2) : null;
    const result = await db.query(
      `INSERT INTO store_deals
        (store_id, item_name, category, original_price, sale_price, savings,
         unit, deal_type, valid_from, valid_until, description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [storeId, itemName, category || null, originalPrice ?? null, salePrice,
       savings, unit || null, dealType, validFrom || null, validUntil,
       description || null, imageUrl || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating deal:', error);
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

// Get active digital coupons for a store
router.get('/:storeId/coupons', async (req, res) => {
  const { storeId } = req.params;

  try {
    const result = await db.query(
      `SELECT c.id, c.coupon_code AS "couponCode", c.item_name AS "itemName",
              c.category, c.discount_amount AS "discountAmount",
              c.discount_percent AS "discountPercent",
              c.min_purchase AS "minPurchase", c.max_discount AS "maxDiscount",
              c.valid_from AS "validFrom", c.valid_until AS "validUntil",
              c.usage_limit AS "usageLimit", c.description, c.terms,
              (uc.id IS NOT NULL) AS "isClipped"
       FROM digital_coupons c
       LEFT JOIN user_coupons uc
         ON uc.coupon_id = c.id AND uc.user_id = $2
       WHERE c.store_id = $1 AND c.valid_until >= NOW()
       ORDER BY c.discount_amount DESC NULLS LAST, c.discount_percent DESC NULLS LAST`,
      [storeId, req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching coupons:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// Get the user's clipped coupons (digital wallet)
router.get('/coupons/clipped', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT uc.id AS "clipId", uc.clipped_at AS "clippedAt",
              uc.used_at AS "usedAt", uc.list_id AS "listId",
              c.id, c.store_id AS "storeId", c.coupon_code AS "couponCode",
              c.item_name AS "itemName", c.category,
              c.discount_amount AS "discountAmount",
              c.discount_percent AS "discountPercent",
              c.valid_until AS "validUntil", c.description,
              COALESCE(sl.name, sl.store_name) AS "storeName"
       FROM user_coupons uc
       JOIN digital_coupons c ON uc.coupon_id = c.id
       LEFT JOIN store_locations sl ON c.store_id = sl.id
       WHERE uc.user_id = $1
       ORDER BY uc.used_at IS NOT NULL, uc.clipped_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching clipped coupons:', error);
    res.status(500).json({ error: 'Failed to fetch clipped coupons' });
  }
});

// Clip a coupon to the user's wallet
router.post('/coupons/:couponId/clip', async (req, res) => {
  const { couponId } = req.params;
  const { listId } = req.body;

  try {
    const coupon = await db.query(
      'SELECT id FROM digital_coupons WHERE id = $1 AND valid_until >= NOW()',
      [couponId]
    );
    if (!coupon.rows[0]) {
      return res.status(404).json({ error: 'Coupon not found or expired' });
    }

    const result = await db.query(
      `INSERT INTO user_coupons (user_id, coupon_id, list_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, coupon_id) DO NOTHING
       RETURNING *`,
      [req.user.id, couponId, listId || null]
    );
    res.status(201).json(result.rows[0] || { clipped: true });
  } catch (error) {
    console.error('Error clipping coupon:', error);
    res.status(500).json({ error: 'Failed to clip coupon' });
  }
});

// Unclip a coupon
router.delete('/coupons/:couponId/clip', async (req, res) => {
  try {
    await db.query(
      'DELETE FROM user_coupons WHERE user_id = $1 AND coupon_id = $2',
      [req.user.id, req.params.couponId]
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error unclipping coupon:', error);
    res.status(500).json({ error: 'Failed to unclip coupon' });
  }
});

module.exports = router;
