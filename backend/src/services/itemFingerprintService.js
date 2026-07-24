const db = require('../database/db');
const validationService = require('./itemValidationService');

/**
 * Item Fingerprinting Service
 * Handles unique item identification and global learning
 */

/**
 * Generate or find fingerprint for an item
 * @param {Object} itemData - Item details (name, category, brand, barcode)
 * @returns {Promise<Object>} Fingerprint data with validation info
 */
async function getOrCreateFingerprint(itemData) {
  const { item_name, category, brand, barcode, store, price } = itemData;
  
  // First, validate and enhance the item data
  const validation = await validationService.validateAndEnhanceItem(itemData);
  
  if (!validation.valid) {
    return {
      success: false,
      reason: validation.reason,
      confidence: validation.confidence,
      fingerprint: null
    };
  }
  
  // If validation failed or requires review, flag it
  if (validation.enhancedData.requiresReview) {
    await validationService.flagForReview(itemData, validation.reason);
  }
  
  // Only create fingerprint if confidence is acceptable
  if (!validation.shouldCreateFingerprint) {
    return {
      success: false,
      reason: 'Item did not meet minimum confidence threshold',
      confidence: validation.confidence,
      fingerprint: null,
      requiresReview: true
    };
  }
  
  try {
    // Normalize the item name for matching
    const normalizedName = item_name.toLowerCase().trim();
    
    // Try to find existing fingerprint
    // Match by barcode (most accurate)
    if (barcode) {
      const barcodeMatch = await db.query(
        'SELECT * FROM item_fingerprints WHERE barcode = $1',
        [barcode]
      );
      if (barcodeMatch.rows.length > 0) {
        return barcodeMatch.rows[0];
      }
    }
    
    // Match by normalized name + category + brand
    const exactMatch = await db.query(
      `SELECT * FROM item_fingerprints 
       WHERE normalized_name = $1 
       AND (category = $2 OR $2 IS NULL)
       AND (brand = $3 OR $3 IS NULL)
       LIMIT 1`,
      [normalizedName, category, brand]
    );
    
    if (exactMatch.rows.length > 0) {
      // Update last_seen_at
      await db.query(
        'UPDATE item_fingerprints SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1',
        [exactMatch.rows[0].id]
      );
      return exactMatch.rows[0];
    }
    
    // No match found, create new fingerprint with validation data
    const fingerprintCode = await generateFingerprintCode(item_name, category);
    const enhanced = validation.enhancedData;
    
    const newFingerprint = await db.query(
      `INSERT INTO item_fingerprints 
       (fingerprint, item_name, normalized_name, category, brand, store, barcode, 
        total_instances, confidence_score, quality_score, food_types, nutritional_info,
        extracted_size, is_validated, requires_review, should_contribute_to_learning)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        fingerprintCode, item_name, normalizedName, category, brand, store, barcode,
        enhanced.confidence, enhanced.qualityScore, 
        JSON.stringify(enhanced.foodTypes), JSON.stringify(enhanced.nutritionalInfo),
        JSON.stringify(enhanced.extractedSize), false, enhanced.requiresReview,
        enhanced.shouldContributeToLearning
      ]
    );
    
    return {
      success: true,
      fingerprint: newFingerprint.rows[0],
      validation: enhanced
    };
  } catch (error) {
    console.error('Error in getOrCreateFingerprint:', error);
    throw error;
  }
}

/**
 * Generate a unique fingerprint code
 * Format: CATEGORY-ITEMCODE-NUMBER (e.g., BRD-WHT-001)
 */
async function generateFingerprintCode(itemName, category) {
  const normalizedName = itemName.toLowerCase().trim();
  
  // Generate category code (first 3 letters)
  let categoryCode = 'GEN';
  if (category) {
    categoryCode = category.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  }
  
  // Generate item code (first 3 letters of item name)
  const itemCode = normalizedName.replace(/[^a-zA-Z]/g, '').substring(0, 3).toUpperCase();
  
  // Get counter for this item type
  const counterResult = await db.query(
    'SELECT COUNT(*) as count FROM item_fingerprints WHERE normalized_name = $1',
    [normalizedName]
  );
  const counter = parseInt(counterResult.rows[0].count) + 1;
  
  // Generate fingerprint
  const fingerprint = `${categoryCode}-${itemCode}-${counter.toString().padStart(3, '0')}`;
  
  return fingerprint;
}

/**
 * Create an item instance (tracking individual item)
 */
async function createItemInstance(inventoryId, fingerprintId, userId, instanceData) {
  const {
    bought_date,
    opened_date,
    expiry_date,
    purchase_price,
    purchase_store,
    user_shelf_life_estimate
  } = instanceData;
  
  try {
    const result = await db.query(
      `INSERT INTO item_instances 
       (fingerprint_id, inventory_id, user_id, bought_date, opened_date, expiry_date,
        purchase_price, purchase_store, user_shelf_life_estimate)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [fingerprintId, inventoryId, userId, bought_date, opened_date, expiry_date,
       purchase_price, purchase_store, user_shelf_life_estimate]
    );
    
    // Increment total_instances for fingerprint
    await db.query(
      'UPDATE item_fingerprints SET total_instances = total_instances + 1 WHERE id = $1',
      [fingerprintId]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating item instance:', error);
    throw error;
  }
}

/**
 * Record item disposal and contribute to learning
 */
async function recordDisposal(instanceId, disposalData) {
  const { disposal_date, disposal_reason } = disposalData;
  
  try {
    // Get instance data
    const instance = await db.query(
      'SELECT * FROM item_instances WHERE id = $1',
      [instanceId]
    );
    
    if (instance.rows.length === 0) {
      throw new Error('Instance not found');
    }
    
    const instanceData = instance.rows[0];
    
    // Calculate actual shelf life
    const boughtDate = new Date(instanceData.bought_date);
    const disposalDate = new Date(disposal_date);
    const actualShelfLife = Math.ceil((disposalDate - boughtDate) / (1000 * 60 * 60 * 24));
    
    // Update instance
    await db.query(
      `UPDATE item_instances 
       SET actual_disposal_date = $1, 
           disposal_reason = $2, 
           actual_shelf_life = $3,
           contributed_to_learning = TRUE,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [disposal_date, disposal_reason, actualShelfLife, instanceId]
    );
    
    // Update fingerprint learning data
    await updateFingerprintLearning(instanceData.fingerprint_id);
    
    return { actualShelfLife, contributed: true };
  } catch (error) {
    console.error('Error recording disposal:', error);
    throw error;
  }
}

/**
 * Update fingerprint learning data based on all instances
 */
async function updateFingerprintLearning(fingerprintId) {
  try {
    // Calculate average shelf life from all instances
    const stats = await db.query(
      `SELECT 
         AVG(actual_shelf_life) as avg_shelf_life,
         AVG(purchase_price) as avg_price,
         MODE() WITHIN GROUP (ORDER BY purchase_store) as common_store
       FROM item_instances
       WHERE fingerprint_id = $1 
       AND actual_shelf_life IS NOT NULL
       AND contributed_to_learning = TRUE`,
      [fingerprintId]
    );
    
    if (stats.rows.length > 0 && stats.rows[0].avg_shelf_life) {
      await db.query(
        `UPDATE item_fingerprints 
         SET avg_shelf_life_days = $1,
             avg_price = $2,
             store = $3,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [
          stats.rows[0].avg_shelf_life,
          stats.rows[0].avg_price,
          stats.rows[0].common_store,
          fingerprintId
        ]
      );
    }
  } catch (error) {
    console.error('Error updating fingerprint learning:', error);
    throw error;
  }
}

/**
 * Get shelf life prediction for an item
 */
async function getShelfLifePrediction(fingerprintId, storageLocation) {
  try {
    // Check if we have a prediction
    const prediction = await db.query(
      `SELECT * FROM shelf_life_predictions 
       WHERE fingerprint_id = $1 AND storage_location = $2`,
      [fingerprintId, storageLocation]
    );
    
    if (prediction.rows.length > 0) {
      return prediction.rows[0];
    }
    
    // No prediction yet, use fingerprint average
    const fingerprint = await db.query(
      'SELECT * FROM item_fingerprints WHERE id = $1',
      [fingerprintId]
    );
    
    if (fingerprint.rows.length > 0 && fingerprint.rows[0].avg_shelf_life_days) {
      return {
        predicted_days: fingerprint.rows[0].avg_shelf_life_days,
        confidence_score: fingerprint.rows[0].total_instances >= 5 ? 0.8 : 0.5,
        sample_size: fingerprint.rows[0].total_instances
      };
    }
    
    // No data yet, return default
    return {
      predicted_days: 7, // Default 7 days
      confidence_score: 0.3,
      sample_size: 0
    };
  } catch (error) {
    console.error('Error getting shelf life prediction:', error);
    throw error;
  }
}

/**
 * Get global learning statistics
 */
async function getGlobalStats() {
  try {
    const stats = await db.query(
      'SELECT * FROM global_learning_stats ORDER BY stat_type'
    );
    
    // Get additional stats
    const topCategories = await db.query(
      `SELECT category, COUNT(*) as count 
       FROM item_fingerprints 
       WHERE category IS NOT NULL
       GROUP BY category 
       ORDER BY count DESC 
       LIMIT 5`
    );
    
    const recentFingerprints = await db.query(
      `SELECT * FROM item_fingerprints 
       ORDER BY created_at DESC 
       LIMIT 10`
    );
    
    return {
      stats: stats.rows,
      topCategories: topCategories.rows,
      recentFingerprints: recentFingerprints.rows
    };
  } catch (error) {
    console.error('Error getting global stats:', error);
    throw error;
  }
}

/**
 * Search for similar items by name
 */
async function findSimilarItems(itemName, limit = 10) {
  const normalizedName = itemName.toLowerCase().trim();
  
  try {
    const results = await db.query(
      `SELECT *, 
              similarity(normalized_name, $1) as similarity_score
       FROM item_fingerprints
       WHERE normalized_name % $1
       ORDER BY similarity_score DESC
       LIMIT $2`,
      [normalizedName, limit]
    );
    
    return results.rows;
  } catch (error) {
    console.error('Error finding similar items:', error);
    // If similarity extension not available, use LIKE
    const fallbackResults = await db.query(
      `SELECT * FROM item_fingerprints
       WHERE normalized_name ILIKE $1
       ORDER BY total_instances DESC
       LIMIT $2`,
      ['%' + normalizedName + '%', limit]
    );
    return fallbackResults.rows;
  }
}

module.exports = {
  getOrCreateFingerprint,
  createItemInstance,
  recordDisposal,
  updateFingerprintLearning,
  getShelfLifePrediction,
  getGlobalStats,
  findSimilarItems
};
