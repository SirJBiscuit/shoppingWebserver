import CATEGORIES from './categories';

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
  
  // Grains & Pasta
  'rice': '🍚',
  'pasta': '🍝',
  'spaghetti': '🍝',
  'noodle': '🍜',
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
  
  // Household & Kitchen
  'soap': '🧼',
  'paper': '🧻',
  'tissue': '🧻',
  'trash': '🗑️',
  'aluminum foil': '📄',
  'plastic wrap': '📄',
  'saran wrap': '📄',
  'parchment paper': '📄',
  'wax paper': '📄',
  'paper towel': '🧻',
  'plate': '🍽️',
  'cup': '🥤',
  'utensil': '🍴',
  'fork': '🍴',
  'spoon': '🥄',
  'knife': '🔪',
  'ziplock': '📦',
  'storage': '📦',
  'tupperware': '📦',
  'dish soap': '🧼',
  'disinfectant': '🧴',
  'scrubber': '🧽',
  'mop': '🧹',
  'broom': '🧹',
  'vacuum': '🧹',
  'duster': '🧹',
  'laundry': '🧺',
  'fabric softener': '🧴',
  'dryer sheet': '🧺',
  
  // Personal Care
  'toothpaste': '🦷',
  'shampoo': '🧴',
  'lotion': '🧴',
  'deodorant': '🧴',
  
  // More Fruits & Vegetables
  'blueberry': '🫐',
  'coconut': '🥥',
  'celery': '🥬',
  'spinach': '🥬',
  'kale': '🥬',
  'cabbage': '🥬',
  'zucchini': '🥒',
  'squash': '🥒',
  'radish': '🥕',
  'beet': '🥕',
  'turnip': '🥔',
  
  // More Proteins
  'salmon': '🐟',
  'tuna': '🐟',
  'tilapia': '🐟',
  'cod': '🐟',
  'ground beef': '🥩',
  'ribeye': '🥩',
  'sirloin': '🥩',
  'pork chop': '🥓',
  'ribs': '🍖',
  'wings': '🍗',
  'drumstick': '🍗',
  
  // More Dairy
  'cream': '🥛',
  'sour cream': '🥛',
  'cottage cheese': '🧀',
  'cheddar': '🧀',
  'mozzarella': '🧀',
  'parmesan': '🧀',
  'cream cheese': '🧀',
  
  // Breakfast Items
  'cereal': '🥣',
  'oatmeal': '🥣',
  'granola': '🥣',
  'pancake': '🥞',
  'waffle': '🧇',
  'syrup': '🍯',
  'french toast': '🍞',
  
  // More Snacks & Sweets
  'gummy': '🍬',
  'lollipop': '🍭',
  'cupcake': '🧁',
  'brownie': '🍫',
  'ice cream': '🍨',
  'popsicle': '🍡',
  'pudding': '🍮',
  'jello': '🍮',
  'granola bar': '🥜',
  'protein bar': '🥜',
  'energy bar': '⚡',
  'cereal bar': '🥣',
  'snack bar': '🍫',
  'cliff bar': '🥜',
  'kind bar': '🥜',
  'nature valley': '🥜',
  'trail mix': '🥜',
  'mixed nuts': '🥜',
  'cashew': '🥜',
  'almond': '🥜',
  'walnut': '🥜',
  'pecan': '🥜',
  'pistachio': '🥜',
  'sunflower seed': '🌻',
  'pumpkin seed': '🎃',
  'cracker': '🍘',
  'rice cake': '🍘',
  'graham cracker': '🍘',
  'goldfish': '🐟',
  'cheez-it': '🧀',
  'ritz': '🍘',
  
  // More Beverages
  'latte': '☕',
  'espresso': '☕',
  'cappuccino': '☕',
  'green tea': '🍵',
  'black tea': '🍵',
  'smoothie': '🥤',
  'milkshake': '🥤',
  'lemonade': '🍋',
  'cocktail': '🍹',
  'champagne': '🍾',
  'energy drink': '⚡',
  'sports drink': '🥤',
  'gatorade': '🥤',
  'powerade': '🥤',
  'vitamin water': '💧',
  'sparkling water': '💧',
  'seltzer': '💧',
  'tonic': '🥤',
  
  // Alcohol
  'vodka': '🍸',
  'whiskey': '🥃',
  'rum': '🥃',
  'gin': '🍸',
  'tequila': '🍹',
  'bourbon': '🥃',
  'scotch': '🥃',
  'liquor': '🍾',
  'liqueur': '🍾',
  'brandy': '🥃',
  'cognac': '🥃',
  'sake': '🍶',
  'cider': '🍺',
  'ale': '🍺',
  'lager': '🍺',
  'ipa': '🍺',
  'stout': '🍺',
  'porter': '🍺',
  'red wine': '🍷',
  'white wine': '🍷',
  'rosé': '🍷',
  'prosecco': '🍾',
  'margarita': '🍹',
  'mojito': '🍹',
  
  // Condiments & Seasonings
  'salt': '🧂',
  'pepper': '🧂',
  'oil': '🫒',
  'olive oil': '🫒',
  'vinegar': '🫗',
  'soy sauce': '🥫',
  'hot sauce': '🌶️',
  'salsa': '🫔',
  'guacamole': '🥑',
  'hummus': '🫘',
  'ranch': '🥗',
  'dressing': '🥗',
  
  // Baking & Cooking
  'flour': '🌾',
  'sugar': '🍬',
  'brown sugar': '🍬',
  'baking soda': '🧂',
  'baking powder': '🧂',
  'yeast': '🍞',
  'vanilla': '🍦',
  'cinnamon': '🧂',
  
  // Grains & Legumes
  'quinoa': '🌾',
  'couscous': '🌾',
  'barley': '🌾',
  'oats': '🌾',
  'beans': '🫘',
  'lentils': '🫘',
  'chickpeas': '🫘',
  'black beans': '🫘',
  'kidney beans': '🫘',
  'pinto beans': '🫘',
  
  // Frozen Foods
  'frozen pizza': '🍕',
  'frozen dinner': '🍱',
  'frozen vegetables': '🥦',
  'frozen fruit': '🍓',
  'ice': '🧊',
  
  // Prepared Foods
  'sandwich': '🥪',
  'salad': '🥗',
  'bowl': '🍱',
  'meal': '🍱',
  
  // International
  'sushi': '🍣',
  'ramen': '🍜',
  'curry': '🍛',
  'dim sum': '🥟',
  'dumpling': '🥟',
  'spring roll': '🥟',
  'falafel': '🧆',
  'kebab': '🥙',
  'gyro': '🥙',
  
  // Household & Cleaning
  'detergent': '🧴',
  'bleach': '🧴',
  'cleaner': '🧴',
  'spray': '🧴',
  'sponge': '🧽',
  'towel': '🧻',
  'napkin': '🧻',
  'foil': '📦',
  'wrap': '📦',
  'bag': '🛍️',
  'container': '📦',
  
  // Pet Supplies
  'dog food': '🐕',
  'cat food': '🐈',
  'pet food': '🐾',
  'dog treat': '🦴',
  'cat treat': '🐈',
  'treats': '🦴',
  'litter': '🐈',
  'cat litter': '🐈',
  'kitty litter': '🐈',
  'pet toy': '🎾',
  'dog toy': '🎾',
  'cat toy': '🐈',
  'leash': '🐕',
  'collar': '🐕',
  'pet bowl': '🥣',
  'bird seed': '🐦',
  'fish food': '🐠',
  'hamster': '🐹',
  'guinea pig': '🐹',
  'rabbit': '🐰',
  'pet bed': '🛏️',
  'pet carrier': '📦',
  
  // Baby Items
  'diaper': '👶',
  'wipes': '👶',
  'formula': '🍼',
  'baby food': '🍼',
};

// Canonical categories — these exactly match the `categories` table
// (schema-v2.sql). Anything the detector emits must be one of these so
// shopping_list_items.category joins cleanly for icons + shopping order.
// Canonical list is derived from the single shared source in
// utils/categories.js — pickers/detector can't drift apart.
export const CANONICAL_CATEGORIES = CATEGORIES.map((c) => ({
  name: c.label,
  icon: c.icon,
  shopping_order: c.shopping_order,
}));

const CANONICAL_SET = new Set(CANONICAL_CATEGORIES.map(c => c.name));
const CANONICAL_BY_NAME = Object.fromEntries(CANONICAL_CATEGORIES.map(c => [c.name, c]));

// Legacy free-text labels (old detector output / old DB rows) → canonical name
const CATEGORY_ALIASES = {
  'fruits': 'Produce', 'vegetables': 'Produce', 'fresh': 'Produce',
  'meat': 'Meat & Seafood', 'seafood': 'Meat & Seafood', 'deli': 'Meat & Seafood',
  'fish': 'Meat & Seafood', 'meat & fish': 'Meat & Seafood', 'meat & seafood': 'Meat & Seafood',
  'dairy': 'Dairy & Eggs', 'eggs': 'Dairy & Eggs', 'dairy & eggs': 'Dairy & Eggs',
  'ice cream': 'Frozen',
  'fridge': 'Fridge', 'refrigerated': 'Fridge', 'chilled': 'Fridge',
  'pantry': 'Pantry Staples', 'canned': 'Pantry Staples', 'canned goods': 'Pantry Staples',
  'dry goods': 'Pantry Staples', 'grains': 'Pantry Staples', 'lunch': 'Pantry Staples',
  'dinner': 'Pantry Staples', 'pantry staples': 'Pantry Staples', 'food': 'Food',
  'spices': 'Seasoning & Spices', 'seasoning': 'Seasoning & Spices',
  'seasoning & spices': 'Seasoning & Spices',
  'baking': 'Baking Supplies', 'baking supplies': 'Baking Supplies',
  'condiments': 'Condiments & Sauces', 'sauces': 'Condiments & Sauces',
  'condiments & sauces': 'Condiments & Sauces',
  'alcohol': 'Alcohol', 'beer': 'Alcohol', 'wine': 'Alcohol', 'liquor': 'Alcohol',
  'drinks': 'Beverages',
  'household': 'Household', 'kitchen': 'Household', 'storage': 'Household',
  'cleaning': 'Cleaning', 'cleaning supplies': 'Cleaning',
  'laundry': 'Laundry', 'detergent': 'Laundry',
  'paper': 'Paper & Plastic', 'paper & plastic': 'Paper & Plastic',
  'paper towels': 'Paper & Plastic', 'plastic': 'Paper & Plastic',
  'pet': 'Pet Supplies', 'pet supplies': 'Pet Supplies',
  'baby': 'Baby & Kids', 'baby & kids': 'Baby & Kids', 'kids': 'Baby & Kids',
  'tools': 'Tools & Hardware', 'hardware': 'Tools & Hardware', 'tools & hardware': 'Tools & Hardware',
  'automotive': 'Automotive', 'car': 'Automotive',
  'garden': 'Garden & Outdoor', 'outdoor': 'Garden & Outdoor', 'garden & outdoor': 'Garden & Outdoor',
  'office': 'Office & School', 'school': 'Office & School', 'office & school': 'Office & School',
  'stationery': 'Office & School',
  'electronics': 'Electronics', 'batteries': 'Electronics',
  'holiday': 'Holiday & Seasonal', 'seasonal': 'Holiday & Seasonal',
  'holiday & seasonal': 'Holiday & Seasonal', 'christmas': 'Holiday & Seasonal',
  'bathroom': 'Personal Care', 'beauty': 'Personal Care',
  'personal care': 'Personal Care', 'hygiene': 'Personal Care',
  'health': 'Health & Medical', 'medical': 'Health & Medical',
  'health & medical': 'Health & Medical', 'pharmacy': 'Health & Medical',
  'other': 'Other',
};

/**
 * Normalize any category label (legacy, free-text, user-typed, canonical)
 * to one of the 13 canonical names. Returns 'Other' when unsure.
 */
export const canonicalizeCategory = (category) => {
  if (!category || typeof category !== 'string') return 'Other';
  const trimmed = category.trim();
  if (CANONICAL_SET.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (CATEGORY_ALIASES[lower]) return CATEGORY_ALIASES[lower];
  // Case-insensitive canonical match
  const hit = CANONICAL_CATEGORIES.find(c => c.name.toLowerCase() === lower);
  return hit ? hit.name : 'Other';
};

export const getCategoryIcon = (category) =>
  (CANONICAL_BY_NAME[canonicalizeCategory(category)] || {}).icon || '📦';

export const getCategoryOrder = (category) =>
  (CANONICAL_BY_NAME[canonicalizeCategory(category)] || {}).shopping_order ?? 13;

// Auto-detect canonical category based on item name
const categoryKeywords = {
  'Breakfast': ['cereal', 'oatmeal', 'pancake', 'waffle', 'syrup', 'breakfast', 'bagel', 'muffin', 'croissant', 'granola', 'breakfast bar', 'french toast'],

  // Fresh food
  'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'celery', 'broccoli', 'spinach', 'cucumber', 'pepper', 'avocado', 'strawberry', 'grape', 'melon', 'peach', 'pear', 'plum', 'berry', 'fruit', 'vegetable', 'salad', 'greens', 'kale', 'cabbage', 'zucchini', 'squash', 'kiwi', 'mango', 'pineapple', 'watermelon', 'lemon', 'lime', 'garlic', 'mushroom', 'corn', 'radish', 'beet', 'turnip', 'coconut'],
  'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream', 'cottage cheese', 'eggs', 'egg', 'half and half', 'whipped cream', 'cheddar', 'mozzarella', 'parmesan'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'steak', 'ground beef', 'ribs', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'meat', 'seafood', 'crab', 'lobster', 'deli', 'lunch meat', 'rotisserie', 'wings', 'drumstick', 'tilapia', 'cod', 'hot dog', 'burger', 'pepperoni'],
  'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'pita', 'donut', 'cake', 'cookie', 'pastry', 'baguette', 'brownie', 'cupcake'],
  'Frozen': ['frozen', 'ice cream', 'popsicle', 'frozen pizza', 'frozen meal', 'frozen vegetable', 'frozen fruit', 'frozen dinner'],

  // Shelf-stable
  'Pantry Staples': ['pasta', 'rice', 'beans', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soup', 'can', 'jar', 'noodles', 'macaroni', 'canned', 'jarred', 'quinoa', 'couscous', 'barley', 'oats', 'lentils', 'chickpeas', 'sandwich', 'wrap', 'lunch', 'dinner', 'entree', 'roast', 'casserole', 'ramen', 'baking soda', 'baking powder', 'yeast', 'vanilla'],
  'Condiments & Sauces': ['ketchup', 'mustard', 'mayo', 'mayonnaise', 'relish', 'sauce', 'dressing', 'condiment', 'salsa', 'hot sauce', 'spice', 'seasoning', 'herb', 'oregano', 'basil', 'thyme', 'cumin', 'paprika', 'cinnamon', 'garlic powder', 'onion powder', 'soy sauce', 'ranch', 'hummus', 'guacamole', 'peanut butter', 'jam', 'honey'],
  'Snacks': ['chips', 'crackers', 'popcorn', 'pretzels', 'nuts', 'candy', 'chocolate', 'granola bar', 'protein bar', 'snack', 'cookies', 'trail mix', 'cereal bar', 'energy bar', 'cracker', 'gummy', 'lollipop', 'pudding', 'jello', 'goldfish', 'cheez-it', 'ritz'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'drink', 'beverage', 'energy drink', 'sports drink', 'sparkling', 'lemonade', 'smoothie', 'milkshake', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 'bourbon', 'scotch', 'liquor', 'ale', 'lager', 'ipa', 'stout', 'cider', 'champagne', 'prosecco', 'cocktail', 'margarita', 'mojito', 'latte', 'espresso', 'cappuccino'],

  // Non-food
  'Household': ['cleaner', 'bleach', 'disinfectant', 'wipes', 'spray', 'scrub', 'mop', 'broom', 'duster', 'cleaning', 'paper towel', 'toilet paper', 'tissue', 'napkin', 'paper plate', 'paper', 'foil', 'plastic wrap', 'ziplock', 'bag', 'container', 'dish soap', 'sponge', 'kitchen', 'detergent', 'fabric softener', 'dryer sheet', 'stain remover', 'laundry', 'storage', 'organizer', 'bin', 'light bulb', 'battery', 'tape', 'glue', 'tool', 'household', 'pet', 'dog', 'cat', 'bird', 'fish food', 'pet food', 'litter', 'treats', 'baby', 'diaper', 'formula', 'pacifier', 'motor oil', 'car', 'auto', 'windshield', 'antifreeze', 'automotive', 'plant', 'seed', 'soil', 'fertilizer', 'garden', 'outdoor', 'lawn', 'mulch'],
  'Personal Care': ['toilet paper', 'bath', 'shower', 'bathroom', 'hand soap', 'body wash', 'shampoo', 'conditioner', 'toothpaste', 'toothbrush', 'deodorant', 'lotion', 'razor', 'shaving cream', 'soap', 'face wash', 'medicine', 'vitamin', 'supplement', 'pain reliever', 'bandage', 'first aid', 'aspirin', 'ibuprofen', 'allergy', 'makeup', 'cosmetic', 'lipstick', 'mascara', 'foundation', 'beauty', 'nail polish', 'perfume'],
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
    'Dairy & Eggs': ['gal', 'qt', 'pt', 'oz', 'lb'],
    'Meat & Seafood': ['lb', 'oz', 'pkg'],
    'Bakery': ['ct', 'pkg', 'box'],
    'Frozen': ['oz', 'lb', 'box', 'bag'],
    'Pantry Staples': ['oz', 'lb', 'box', 'can', 'jar', 'bag'],
    'Snacks': ['oz', 'bag', 'box'],
    'Beverages': ['L', 'ml', 'gal', 'qt', 'oz', 'can'],
    'Household': ['ct', 'pkg', 'box'],
    'Personal Care': ['oz', 'ml', 'ct']
  };
  
  return sizesByCategory[canonicalizeCategory(category)] || ['ct', 'oz', 'lb'];
};

// Estimate average price based on category and item name
export const estimatePrice = (itemName, category) => {
  const averagePrices = {
    'Produce': 2.99,
    'Dairy & Eggs': 4.49,
    'Meat & Seafood': 8.99,
    'Bakery': 3.99,
    'Frozen': 5.99,
    'Pantry Staples': 3.49,
    'Snacks': 4.29,
    'Beverages': 3.99,
    'Household': 6.99,
    'Personal Care': 5.99
  };
  
  return averagePrices[canonicalizeCategory(category)] || 4.99;
};
