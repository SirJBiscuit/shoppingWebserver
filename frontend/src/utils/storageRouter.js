/**
 * Automatically determines the correct storage location (pantry/fridge/freezer)
 * based on item category and name
 */

export const determineStorageLocation = (itemName, category) => {
  const name = itemName.toLowerCase();
  const cat = (category || '').toLowerCase();

  // Freezer items
  const freezerKeywords = [
    'frozen', 'ice cream', 'popsicle', 'ice', 'freezer',
    'frozen pizza', 'frozen meal', 'frozen vegetable', 'frozen fruit',
    'frozen chicken', 'frozen beef', 'frozen fish', 'frozen shrimp',
    'frozen fries', 'frozen waffle', 'frozen burrito', 'frozen dinner',
    'popsicles', 'ice pops', 'gelato', 'sorbet'
  ];

  const freezerCategories = ['frozen', 'ice cream', 'frozen foods'];

  // Fridge items
  const fridgeKeywords = [
    'milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs',
    'fresh', 'lettuce', 'salad', 'deli', 'meat', 'chicken', 'beef',
    'pork', 'fish', 'seafood', 'shrimp', 'salmon', 'tuna',
    'juice', 'soda', 'beer', 'wine', 'champagne',
    'vegetables', 'fruits', 'berries', 'grapes', 'apple',
    'orange', 'lemon', 'lime', 'tomato', 'cucumber',
    'carrot', 'celery', 'broccoli', 'cauliflower',
    'cottage cheese', 'sour cream', 'whipped cream',
    'bacon', 'sausage', 'ham', 'turkey', 'salami',
    'mayonnaise', 'ketchup', 'mustard', 'pickles',
    'hummus', 'guacamole', 'salsa'
  ];

  const fridgeCategories = [
    'dairy', 'produce', 'fruits', 'vegetables', 'meat', 'deli',
    'seafood', 'beverages', 'fresh', 'refrigerated'
  ];

  // Pantry items (default)
  const pantryKeywords = [
    'canned', 'dry', 'pasta', 'rice', 'flour', 'sugar', 'salt',
    'pepper', 'spice', 'cereal', 'bread', 'crackers', 'chips',
    'cookies', 'candy', 'chocolate', 'nuts', 'peanut butter',
    'jelly', 'jam', 'honey', 'syrup', 'oil', 'vinegar',
    'sauce', 'soup', 'beans', 'corn', 'peas', 'tomatoes',
    'coffee', 'tea', 'snacks', 'granola', 'oatmeal'
  ];

  // Check freezer first
  if (freezerCategories.includes(cat)) {
    return 'freezer';
  }

  for (const keyword of freezerKeywords) {
    if (name.includes(keyword)) {
      return 'freezer';
    }
  }

  // Check fridge
  if (fridgeCategories.includes(cat)) {
    return 'fridge';
  }

  for (const keyword of fridgeKeywords) {
    if (name.includes(keyword)) {
      return 'fridge';
    }
  }

  // Check pantry
  for (const keyword of pantryKeywords) {
    if (name.includes(keyword)) {
      return 'pantry';
    }
  }

  // Default to pantry for unknown items
  return 'pantry';
};

/**
 * Get a friendly icon for storage location
 */
export const getStorageIcon = (location) => {
  const icons = {
    'pantry': '📦',
    'fridge': '🧊',
    'freezer': '❄️'
  };
  return icons[location] || '📦';
};

/**
 * Get storage location display name
 */
export const getStorageDisplayName = (location) => {
  const names = {
    'pantry': 'Pantry',
    'fridge': 'Fridge',
    'freezer': 'Freezer'
  };
  return names[location] || 'Pantry';
};
