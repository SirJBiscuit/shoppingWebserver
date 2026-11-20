/**
 * Shared backend category normalization — mirrors migration 052's
 * canonical_category() SQL function and the frontend categoryDetector.
 * Keeps DB writes canonical without requiring the function to exist
 * on every environment (e.g. un-migrated dev DBs).
 */

const CANONICAL = new Set([
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Frozen', 'Bakery',
  'Pantry Staples', 'Snacks', 'Beverages', 'Condiments & Sauces',
  'Breakfast', 'Household', 'Personal Care',
  'Seasoning & Spices', 'Baking Supplies', 'Alcohol',
  'Health & Medical', 'Baby & Kids', 'Pet Supplies',
  'Cleaning', 'Laundry', 'Paper & Plastic',
  'Tools & Hardware', 'Garden & Outdoor', 'Automotive',
  'Office & School', 'Electronics', 'Holiday & Seasonal',
  'Other'
]);

const ALIASES = {
  'fruits': 'Produce', 'vegetables': 'Produce', 'fresh': 'Produce',
  'meat': 'Meat & Seafood', 'seafood': 'Meat & Seafood', 'deli': 'Meat & Seafood',
  'fish': 'Meat & Seafood', 'meat & fish': 'Meat & Seafood', 'meat & seafood': 'Meat & Seafood',
  'dairy': 'Dairy & Eggs', 'eggs': 'Dairy & Eggs', 'dairy & eggs': 'Dairy & Eggs',
  'ice cream': 'Frozen',
  'pantry': 'Pantry Staples', 'canned': 'Pantry Staples', 'canned goods': 'Pantry Staples',
  'dry goods': 'Pantry Staples', 'grains': 'Pantry Staples', 'lunch': 'Pantry Staples',
  'dinner': 'Pantry Staples', 'pantry staples': 'Pantry Staples', 'food': 'Pantry Staples',
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
  'hygiene': 'Personal Care', 'personal care': 'Personal Care',
  'health': 'Health & Medical', 'medical': 'Health & Medical',
  'health & medical': 'Health & Medical', 'pharmacy': 'Health & Medical',
  'other': 'Other'
};

/**
 * Normalize any category label to a canonical name.
 * @param {string|null|undefined} raw
 * @returns {string} canonical name ('Other' when unrecognized/empty)
 */
const canonicalizeCategory = (raw) => {
  if (!raw || typeof raw !== 'string' || !raw.trim()) return 'Other';
  const t = raw.trim();
  if (CANONICAL.has(t)) return t;
  const lower = t.toLowerCase();
  if (ALIASES[lower]) return ALIASES[lower];
  for (const c of CANONICAL) if (c.toLowerCase() === lower) return c;
  return 'Other';
};

module.exports = { canonicalizeCategory };
