/**
 * Unified category list — the single source every category feature reads.
 *
 * `label` is the canonical shopping `category_name` ('Dairy & Eggs');
 * `value` is the inventory `item_category` key ('dairy_eggs'). Both DB
 * columns keep their own format, but every picker shows the same set.
 *
 * Custom (user-created) categories live in the DB `categories` table and
 * are merged in at picker-open time via categoriesAPI.getCategories().
 */
const CATEGORIES = [
  { value: 'pantry_staples', label: 'Pantry Staples', icon: '🥫', shopping_order: 1, color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  { value: 'snacks', label: 'Snacks', icon: '🍿', shopping_order: 2, color: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300' },
  { value: 'beverages', label: 'Beverages', icon: '🥤', shopping_order: 3, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'condiments', label: 'Condiments & Sauces', icon: '🍯', shopping_order: 4, color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' },
  { value: 'breakfast', label: 'Breakfast', icon: '🥞', shopping_order: 5, color: 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300' },
  { value: 'household', label: 'Household', icon: '🧹', shopping_order: 6, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
  { value: 'beauty', label: 'Personal Care', icon: '🧴', shopping_order: 7, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
  { value: 'produce', label: 'Produce', icon: '🥬', shopping_order: 8, color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' },
  { value: 'meat_seafood', label: 'Meat & Seafood', icon: '🥩', shopping_order: 9, color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300' },
  { value: 'dairy_eggs', label: 'Dairy & Eggs', icon: '🥛', shopping_order: 10, color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300' },
  { value: 'frozen', label: 'Frozen', icon: '🧊', shopping_order: 11, color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300' },
  { value: 'bakery', label: 'Bakery', icon: '🍞', shopping_order: 12, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
  { value: 'fridge', label: 'Fridge', icon: '❄️', shopping_order: 13, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'seasoning', label: 'Seasoning & Spices', icon: '🧂', shopping_order: 14, color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'baking', label: 'Baking Supplies', icon: '🧁', shopping_order: 15, color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
  { value: 'alcohol', label: 'Alcohol', icon: '🍷', shopping_order: 16, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  { value: 'medical', label: 'Health & Medical', icon: '💊', shopping_order: 17, color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'baby', label: 'Baby & Kids', icon: '👶', shopping_order: 18, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300' },
  { value: 'pet', label: 'Pet Supplies', icon: '🐾', shopping_order: 19, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧽', shopping_order: 20, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'laundry', label: 'Laundry', icon: '🧺', shopping_order: 21, color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300' },
  { value: 'paper_plastic', label: 'Paper & Plastic', icon: '🧻', shopping_order: 22, color: 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-300' },
  { value: 'tools', label: 'Tools & Hardware', icon: '🔧', shopping_order: 23, color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
  { value: 'garden', label: 'Garden & Outdoor', icon: '🌱', shopping_order: 24, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'automotive', label: 'Automotive', icon: '🚗', shopping_order: 25, color: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300' },
  { value: 'office', label: 'Office & School', icon: '📎', shopping_order: 26, color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
  { value: 'electronics', label: 'Electronics', icon: '🔌', shopping_order: 27, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'holiday', label: 'Holiday & Seasonal', icon: '🎄', shopping_order: 28, color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'food', label: 'Food', icon: '🍽️', shopping_order: 30, color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'other', label: 'Other', icon: '📦', shopping_order: 31, color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
];

export default CATEGORIES;

/** Lookups by either write format. */
const BY_VALUE = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));
const BY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.label, c]));
const BY_LABEL_LOWER = Object.fromEntries(CATEGORIES.map((c) => [c.label.toLowerCase(), c]));

export const categoryByValue = (v) => BY_VALUE[v] || null;
export const categoryByLabel = (l) => BY_LABEL[l] || null;

/**
 * Merge DB `categories` rows (custom user categories + seeded presets)
 * into the unified list shape for a picker. Rows matching a unified label
 * or value are skipped — custom extras append after the built-ins.
 */
export const mergeDbCategories = (rows = [], { valueFromLabel = 'value' } = {}) => {
  const custom = [];
  for (const row of rows) {
    const name = (row?.name || '').trim();
    if (!name || BY_LABEL[name] || BY_LABEL_LOWER[name.toLowerCase()] || BY_VALUE[name]) continue;
    custom.push({
      value: valueFromLabel === 'slug'
        ? name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'other'
        : name,
      label: name,
      icon: row.icon || '🏷️',
      color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300',
      custom: true,
      id: row.id,
      user_id: row.user_id ?? null,
    });
  }
  return [...CATEGORIES, ...custom];
};
