import React, { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import ModalShell from './ui/ModalShell';

/**
 * QuickCategoryModal - fast category picker popup.
 *
 * Reusable anywhere an item's category needs one-tap changing:
 * Home Inventory item icons/badges, the Looking-for-Next category pill, etc.
 *
 * categories: array of strings OR { value, label, icon } objects.
 */
// Full category set — each carries an emoji icon plus the Tailwind chip
// colors used by the inventory Category view group headers.
export const INVENTORY_CATEGORIES = [
  // Food & drink
  { value: 'food', label: 'Food', icon: '🍎', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'produce', label: 'Produce', icon: '🥬', color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300' },
  { value: 'meat_seafood', label: 'Meat & Seafood', icon: '🥩', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-800 dark:text-rose-300' },
  { value: 'dairy_eggs', label: 'Dairy & Eggs', icon: '🥚', color: 'bg-sky-100 dark:bg-sky-900/30 text-sky-800 dark:text-sky-300' },
  { value: 'bakery', label: 'Bakery', icon: '🥖', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300' },
  { value: 'frozen', label: 'Frozen', icon: '🧊', color: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300' },
  { value: 'pantry_staples', label: 'Pantry Staples', icon: '🥫', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300' },
  { value: 'snacks', label: 'Snacks', icon: '🍿', color: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-800 dark:text-fuchsia-300' },
  { value: 'beverages', label: 'Beverages', icon: '🧃', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' },
  { value: 'breakfast', label: 'Breakfast & Cereal', icon: '🥣', color: 'bg-lime-100 dark:bg-lime-900/30 text-lime-800 dark:text-lime-300' },
  { value: 'seasoning', label: 'Seasoning & Spices', icon: '🧂', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'condiments', label: 'Condiments & Sauces', icon: '🫙', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-800 dark:text-teal-300' },
  { value: 'baking', label: 'Baking Supplies', icon: '🧁', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
  { value: 'alcohol', label: 'Alcohol', icon: '🍷', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  // Household
  { value: 'household', label: 'Household', icon: '🏠', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'laundry', label: 'Laundry', icon: '🧺', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300' },
  { value: 'paper_plastic', label: 'Paper & Plastic', icon: '🧻', color: 'bg-stone-200 dark:bg-stone-700 text-stone-800 dark:text-stone-300' },
  // Health & personal
  { value: 'medical', label: 'Health & Medical', icon: '💊', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'beauty', label: 'Beauty & Personal Care', icon: '💄', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300' },
  { value: 'baby', label: 'Baby & Kids', icon: '👶', color: 'bg-violet-100 dark:bg-violet-900/30 text-violet-800 dark:text-violet-300' },
  { value: 'pet', label: 'Pet', icon: '🐾', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' },
  // Home & beyond
  { value: 'tools', label: 'Tools & Hardware', icon: '🔧', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
  { value: 'garden', label: 'Garden & Outdoor', icon: '🌱', color: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' },
  { value: 'automotive', label: 'Automotive', icon: '🚗', color: 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300' },
  { value: 'office', label: 'Office & School', icon: '📎', color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300' },
  { value: 'electronics', label: 'Electronics & Batteries', icon: '🔌', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' },
  { value: 'holiday', label: 'Holiday & Seasonal', icon: '🎄', color: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' },
  { value: 'other', label: 'Other', icon: '📦', color: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' },
];

const normalize = (cat) =>
  typeof cat === 'string'
    ? { value: cat, label: cat, icon: '🏷️' }
    : { value: cat.value ?? cat.name, label: cat.label ?? cat.name, icon: cat.icon ?? '🏷️' };

const QuickCategoryModal = ({
  isOpen,
  title = 'Change Category',
  categories = INVENTORY_CATEGORIES,
  currentCategory,
  onSelect,
  onClose,
}) => {
  const [query, setQuery] = useState('');
  const options = categories.map(normalize);
  const current = (currentCategory || '').toLowerCase();

  const q = query.trim().toLowerCase();
  const list = q
    ? options.filter((c) =>
        c.label?.toLowerCase().includes(q) || c.value?.toLowerCase().includes(q))
    : options;

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} title={title} maxWidth="max-w-sm" bodyClass="p-3">
      {/* Search — same pattern as QuickCategoryPicker */}
      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search categories…"
          className="w-full pl-8 pr-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-2 gap-2 max-h-[60vh]">
        {list.map((cat, i) => {
          const active = cat.value?.toLowerCase() === current || cat.label?.toLowerCase() === current;
          return (
            <motion.button
              key={cat.value}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelect(cat.value)}
              className={`flex items-center gap-2 px-3 py-3 rounded-xl font-medium text-left transition-all ${
                active
                  ? 'bg-primary-600 text-white shadow-md'
                  : 'bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 hover:shadow'
              }`}
            >
              <span className="text-xl leading-none">{cat.icon}</span>
              <span className="flex-1 text-sm truncate">{cat.label}</span>
              {active && <Check size={16} className="flex-shrink-0" />}
            </motion.button>
          );
        })}
        {list.length === 0 && (
          <p className="col-span-2 text-center text-xs text-gray-400 py-4">No matches for “{query.trim()}”</p>
        )}
      </div>
    </ModalShell>
  );
};

export default QuickCategoryModal;
