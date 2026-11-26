import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, Save, MapPin, ChevronLeft, ChevronRight, Store } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import { useToast } from '../hooks/useToast';
import { Portal } from '../utils/autoPlacement';

const authHeaders = (json = false) => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

/**
 * AisleConfigModal — focused aisle editor.
 *
 * Left rail lists every configured aisle as a compact pill; selecting one
 * fills the panel with that aisle's full configuration (number, name,
 * category chips, custom categories). Prev/next arrows step through.
 * Saves via the bulk PUT /api/stores/:id/aisles — one atomic replace.
 */
const AisleConfigModal = ({ isOpen, onClose, storeName, storeId: storeIdProp, onSave, userCategories = [] }) => {
  const { success, error } = useToast();
  const [aisles, setAisles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState(storeIdProp || null);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [customCat, setCustomCat] = useState('');

  useEffect(() => {
    if (isOpen) {
      openAndLoad();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, storeName, storeIdProp]);

  // The list only stores a free-text store_name — resolve (or create) the
  // matching store_locations row so aisles have a real storeId to save under.
  const resolveStoreId = async () => {
    if (storeIdProp) return storeIdProp;
    if (!storeName) return null;
    try {
      const res = await fetch(
        `/api/mdl/stores/search?name=${encodeURIComponent(storeName)}`,
        { headers: authHeaders() }
      );
      if (res.ok) {
        const rows = await res.json();
        const exact = rows.find(
          (s) => (s.name || '').toLowerCase() === storeName.toLowerCase()
        );
        if (exact) return exact.id;
        if (rows[0]) return rows[0].id;
      }
      // No store record yet — create one so the config persists
      const create = await fetch('/api/mdl/stores', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ name: storeName }),
      });
      if (create.ok) {
        const created = await create.json();
        return created.id || created.store?.id || null;
      }
    } catch (err) {
      console.error('Error resolving store:', err);
    }
    return null;
  };

  const openAndLoad = async () => {
    const id = await resolveStoreId();
    setStoreId(id);
    await loadAisles(id);
  };

  const loadAisles = async (id) => {
    if (!id) {
      setAisles([]);
      return;
    }
    try {
      const response = await fetch(`/api/stores/${id}/aisles`, {
        headers: authHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setAisles(data);
        setSelectedIdx(0);
      } else {
        setAisles([]);
      }
    } catch (err) {
      console.error('Error loading aisles:', err);
      setAisles([]);
    }
  };

  const addAisle = () => {
    const next = {
      aisle_number: String(aisles.length + 1),
      aisle_name: '',
      categories: [],
      display_order: aisles.length,
      isNew: true,
    };
    setAisles([...aisles, next]);
    setSelectedIdx(aisles.length); // jump straight to the new aisle
  };

  const updateAisle = (index, field, value) => {
    const updated = [...aisles];
    updated[index][field] = value;
    setAisles(updated);
  };

  const removeAisle = (index) => {
    const next = aisles.filter((_, i) => i !== index);
    setAisles(next);
    setSelectedIdx((i) => Math.min(Math.max(0, i - (index <= i ? 1 : 0)), Math.max(0, next.length - 1)));
  };

  const addCategory = (aisleIndex, category) => {
    if (!category.trim()) return;
    const updated = [...aisles];
    if (!updated[aisleIndex].categories) {
      updated[aisleIndex].categories = [];
    }
    if (!updated[aisleIndex].categories.includes(category.trim())) {
      updated[aisleIndex].categories.push(category.trim());
      setAisles(updated);
    }
  };

  const removeCategory = (aisleIndex, categoryIndex) => {
    const updated = [...aisles];
    updated[aisleIndex].categories.splice(categoryIndex, 1);
    setAisles(updated);
  };

  const saveAisles = async () => {
    if (!storeId) {
      error('No store selected — set a store location on the list first');
      return;
    }
    setLoading(true);
    try {
      // One atomic replace — removed aisles actually delete, and a failure
      // can't leave a half-saved layout. Rows without a number are skipped.
      const res = await fetch(`/api/stores/${storeId}/aisles`, {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify({
          aisles: aisles.map((a, i) => ({
            aisle_number: a.aisle_number,
            aisle_name: a.aisle_name,
            categories: a.categories || [],
            display_order: i,
          })),
        }),
      });
      if (!res.ok) throw new Error('Bulk save failed');
      success('Aisle configuration saved!');
      if (onSave) await onSave(aisles);
      onClose();
    } catch (err) {
      console.error('Error saving aisles:', err);
      error('Failed to save aisle configuration');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // Category options: the user's own categories first (that's what items
  // actually carry), then common store categories — deduped.
  const commonCategories = [
    'Produce', 'Bakery', 'Deli', 'Meat', 'Seafood', 'Dairy', 'Eggs',
    'Frozen', 'Breakfast', 'Cereal', 'Canned', 'Soup', 'Pantry',
    'Pasta', 'Rice', 'Baking', 'Spices', 'Condiments', 'Sauces',
    'Snacks', 'Chips', 'Candy', 'Beverages', 'Soda', 'Juice',
    'Coffee', 'Tea', 'Paper', 'Cleaning', 'Household', 'Kitchen',
    'Laundry', 'Personal Care', 'Health', 'Baby', 'Pet',
  ];
  const categoryOptions = [...new Set([
    ...userCategories.map((c) => (typeof c === 'string' ? c : c?.name)).filter(Boolean),
    ...commonCategories,
  ])];

  const aisle = aisles[selectedIdx] || null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-3 sm:p-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ type: 'spring', damping: 24, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden"
        >
          {/* Header — compact, matches the quick-picker chrome */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Configure Aisles
              </h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 truncate">
                <Store className="w-3 h-3" /> {storeName || 'No store'} · {aisles.length} aisle{aisles.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Aisle rail — compact pills, vertical on desktop / horizontal on mobile */}
          <div className="border-b border-gray-100 dark:border-gray-700 px-3 py-2">
            <AnimatedScrollbar3D
              maxHeight="96px"
              thumbColor="bg-gradient-to-b from-blue-400 to-blue-600"
              glowColor="primary"
              autoHide={false}
            >
              <div className="flex flex-wrap gap-1.5">
                {aisles.map((a, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedIdx(i)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95 ${
                      i === selectedIdx
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-gray-200 dark:border-gray-600'
                    }`}
                    title={a.aisle_name || `Aisle ${a.aisle_number || i + 1}`}
                  >
                    <span className="font-bold">{a.aisle_number || '?'}</span>
                    {a.aisle_name ? <span className="opacity-80"> · {a.aisle_name}</span> : null}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={addAisle}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all active:scale-95 flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Aisle
                </button>
              </div>
            </AnimatedScrollbar3D>
          </div>

          {/* Focused editor — one aisle's config takes the whole panel */}
          <div className="flex-1 overflow-y-auto scrollbar-3d p-4">
            {aisle ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedIdx}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.14 }}
                  className="space-y-4"
                >
                  {/* Aisle pager */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setSelectedIdx((i) => Math.max(0, i - 1))}
                        disabled={selectedIdx === 0}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-blue-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tabular-nums">
                        {selectedIdx + 1} / {aisles.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedIdx((i) => Math.min(aisles.length - 1, i + 1))}
                        disabled={selectedIdx >= aisles.length - 1}
                        className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-blue-100 disabled:opacity-30 transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAisle(selectedIdx)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Delete this aisle"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Number + name */}
                  <div className="grid grid-cols-[5.5rem_1fr] gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                        Aisle #
                      </label>
                      <input
                        type="text"
                        value={aisle.aisle_number}
                        onChange={(e) => updateAisle(selectedIdx, 'aisle_number', e.target.value)}
                        className="input-field text-center font-bold text-lg"
                        placeholder="1"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={aisle.aisle_name}
                        onChange={(e) => updateAisle(selectedIdx, 'aisle_name', e.target.value)}
                        className="input-field"
                        placeholder="e.g., Fresh Produce"
                      />
                    </div>
                  </div>

                  {/* Categories */}
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">
                      Categories in this aisle
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2 min-h-[2rem]">
                      {(aisle.categories || []).length === 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 italic py-1">No categories yet — shoppers will only find this aisle by number.</span>
                      )}
                      {(aisle.categories || []).map((cat, catIndex) => (
                        <span
                          key={catIndex}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-xs font-semibold"
                        >
                          {cat}
                          <button
                            type="button"
                            onClick={() => removeCategory(selectedIdx, catIndex)}
                            className="hover:text-red-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addCategory(selectedIdx, e.target.value);
                            e.target.value = '';
                          }
                        }}
                        className="input-field text-sm flex-1"
                      >
                        <option value="">+ Add category…</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={customCat}
                          onChange={(e) => setCustomCat(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && customCat.trim()) {
                              addCategory(selectedIdx, customCat);
                              setCustomCat('');
                            }
                          }}
                          placeholder="Custom category…"
                          className="input-field text-sm flex-1 sm:w-40"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customCat.trim()) {
                              addCategory(selectedIdx, customCat);
                              setCustomCat('');
                            }
                          }}
                          disabled={!customCat.trim()}
                          className="px-3 rounded-lg bg-primary-600 text-white disabled:opacity-40 transition-opacity"
                          title="Add custom category"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <MapPin className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No aisles configured yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-4">
                  Add your first aisle to teach the app this store's layout.
                </p>
                <button
                  type="button"
                  onClick={addAisle}
                  className="btn-primary flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Add Aisle
                </button>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex gap-2 bg-gray-50/60 dark:bg-gray-900/30">
            <button
              type="button"
              onClick={saveAisles}
              disabled={loading}
              className="btn-primary flex-1 flex items-center justify-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving…' : 'Save Configuration'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </Portal>
  );
};

export default AisleConfigModal;
