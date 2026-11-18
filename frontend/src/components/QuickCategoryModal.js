import React from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../utils/autoPlacement';

/**
 * QuickCategoryModal - fast category picker popup.
 *
 * Reusable anywhere an item's category needs one-tap changing:
 * Home Inventory item icons/badges, the Looking-for-Next category pill, etc.
 *
 * categories: array of strings OR { value, label, icon } objects.
 */
export const INVENTORY_CATEGORIES = [
  { value: 'food', label: 'Food', icon: '🍎' },
  { value: 'seasoning', label: 'Seasoning', icon: '🧂' },
  { value: 'household', label: 'Household', icon: '🏠' },
  { value: 'cleaning', label: 'Cleaning', icon: '🧹' },
  { value: 'medical', label: 'Health & Medical', icon: '💊' },
  { value: 'pet', label: 'Pet', icon: '🐾' },
  { value: 'tools', label: 'Tools', icon: '🔧' },
  { value: 'beauty', label: 'Beauty', icon: '💄' },
  { value: 'other', label: 'Other', icon: '📦' },
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
  if (!isOpen) return null;
  const options = categories.map(normalize);
  const current = (currentCategory || '').toLowerCase();

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[80] p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Category grid */}
            <div className="p-3 grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {options.map((cat, i) => {
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
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </Portal>
  );
};

export default QuickCategoryModal;
