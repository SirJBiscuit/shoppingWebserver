// Smart Cart Packing Algorithm
// Organizes shopping list items by store layout for efficient shopping

// Default store layout order (typical grocery store flow)
export const defaultStoreLayout = [
  { zone: 'Produce', order: 1, icon: '🥬', color: 'green' },
  { zone: 'Bakery', order: 2, icon: '🍞', color: 'amber' },
  { zone: 'Dairy', order: 3, icon: '🥛', color: 'blue' },
  { zone: 'Meat', order: 4, icon: '🥩', color: 'red' },
  { zone: 'Pantry', order: 5, icon: '🥫', color: 'yellow' },
  { zone: 'Snacks', order: 6, icon: '🍿', color: 'orange' },
  { zone: 'Beverages', order: 7, icon: '🥤', color: 'cyan' },
  { zone: 'Frozen', order: 8, icon: '🧊', color: 'indigo' },
  { zone: 'Household', order: 9, icon: '🧼', color: 'purple' },
  { zone: 'Personal Care', order: 10, icon: '🧴', color: 'pink' },
  { zone: 'Other', order: 99, icon: '📦', color: 'gray' },
];

// Get zone configuration by name
export const getZoneConfig = (zoneName) => {
  return defaultStoreLayout.find(z => z.zone === zoneName) || defaultStoreLayout[defaultStoreLayout.length - 1];
};

// Sort items by store layout for optimal shopping path
export const sortItemsByStoreLayout = (items, customLayout = null) => {
  const layout = customLayout || defaultStoreLayout;
  
  // Create a map of zone names to their order
  const zoneOrderMap = {};
  layout.forEach(zone => {
    zoneOrderMap[zone.zone] = zone.order;
  });
  
  // Sort items by zone order
  return [...items].sort((a, b) => {
    const categoryA = a.category_name || a.category || 'Other';
    const categoryB = b.category_name || b.category || 'Other';
    
    const orderA = zoneOrderMap[categoryA] || 99;
    const orderB = zoneOrderMap[categoryB] || 99;
    
    // Primary sort: by zone order
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    
    // Secondary sort: by item name within same zone
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
