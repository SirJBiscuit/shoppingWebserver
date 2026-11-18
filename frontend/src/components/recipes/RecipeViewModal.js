import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Clock, Users, Star, ShoppingCart, Trash2, Edit2,
  ChefHat, Thermometer, RefreshCw,
} from 'lucide-react';
import api from '../../services/api';
import { Portal } from '../../utils/autoPlacement';
import lookupSubstitutions from '../../utils/ingredientSubstitutions';
import RecipeIconPicker from './RecipeIconPicker';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

const StarRow = ({ value, onRate, size = 'w-5 h-5' }) => (
  <div className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        onClick={() => onRate(n)}
        className="hover:scale-125 transition-transform"
        title={`Rate ${n}/5`}
      >
        <Star
          className={`${size} ${n <= (value || 0) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
        />
      </button>
    ))}
  </div>
);

/**
 * RecipeViewModal — read-only recipe sheet.
 * Clicking a recipe in the book opens THIS, not the editor. The pencil in the
 * header jumps to the editor. Icon, difficulty, and rating are editable inline
 * via quick PATCHes — full form fields stay in RecipeModal.
 */
const RecipeViewModal = ({ recipe, onClose, onEdit, onToggleFavorite, onAddToList, onDelete, onChanged }) => {
  const [detail, setDetail] = useState(null);
  const [ratings, setRatings] = useState(null); // {avg, count, mine} from recipe_ratings
  const [loading, setLoading] = useState(true);
  const [iconOpen, setIconOpen] = useState(false);
  const [current, setCurrent] = useState(recipe); // live-updated view of the recipe row

  useEffect(() => {
    setCurrent(recipe);
    setRatings(null);
    if (!recipe) return;
    setLoading(true);
    api.get(`/recipes/${recipe.id}`)
      .then(({ data }) => setDetail(data))
      .catch(() => setDetail(null))
      .finally(() => setLoading(false));
    api.get(`/recipes/${recipe.id}/ratings`)
      .then(({ data }) => setRatings(data))
      .catch(() => setRatings(null));
  }, [recipe]);

  if (!recipe) return null;

  const patch = async (fields) => {
    try {
      const { data } = await api.patch(`/recipes/${recipe.id}`, fields);
      setCurrent((c) => ({ ...c, ...data }));
      if (detail) setDetail((d) => ({ ...d, ...fields }));
      onChanged?.();
    } catch (err) {
      console.error('Recipe update failed:', err);
    }
  };

  // Per-user star rating → recipe_ratings (upsert), then refresh the aggregate
  const rate = async (n) => {
    try {
      await api.post(`/recipes/${recipe.id}/rate`, { rating: n });
      const { data } = await api.get(`/recipes/${recipe.id}/ratings`);
      setRatings(data);
      onChanged?.();
    } catch (err) {
      console.error('Rating save failed:', err);
    }
  };

  const isEmoji = current?.image_url?.startsWith('emoji:');
  const emoji = isEmoji ? current.image_url.slice(6) : null;
  const ratingVal = ratings?.mine?.rating ?? current?.rating;
  const avg = ratings?.avg ?? detail?.avg_rating ?? current?.avg_rating;
  const ratingCount = ratings?.count ?? current?.rating_count;
  const steps = detail?.instructions
    ? detail.instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    : [];
  const ings = detail?.ingredients || [];

  return (
    <Portal>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.92, y: 30 }} animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 30 }} transition={{ type: 'spring', damping: 24 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur border-b border-gray-200 dark:border-gray-700 p-5 flex items-start gap-4 z-10">
              <button
                onClick={() => setIconOpen(true)}
                title="Change icon / image"
                className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-3xl hover:ring-2 ring-primary-400 transition-shadow overflow-hidden"
              >
                {current?.image_url && !isEmoji ? (
                  <img src={current.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  emoji || '🍽️'
                )}
              </button>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{current.name}</h2>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {(current.prep_time || current.cook_time) > 0 && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />{(current.prep_time || 0) + (current.cook_time || 0)} min
                    </span>
                  )}
                  {current.servings && (
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{current.servings} servings</span>
                  )}
                  {current.temperature && (
                    <span className="flex items-center gap-1"><Thermometer className="w-3.5 h-3.5" />{current.temperature}</span>
                  )}
                  {current.category && <span className="capitalize">{current.category}</span>}
                  {avg != null && (
                    <span className="text-amber-500">★ {avg} avg{ratingCount ? ` (${ratingCount})` : ''}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <StarRow value={ratingVal} onRate={rate} />
                  <span className="text-[10px] text-gray-400">your rating</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => onToggleFavorite?.(current)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Favorite"
                >
                  <Star className={`w-5 h-5 ${current.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={() => onEdit?.(current)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit recipe"
                >
                  <Edit2 className="w-5 h-5 text-gray-500" />
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {current.description && <p className="text-sm text-gray-600 dark:text-gray-400">{current.description}</p>}

              {/* Difficulty quick-set */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Difficulty</span>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    onClick={() => patch({ difficulty: d })}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold capitalize transition-colors ${
                      (current.difficulty || 'medium') === d
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  {ings.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ingredients</h3>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {ings.map((ing, i) => {
                          const sub = lookupSubstitutions(ing.item_name);
                          return (
                            <li key={i} className="text-sm text-gray-700 dark:text-gray-300">
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-primary-500">•</span>
                                <span className="font-mono text-xs text-gray-500 dark:text-gray-400">
                                  {ing.quantity_display || ing.quantity || ''} {ing.unit || ''}
                                </span>
                                <span>
                                  {ing.item_name}
                                  {ing.is_optional && <span className="text-[10px] text-gray-400"> (opt)</span>}
                                </span>
                              </div>
                              {sub && (
                                <div className="ml-5 mt-0.5 flex items-start gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                                  <RefreshCw className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  <span>or use: {sub.subs.slice(0, 2).join(', ')}</span>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {steps.length > 0 && (
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white mb-2">Steps</h3>
                      <ol className="space-y-2">
                        {steps.map((s, i) => (
                          <li key={i} className="flex gap-2.5 text-sm text-gray-700 dark:text-gray-300">
                            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                            <span>{s.replace(/^\d+[.)]\s*/, '')}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {!loading && ings.length === 0 && steps.length === 0 && (
                    <div className="text-center py-4 text-sm text-gray-400">
                      <ChefHat className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No ingredients or steps yet — hit the pencil to add them.
                    </div>
                  )}
                </>
              )}

              {/* Footer actions */}
              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {onAddToList && (
                  <button
                    onClick={() => { onAddToList(current.id); onClose(); }}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
                  >
                    <ShoppingCart className="w-4 h-4" /> Add to List
                  </button>
                )}
                <button
                  onClick={() => { onDelete?.(current.id); onClose(); }}
                  className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete recipe"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      <RecipeIconPicker
        isOpen={iconOpen}
        onClose={() => setIconOpen(false)}
        current={current?.image_url}
        onPick={(v) => patch({ image_url: v })}
      />
    </Portal>
  );
};

export default RecipeViewModal;
