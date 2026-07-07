// Auto-detect category based on item name
const categoryKeywords = {
  'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'celery', 'broccoli', 'spinach', 'cucumber', 'pepper', 'avocado', 'strawberry', 'grape', 'melon', 'peach', 'pear', 'plum', 'berry', 'fruit', 'vegetable', 'salad', 'greens'],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'eggs', 'egg'],
  'Meat': ['chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'steak', 'ground beef', 'ribs', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'meat'],
  'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita', 'donut', 'cake', 'cookie', 'pastry'],
  'Frozen': ['frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen meal', 'frozen vegetable', 'frozen fruit'],
  'Pantry': ['pasta', 'rice', 'beans', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'cereal', 'oatmeal', 'soup', 'can', 'jar'],
  'Snacks': ['chips', 'crackers', 'popcorn', 'pretzels', 'nuts', 'candy', 'chocolate', 'granola bar', 'snack'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'drink', 'beverage'],
  'Household': ['paper towel', 'toilet paper', 'tissue', 'soap', 'detergent', 'cleaner', 'trash bag', 'foil', 'plastic wrap', 'dish soap'],
  'Personal Care': ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'razor', 'shaving cream']
};

export const detectCategory = (itemName) => {
  if (!itemName) return '';
  
  const lowerName = itemName.toLowerCase();
  
  // Check each category's keywords
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    for (const keyword of keywords) {
      if (lowerName.includes(keyword)) {
        return category;
      }
    }
  }
  
  return ''; // No category detected
};

// Get common sizes for a category
export const getCommonSizesForCategory = (category) => {
  const sizesByCategory = {
    'Produce': ['lb', 'oz', 'ct', 'bag'],
    'Dairy': ['gal', 'qt', 'pt', 'oz', 'lb'],
    'Meat': ['lb', 'oz', 'pkg'],
    'Bakery': ['ct', 'pkg', 'box'],
    'Frozen': ['oz', 'lb', 'box', 'bag'],
    'Pantry': ['oz', 'lb', 'box', 'can', 'jar', 'bag'],
    'Snacks': ['oz', 'bag', 'box'],
    'Beverages': ['L', 'ml', 'gal', 'qt', 'oz', 'can'],
    'Household': ['ct', 'pkg', 'box'],
    'Personal Care': ['oz', 'ml', 'ct']
  };
  
  return sizesByCategory[category] || ['ct', 'oz', 'lb'];
};

// Estimate average price based on category and item name
export const estimatePrice = (itemName, category) => {
  const averagePrices = {
    'Produce': 2.99,
    'Dairy': 4.49,
    'Meat': 8.99,
    'Bakery': 3.99,
    'Frozen': 5.99,
    'Pantry': 3.49,
    'Snacks': 4.29,
    'Beverages': 3.99,
    'Household': 6.99,
    'Personal Care': 5.99
  };
  
  return averagePrices[category] || 4.99;
};
