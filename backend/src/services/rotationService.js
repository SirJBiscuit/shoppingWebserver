const db = require('../database/db');

/**
 * Rotation Service - Smart suggestions for stock rotation and waste prevention
 */

/**
 * Generate rotation suggestions for a staging item
 * Checks existing inventory for similar items and suggests actions
 */
async function generateRotationSuggestions(userId, stagingItem) {
  const suggestions = [];
  
  try {
    // Find similar items in inventory
    const similarItems = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        CASE
          WHEN i.estimated_expiry_date IS NOT NULL THEN 
            EXTRACT(DAY FROM (i.estimated_expiry_date - CURRENT_DATE))
          ELSE NULL
        END as days_until_expiry
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1
        AND LOWER(it.name) = LOWER($2)
        AND i.storage_location = $3
      ORDER BY i.estimated_expiry_date ASC NULLS LAST
    `, [userId, stagingItem.item_name, stagingItem.storage_location]);

    // Check for items to use first
    for (const item of similarItems.rows) {
      const daysUntilExpiry = item.days_until_expiry;
      
      // Urgent - expiring today or tomorrow
      if (daysUntilExpiry !== null && daysUntilExpiry <= 1) {
        suggestions.push({
          inventory_item_id: item.id,
          suggestion_type: 'use_first',
          reason: `${item.item_name} expires ${daysUntilExpiry === 0 ? 'today' : 'tomorrow'}! Use before putting away new one.`,
          priority: 1
        });
      }
      // Important - expiring within 3 days
      else if (daysUntilExpiry !== null && daysUntilExpiry <= 3) {
        suggestions.push({
          inventory_item_id: item.id,
          suggestion_type: 'use_first',
          reason: `${item.item_name} expires in ${Math.ceil(daysUntilExpiry)} days. Use this one first.`,
          priority: 2
        });
      }
      // Opened items should be used first
      else if (item.is_opened) {
        const daysSinceOpened = item.opened_date 
          ? Math.floor((new Date() - new Date(item.opened_date)) / (1000 * 60 * 60 * 24))
          : null;
        
        suggestions.push({
          inventory_item_id: item.id,
          suggestion_type: 'use_first',
          reason: `${item.item_name} was opened ${daysSinceOpened ? daysSinceOpened + ' days ago' : 'recently'}. Use before new one.`,
          priority: 2
        });
      }
      // Suggest rotation for older items
      else if (item.bought_date) {
        const daysSinceBought = Math.floor((new Date() - new Date(item.bought_date)) / (1000 * 60 * 60 * 24));
        
        if (daysSinceBought > 7) {
          suggestions.push({
            inventory_item_id: item.id,
            suggestion_type: 'rotate',
            reason: `Move older ${item.item_name} to front, put new one in back (FIFO rotation).`,
            priority: 3
          });
        }
      }
    }

    // Check for expired or old items to discard
    const expiredItems = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        EXTRACT(DAY FROM (CURRENT_DATE - i.estimated_expiry_date)) as days_expired
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1
        AND i.storage_location = $2
        AND (
          i.estimated_expiry_date < CURRENT_DATE
          OR (i.is_opened = true AND i.opened_date < CURRENT_DATE - INTERVAL '7 days')
        )
      ORDER BY i.estimated_expiry_date ASC
      LIMIT 10
    `, [userId, stagingItem.storage_location]);

    for (const item of expiredItems.rows) {
      const daysExpired = item.days_expired || 0;
      
      suggestions.push({
        inventory_item_id: item.id,
        suggestion_type: 'discard',
        reason: daysExpired > 0 
          ? `${item.item_name} expired ${Math.ceil(daysExpired)} days ago. Consider discarding.`
          : `${item.item_name} has been opened for over a week. Check quality.`,
        priority: 1
      });
    }

    // Check for items expiring soon in the same location
    const expiringSoon = await db.query(`
      SELECT 
        i.*,
        it.name as item_name,
        EXTRACT(DAY FROM (i.estimated_expiry_date - CURRENT_DATE)) as days_until_expiry
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      WHERE i.user_id = $1
        AND i.storage_location = $2
        AND i.estimated_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 days'
        AND LOWER(it.name) != LOWER($3)
      ORDER BY i.estimated_expiry_date ASC
      LIMIT 5
    `, [userId, stagingItem.storage_location, stagingItem.item_name]);

    for (const item of expiringSoon.rows) {
      suggestions.push({
        inventory_item_id: item.id,
        suggestion_type: 'expires_soon',
        reason: `${item.item_name} expires in ${Math.ceil(item.days_until_expiry)} days. Use soon!`,
        priority: 2
      });
    }

    return suggestions;
  } catch (error) {
    console.error('Error generating rotation suggestions:', error);
    return [];
  }
}

/**
 * Save rotation suggestions to database
 */
async function saveRotationSuggestions(userId, stagingItemId, suggestions) {
  try {
    for (const suggestion of suggestions) {
      await db.query(`
        INSERT INTO rotation_suggestions (
          user_id, staging_item_id, inventory_item_id,
          suggestion_type, reason, priority
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [
        userId,
        stagingItemId,
        suggestion.inventory_item_id,
        suggestion.suggestion_type,
        suggestion.reason,
        suggestion.priority
      ]);
    }
  } catch (error) {
    console.error('Error saving rotation suggestions:', error);
    throw error;
  }
}

/**
 * Get all rotation suggestions for a staging item
 */
async function getRotationSuggestions(userId, stagingItemId) {
  try {
    const result = await db.query(`
      SELECT 
        rs.*,
        i.id as inventory_id,
        it.name as item_name,
        i.current_quantity,
        i.unit,
        i.estimated_expiry_date,
        i.is_opened,
        i.opened_date,
        i.bought_date
      FROM rotation_suggestions rs
      LEFT JOIN inventory i ON rs.inventory_item_id = i.id
      LEFT JOIN items it ON i.item_id = it.id
      WHERE rs.user_id = $1
        AND rs.staging_item_id = $2
        AND rs.action_taken = false
      ORDER BY rs.priority ASC, rs.created_at ASC
    `, [userId, stagingItemId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting rotation suggestions:', error);
    return [];
  }
}

/**
 * Mark suggestion as resolved
 */
async function resolveSuggestion(userId, suggestionId, actionType) {
  try {
    await db.query(`
      UPDATE rotation_suggestions
      SET action_taken = true,
          action_type = $3,
          resolved_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
    `, [suggestionId, userId, actionType]);
  } catch (error) {
    console.error('Error resolving suggestion:', error);
    throw error;
  }
}

/**
 * Get summary of all pending suggestions grouped by priority
 */
async function getSuggestionsSummary(userId) {
  try {
    const result = await db.query(`
      SELECT 
        priority,
        COUNT(*) as count,
        ARRAY_AGG(DISTINCT suggestion_type) as types
      FROM rotation_suggestions
      WHERE user_id = $1
        AND action_taken = false
      GROUP BY priority
      ORDER BY priority ASC
    `, [userId]);

    return result.rows;
  } catch (error) {
    console.error('Error getting suggestions summary:', error);
    return [];
  }
}

module.exports = {
  generateRotationSuggestions,
  saveRotationSuggestions,
  getRotationSuggestions,
  resolveSuggestion,
  getSuggestionsSummary
};
