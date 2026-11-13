/**
 * Pluggable plate health-scoring services.
 *
 * Each service provides:
 *   key        — stored on plate_entries.health_service + household_members.health_service
 *   name/desc  — display metadata (GET /api/plate/services)
 *   profiles   — per-food-group macro profiles + per-serving calorie scale
 *   score()    — whole-plate balance score from a day's entries
 *
 * Adding a new scoring engine = adding an entry to SERVICES + a matching
 * plate_health_services row (migration 065). Entries keep the service that
 * scored them, so historical plates can be re-scored or compared across
 * services via scores_by_service JSONB.
 */
const { detectCategoryForName } = require('../utils/categories');

// ---------------------------------------------------------------------------
// Group detection (service-agnostic: category first, keyword fallback)
// ---------------------------------------------------------------------------

const CATEGORY_GROUPS = {
  'Produce': 'vegetables',
  'Meat & Seafood': 'protein',
  'Dairy & Eggs': 'dairy',
  'Bakery': 'grains',
  'Pantry Staples': 'grains',
  'Breakfast': 'grains',
  'Snacks': 'extras',
  'Frozen': 'extras',
  'Condiments & Sauces': 'extras',
  'Beverages': 'beverages',
};

const FRUIT_WORDS = ['apple', 'banana', 'orange', 'berry', 'strawberry', 'blueberry',
  'raspberry', 'grape', 'melon', 'watermelon', 'peach', 'pear', 'pineapple',
  'mango', 'kiwi', 'cherry', 'plum', 'apricot', 'lemon', 'lime', 'fruit'];
const PROTEIN_WORDS = ['chicken', 'beef', 'pork', 'turkey', 'fish', 'salmon',
  'tuna', 'shrimp', 'steak', 'bacon', 'ham', 'sausage', 'lamb', 'meat',
  'tofu', 'tempeh', 'protein', 'beans', 'lentils', 'chickpea', 'egg'];
const GRAIN_WORDS = ['rice', 'pasta', 'bread', 'noodle', 'cereal', 'oat', 'quinoa',
  'flour', 'tortilla', 'bagel', 'crackers', 'pancake', 'waffle'];
const DAIRY_WORDS = ['milk', 'cheese', 'yogurt', 'yoghurt', 'butter', 'cream', 'dairy'];

const wordHit = (lower, words) => words.some((w) => lower.includes(w));

/** Detect a food group from name (+ optional canonical category). */
const detectGroup = (itemName, category = null) => {
  if (category && CATEGORY_GROUPS[category]) {
    if (category === 'Produce' && itemName && wordHit(itemName.toLowerCase(), FRUIT_WORDS)) return 'fruits';
    if (category === 'Dairy & Eggs' && itemName && /egg/.test(itemName.toLowerCase())) return 'protein';
    return CATEGORY_GROUPS[category];
  }
  const lower = (itemName || '').toLowerCase();
  if (!lower) return 'extras';
  if (wordHit(lower, PROTEIN_WORDS)) return 'protein';
  if (wordHit(lower, FRUIT_WORDS)) return 'fruits';
  if (wordHit(lower, DAIRY_WORDS)) return 'dairy';
  if (wordHit(lower, GRAIN_WORDS)) return 'grains';
  const cat = detectCategoryForName(itemName);
  return CATEGORY_GROUPS[cat] || 'extras';
};

// ---------------------------------------------------------------------------
// Whole-plate scoring helper
// ---------------------------------------------------------------------------

const GROUPS_OF_PLATE = ['vegetables', 'fruits', 'protein', 'grains', 'dairy'];

/**
 * 0-100 plate score: group coverage (5 groups ×12), ≥50% of servings being
 * produce (veg+fruit half-plate rule, up to 25pts), extras restraint (15pts,
 * decays as extras grow past 15% of servings).
 */
const baseScore = ({ groupServings, totalServings }) => {
  if (!totalServings) return { score: null, covered: [], missing: GROUPS_OF_PLATE };
  const covered = GROUPS_OF_PLATE.filter((g) => groupServings[g] > 0);
  const missing = GROUPS_OF_PLATE.filter((g) => !groupServings[g]);
  const produceShare = ((groupServings.vegetables || 0) + (groupServings.fruits || 0)) / totalServings;
  const extrasShare = (groupServings.extras || 0) / totalServings;
  const score = Math.round(
    covered.length * 12 +
    Math.min(1, produceShare / 0.5) * 25 +
    Math.max(0, 1 - Math.max(0, extrasShare - 0.15) / 0.35) * 15
  );
  return { score: Math.min(100, score), covered, missing, produceShare, extrasShare };
};

// ---------------------------------------------------------------------------
// Service registry
// ---------------------------------------------------------------------------

const SERVICES = {
  legacy: {
    key: 'legacy',
    name: 'Legacy Heuristic',
    description: 'Original group-based estimates — fixed macro profiles per food group.',
    version: 1,
    active: true,
    profiles: {
      protein:    { p: 55, f: 25, c: 20, cal: 180 },
      dairy:      { p: 25, f: 35, c: 40, cal: 120 },
      grains:     { p: 10, f: 5,  c: 85, cal: 160 },
      vegetables: { p: 15, f: 5,  c: 80, cal: 30 },
      fruits:     { p: 5,  f: 3,  c: 92, cal: 60 },
      extras:     { p: 8,  f: 45, c: 47, cal: 170 },
      beverages:  { p: 2,  f: 2,  c: 96, cal: 90 },
      other:      { p: 20, f: 30, c: 50, cal: 100 },
    },
    score: baseScore,
  },
  balanced: {
    key: 'balanced',
    name: 'Balanced Plate',
    description: 'Stricter half-plate produce rule; protein-leaning profiles for mains.',
    version: 2,
    active: true,
    profiles: {
      protein:    { p: 60, f: 25, c: 15, cal: 170 },
      dairy:      { p: 30, f: 30, c: 40, cal: 110 },
      grains:     { p: 12, f: 6,  c: 82, cal: 150 },
      vegetables: { p: 15, f: 5,  c: 80, cal: 25 },
      fruits:     { p: 5,  f: 3,  c: 92, cal: 55 },
      extras:     { p: 8,  f: 45, c: 47, cal: 190 },
      beverages:  { p: 2,  f: 2,  c: 96, cal: 95 },
      other:      { p: 20, f: 30, c: 50, cal: 100 },
    },
    // Same coverage model but produce must reach 55% for full marks
    score: (input) => {
      const r = baseScore(input);
      if (r.score == null) return r;
      const adj = Math.min(1, (r.produceShare || 0) / 0.55) * 25;
      return { ...r, score: Math.min(100, Math.round(r.covered.length * 12 + adj +
        Math.max(0, 1 - Math.max(0, (r.extrasShare || 0) - 0.15) / 0.35) * 15)) };
    },
  },
  'nutrition-api': {
    key: 'nutrition-api',
    name: 'Nutrition Lookup (coming soon)',
    description: 'Reserved for a real nutrition database — entries will store per-item macros.',
    version: 0,
    active: false,
    profiles: null,
    score: () => ({ score: null, covered: [], missing: GROUPS_OF_PLATE }),
  },
};

const DEFAULT_KEY = 'legacy';

/** Registry rows for GET /services — code is the source of truth. */
const listServices = () => Object.values(SERVICES).map(({ key, name, description, version, active }) =>
  ({ key, name, description, version, active }));

/** Resolve a scorer; unknown/inactive keys fall back to legacy. */
const resolveScorer = (key) => {
  const s = SERVICES[key];
  return s && s.active ? s : SERVICES[DEFAULT_KEY];
};

module.exports = { SERVICES, listServices, resolveScorer, detectGroup, CATEGORY_GROUPS, GROUPS_OF_PLATE };
