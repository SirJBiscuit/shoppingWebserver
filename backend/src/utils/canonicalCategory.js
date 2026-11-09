/**
 * Shared backend category normalization — mirrors migration 052's
 * canonical_category() SQL function and the frontend categoryDetector.
 * Keeps DB writes canonical without requiring the function to exist
 * on every environment (e.g. un-migrated dev DBs).
 */

const CANONICAL = new Set([
  'Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Frozen', 'Bakery',
  'Pantry Staples', 'Snacks', 'Beverages', 'Condiments & Sauces',
  'Breakfast', 'Household', 'Personal Care', 'Other'
]);

const ALIASES = {
  'fruits': 'Produce', 'vegetables': 'Produce', 'fresh': 'Produce',
  'meat': 'Meat & Seafood', 'seafood': 'Meat & Seafood', 'deli': 'Meat & Seafood',
  'fish': 'Meat & Seafood', 'meat & fish': 'Meat & Seafood',
  'dairy': 'Dairy & Eggs', 'eggs': 'Dairy & Eggs',
  'ice cream': 'Frozen',
  'pantry': 'Pantry Staples', 'canned': 'Pantry Staples', 'canned goods': 'Pantry Staples',
  'dry goods': 'Pantry Staples', 'grains': 'Pantry Staples', 'lunch': 'Pantry Staples',
  'dinner': 'Pantry Staples', 'baking': 'Pantry Staples',
  'spices': 'Condiments & Sauces', 'condiments': 'Condiments & Sauces', 'sauces': 'Condiments & Sauces',
  'alcohol': 'Beverages', 'drinks': 'Beverages',
  'cleaning': 'Household', 'paper': 'Household', 'kitchen': 'Household',
  'laundry': 'Household', 'storage': 'Household', 'pet': 'Household',
  'pet supplies': 'Household', 'baby': 'Household', 'automotive': 'Household',
  'garden': 'Household', 'tools': 'Household',
  'bathroom': 'Personal Care', 'health': 'Personal Care', 'beauty': 'Personal Care',
  'hygiene': 'Personal Care', 'medical': 'Personal Care',
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
