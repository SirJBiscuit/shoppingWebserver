// Smart Cart Packing Algorithm
// Organizes shopping list items by store layout for efficient shopping

// Default store layout order (optimized for cart packing)
// Cold/frozen items LAST to keep them cold
// Fragile items handled separately
export const defaultStoreLayout = [
  { zone: 'Household', order: 1, icon: '�', color: 'purple' },
  { zone: 'Personal Care', order: 2, icon: '🧴', color: 'pink' },
  { zone: 'Pantry', order: 3, icon: '�', color: 'yellow' },
  { zone: 'Snacks', order: 4, icon: '🍿', color: 'orange' },
  { zone: 'Beverages', order: 5, icon: '�', color: 'cyan' },
  { zone: 'Bakery', order: 6, icon: '�', color: 'amber' },
  { zone: 'Produce', order: 7, icon: '�', color: 'green' },
  { zone: 'Meat', order: 8, icon: '�', color: 'red' },
  { zone: 'Dairy', order: 9, icon: '�', color: 'blue' },
  { zone: 'Frozen', order: 10, icon: '�', color: 'indigo' },
  { zone: 'Other', order: 99, icon: '📦', color: 'gray' },
];

// Item properties for smart packing
const fragileKeywords = ['egg', 'bread', 'chip', 'cracker', 'cookie', 'cake', 'pastry', 'berry', 'tomato', 'banana', 'avocado'];
const coldKeywords = ['frozen', 'ice cream', 'popsicle', 'milk', 'yogurt', 'cheese', 'butter', 'meat', 'chicken', 'beef', 'pork', 'fish', 'seafood'];
const heavyKeywords = ['water', 'soda', 'juice', 'milk', 'detergent', 'cat litter', 'dog food', 'flour', 'sugar', 'rice'];

// Detect item properties
export const getItemProperties = (itemName) => {
  const lowerName = (itemName || '').toLowerCase();
  return {
    isFragile: fragileKeywords.some(keyword => lowerName.includes(keyword)),
    isCold: coldKeywords.some(keyword => lowerName.includes(keyword)),
    isHeavy: heavyKeywords.some(keyword => lowerName.includes(keyword))
  };
};

// Get zone configuration by name
export const getZoneConfig = (zoneName) => {
  return defaultStoreLayout.find(z => z.zone === zoneName) || defaultStoreLayout[defaultStoreLayout.length - 1];
};

// Sort items by store layout for optimal shopping path and cart packing
export const sortItemsByStoreLayout = (items, customLayout = null) => {
  const layout = customLayout || defaultStoreLayout;
  
  // Create a map of zone names to their order
  const zoneOrderMap = {};
  layout.forEach(zone => {
    zoneOrderMap[zone.zone] = zone.order;
  });
  
  // Sort items with smart packing logic
  return [...items].sort((a, b) => {
    const categoryA = a.category_name || a.category || 'Other';
    const categoryB = b.category_name || b.category || 'Other';
    
    const orderA = zoneOrderMap[categoryA] || 99;
    const orderB = zoneOrderMap[categoryB] || 99;
    
    const propsA = getItemProperties(a.item_name);
    const propsB = getItemProperties(b.item_name);
    
    // Primary sort: by zone order (cold items last)
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Within same zone, apply packing logic:
    // 1. Heavy items first (bottom of cart)
    if (propsA.isHeavy !== propsB.isHeavy) {
      return propsB.isHeavy ? 1 : -1;
    }
    
    // 2. Fragile items last (top of cart)
    if (propsA.isFragile !== propsB.isFragile) {
      return propsA.isFragile ? 1 : -1;
    }
    
    // 3. By item name within same properties
    return (a.item_name || '').localeCompare(b.item_name || '');
  });
};

// Group items by store zone
export const groupItemsByZone = (items) => {
  const grouped = {};
  
  items.forEach(item => {
    const category = item.category_name || item.category || 'Other';
    
    if (!grouped[category]) {
      const config = getZoneConfig(category);
      grouped[category] = {
        zone: category,
        items: [],
        order: config.order,
        icon: config.icon,
        color: config.color,
      };
    }
    
    grouped[category].items.push(item);
  });
  
  // Convert to array and sort by zone order
  return Object.values(grouped).sort((a, b) => a.order - b.order);
};

// Calculate shopping efficiency score
export const calculateEfficiency = (items, sorted = false) => {
  if (items.length === 0) return 100;
  
  let backtrackCount = 0;
  let lastZoneOrder = -1;
  
  items.forEach(item => {
    const category = item.category_name || item.category || 'Other';
    const config = getZoneConfig(category);
    const currentZoneOrder = config.order;
    
    // Count backtracks (going to a previous zone)
    if (currentZoneOrder < lastZoneOrder) {
      backtrackCount++;
    }
    
    lastZoneOrder = currentZoneOrder;
  });
  
  // Calculate efficiency percentage (fewer backtracks = higher efficiency)
  const maxBacktracks = Math.max(items.length - 1, 1);
  const efficiency = Math.max(0, 100 - (backtrackCount / maxBacktracks * 100));
  
  return Math.round(efficiency);
};

// Get shopping path summary
export const getShoppingPath = (items) => {
  const zones = [];
  let lastZone = null;
  
  items.forEach(item => {
    const category = item.category_name || item.category || 'Other';
    
    if (category !== lastZone) {
      const config = getZoneConfig(category);
      zones.push({
        zone: category,
        icon: config.icon,
        itemCount: items.filter(i => (i.category_name || i.category || 'Other') === category).length,
      });
      lastZone = category;
    }
  });
  
  return zones;
};

// Optimize cart packing with special rules
export const optimizeCartPacking = (items, rules = {}) => {
  let optimized = [...items];
  
  // Rule 1: Heavy items at bottom (if weight data available)
  if (rules.heavyItemsFirst) {
    optimized = optimized.sort((a, b) => {
      const weightA = a.weight || 0;
      const weightB = b.weight || 0;
      return weightB - weightA;
    });
  }
  
  // Rule 2: Frozen items last (to prevent thawing)
  if (rules.frozenLast !== false) {
    optimized = optimized.sort((a, b) => {
      const isFrozenA = (a.category_name || a.category) === 'Frozen' ? 1 : 0;
      const isFrozenB = (b.category_name || b.category) === 'Frozen' ? 1 : 0;
      return isFrozenA - isFrozenB;
    });
  }
  
  // Rule 3: Fragile items on top
  if (rules.fragileOnTop) {
    const fragileCategories = ['Bakery', 'Produce'];
    optimized = optimized.sort((a, b) => {
      const isFragileA = fragileCategories.includes(a.category_name || a.category) ? 1 : 0;
      const isFragileB = fragileCategories.includes(b.category_name || b.category) ? 1 : 0;
      return isFragileB - isFragileA;
    });
  }
  
  return optimized;
};
