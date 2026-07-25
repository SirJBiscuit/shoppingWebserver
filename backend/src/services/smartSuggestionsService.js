const db = require('../config/database');

/**
 * Smart Suggestions Service
 * Analyzes user behavior and provides intelligent shopping recommendations
 */

/**
 * Check if user already has an item in their inventory
 */
async function checkInventoryForItem(userId, itemName) {
  try {
    const result = await db.query(`
      SELECT 
        i.id,
        i.current_quantity,
        i.unit,
        i.storage_location,
        i.estimated_expiry_date,
        it.name as item_name,
        csl.name as custom_location_name,
        CASE 
          WHEN i.estimated_expiry_date IS NULL THEN NULL
          WHEN i.estimated_expiry_date < CURRENT_DATE THEN 0
          ELSE EXTRACT(DAY FROM (i.estimated_expiry_date - CURRENT_DATE))::INTEGER
        END as days_until_expiry
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.user_id = $1 
        AND LOWER(it.name) = LOWER($2)
        AND i.current_quantity > 0
      ORDER BY i.estimated_expiry_date ASC NULLS LAST
      LIMIT 1
    `, [userId, itemName]);

    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows[0];
    return {
      hasItem: true,
      inventoryId: item.id,
      quantity: parseFloat(item.current_quantity),
      unit: item.unit,
      location: item.custom_location_name || item.storage_location,
      expiresIn: item.days_until_expiry,
      isExpired: item.days_until_expiry !== null && item.days_until_expiry <= 0,
      isExpiringSoon: item.days_until_expiry !== null && item.days_until_expiry <= 3
    };
  } catch (error) {
    console.error('Error checking inventory:', error);
    return null;
  }
}

/**
 * Analyze purchase patterns and suggest reorder amount
 */
async function getSmartReorderSuggestion(userId, itemName) {
  try {
    // Get purchase history from inventory_history and current inventory
    const historyResult = await db.query(`
      SELECT 
        bought_date,
        quantity,
        removed_date,
        EXTRACT(DAY FROM (removed_date - bought_date))::INTEGER as days_lasted
      FROM inventory_history
      WHERE user_id = $1 
        AND LOWER(item_name) = LOWER($2)
        AND bought_date IS NOT NULL
        AND removed_date IS NOT NULL
        AND removal_reason IN ('used_up', 'went_bad', 'bulk_delete')
      ORDER BY bought_date DESC
      LIMIT 10
    `, [userId, itemName]);

    if (historyResult.rows.length < 2) {
      // Not enough data for smart suggestions
      return null;
    }

    const purchases = historyResult.rows;
    
    // Calculate average days between purchases
    const avgDaysLasted = purchases.reduce((sum, p) => sum + (p.days_lasted || 0), 0) / purchases.length;
    
    // Calculate average quantity purchased
    const avgQuantity = purchases.reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0) / purchases.length;
    
    // Get most common unit
    const units = purchases.map(p => p.unit).filter(Boolean);
    const mostCommonUnit = units.length > 0 ? units[0] : 'units';

    // Calculate suggested amount (round to nearest 0.5 or whole number)
    let suggestedAmount = Math.round(avgQuantity * 2) / 2;
    if (suggestedAmount < 1) suggestedAmount = 1;

    return {
      hasSuggestion: true,
      avgDays: Math.round(avgDaysLasted),
      suggestedAmount,
      unit: mostCommonUnit,
      confidence: Math.min(purchases.length / 5, 1), // 0-1 scale, max at 5 purchases
      purchaseCount: purchases.length
    };
  } catch (error) {
    console.error('Error getting reorder suggestion:', error);
    return null;
  }
}

/**
 * Check if item is running low based on usage patterns
 */
async function checkLowStock(userId, itemId) {
  try {
    const result = await db.query(`
      SELECT 
        i.current_quantity,
        i.unit,
        it.name as item_name,
        i.bought_date
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      WHERE i.id = $1 AND i.user_id = $2
    `, [itemId, userId]);

    if (result.rows.length === 0) {
      return null;
    }

    const item = result.rows[0];
    const currentAmount = parseFloat(item.current_quantity);

    // Get usage history
    const historyResult = await db.query(`
      SELECT 
        quantity,
        bought_date,
        removed_date,
        EXTRACT(DAY FROM (removed_date - bought_date))::INTEGER as days_lasted
      FROM inventory_history
      WHERE user_id = $1 
        AND LOWER(item_name) = LOWER($2)
        AND bought_date IS NOT NULL
        AND removed_date IS NOT NULL
      ORDER BY bought_date DESC
      LIMIT 5
    `, [userId, item.item_name]);

    if (historyResult.rows.length === 0) {
      // No history, use simple threshold
      return currentAmount < 1 ? {
        isLow: true,
        currentAmount,
        unit: item.unit,
        avgUsage: null
      } : null;
    }

    // Calculate average usage per week
    const avgDaysLasted = historyResult.rows.reduce((sum, p) => sum + (p.days_lasted || 0), 0) / historyResult.rows.length;
    const avgQuantity = historyResult.rows.reduce((sum, p) => sum + parseFloat(p.quantity || 0), 0) / historyResult.rows.length;
    const avgUsagePerWeek = (avgQuantity / avgDaysLasted) * 7;

    // Consider low if less than 3 days worth remaining
    const daysRemaining = currentAmount / (avgUsagePerWeek / 7);
    const isLow = daysRemaining < 3;

    return isLow ? {
      isLow: true,
      currentAmount,
      unit: item.unit,
      avgUsage: avgUsagePerWeek.toFixed(1),
      daysRemaining: Math.round(daysRemaining)
    } : null;
  } catch (error) {
    console.error('Error checking low stock:', error);
    return null;
  }
}

/**
 * Get items expiring soon that should be added to shopping list
 */
async function getExpiringItemsSuggestions(userId, daysThreshold = 3) {
  try {
    const result = await db.query(`
      SELECT 
        i.id,
        it.name as item_name,
        i.current_quantity,
        i.unit,
        i.storage_location,
        i.estimated_expiry_date,
        csl.name as custom_location_name,
        EXTRACT(DAY FROM (i.estimated_expiry_date - CURRENT_DATE))::INTEGER as days_until_expiry
      FROM inventory i
      LEFT JOIN items it ON i.item_id = it.id
      LEFT JOIN custom_storage_locations csl ON i.custom_location_id = csl.id
      WHERE i.user_id = $1 
        AND i.estimated_expiry_date IS NOT NULL
        AND i.estimated_expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '${daysThreshold} days'
        AND i.current_quantity > 0
      ORDER BY i.estimated_expiry_date ASC
    `, [userId]);

    return result.rows.map(item => ({
      inventoryId: item.id,
      itemName: item.item_name,
      quantity: parseFloat(item.current_quantity),
      unit: item.unit,
      location: item.custom_location_name || item.storage_location,
      daysUntilExpiry: item.days_until_expiry,
      expiryDate: item.estimated_expiry_date
    }));
  } catch (error) {
    console.error('Error getting expiring items:', error);
    return [];
  }
}

/**
 * Calculate expiration from sell-by date
 * Sell-by date is typically 2-7 days before actual expiration depending on product type
 */
function calculateExpirationFromSellBy(sellByDate, category, storageLocation) {
  const sellBy = new Date(sellByDate);
  let daysToAdd = 3; // Default: 3 days after sell-by

  // Adjust based on category and storage
  const categoryAdjustments = {
    'dairy': { pantry: 0, fridge: 5, freezer: 60 },
    'meat': { pantry: 0, fridge: 2, freezer: 90 },
    'produce': { pantry: 3, fridge: 7, freezer: 180 },
    'bread': { pantry: 2, fridge: 7, freezer: 90 },
    'eggs': { pantry: 0, fridge: 21, freezer: 180 },
    'cheese': { pantry: 0, fridge: 14, freezer: 180 },
    'yogurt': { pantry: 0, fridge: 7, freezer: 30 },
    'milk': { pantry: 0, fridge: 5, freezer: 90 }
  };

  const adjustment = categoryAdjustments[category?.toLowerCase()];
  if (adjustment && adjustment[storageLocation]) {
    daysToAdd = adjustment[storageLocation];
  }

  const expirationDate = new Date(sellBy);
  expirationDate.setDate(expirationDate.getDate() + daysToAdd);

  return {
    estimatedExpiryDate: expirationDate,
    daysAfterSellBy: daysToAdd,
    confidence: adjustment ? 90 : 70 // Higher confidence if we have category data
  };
}

module.exports = {
  checkInventoryForItem,
  getSmartReorderSuggestion,
  checkLowStock,
  getExpiringItemsSuggestions,
  calculateExpirationFromSellBy
};
