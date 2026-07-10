// Store layouts with aisle information for different stores
// This helps organize shopping lists by store location and aisle

export const storeLayouts = {
  walmart: {
    name: 'Walmart',
    aisles: [
      { number: 1, name: 'Produce', categories: ['Produce', 'Fruits'] },
      { number: 2, name: 'Bakery', categories: ['Bakery', 'Bread'] },
      { number: 3, name: 'Deli & Prepared Foods', categories: ['Deli'] },
      { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
      { number: 5, name: 'Dairy & Eggs', categories: ['Dairy', 'Eggs'] },
      { number: 6, name: 'Frozen Foods', categories: ['Frozen'] },
      { number: 7, name: 'Breakfast & Cereal', categories: ['Breakfast', 'Cereal'] },
      { number: 8, name: 'Canned Goods', categories: ['Canned', 'Soup'] },
      { number: 9, name: 'Pasta & Rice', categories: ['Pantry', 'Pasta', 'Rice'] },
      { number: 10, name: 'Baking', categories: ['Baking', 'Spices'] },
      { number: 11, name: 'Condiments & Sauces', categories: ['Condiments', 'Sauces'] },
      { number: 12, name: 'Snacks', categories: ['Snacks', 'Chips', 'Candy'] },
      { number: 13, name: 'Beverages', categories: ['Beverages', 'Soda', 'Juice'] },
      { number: 14, name: 'Coffee & Tea', categories: ['Coffee', 'Tea'] },
      { number: 15, name: 'Paper Products', categories: ['Paper', 'Paper Towels'] },
      { number: 16, name: 'Cleaning Supplies', categories: ['Cleaning', 'Household'] },
      { number: 17, name: 'Laundry', categories: ['Laundry'] },
      { number: 18, name: 'Personal Care', categories: ['Personal Care', 'Health'] },
      { number: 19, name: 'Baby', categories: ['Baby'] },
      { number: 20, name: 'Pet Supplies', categories: ['Pet'] },
    ],
    priceMultiplier: 1.0, // Base pricing
  },
  
  target: {
    name: 'Target',
    aisles: [
      { number: 'A1', name: 'Fresh Produce', categories: ['Produce', 'Fruits'] },
      { number: 'A2', name: 'Bakery & Deli', categories: ['Bakery', 'Deli'] },
      { number: 'A3', name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
      { number: 'A4', name: 'Dairy & Refrigerated', categories: ['Dairy', 'Eggs'] },
      { number: 'A5', name: 'Frozen Foods', categories: ['Frozen'] },
      { number: 'B1', name: 'Breakfast & Cereal', categories: ['Breakfast', 'Cereal'] },
      { number: 'B2', name: 'Canned & Jarred', categories: ['Canned', 'Pantry'] },
      { number: 'B3', name: 'Pasta & Grains', categories: ['Pasta', 'Rice'] },
      { number: 'B4', name: 'Baking Needs', categories: ['Baking', 'Spices'] },
      { number: 'B5', name: 'Condiments', categories: ['Condiments', 'Sauces'] },
      { number: 'C1', name: 'Snacks & Candy', categories: ['Snacks', 'Candy'] },
      { number: 'C2', name: 'Beverages', categories: ['Beverages', 'Soda'] },
      { number: 'C3', name: 'Coffee & Tea', categories: ['Coffee', 'Tea'] },
      { number: 'D1', name: 'Paper & Cleaning', categories: ['Paper', 'Cleaning'] },
      { number: 'D2', name: 'Personal Care', categories: ['Personal Care', 'Health'] },
      { number: 'D3', name: 'Baby & Kids', categories: ['Baby'] },
      { number: 'D4', name: 'Pet Care', categories: ['Pet'] },
    ],
    priceMultiplier: 1.05, // Slightly higher pricing
  },
  
  costco: {
    name: 'Costco',
    aisles: [
      { number: 1, name: 'Produce', categories: ['Produce', 'Fruits'] },
      { number: 2, name: 'Bakery', categories: ['Bakery'] },
      { number: 3, name: 'Deli & Prepared', categories: ['Deli'] },
      { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
      { number: 5, name: 'Dairy & Refrigerated', categories: ['Dairy', 'Eggs'] },
      { number: 6, name: 'Frozen Foods', categories: ['Frozen'] },
      { number: 7, name: 'Pantry Staples', categories: ['Pantry', 'Canned', 'Pasta'] },
      { number: 8, name: 'Snacks & Candy', categories: ['Snacks', 'Candy'] },
      { number: 9, name: 'Beverages', categories: ['Beverages', 'Soda', 'Juice'] },
      { number: 10, name: 'Paper & Cleaning', categories: ['Paper', 'Cleaning', 'Laundry'] },
      { number: 11, name: 'Personal Care', categories: ['Personal Care', 'Health'] },
      { number: 12, name: 'Baby & Pet', categories: ['Baby', 'Pet'] },
    ],
    priceMultiplier: 0.85, // Bulk pricing discount
  },
  
  kroger: {
    name: 'Kroger',
    aisles: [
      { number: 1, name: 'Produce', categories: ['Produce', 'Fruits'] },
      { number: 2, name: 'Bakery', categories: ['Bakery'] },
      { number: 3, name: 'Deli', categories: ['Deli'] },
      { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
      { number: 5, name: 'Dairy', categories: ['Dairy', 'Eggs'] },
      { number: 6, name: 'Frozen', categories: ['Frozen'] },
      { number: 7, name: 'Breakfast', categories: ['Breakfast', 'Cereal'] },
      { number: 8, name: 'Canned Goods', categories: ['Canned', 'Soup'] },
      { number: 9, name: 'Pasta & Rice', categories: ['Pasta', 'Rice', 'Pantry'] },
      { number: 10, name: 'Baking', categories: ['Baking', 'Spices'] },
      { number: 11, name: 'Condiments', categories: ['Condiments', 'Sauces'] },
      { number: 12, name: 'Snacks', categories: ['Snacks', 'Chips'] },
      { number: 13, name: 'Beverages', categories: ['Beverages', 'Soda'] },
      { number: 14, name: 'Paper Products', categories: ['Paper'] },
      { number: 15, name: 'Cleaning', categories: ['Cleaning', 'Household'] },
      { number: 16, name: 'Personal Care', categories: ['Personal Care'] },
      { number: 17, name: 'Pet Supplies', categories: ['Pet'] },
    ],
    priceMultiplier: 0.95,
  },
  
  'whole-foods': {
    name: 'Whole Foods',
    aisles: [
      { number: 1, name: 'Organic Produce', categories: ['Produce', 'Fruits'] },
      { number: 2, name: 'Bakery', categories: ['Bakery'] },
      { number: 3, name: 'Prepared Foods', categories: ['Deli'] },
      { number: 4, name: 'Meat & Seafood', categories: ['Meat', 'Seafood'] },
      { number: 5, name: 'Dairy & Cheese', categories: ['Dairy', 'Eggs'] },
      { number: 6, name: 'Frozen', categories: ['Frozen'] },
      { number: 7, name: 'Pantry', categories: ['Pantry', 'Canned', 'Pasta'] },
      { number: 8, name: 'Snacks', categories: ['Snacks'] },
      { number: 9, name: 'Beverages', categories: ['Beverages'] },
      { number: 10, name: 'Personal Care', categories: ['Personal Care', 'Health'] },
    ],
    priceMultiplier: 1.25, // Premium pricing
  },
  
  aldi: {
    name: 'Aldi',
    aisles: [
      { number: 1, name: 'Fresh Produce', categories: ['Produce', 'Fruits'] },
      { number: 2, name: 'Bakery & Bread', categories: ['Bakery', 'Bread'] },
      { number: 3, name: 'Meat & Deli', categories: ['Meat', 'Deli', 'Seafood'] },
      { number: 4, name: 'Dairy & Refrigerated', categories: ['Dairy', 'Eggs'] },
      { number: 5, name: 'Frozen Foods', categories: ['Frozen'] },
      { number: 6, name: 'Breakfast & Cereal', categories: ['Breakfast', 'Cereal'] },
      { number: 7, name: 'Pantry Essentials', categories: ['Pantry', 'Canned', 'Pasta', 'Rice'] },
      { number: 8, name: 'Baking & Spices', categories: ['Baking', 'Spices'] },
      { number: 9, name: 'Condiments & Sauces', categories: ['Condiments', 'Sauces'] },
      { number: 10, name: 'Snacks & Candy', categories: ['Snacks', 'Candy'] },
      { number: 11, name: 'Beverages', categories: ['Beverages', 'Soda', 'Juice', 'Coffee', 'Tea'] },
      { number: 12, name: 'Paper & Household', categories: ['Paper', 'Cleaning', 'Laundry'] },
      { number: 13, name: 'Personal Care', categories: ['Personal Care', 'Health', 'Beauty'] },
      { number: 14, name: 'Baby & Pet', categories: ['Baby', 'Pet'] },
    ],
    priceMultiplier: 0.80, // Budget-friendly pricing (20% cheaper on average)
  },
};

// Get aisle for a category at a specific store
export const getAisleForCategory = (storeName, category) => {
  if (!storeName || !category) return null;
  
  const storeKey = storeName.toLowerCase().replace(/\s+/g, '-');
  const store = storeLayouts[storeKey];
  
  // Debug logging
  if (!store) {
    console.log(`Store not found: "${storeName}" (key: "${storeKey}"). Available stores:`, Object.keys(storeLayouts));
    return null;
  }
  
  const aisle = store.aisles.find(a => 
    a.categories.some(cat => 
      cat.toLowerCase() === category.toLowerCase()
    )
  );
  
  if (!aisle) {
    console.log(`No aisle found for category "${category}" in store "${storeName}"`);
  }
  
  return aisle;
};

// Sort items by store aisle
export const sortItemsByStoreAisle = (items, storeName) => {
  const store = storeLayouts[storeName.toLowerCase().replace(/\s+/g, '-')];
  if (!store) return items;
  
  return [...items].sort((a, b) => {
    const categoryA = a.category_name || a.category || 'Other';
    const categoryB = b.category_name || b.category || 'Other';
    
    const aisleA = getAisleForCategory(storeName, categoryA);
    const aisleB = getAisleForCategory(storeName, categoryB);
    
    if (!aisleA && !aisleB) return 0;
    if (!aisleA) return 1;
    if (!aisleB) return -1;
    
    // Compare aisle numbers (handle both numeric and alphanumeric)
    const numA = typeof aisleA.number === 'number' ? aisleA.number : aisleA.number.charCodeAt(0) * 100 + parseInt(aisleA.number.slice(1) || 0);
    const numB = typeof aisleB.number === 'number' ? aisleB.number : aisleB.number.charCodeAt(0) * 100 + parseInt(aisleB.number.slice(1) || 0);
    
    return numA - numB;
  });
};

// Get estimated price for item at store
export const getStorePriceEstimate = (basePrice, storeName) => {
  const store = storeLayouts[storeName.toLowerCase().replace(/\s+/g, '-')];
  if (!store) return basePrice;
  
  return (basePrice * store.priceMultiplier).toFixed(2);
};

// Get all available stores
export const getAvailableStores = () => {
  return Object.keys(storeLayouts).map(key => ({
    id: key,
    name: storeLayouts[key].name,
    priceMultiplier: storeLayouts[key].priceMultiplier
  }));
};

export default storeLayouts;
