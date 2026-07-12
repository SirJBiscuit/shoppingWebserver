// Store-based intelligent sorting with temperature and fragility rules

const TEMPERATURE_ZONES = {
  frozen: { priority: 1000, name: 'Frozen' },
  refrigerated: { priority: 900, name: 'Refrigerated' },
  room_temp: { priority: 0, name: 'Room Temperature' }
};

const FRAGILITY_RULES = {
  very_fragile: { priority: -100, items: ['eggs', 'bread', 'chips', 'crackers'] },
  fragile: { priority: -50, items: ['tomatoes', 'berries', 'lettuce', 'bananas'] },
  normal: { priority: 0, items: [] }
};

// Default category ordering (used when no store template exists)
const DEFAULT_CATEGORY_ORDER = {
  'Produce': 1,
  'Bakery': 2,
  'Deli': 3,
  'Meat & Seafood': 4,
  'Pantry Staples': 5,
  'Canned Goods': 6,
  'Pasta & Rice': 7,
  'Snacks': 8,
  'Beverages': 9,
  'Breakfast': 10,
  'Condiments': 11,
  'Baking': 12,
  'Cleaning': 13,
  'Personal Care': 14,
  'Dairy': 15,
  'Frozen': 16
};

// Determine temperature zone for an item
export const getTemperatureZone = (item) => {
  const name = item.item_name.toLowerCase();
  const category = (item.category || '').toLowerCase();
  
  // Frozen items
  if (category.includes('frozen') || 
      name.includes('ice cream') || 
      name.includes('frozen')) {
    return 'frozen';
  }
  
  // Refrigerated items
  if (category.includes('dairy') || 
      category.includes('meat') || 
      category.includes('deli') ||
      name.includes('milk') || 
      name.includes('cheese') || 
      name.includes('yogurt') ||
      name.includes('chicken') ||
      name.includes('beef') ||
      name.includes('pork') ||
      name.includes('fish')) {
    return 'refrigerated';
  }
  
  return 'room_temp';
};

// Determine fragility for an item
export const getFragility = (item) => {
  const name = item.item_name.toLowerCase();
  
  for (const [level, data] of Object.entries(FRAGILITY_RULES)) {
    if (data.items.some(fragileItem => name.includes(fragileItem))) {
      return level;
    }
  }
  
  return 'normal';
};

// Get category sort order
export const getCategoryOrder = (category, storeTemplate = null) => {
  if (storeTemplate && storeTemplate.categoryOrder) {
    return storeTemplate.categoryOrder[category] || 999;
  }
  return DEFAULT_CATEGORY_ORDER[category] || 999;
};

// Smart sort items with temperature and fragility rules
export const smartSortItems = (items, storeTemplate = null) => {
  return [...items].sort((a, b) => {
    // 1. Category order (store layout)
    const categoryA = a.category || 'Other';
    const categoryB = b.category || 'Other';
    const categoryOrderA = getCategoryOrder(categoryA, storeTemplate);
    const categoryOrderB = getCategoryOrder(categoryB, storeTemplate);
    
    if (categoryOrderA !== categoryOrderB) {
      return categoryOrderA - categoryOrderB;
    }
    
    // 2. Temperature zones (frozen last, refrigerated near end)
    const tempA = getTemperatureZone(a);
    const tempB = getTemperatureZone(b);
    const tempPriorityA = TEMPERATURE_ZONES[tempA].priority;
    const tempPriorityB = TEMPERATURE_ZONES[tempB].priority;
    
    if (tempPriorityA !== tempPriorityB) {
      return tempPriorityA - tempPriorityB;
    }
    
    // 3. Fragility (fragile items last/on top)
    const fragilityA = getFragility(a);
    const fragilityB = getFragility(b);
    const fragilityPriorityA = FRAGILITY_RULES[fragilityA].priority;
    const fragilityPriorityB = FRAGILITY_RULES[fragilityB].priority;
    
    if (fragilityPriorityA !== fragilityPriorityB) {
      return fragilityPriorityA - fragilityPriorityB;
    }
    
    // 4. Alphabetical within same category/temp/fragility
    return a.item_name.localeCompare(b.item_name);
  });
};

// Apply store-specific sorting rules
export const applySortingRules = (items, rules = []) => {
  let sortedItems = [...items];
  
  // Sort rules by priority (highest first)
  const sortedRules = [...rules].sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  sortedRules.forEach(rule => {
    switch (rule.rule_type) {
      case 'temperature':
        if (rule.rule_value === 'frozen_last') {
          sortedItems = sortedItems.sort((a, b) => {
            const aFrozen = getTemperatureZone(a) === 'frozen' ? 1 : 0;
            const bFrozen = getTemperatureZone(b) === 'frozen' ? 1 : 0;
            return aFrozen - bFrozen;
          });
        }
        break;
        
      case 'fragile':
        if (rule.rule_value === 'eggs_bread_top') {
          sortedItems = sortedItems.sort((a, b) => {
            const aFragile = getFragility(a) === 'very_fragile' ? 1 : 0;
            const bFragile = getFragility(b) === 'very_fragile' ? 1 : 0;
            return bFragile - aFragile; // Reverse to put fragile at end
          });
        }
        break;
        
      default:
        break;
    }
  });
  
  return sortedItems;
};

// Get shopping efficiency score
export const getShoppingEfficiency = (items, storeTemplate = null) => {
  if (items.length === 0) return 100;
  
  const sortedItems = smartSortItems(items, storeTemplate);
  let backtrackCount = 0;
  let lastCategoryOrder = -1;
  
  sortedItems.forEach(item => {
    const categoryOrder = getCategoryOrder(item.category || 'Other', storeTemplate);
    if (categoryOrder < lastCategoryOrder) {
      backtrackCount++;
    }
    lastCategoryOrder = categoryOrder;
  });
  
  const efficiency = Math.max(0, 100 - (backtrackCount * 10));
  return efficiency;
};

export default {
  smartSortItems,
  applySortingRules,
  getTemperatureZone,
  getFragility,
  getCategoryOrder,
  getShoppingEfficiency
};
