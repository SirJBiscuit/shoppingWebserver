import { useEffect, useState } from 'react';
import { Check, Plus, Search } from 'lucide-react';
import { motion } from 'framer-motion';
import ModalShell from './ui/ModalShell';
import CATEGORIES, { mergeDbCategories } from '../utils/categories';
import { categoriesAPI } from '../services/api';

/**
 * QuickCategoryModal - fast category picker popup.
 *
 * Reusable anywhere an item's category needs one-tap changing:
 * Home Inventory item icons/badges, the Looking-for-Next category pill, etc.
 *
 * categories: array of strings OR { value, label, icon } objects.
 */
// Full category set — unified single source in utils/categories.js. Each
// entry carries an emoji icon plus the Tailwind chip colors used by the
// inventory Category view group headers.
export const INVENTORY_CATEGORIES = CATEGORIES;

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
  const [dbRows, setDbRows] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏷️');
  const [saving, setSaving] = useState(false);

  // Custom categories live in the DB `categories` table — merge them into
  // the unified list whenever the picker opens so every picker agrees.
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    categoriesAPI.getCategories()
      .then((r) => { if (!cancelled) setDbRows(Array.isArray(r.data) ? r.data : []); })
      .catch(() => { if (!cancelled) setDbRows([]); });
    return () => { cancelled = true; };
  }, [isOpen]);

  const options = (dbRows
    ? mergeDbCategories(dbRows, { valueFromLabel: 'slug' })
    : categories
  ).map(normalize);
  const current = (currentCategory || '').toLowerCase();

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name || saving) return;
    setSaving(true);
    try {
      const r = await categoriesAPI.createCategory({ name, icon: newIcon || '🏷️' });
      const saved = r.data;
      setDbRows((rows) => [...(rows || []), saved]);
      setCreating(false);
      setNewName('');
      onSelect(name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'other');
    } catch {
      // leave the form open so the user can retry
    } finally {
      setSaving(false);
    }
  };

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

      {/* Create a custom category — saved to the shared categories table
          so every picker offers it */}
      <div className="mt-2 border-t border-gray-100 dark:border-gray-700 pt-2">
        {creating ? (
          <div className="flex items-center gap-1.5">
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              maxLength={4}
              className="w-11 px-2 py-1.5 text-center text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
              title="Emoji icon"
            />
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="Category name"
              className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim() || saving}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-primary-600 text-white disabled:opacity-50"
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> New category
          </button>
        )}
      </div>
    </ModalShell>
  );
};

export default QuickCategoryModal;
