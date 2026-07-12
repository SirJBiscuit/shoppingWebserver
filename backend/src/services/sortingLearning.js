// Service to learn user shopping patterns and improve sorting

const db = require('../database/db');

/**
 * Record when a user checks off an item
 * This helps learn the order they shop in
 */
async function recordItemCheckOff(userId, listId, itemId, checkOffOrder) {
  try {
    await db.query(
      `INSERT INTO item_check_history (user_id, list_id, item_id, check_off_order, checked_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [userId, listId, itemId, checkOffOrder]
    );
  } catch (error) {
    console.error('Error recording check-off:', error);
  }
}

/**
 * Learn category ordering based on user's shopping patterns
 */
async function learnCategoryOrder(userId, storeId = null) {
  try {
    const query = storeId
      ? `SELECT sli.category, AVG(ich.check_off_order) as avg_order, COUNT(*) as frequency
         FROM item_check_history ich
         JOIN shopping_list_items sli ON ich.item_id = sli.id
         JOIN shopping_lists sl ON ich.list_id = sl.id
         WHERE ich.user_id = $1 AND sl.store_id = $2
         GROUP BY sli.category
         ORDER BY avg_order ASC`
      : `SELECT sli.category, AVG(ich.check_off_order) as avg_order, COUNT(*) as frequency
         FROM item_check_history ich
         JOIN shopping_list_items sli ON ich.item_id = sli.id
         WHERE ich.user_id = $1
         GROUP BY sli.category
         ORDER BY avg_order ASC`;

    const params = storeId ? [userId, storeId] : [userId];
    const result = await db.query(query, params);

    return result.rows;
  } catch (error) {
    console.error('Error learning category order:', error);
    return [];
  }
}

/**
 * Get personalized sort order for a user
 */
async function getPersonalizedSortOrder(userId, storeId = null) {
  try {
    const learnedOrder = await learnCategoryOrder(userId, storeId);
    
    // Convert to category -> order mapping
    const sortOrder = {};
    learnedOrder.forEach((row, index) => {
      sortOrder[row.category] = index + 1;
    });

    return sortOrder;
  } catch (error) {
    console.error('Error getting personalized sort:', error);
    return {};
  }
}

/**
 * Update store template based on aggregated user patterns
 */
async function updateStoreTemplate(storeId) {
  try {
    // Get all users' patterns for this store
    const result = await db.query(
      `SELECT sli.category, AVG(ich.check_off_order) as avg_order, COUNT(*) as frequency
       FROM item_check_history ich
       JOIN shopping_list_items sli ON ich.item_id = sli.id
       JOIN shopping_lists sl ON ich.list_id = sl.id
       WHERE sl.store_id = $1
       GROUP BY sli.category
       HAVING COUNT(*) >= 5
       ORDER BY avg_order ASC`,
      [storeId]
    );

    // Find or create template for this store
    const templateResult = await db.query(
      `SELECT id FROM store_sort_templates WHERE store_id = $1 LIMIT 1`,
      [storeId]
    );

    let templateId;
    if (templateResult.rows.length === 0) {
      // Create new template
      const newTemplate = await db.query(
        `INSERT INTO store_sort_templates (store_id, name, description, is_default)
         VALUES ($1, $2, $3, false)
         RETURNING id`,
        [storeId, 'Learned from usage', 'Auto-generated from user shopping patterns']
      );
      templateId = newTemplate.rows[0].id;
    } else {
      templateId = templateResult.rows[0].id;
    }

    // Clear existing category orders
    await db.query(
      'DELETE FROM template_category_order WHERE template_id = $1',
      [templateId]
    );

    // Insert learned category orders
    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows[i];
      await db.query(
        `INSERT INTO template_category_order (template_id, category_name, sort_order)
         VALUES ($1, $2, $3)`,
        [templateId, row.category, i + 1]
      );
    }

    return templateId;
  } catch (error) {
    console.error('Error updating store template:', error);
    return null;
  }
}

module.exports = {
  recordItemCheckOff,
  learnCategoryOrder,
  getPersonalizedSortOrder,
  updateStoreTemplate
};
