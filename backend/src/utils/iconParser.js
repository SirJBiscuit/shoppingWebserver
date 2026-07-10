// ============================================
// ICON FILENAME PARSER
// Automatically extracts metadata from icon filenames
// ============================================

const RARITY_KEYWORDS = {
  common: ['common', 'basic', 'simple', 'plain', 'regular'],
  uncommon: ['uncommon', 'nice', 'good', 'quality', 'decent'],
  rare: ['rare', 'premium', 'special', 'fancy', 'fine'],
  epic: ['epic', 'amazing', 'awesome', 'super', 'great'],
  legendary: ['legendary', 'ultra', 'supreme', 'godly', 'ultimate'],
  mythical: ['mythical', 'divine', 'celestial', 'cosmic', 'ethereal']
};

const QUALITY_TIERS = {
  1: { minLevel: 0, maxLevel: 10, resolution: 64, description: 'Basic pixel art' },
  2: { minLevel: 11, maxLevel: 20, resolution: 128, description: 'Clean vectors' },
  3: { minLevel: 21, maxLevel: 35, resolution: 256, description: 'Detailed illustrations' },
  4: { minLevel: 36, maxLevel: 50, resolution: 512, description: 'Stylized art with effects' },
  5: { minLevel: 51, maxLevel: 70, resolution: 512, description: 'Animated icons' },
  6: { minLevel: 71, maxLevel: 90, resolution: 1024, description: 'Legendary full effects' },
  7: { minLevel: 91, maxLevel: 999, resolution: 1024, description: 'Mythical cinematic' }
};

const CATEGORIES = {
  'Fruits': ['apple', 'banana', 'orange', 'grape', 'berry', 'strawberry', 'blueberry', 'watermelon', 'pear', 'peach', 'plum', 'cherry', 'lemon', 'lime', 'mango', 'pineapple', 'kiwi', 'melon'],
  'Vegetables': ['carrot', 'broccoli', 'lettuce', 'tomato', 'potato', 'onion', 'garlic', 'pepper', 'cucumber', 'celery', 'spinach', 'cabbage', 'cauliflower', 'zucchini', 'eggplant', 'corn', 'peas'],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'ice cream', 'sour cream', 'cottage cheese', 'whipped cream'],
  'Meat': ['chicken', 'beef', 'pork', 'fish', 'turkey', 'lamb', 'bacon', 'sausage', 'ham', 'steak', 'ground beef', 'salmon', 'tuna'],
  'Bakery': ['bread', 'bagel', 'croissant', 'cake', 'muffin', 'donut', 'cookie', 'pie', 'pastry', 'baguette', 'roll', 'bun'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'energy drink', 'sports drink', 'smoothie'],
  'Snacks': ['chips', 'crackers', 'popcorn', 'nuts', 'candy', 'chocolate', 'pretzels', 'granola', 'trail mix'],
  'Household': ['toilet paper', 'paper towel', 'soap', 'detergent', 'cleaner', 'trash bag', 'dish soap', 'sponge', 'bleach', 'fabric softener'],
  'Personal Care': ['shampoo', 'conditioner', 'toothpaste', 'deodorant', 'lotion', 'razor', 'shaving cream', 'body wash'],
  'Frozen': ['frozen pizza', 'ice cream', 'frozen vegetables', 'frozen fruit', 'frozen meals', 'popsicle'],
  'Canned': ['soup', 'beans', 'tuna', 'vegetables', 'fruit', 'tomato sauce', 'corn'],
  'Condiments': ['ketchup', 'mustard', 'mayo', 'hot sauce', 'soy sauce', 'bbq sauce', 'salad dressing', 'salsa'],
  'Grains': ['rice', 'pasta', 'cereal', 'oatmeal', 'flour', 'quinoa', 'couscous'],
  'Spices': ['salt', 'pepper', 'garlic powder', 'onion powder', 'paprika', 'cumin', 'oregano', 'basil', 'cinnamon'],
  'Baby': ['diapers', 'wipes', 'formula', 'baby food', 'bottles'],
  'Pet': ['dog food', 'cat food', 'pet treats', 'cat litter', 'pet toys'],
  'Other': []
};

/**
 * Parse icon filename and extract metadata
 * @param {string} filename - Icon filename (e.g., "apple_rare_crystal.png")
 * @returns {object} Parsed icon metadata
 */
function parseIconFilename(filename) {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.(png|jpg|jpeg|svg|gif|webp)$/i, '');
  
  // Split by underscore
  const parts = nameWithoutExt.split('_');
  
  let itemName = '';
  let rarity = 'common'; // default
  let variant = '';
  let qualityTier = 1;
  let animated = false;
  let hasParticles = false;
  let hasSound = false;
  
  // Detect if animated (GIF or has 'animated' in name)
  if (filename.match(/\.gif$/i) || nameWithoutExt.includes('animated')) {
    animated = true;
    qualityTier = Math.max(qualityTier, 5); // Animated = at least tier 5
  }
  
  // Find rarity keyword in parts
  let rarityIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].toLowerCase();
    
    for (const [rarityLevel, keywords] of Object.entries(RARITY_KEYWORDS)) {
      if (keywords.includes(part)) {
        rarity = rarityLevel;
        rarityIndex = i;
        break;
      }
    }
    
    if (rarityIndex !== -1) break;
  }
  
  // Extract item name (everything before rarity)
  if (rarityIndex !== -1) {
    itemName = parts.slice(0, rarityIndex).join(' ');
    variant = parts.slice(rarityIndex + 1).join(' ');
  } else {
    // No rarity found, entire name is item name
    itemName = parts.join(' ');
  }
  
  // Determine quality tier based on rarity and variant keywords
  if (rarity === 'mythical') qualityTier = 7;
  else if (rarity === 'legendary') qualityTier = 6;
  else if (rarity === 'epic') qualityTier = 5;
  else if (rarity === 'rare') qualityTier = 4;
  else if (rarity === 'uncommon') qualityTier = 3;
  else if (rarity === 'common') qualityTier = 2;
  
  // Check for special effects in variant name
  const variantLower = variant.toLowerCase();
  if (variantLower.includes('particle') || variantLower.includes('sparkle') || 
      variantLower.includes('glow') || variantLower.includes('fire') ||
      variantLower.includes('cosmic') || variantLower.includes('magic')) {
    hasParticles = true;
  }
  
  if (variantLower.includes('sound') || rarity === 'legendary' || rarity === 'mythical') {
    hasSound = true;
  }
  
  // Format item name
  itemName = formatItemName(itemName);
  
  // Categorize
  const category = categorizeIcon(itemName);
  
  // Determine min level based on quality tier
  const minLevel = QUALITY_TIERS[qualityTier].minLevel;
  
  // Premium only for highest tiers
  const premiumOnly = qualityTier >= 6 || rarity === 'legendary' || rarity === 'mythical';
  
  return {
    itemName,
    rarity,
    variant: variant || null,
    category,
    qualityTier,
    minLevel,
    animated,
    hasParticles,
    hasSound,
    premiumOnly,
    filename,
    resolution: QUALITY_TIERS[qualityTier].resolution
  };
}

/**
 * Format item name with proper capitalization
 */
function formatItemName(name) {
  if (!name) return '';
  
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Categorize icon based on item name
 */
function categorizeIcon(itemName) {
  const lowerName = itemName.toLowerCase();
  
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (category === 'Other') continue;
    
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }
  
  return 'Other';
}

/**
 * Get rarity color for UI
 */
function getRarityColor(rarity) {
  const colors = {
    common: '#9CA3AF',
    uncommon: '#10B981',
    rare: '#3B82F6',
    epic: '#8B5CF6',
    legendary: '#F59E0B',
    mythical: '#EC4899'
  };
  return colors[rarity] || colors.common;
}

/**
 * Get quality tier info
 */
function getQualityTierInfo(tier) {
  return QUALITY_TIERS[tier] || QUALITY_TIERS[1];
}

/**
 * Validate icon filename format
 */
function validateIconFilename(filename) {
  const errors = [];
  
  // Check extension
  if (!filename.match(/\.(png|jpg|jpeg|svg|gif|webp)$/i)) {
    errors.push('Invalid file extension. Must be PNG, JPG, SVG, GIF, or WEBP');
  }
  
  // Check for special characters
  if (filename.match(/[^a-zA-Z0-9_.-]/)) {
    errors.push('Filename contains invalid characters. Use only letters, numbers, underscores, and hyphens');
  }
  
  // Check length
  if (filename.length > 255) {
    errors.push('Filename too long (max 255 characters)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate suggested filename from metadata
 */
function generateFilename(itemName, rarity, variant = '') {
  const parts = [
    itemName.toLowerCase().replace(/\s+/g, '_'),
    rarity.toLowerCase()
  ];
  
  if (variant) {
    parts.push(variant.toLowerCase().replace(/\s+/g, '_'));
  }
  
  return parts.join('_') + '.png';
}

module.exports = {
  parseIconFilename,
  formatItemName,
  categorizeIcon,
  getRarityColor,
  getQualityTierInfo,
  validateIconFilename,
  generateFilename,
  RARITY_KEYWORDS,
  QUALITY_TIERS,
  CATEGORIES
};
