const db = require('../database/db');

/**
 * Item Validation Service
 * Validates items before creating fingerprints to prevent bad data
 */

// Comprehensive food/household item categories
const VALID_CATEGORIES = [
  'Produce', 'Dairy & Eggs', 'Meat & Seafood', 'Bakery & Bread',
  'Grains & Pasta', 'Canned & Jarred', 'Frozen Foods', 'Snacks & Sweets',
  'Beverages', 'Condiments & Sauces', 'Spices & Seasonings', 'Oils & Vinegars',
  'Baking Supplies', 'Breakfast Foods', 'Baby Food', 'Pet Food',
  'Household Supplies', 'Cleaning Products', 'Paper Products', 'Personal Care',
  'Health & Wellness', 'Vitamins & Supplements', 'Leftovers', 'Prepared Foods',
  'Deli', 'Cheese', 'International Foods', 'Organic', 'Gluten-Free', 'Vegan',
  'Other'
];

// Common food types for classification
const FOOD_TYPES = {
  fruit: ['apple', 'banana', 'orange', 'grape', 'berry', 'melon', 'peach', 'pear', 'plum', 'cherry', 'kiwi', 'mango', 'pineapple', 'strawberry', 'blueberry', 'raspberry', 'watermelon', 'cantaloupe', 'lemon', 'lime', 'avocado', 'tomato'],
  vegetable: ['carrot', 'broccoli', 'lettuce', 'spinach', 'kale', 'cabbage', 'celery', 'cucumber', 'pepper', 'onion', 'garlic', 'potato', 'corn', 'peas', 'beans', 'squash', 'zucchini', 'eggplant', 'asparagus', 'mushroom'],
  grain: ['rice', 'pasta', 'bread', 'cereal', 'oats', 'wheat', 'quinoa', 'barley', 'couscous', 'flour', 'cornmeal'],
  protein: ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'eggs', 'tofu', 'beans', 'lentils', 'nuts', 'seeds'],
  dairy: ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'ice cream'],
  beverage: ['water', 'juice', 'soda', 'coffee', 'tea', 'milk', 'beer', 'wine', 'sports drink', 'energy drink'],
  condiment: ['ketchup', 'mustard', 'mayo', 'sauce', 'dressing', 'oil', 'vinegar', 'salt', 'pepper', 'spice'],
  snack: ['chips', 'crackers', 'cookies', 'candy', 'chocolate', 'popcorn', 'pretzels', 'nuts'],
  frozen: ['pizza', 'ice cream', 'vegetables', 'meals', 'meat', 'fish', 'dessert'],
  canned: ['soup', 'beans', 'vegetables', 'fruit', 'tuna', 'tomatoes', 'broth']
};

// Suspicious patterns that indicate invalid items
const SUSPICIOUS_PATTERNS = [
  /test/i,
  /asdf/i,
  /qwerty/i,
  /^[a-z]{1,2}$/i, // Single or two letters
  /^\d+$/, // Only numbers
  /^[^a-zA-Z0-9\s]+$/, // Only special characters
  /fuck|shit|damn|hell|ass/i, // Profanity
  /xxx|porn|sex/i, // Inappropriate
  /lorem ipsum/i, // Placeholder text
  /^.{1,2}$/, // Too short (1-2 chars)
  /^.{100,}$/ // Too long (100+ chars)
];

// Common household items (non-food)
const HOUSEHOLD_ITEMS = [
  'paper towel', 'toilet paper', 'tissue', 'napkin', 'trash bag', 'foil', 'plastic wrap',
  'soap', 'shampoo', 'toothpaste', 'detergent', 'cleaner', 'bleach', 'sponge', 'dish soap',
  'battery', 'light bulb', 'candle', 'matches', 'tape', 'glue'
];

/**
 * Validate item name
 * @param {string} itemName - Item name to validate
 * @returns {Object} { valid: boolean, reason: string, confidence: number }
 */
function validateItemName(itemName) {
  if (!itemName || typeof itemName !== 'string') {
    return { valid: false, reason: 'Item name is required', confidence: 0 };
  }

  const trimmedName = itemName.trim();
  
  // Check length
  if (trimmedName.length < 2) {
    return { valid: false, reason: 'Item name too short', confidence: 0 };
  }
  
  if (trimmedName.length > 100) {
    return { valid: false, reason: 'Item name too long', confidence: 0 };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(trimmedName)) {
      return { valid: false, reason: 'Item name contains suspicious pattern', confidence: 0 };
    }
  }

  // Check if it contains at least some letters
  if (!/[a-zA-Z]{2,}/.test(trimmedName)) {
    return { valid: false, reason: 'Item name must contain letters', confidence: 0 };
  }

  // Calculate confidence based on recognizable words
  const confidence = calculateItemConfidence(trimmedName);
  
  if (confidence < 0.3) {
    return { valid: false, reason: 'Item name not recognized as valid food/household item', confidence };
  }

  return { valid: true, reason: 'Valid item name', confidence };
}

/**
 * Calculate confidence that this is a real item
 * @param {string} itemName - Item name
 * @returns {number} Confidence score 0.0 to 1.0
 */
function calculateItemConfidence(itemName) {
  const lowerName = itemName.toLowerCase();
  let confidence = 0.5; // Start at neutral

  // Check against known food types
  for (const [type, items] of Object.entries(FOOD_TYPES)) {
    for (const item of items) {
      if (lowerName.includes(item)) {
        confidence += 0.3;
        break;
      }
    }
  }

  // Check against household items
  for (const item of HOUSEHOLD_ITEMS) {
    if (lowerName.includes(item)) {
      confidence += 0.3;
      break;
    }
  }

  // Check for common food-related words
  const foodWords = ['fresh', 'organic', 'whole', 'raw', 'cooked', 'frozen', 'canned', 'dried', 'smoked', 'roasted', 'baked', 'fried', 'grilled'];
  for (const word of foodWords) {
    if (lowerName.includes(word)) {
      confidence += 0.1;
      break;
    }
  }

  // Check for brand indicators
  if (/brand|®|™|©/.test(itemName)) {
    confidence += 0.1;
  }

  // Check for size/quantity indicators
  if (/\d+\s*(oz|lb|kg|g|ml|l|count|pack|ct)/i.test(itemName)) {
    confidence += 0.1;
  }

  return Math.min(confidence, 1.0);
}

/**
 * Classify item into food type
 * @param {string} itemName - Item name
 * @returns {Array<string>} Array of matching types
 */
function classifyFoodType(itemName) {
  const lowerName = itemName.toLowerCase();
  const types = [];

  for (const [type, items] of Object.entries(FOOD_TYPES)) {
    for (const item of items) {
      if (lowerName.includes(item)) {
        types.push(type);
        break;
      }
    }
  }

  return types.length > 0 ? types : ['unknown'];
}

/**
 * Extract nutritional category
 * @param {string} itemName - Item name
 * @param {string} category - Item category
 * @returns {Object} Nutritional classification
 */
function extractNutritionalInfo(itemName, category) {
  const types = classifyFoodType(itemName);
  
  return {
    foodTypes: types,
    isProtein: types.includes('protein'),
    isDairy: types.includes('dairy'),
    isFruit: types.includes('fruit'),
    isVegetable: types.includes('vegetable'),
    isGrain: types.includes('grain'),
    isBeverage: types.includes('beverage'),
    isProcessed: types.includes('snack') || types.includes('frozen') || types.includes('canned'),
    isPerishable: types.includes('fruit') || types.includes('vegetable') || types.includes('dairy') || types.includes('protein')
  };
}

/**
 * Validate complete item data before fingerprinting
 * @param {Object} itemData - Complete item data
 * @returns {Object} Validation result with enhanced data
 */
async function validateAndEnhanceItem(itemData) {
  const { item_name, category, barcode, brand, store, price } = itemData;

  // Validate item name
  const nameValidation = validateItemName(item_name);
  
  if (!nameValidation.valid) {
    return {
      valid: false,
      shouldCreateFingerprint: false,
      reason: nameValidation.reason,
      confidence: nameValidation.confidence,
      enhancedData: null
    };
  }

  // Low confidence items should be tracked but not contribute to global learning
  const shouldCreateFingerprint = nameValidation.confidence >= 0.6;

  // Classify and enhance item data
  const foodTypes = classifyFoodType(item_name);
  const nutritionalInfo = extractNutritionalInfo(item_name, category);
  
  // Validate category
  const validCategory = VALID_CATEGORIES.includes(category) ? category : 'Other';

  // Extract size/quantity from name if present
  const sizeMatch = item_name.match(/(\d+\.?\d*)\s*(oz|lb|kg|g|ml|l|count|pack|ct)/i);
  const extractedSize = sizeMatch ? {
    amount: parseFloat(sizeMatch[1]),
    unit: sizeMatch[2].toLowerCase()
  } : null;

  // Check if item already exists in database
  const existingItem = await checkExistingItem(item_name, barcode);

  const enhancedData = {
    // Original data
    item_name,
    category: validCategory,
    barcode,
    brand,
    store,
    price,
    
    // Enhanced data
    foodTypes,
    nutritionalInfo,
    extractedSize,
    confidence: nameValidation.confidence,
    
    // Metadata
    isRecognized: nameValidation.confidence >= 0.7,
    isLikelyValid: nameValidation.confidence >= 0.6,
    requiresReview: nameValidation.confidence < 0.6,
    existingFingerprint: existingItem?.fingerprint,
    
    // Learning flags
    shouldContributeToLearning: shouldCreateFingerprint && nameValidation.confidence >= 0.7,
    qualityScore: calculateQualityScore(itemData, nameValidation.confidence)
  };

  return {
    valid: true,
    shouldCreateFingerprint,
    reason: nameValidation.reason,
    confidence: nameValidation.confidence,
    enhancedData
  };
}

/**
 * Check if item already exists
 */
async function checkExistingItem(itemName, barcode) {
  try {
    const normalizedName = itemName.toLowerCase().trim();
    
    if (barcode) {
      const result = await db.query(
        'SELECT fingerprint FROM item_fingerprints WHERE barcode = $1 LIMIT 1',
        [barcode]
      );
      if (result.rows.length > 0) return result.rows[0];
    }

    const result = await db.query(
      'SELECT fingerprint FROM item_fingerprints WHERE normalized_name = $1 LIMIT 1',
      [normalizedName]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error checking existing item:', error);
    return null;
  }
}

/**
 * Calculate overall quality score for item data
 */
function calculateQualityScore(itemData, nameConfidence) {
  let score = nameConfidence * 50; // Name confidence is 50% of score

  // Has category
  if (itemData.category && VALID_CATEGORIES.includes(itemData.category)) {
    score += 10;
  }

  // Has barcode
  if (itemData.barcode && itemData.barcode.length >= 8) {
    score += 15;
  }

  // Has brand
  if (itemData.brand && itemData.brand.length >= 2) {
    score += 10;
  }

  // Has store
  if (itemData.store && itemData.store.length >= 2) {
    score += 5;
  }

  // Has price
  if (itemData.price && parseFloat(itemData.price) > 0) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Flag item for manual review
 */
async function flagForReview(itemData, reason) {
  try {
    await db.query(
      `INSERT INTO item_review_queue 
       (item_name, category, barcode, brand, reason, flagged_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
      [itemData.item_name, itemData.category, itemData.barcode, itemData.brand, reason]
    );
  } catch (error) {
    console.error('Error flagging item for review:', error);
  }
}

/**
 * Get validation statistics
 */
async function getValidationStats() {
  try {
    const stats = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE confidence >= 0.7) as high_confidence,
        COUNT(*) FILTER (WHERE confidence >= 0.5 AND confidence < 0.7) as medium_confidence,
        COUNT(*) FILTER (WHERE confidence < 0.5) as low_confidence,
        AVG(confidence) as avg_confidence
      FROM item_fingerprints
    `);

    const reviewQueue = await db.query(
      'SELECT COUNT(*) as count FROM item_review_queue WHERE reviewed = FALSE'
    );

    return {
      highConfidence: parseInt(stats.rows[0].high_confidence) || 0,
      mediumConfidence: parseInt(stats.rows[0].medium_confidence) || 0,
      lowConfidence: parseInt(stats.rows[0].low_confidence) || 0,
      avgConfidence: parseFloat(stats.rows[0].avg_confidence) || 0,
      pendingReview: parseInt(reviewQueue.rows[0].count) || 0
    };
  } catch (error) {
    console.error('Error getting validation stats:', error);
    return null;
  }
}

module.exports = {
  validateItemName,
  validateAndEnhanceItem,
  classifyFoodType,
  extractNutritionalInfo,
  calculateItemConfidence,
  flagForReview,
  getValidationStats,
  VALID_CATEGORIES,
  FOOD_TYPES
};
