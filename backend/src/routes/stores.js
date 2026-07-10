const express = require('express');
const db = require('../database/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

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
          OR address ILIKE $1
          OR city ILIKE $1
          OR zip_code ILIKE $1
          OR state ILIKE $1
       ORDER BY store_chain, name
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
      [req.user.userId]
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
        [req.user.userId]
      );
    }

    const result = await db.query(
      `INSERT INTO user_favorite_stores (user_id, store_location_id, nickname, is_default)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, store_location_id) 
       DO UPDATE SET nickname = $3, is_default = $4
       RETURNING *`,
      [req.user.userId, store_location_id, nickname, is_default || false]
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
      [req.user.userId, req.params.storeLocationId]
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

module.exports = router;
