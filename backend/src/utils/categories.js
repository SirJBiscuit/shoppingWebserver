// Canonical category names — must match the `categories` table in
// schema-v2.sql. shopping_list_items.category stores these exact strings so
// it can join categories.name for icons + shopping_order.

const CANONICAL = [
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Frozen', 'Bakery',
  'Pantry Staples', 'Snacks', 'Beverages', 'Condiments & Sauces',
  'Breakfast', 'Household', 'Personal Care', 'Fridge',
  'Seasoning & Spices', 'Baking Supplies', 'Alcohol',
  'Health & Medical', 'Baby & Kids', 'Pet Supplies',
  'Cleaning', 'Laundry', 'Paper & Plastic',
  'Tools & Hardware', 'Garden & Outdoor', 'Automotive',
  'Office & School', 'Electronics', 'Holiday & Seasonal',
  'Food', 'Other',
];

const SET = new Set(CANONICAL);
const BY_LOWER = Object.fromEntries(CANONICAL.map((c) => [c.toLowerCase(), c]));

// Legacy free-text labels (old detector output / old DB rows) → canonical
const ALIASES = {
  fruits: 'Produce', vegetables: 'Produce', fresh: 'Produce',
  meat: 'Meat & Seafood', seafood: 'Meat & Seafood', deli: 'Meat & Seafood',
  fish: 'Meat & Seafood', 'meat & seafood': 'Meat & Seafood',
  dairy: 'Dairy & Eggs', eggs: 'Dairy & Eggs', 'dairy & eggs': 'Dairy & Eggs',
  'ice cream': 'Frozen',
  fridge: 'Fridge', refrigerated: 'Fridge', chilled: 'Fridge',
  pantry: 'Pantry Staples', canned: 'Pantry Staples', 'canned goods': 'Pantry Staples',
  'dry goods': 'Pantry Staples', grains: 'Pantry Staples', lunch: 'Pantry Staples',
  dinner: 'Pantry Staples', 'pantry staples': 'Pantry Staples', food: 'Food',
  spices: 'Seasoning & Spices', seasoning: 'Seasoning & Spices',
  'seasoning & spices': 'Seasoning & Spices',
  baking: 'Baking Supplies', 'baking supplies': 'Baking Supplies',
  condiments: 'Condiments & Sauces', sauces: 'Condiments & Sauces',
  'condiments & sauces': 'Condiments & Sauces',
  alcohol: 'Alcohol', beer: 'Alcohol', wine: 'Alcohol', liquor: 'Alcohol',
  drinks: 'Beverages',
  household: 'Household', kitchen: 'Household', storage: 'Household',
  cleaning: 'Cleaning', 'cleaning supplies': 'Cleaning',
  laundry: 'Laundry', detergent: 'Laundry',
  paper: 'Paper & Plastic', 'paper & plastic': 'Paper & Plastic',
  'paper towels': 'Paper & Plastic', plastic: 'Paper & Plastic',
  pet: 'Pet Supplies', 'pet supplies': 'Pet Supplies',
  baby: 'Baby & Kids', 'baby & kids': 'Baby & Kids', kids: 'Baby & Kids',
  tools: 'Tools & Hardware', hardware: 'Tools & Hardware', 'tools & hardware': 'Tools & Hardware',
  automotive: 'Automotive', car: 'Automotive',
  garden: 'Garden & Outdoor', outdoor: 'Garden & Outdoor', 'garden & outdoor': 'Garden & Outdoor',
  office: 'Office & School', school: 'Office & School', 'office & school': 'Office & School',
  stationery: 'Office & School',
  electronics: 'Electronics', batteries: 'Electronics',
  holiday: 'Holiday & Seasonal', seasonal: 'Holiday & Seasonal',
  'holiday & seasonal': 'Holiday & Seasonal', christmas: 'Holiday & Seasonal',
  bathroom: 'Personal Care', beauty: 'Personal Care',
  'personal care': 'Personal Care', hygiene: 'Personal Care',
  health: 'Health & Medical', medical: 'Health & Medical',
  'health & medical': 'Health & Medical', pharmacy: 'Health & Medical',
  other: 'Other',
};

/**
 * User-created categories from the DB `categories` table — exact/lowercase
 * lookups win over legacy aliases so a user-named category is never folded
 * into a canonical bucket. Populated by addCustomCategory / the boot load
 * in routes/categories.js.
 */
const CUSTOM_BY_LOWER = new Map();

const addCustomCategory = (name) => {
  if (!name || typeof name !== 'string') return;
  const trimmed = name.trim();
  if (!trimmed || SET.has(trimmed)) return;
  CUSTOM_BY_LOWER.set(trimmed.toLowerCase(), trimmed);
};

/**
 * Normalize any category label to a canonical name. Returns 'Other' when
 * unsure (or given nothing), so the value always joins categories.name.
 */
const canonicalizeCategory = (category) => {
  if (!category || typeof category !== 'string') return 'Other';
  const trimmed = category.trim();
  if (SET.has(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (CUSTOM_BY_LOWER.has(lower)) return CUSTOM_BY_LOWER.get(lower);
  if (ALIASES[lower]) return ALIASES[lower];
  return BY_LOWER[lower] || 'Other';
};

// Compact name-based detector for writes where the client sent no category
const KEYWORDS = {
  'Breakfast': ['cereal', 'oatmeal', 'pancake', 'waffle', 'granola'],
  'Produce': ['apple', 'banana', 'orange', 'lettuce', 'tomato', 'potato', 'onion', 'carrot', 'broccoli', 'spinach', 'cucumber', 'pepper', 'avocado', 'strawberry', 'grape', 'melon', 'peach', 'pear', 'berry', 'fruit', 'vegetable', 'salad', 'kale', 'zucchini', 'lemon', 'lime', 'garlic', 'mushroom'],
  'Dairy & Eggs': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'egg', 'cheddar', 'mozzarella', 'parmesan'],
  'Meat & Seafood': ['chicken', 'beef', 'pork', 'turkey', 'ham', 'bacon', 'sausage', 'steak', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp', 'meat', 'seafood', 'crab', 'lobster', 'deli', 'rotisserie', 'pepperoni'],
  'Bakery': ['bread', 'bagel', 'muffin', 'croissant', 'roll', 'bun', 'tortilla', 'donut', 'cake', 'cookie', 'pastry'],
  'Frozen': ['frozen', 'ice cream', 'popsicle'],
  'Pantry Staples': ['pasta', 'rice', 'beans', 'flour', 'sugar', 'salt', 'pepper', 'oil', 'vinegar', 'soup', 'can', 'jar', 'noodles', 'canned', 'quinoa', 'oats', 'lentils'],
  'Condiments & Sauces': ['ketchup', 'mustard', 'mayo', 'relish', 'sauce', 'dressing', 'salsa', 'spice', 'seasoning', 'oregano', 'basil', 'cumin', 'paprika', 'cinnamon', 'honey', 'jam', 'peanut butter'],
  'Snacks': ['chips', 'crackers', 'popcorn', 'pretzel', 'nuts', 'candy', 'chocolate', 'granola bar', 'snack', 'cookies', 'trail mix'],
  'Beverages': ['water', 'juice', 'soda', 'coffee', 'tea', 'beer', 'wine', 'vodka', 'whiskey', 'rum', 'gin', 'tequila', 'cider', 'lemonade', 'smoothie'],
  'Household': ['cleaner', 'bleach', 'wipes', 'spray', 'mop', 'broom', 'paper towel', 'toilet paper', 'tissue', 'napkin', 'foil', 'ziplock', 'dish soap', 'sponge', 'detergent', 'laundry', 'battery', 'light bulb', 'pet', 'dog', 'cat', 'diaper', 'baby'],
  'Personal Care': ['shampoo', 'conditioner', 'toothpaste', 'deodorant', 'lotion', 'razor', 'soap', 'medicine', 'vitamin', 'bandage', 'aspirin', 'makeup', 'perfume'],
};

/** Best-effort canonical category from an item name; '' when nothing matches */
const detectCategoryForName = (itemName) => {
  if (!itemName) return '';
  const lower = itemName.toLowerCase();
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    for (const k of keywords) {
      if (lower.includes(k)) return category;
    }
  }
  return '';
};

/**
 * Resolve the category to store: prefer the client value (canonicalized),
 * fall back to name detection, then 'Other'.
 */
const resolveCategory = (category, itemName) => {
  if (category && category.trim()) return canonicalizeCategory(category);
  return detectCategoryForName(itemName) || 'Other';
};

module.exports = { CANONICAL, canonicalizeCategory, detectCategoryForName, resolveCategory, addCustomCategory };
