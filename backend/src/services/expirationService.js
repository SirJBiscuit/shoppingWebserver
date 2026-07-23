const db = require('../database/db');

/**
 * Smart Expiration Service
 * Calculates expiration dates with learning algorithm
 */

/**
 * Calculate estimated expiration date for an item
 * @param {Object} params - Item parameters
 * @param {string} params.itemName - Name of the item
 * @param {string} params.storageLocation - Where item is stored (pantry/fridge/freezer/custom)
 * @param {Date} params.boughtDate - When item was purchased
 * @param {Date} params.openedDate - When item was opened (optional)
 * @param {number} params.userId - User ID for personalized learning
 * @returns {Object} { estimatedExpiryDate, confidence, shelfLifeDays }
 */
async function calculateExpiration(params) {
  const { itemName, storageLocation, boughtDate, openedDate, userId } = params;
  
  // Normalize item name for matching
  const normalizedName = itemName.toLowerCase().trim();
  
  // 1. Try to get user's learned data first (highest priority)
  const userLearned = await getUserLearnedExpiration(userId, normalizedName, storageLocation);
  
  if (userLearned && userLearned.confidence >= 60) {
    // High confidence in user's learned data
    const expiryDate = addDays(boughtDate, userLearned.shelfLifeDays);
    return {
      estimatedExpiryDate: expiryDate,
      confidence: userLearned.confidence,
      shelfLifeDays: userLearned.shelfLifeDays,
      source: 'user_learned'
    };
  }
  
  // 2. Get default expiration time from database
  const defaultExpiry = await getDefaultExpiration(normalizedName, storageLocation);
  
  if (defaultExpiry) {
    // If we have some user data but low confidence, blend it with default
    if (userLearned && userLearned.confidence > 0) {
      const blendedShelfLife = Math.round(
        (defaultExpiry.shelfLifeDays * (100 - userLearned.confidence) / 100) +
        (userLearned.shelfLifeDays * userLearned.confidence / 100)
      );
      const expiryDate = addDays(boughtDate, blendedShelfLife);
      return {
        estimatedExpiryDate: expiryDate,
        confidence: Math.round((defaultExpiry.confidence + userLearned.confidence) / 2),
        shelfLifeDays: blendedShelfLife,
        source: 'blended'
      };
    }
    
    // Use default data
    const expiryDate = addDays(boughtDate, defaultExpiry.shelfLifeDays);
    return {
      estimatedExpiryDate: expiryDate,
      confidence: defaultExpiry.confidence,
      shelfLifeDays: defaultExpiry.shelfLifeDays,
      source: 'default'
    };
  }
  
  // 3. Fallback to generic defaults based on storage location
  const genericDefaults = {
    'fridge': 7,
    'freezer': 90,
    'pantry': 14
  };
  
  const shelfLifeDays = genericDefaults[storageLocation] || 7;
  const expiryDate = addDays(boughtDate, shelfLifeDays);
  
  return {
    estimatedExpiryDate: expiryDate,
    confidence: 30, // Low confidence for generic estimate
    shelfLifeDays,
    source: 'generic'
  };
}

/**
 * Get user's learned expiration data
 */
async function getUserLearnedExpiration(userId, itemName, storageLocation) {
  try {
    // Get last 5 instances of this item for this user
    const result = await db.query(`
      SELECT 
        actual_shelf_life,
        confidence_after,
        created_at
      FROM item_expiration_learning
      WHERE user_id = $1 
        AND LOWER(item_name) = LOWER($2)
        AND storage_location = $3
      ORDER BY created_at DESC
      LIMIT 5
    `, [userId, itemName, storageLocation]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Calculate weighted average (more recent = more weight)
    const weights = [0.4, 0.3, 0.2, 0.07, 0.03];
    let weightedSum = 0;
    let totalWeight = 0;
    
    result.rows.forEach((row, index) => {
      const weight = weights[index] || 0.01;
      weightedSum += row.actual_shelf_life * weight;
      totalWeight += weight;
    });
    
    const avgShelfLife = Math.round(weightedSum / totalWeight);
    
    // Confidence increases with more data points (max at 5 instances)
    const confidence = Math.min(100, result.rows.length * 20);
    
    return {
      shelfLifeDays: avgShelfLife,
      confidence,
      dataPoints: result.rows.length
    };
  } catch (error) {
    console.error('Error getting user learned expiration:', error);
    return null;
  }
}

/**
 * Get default expiration time from database
 */
async function getDefaultExpiration(itemName, storageLocation) {
  try {
    const result = await db.query(`
      SELECT shelf_life_days, confidence, source
      FROM default_expiration_times
      WHERE LOWER(item_name) = LOWER($1)
        AND storage_location = $2
      LIMIT 1
    `, [itemName, storageLocation]);
    
    if (result.rows.length > 0) {
      return {
        shelfLifeDays: result.rows[0].shelf_life_days,
        confidence: result.rows[0].confidence,
        source: result.rows[0].source
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting default expiration:', error);
    return null;
  }
}

/**
 * Record user feedback on expiration (learning)
 * @param {Object} params - Feedback parameters
 * @param {number} params.userId - User ID
 * @param {number} params.inventoryId - Inventory item ID
 * @param {Date} params.actualExpiryDate - When item actually went bad
 * @param {string} params.feedback - 'went_bad' or 'still_good'
 */
async function recordExpirationFeedback(params) {
  const { userId, inventoryId, actualExpiryDate, feedback } = params;
  
  try {
    // Get the inventory item
    const itemResult = await db.query(`
      SELECT 
        item_name,
        storage_location,
        bought_date,
        opened_date,
        estimated_expiry_date,
        expiry_confidence
      FROM inventory
      WHERE id = $1 AND user_id = $2
    `, [inventoryId, userId]);
    
    if (itemResult.rows.length === 0) {
      throw new Error('Inventory item not found');
    }
    
    const item = itemResult.rows[0];
    
    // Calculate shelf lives
    const estimatedShelfLife = daysBetween(item.bought_date, item.estimated_expiry_date);
    const actualShelfLife = daysBetween(item.bought_date, actualExpiryDate);
    const difference = actualShelfLife - estimatedShelfLife;
    
    // Get current confidence for this item
    const currentLearned = await getUserLearnedExpiration(
      userId,
      item.item_name,
      item.storage_location
    );
    
    const confidenceBefore = currentLearned ? currentLearned.confidence : 0;
    
    // Record the learning data
    await db.query(`
      INSERT INTO item_expiration_learning (
        user_id,
        item_name,
        storage_location,
        bought_date,
        opened_date,
        estimated_expiry_date,
        actual_expiry_date,
        estimated_shelf_life,
        actual_shelf_life,
        difference,
        confidence_before,
        confidence_after
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (user_id, item_name, storage_location, bought_date) 
      DO UPDATE SET
        actual_expiry_date = EXCLUDED.actual_expiry_date,
        actual_shelf_life = EXCLUDED.actual_shelf_life,
        difference = EXCLUDED.difference,
        confidence_after = EXCLUDED.confidence_after
    `, [
      userId,
      item.item_name,
      item.storage_location,
      item.bought_date,
      item.opened_date,
      item.estimated_expiry_date,
      actualExpiryDate,
      estimatedShelfLife,
      actualShelfLife,
      difference,
      confidenceBefore,
      Math.min(100, confidenceBefore + 20) // Increase confidence
    ]);
    
    // Update the inventory item with actual expiry date
    await db.query(`
      UPDATE inventory
      SET actual_expiry_date = $1
      WHERE id = $2
    `, [actualExpiryDate, inventoryId]);
    
    // Get new confidence after learning
    const newLearned = await getUserLearnedExpiration(
      userId,
      item.item_name,
      item.storage_location
    );
    
    return {
      success: true,
      estimatedShelfLife,
      actualShelfLife,
      difference,
      confidenceBefore,
      confidenceAfter: newLearned ? newLearned.confidence : confidenceBefore + 20,
      message: difference > 0 
        ? `Item lasted ${Math.abs(difference)} days longer than expected`
        : `Item expired ${Math.abs(difference)} days earlier than expected`
    };
  } catch (error) {
    console.error('Error recording expiration feedback:', error);
    throw error;
  }
}

/**
 * Get expiration status and color
 * @param {Date} expiryDate - Expiration date
 * @returns {Object} { status, color, daysUntilExpiry, urgent }
 */
function getExpirationStatus(expiryDate) {
  if (!expiryDate) {
    return { status: 'unknown', color: 'gray', daysUntilExpiry: null, urgent: false };
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  
  const daysUntilExpiry = daysBetween(today, expiry);
  
  if (daysUntilExpiry < 0) {
    return {
      status: 'discard',
      color: '#000000', // Black
      daysUntilExpiry,
      urgent: true,
      message: `Expired ${Math.abs(daysUntilExpiry)} days ago`
    };
  } else if (daysUntilExpiry === 0) {
    return {
      status: 'expired',
      color: '#EF4444', // Red
      daysUntilExpiry,
      urgent: true,
      message: 'Expires today'
    };
  } else if (daysUntilExpiry <= 3) {
    return {
      status: 'urgent',
      color: '#F97316', // Orange
      daysUntilExpiry,
      urgent: true,
      message: `${daysUntilExpiry} days left`
    };
  } else if (daysUntilExpiry <= 7) {
    return {
      status: 'use_soon',
      color: '#EAB308', // Yellow
      daysUntilExpiry,
      urgent: false,
      message: `${daysUntilExpiry} days left`
    };
  } else {
    return {
      status: 'fresh',
      color: '#22C55E', // Green
      daysUntilExpiry,
      urgent: false,
      message: `${daysUntilExpiry} days left`
    };
  }
}

/**
 * Extend expiration date (user says "still good")
 * @param {number} inventoryId - Inventory item ID
 * @param {number} extensionDays - Days to extend (default 3)
 */
async function extendExpiration(inventoryId, extensionDays = 3) {
  try {
    const result = await db.query(`
      UPDATE inventory
      SET estimated_expiry_date = estimated_expiry_date + INTERVAL '${extensionDays} days',
          manual_expiry_date = estimated_expiry_date + INTERVAL '${extensionDays} days'
      WHERE id = $1
      RETURNING estimated_expiry_date
    `, [inventoryId]);
    
    return {
      success: true,
      newExpiryDate: result.rows[0].estimated_expiry_date,
      message: `Extended expiration by ${extensionDays} days`
    };
  } catch (error) {
    console.error('Error extending expiration:', error);
    throw error;
  }
}

// ============================================
// Helper Functions
// ============================================

function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  d1.setHours(0, 0, 0, 0);
  d2.setHours(0, 0, 0, 0);
  const diffTime = d2 - d1;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

module.exports = {
  calculateExpiration,
  recordExpirationFeedback,
  getExpirationStatus,
  extendExpiration,
  getUserLearnedExpiration,
  getDefaultExpiration
};
