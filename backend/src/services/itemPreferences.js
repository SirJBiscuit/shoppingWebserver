const db = require('../database/db');

/**
 * Update or create item preferences when user edits/adds an item
 */
async function updateItemPreferences(userId, itemData) {
  const { item_name, item_icon, category, price, quantity, unit } = itemData;
  
  try {
    // Check if item exists
    const existingItem = await db.query(
      'SELECT id, purchase_count FROM items WHERE user_id = $1 AND LOWER(name) = LOWER($2)',
      [userId, item_name]
    );

    if (existingItem.rows.length > 0) {
      // Update existing item
      const item = existingItem.rows[0];
      await db.query(
        `UPDATE items 
         SET preferred_icon = COALESCE($1, preferred_icon),
             category = COALESCE($2, category),
             average_price = COALESCE($3, average_price),
             preferred_quantity = COALESCE($4, preferred_quantity),
             preferred_unit = COALESCE($5, preferred_unit),
             purchase_count = purchase_count + 1,
             last_purchased = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [item_icon, category, price, quantity, unit, item.id]
      );
      
      return item.id;
    } else {
      // Create new item
      const result = await db.query(
        `INSERT INTO items 
         (user_id, name, preferred_icon, category, average_price, preferred_quantity, preferred_unit, purchase_count, last_purchased)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 1, CURRENT_TIMESTAMP)
         RETURNING id`,
        [userId, item_name, item_icon, category, price, quantity, unit]
      );
      
      return result.rows[0].id;
    }
  } catch (error) {
    console.error('Error updating item preferences:', error);
    throw error;
  }
}

/**
 * Get item preferences for autocomplete/suggestions
 */
async function getItemPreferences(userId, searchTerm = '') {
  try {
    const query = searchTerm
      ? `SELECT name, preferred_icon, category, average_price, preferred_quantity, preferred_unit, purchase_count
         FROM items 
         WHERE user_id = $1 AND LOWER(name) LIKE LOWER($2)
         ORDER BY purchase_count DESC, last_purchased DESC
         LIMIT 10`
      : `SELECT name, preferred_icon, category, average_price, preferred_quantity, preferred_unit, purchase_count
         FROM items 
         WHERE user_id = $1
         ORDER BY purchase_count DESC, last_purchased DESC
         LIMIT 50`;
    
    const params = searchTerm ? [userId, `%${searchTerm}%`] : [userId];
    const result = await db.query(query, params);
    
    return result.rows;
  } catch (error) {
    console.error('Error getting item preferences:', error);
    throw error;
  }
}

/**
 * Get specific item preferences
 */
async function getItemPreference(userId, itemName) {
  try {
    const result = await db.query(
      `SELECT name, preferred_icon, category, average_price, preferred_quantity, preferred_unit
       FROM items 
       WHERE user_id = $1 AND LOWER(name) = LOWER($2)`,
      [userId, itemName]
    );
    
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting item preference:', error);
    throw error;
  }
}

module.exports = {
  updateItemPreferences,
  getItemPreferences,
  getItemPreference
};
