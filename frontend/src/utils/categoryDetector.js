// Icon mapping for common items
const itemIcons = {
  // Bread & Bakery
  'bread': '🍞',
  'bagel': '🥯',
  'bun': '🍔',
  'roll': '🥖',
  'croissant': '🥐',
  'donut': '🍩',
  'muffin': '🧁',
  'cake': '🎂',
  'cookie': '🍪',
  'pie': '🥧',
  
  // Fruits
  'apple': '🍎',
  'banana': '🍌',
  'orange': '🍊',
  'lemon': '🍋',
  'lime': '🍋',
  'grape': '🍇',
  'strawberry': '🍓',
  'watermelon': '🍉',
  'melon': '🍈',
  'peach': '🍑',
  'pear': '🍐',
  'cherry': '🍒',
  'pineapple': '🍍',
  'kiwi': '🥝',
  'mango': '🥭',
  'avocado': '🥑',
  
  // Vegetables
  'tomato': '🍅',
  'potato': '🥔',
  'carrot': '🥕',
  'corn': '🌽',
  'pepper': '🌶️',
  'bell pepper': '🫑',
  'broccoli': '🥦',
  'lettuce': '🥬',
  'cucumber': '🥒',
  'onion': '🧅',
  'garlic': '🧄',
  'mushroom': '🍄',
  'eggplant': '🍆',
  
  // Meat & Protein
  'chicken': '🍗',
  'turkey': '🦃',
  'bacon': '🥓',
  'steak': '🥩',
  'beef': '🥩',
  'pork': '🥓',
  'ham': '🍖',
  'sausage': '🌭',
  'hot dog': '🌭',
  'burger': '🍔',
  
  // Seafood
  'fish': '🐟',
  'shrimp': '🦐',
  'crab': '🦀',
  'lobster': '🦞',
  
  // Dairy & Eggs
  'milk': '🥛',
  'cheese': '🧀',
  'butter': '🧈',
  'egg': '🥚',
  'yogurt': '🥛',
  'ice cream': '🍦',
  
  // Grains & Pasta
  'rice': '🍚',
  'pasta': '🍝',
  'spaghetti': '🍝',
  'noodle': '🍜',
  'ramen': '🍜',
  'pizza': '🍕',
  'taco': '🌮',
  'burrito': '🌯',
  
  // Snacks
  'chips': '🥔',
  'popcorn': '🍿',
  'pretzel': '🥨',
  'peanut': '🥜',
  'nut': '🥜',
  'candy': '🍬',
  'chocolate': '🍫',
  
  // Beverages
  'coffee': '☕',
  'tea': '🍵',
  'beer': '🍺',
  'wine': '🍷',
  'juice': '🧃',
  'soda': '🥤',
  'water': '💧',
  
  // Condiments & Sauces
  'ketchup': '🍅',
  'mustard': '🌭',
  'mayo': '🥚',
  'sauce': '🥫',
  'honey': '🍯',
  'jam': '🍓',
  'peanut butter': '🥜',
  
  // Canned/Packaged
  'soup': '🥫',
  'can': '🥫',
  'jar': '🫙',
  
  // Household
  'soap': '🧼',
  'paper': '🧻',
  'tissue': '🧻',
  'trash': '🗑️',
  
  // Personal Care
  'toothpaste': '🦷',
  'shampoo': '🧴',
  'lotion': '🧴',
};

// Auto-detect category based on item name
const categoryKeywords = {
  // Meal Categories
  'Breakfast': ['cereal', 'oatmeal', 'pancake', 'waffle', 'syrup', 'breakfast', 'bagel', 'muffin', 'croissant', 'granola', 'breakfast bar'],
  'Lunch': ['sandwich', 'lunch meat', 'deli', 'wrap', 'salad', 'soup', 'crackers', 'lunch'],
  'Dinner': ['dinner', 'entree', 'main course', 'roast', 'casserole'],
  
  // Food Categories
  'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'celery', 'broccoli', 'spinach', 'cucumber', 'pepper', 'avocado', 'strawberry', 'grape', 'melon', 'peach', 'pear', 'plum', 'berry', 'fruit', 'vegetable', 'salad', 'greens', 'kale', 'cabbage', 'zucchini', 'squash'],
  'Fruits': ['apple', 'banana', 'orange', 'strawberry', 'grape', 'melon', 'peach', 'pear', 'plum', 'berry', 'fruit', 'kiwi', 'mango', 'pineapple', 'watermelon'],
  'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'eggs', 'egg', 'half and half', 'whipped cream'],
  'Meat': ['chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'steak', 'ground beef', 'ribs', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'meat', 'seafood', 'crab', 'lobster'],
  'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita', 'donut', 'cake', 'cookie', 'pastry', 'baguette'],
  'Deli': ['deli', 'lunch meat', 'sliced', 'prepared', 'rotisserie'],
  'Frozen': ['frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen meal', 'frozen vegetable', 'frozen fruit', 'frozen dinner'],
  'Pantry': ['pasta', 'rice', 'beans', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'sauce', 'cereal', 'oatmeal', 'soup', 'can', 'jar', 'noodles', 'macaroni'],
  'Canned': ['canned', 'can', 'jar', 'jarred', 'soup', 'beans', 'tomatoes'],
  'Condiments': ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'sauce', 'dressing', 'condiment', 'salsa', 'hot sauce'],
  'Spices': ['spice', 'seasoning', 'herb', 'oregano', 'basil', 'thyme', 'cumin', 'paprika', 'cinnamon', 'garlic powder', 'onion powder'],
  'Snacks': ['chips', 'crackers', 'popcorn', 'pretzels', 'nuts', 'candy', 'chocolate', 'granola bar', 'snack', 'cookies', 'trail mix'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'drink', 'beverage', 'energy drink', 'sports drink', 'sparkling'],
  
  // Household
  'Cleaning': ['cleaner', 'bleach', 'disinfectant', 'wipes', 'spray', 'scrub', 'mop', 'broom', 'duster', 'cleaning'],
  'Paper': ['paper towel', 'toilet paper', 'tissue', 'napkin', 'paper plate', 'paper'],
  'Kitchen': ['foil', 'plastic wrap', 'ziplock', 'bag', 'container', 'dish soap', 'sponge', 'kitchen'],
  'Laundry': ['detergent', 'fabric softener', 'dryer sheet', 'stain remover', 'laundry', 'bleach'],
  'Storage': ['container', 'bag', 'ziplock', 'storage', 'organizer', 'bin'],
  
  // Personal Care
  'Bathroom': ['toilet paper', 'tissue', 'bath', 'shower', 'bathroom', 'hand soap', 'body wash', 'shampoo', 'conditioner'],
  'Personal Care': ['shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'razor', 'shaving cream', 'soap', 'body wash', 'face wash'],
  'Health': ['medicine', 'vitamin', 'supplement', 'pain reliever', 'bandage', 'first aid', 'aspirin', 'ibuprofen', 'allergy'],
  'Beauty': ['makeup', 'cosmetic', 'lipstick', 'mascara', 'foundation', 'beauty', 'nail polish', 'perfume'],
  
  // Other
  'Pet': ['pet', 'dog', 'cat', 'bird', 'fish food', 'pet food', 'litter', 'treats'],
  'Baby': ['baby', 'diaper', 'wipes', 'formula', 'baby food', 'pacifier'],
  'Automotive': ['motor oil', 'car', 'auto', 'windshield', 'antifreeze', 'automotive'],
  'Garden': ['plant', 'seed', 'soil', 'fertilizer', 'garden', 'outdoor', 'lawn', 'mulch'],
  'Household': ['light bulb', 'battery', 'tape', 'glue', 'tool', 'household']
};

export const detectIcon = (itemName) => {
  if (!itemName) return '';
  
  const lowerName = itemName.toLowerCase();
  
  // Check for exact matches first (e.g., "wheat bread" should match "bread")
  for (const [keyword, icon] of Object.entries(itemIcons)) {
    if (lowerName.includes(keyword)) {
      return icon;
    }
  }
  
  return ''; // No icon detected
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
