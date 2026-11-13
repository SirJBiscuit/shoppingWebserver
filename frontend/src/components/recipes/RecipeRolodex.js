import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChefHat, Clock, Users, Star, X, Plus, Trash2, ChevronLeft,
  ChevronRight, ShoppingCart, RotateCw,
} from 'lucide-react';
import { recipesAPI } from '../../services/api';
import { Portal } from '../../utils/autoPlacement';

/**
 * RecipeRolodex — flip-book rolodex of recipe cards.
 * Cards sit stacked on a top "binding". Drag the front card downward or hit
 * Next and it flips over the binding (rotateX) to reveal the card behind.
 * Click a card to zoom into a full detail sheet (ingredients + numbered steps).
 */
const RecipeRolodex = ({
  recipes = [],
  onAddRecipe,
  onDeleteRecipe,
  onToggleFavorite,
  onAddToList,
}) => {
  const [index, setIndex] = useState(0);
  const [leaving, setLeaving] = useState([]);   // absolute indices animating off the binding
  const [entering, setEntering] = useState([]); // absolute indices flipping back down (prev)
  const [zoomed, setZoomed] = useState(null);   // recipe object
  const [detail, setDetail] = useState(null);   // fetched full recipe w/ ingredients
  const [detailLoading, setDetailLoading] = useState(false);

  const count = recipes.length;
  const safeIndex = count > 0 ? Math.min(index, count - 1) : 0;

  // Full recipe detail fetch when a card is zoomed
  useEffect(() => {
    if (!zoomed) { setDetail(null); return; }
    setDetailLoading(true);
    recipesAPI.getRecipe(zoomed.id)
      .then((r) => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [zoomed]);

  // No waiting: the index moves the moment you tap/drag — the outgoing card
  // animates off the binding in parallel, so rapid taps just keep flipping.
  const flipNext = () => {
    if (count < 2) return;
    setLeaving((l) => (l.includes(safeIndex) ? l : [...l, safeIndex]));
    setIndex((i) => (i + 1) % count);
  };
  const flipPrev = () => {
    if (count < 2) return;
    const prev = (safeIndex - 1 + count) % count;
    setEntering((e) => (e.includes(prev) ? e : [...e, prev]));
    setIndex(prev);
  };

  // Endless deck — positions wrap so the stack never runs out behind the top card
  const visible = [];
  for (let i = 0; i < Math.min(3, count); i++) visible.push({ recipe: recipes[(safeIndex + i) % count], absIdx: (safeIndex + i) % count });

  const getCategoryEmoji = (category) => ({
    breakfast: '🍳', lunch: '🥗', dinner: '🍽️', dessert: '🍰',
    snack: '🍿', appetizer: '🥟', drink: '🍹', other: '🍴',
  }[category] || '🍴');

  const steps = detail?.instructions
    ? detail.instructions.split(/\n+/).map((s) => s.trim()).filter(Boolean)
    : [];

  return (
    <div className="relative">
      <div className="flex flex-col items-center">
        {/* Deck */}
        <div className="relative w-80 h-96" style={{ perspective: '1200px' }}>
          {count === 0 ? (
            <button
              onClick={onAddRecipe}
              className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-2xl flex flex-col items-center justify-center text-white hover:scale-[1.03] transition-transform"
            >
              <Plus className="w-16 h-16 mb-4" />
              <h3 className="text-2xl font-bold">Add Recipe</h3>
              <p className="text-sm opacity-90 mt-2">Start your recipe rolodex</p>
            </button>
          ) : (
            visible.map(({ recipe, absIdx }, i) => {
              const isTop = i === 0;
              const isEntering = entering.includes(absIdx);
              return (
                <motion.div
                  key={recipe.id}
                  initial={isEntering ? { rotateX: -170, opacity: 0, y: 0, scale: 1 } : false}
                  drag={isTop ? 'y' : false}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.22}
                  whileDrag={isTop ? { rotateX: -14 } : undefined}
                  onDragEnd={(e, info) => {
                    if (isTop && (info.offset.y > 40 || info.velocity.y > 220)) flipNext();
                  }}
                  onClick={() => isTop && setZoomed(recipe)}
                  animate={{ rotateX: 0, y: i * 16, scale: 1 - i * 0.06, opacity: 1 }}
                  transition={{ rotateX: { duration: 0.26, ease: [0.3, 0, 0.4, 1] }, y: { type: 'spring', stiffness: 380, damping: 22 }, scale: { type: 'spring', stiffness: 380, damping: 22 }, opacity: { duration: 0.18 } }}
                  onAnimationComplete={() => { if (isEntering) setEntering((en) => en.filter((x) => x !== absIdx)); }}
                  style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: 10 - i }}
                  className={`absolute inset-0 ${isTop ? 'cursor-pointer' : ''}`}
                >
                  <div className="w-full h-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                    {/* Binding holes */}
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-evenly">
                      {[...Array(7)].map((_, h) => (
                        <span key={h} className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 shadow-inner" />
                      ))}
                    </div>
                    {recipe.image_url && !recipe.image_url.startsWith('emoji:') ? (
                      <img src={recipe.image_url} alt={recipe.name} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                        <span className="text-7xl">{recipe.image_url?.startsWith('emoji:') ? recipe.image_url.slice(6) : <ChefHat className="w-16 h-16 text-white/60" />}</span>
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2 flex-1">{recipe.name}</h3>
                        {isTop && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(recipe); }}
                            className="ml-2 hover:scale-110 transition-transform"
                          >
                            <Star className={`w-5 h-5 ${recipe.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{getCategoryEmoji(recipe.category)}</span>
                        {recipe.difficulty && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 capitalize">{recipe.difficulty}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{(recipe.prep_time || 0) + (recipe.cook_time || 0)} min</span>
                        {recipe.servings && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{recipe.servings}</span>}
                      </div>
                      {isTop && count > 1 && (
                        <p className="mt-3 text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <RotateCw className="w-3 h-3" /> drag down or tap next to flip
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
          {/* Cards mid-flight off the binding — non-interactive overlays */}
          {leaving.map((absIdx) => {
            const recipe = recipes[absIdx];
            if (!recipe) return null;
            return (
              <motion.div
                key={`leave-${absIdx}`}
                initial={{ rotateX: 0, opacity: 1, y: 0, scale: 1 }}
                animate={{ rotateX: -170, opacity: 0 }}
                transition={{ rotateX: { duration: 0.28, ease: [0.55, 0, 1, 0.6] }, opacity: { duration: 0.22, delay: 0.08 } }}
                onAnimationComplete={() => setLeaving((l) => l.filter((x) => x !== absIdx))}
                style={{ transformOrigin: 'top center', transformStyle: 'preserve-3d', zIndex: 30, pointerEvents: 'none' }}
                className="absolute inset-0"
              >
                <div className="w-full h-full bg-gradient-to-br from-white to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 flex items-center justify-evenly">
                    {[...Array(7)].map((_, h) => (
                      <span key={h} className="w-2.5 h-2.5 rounded-full bg-gray-400 dark:bg-gray-500 shadow-inner" />
                    ))}
                  </div>
                  {recipe.image_url && !recipe.image_url.startsWith('emoji:') ? (
                    <img src={recipe.image_url} alt={recipe.name} className="w-full h-40 object-cover" />
                  ) : (
                    <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                      <span className="text-7xl">{recipe.image_url?.startsWith('emoji:') ? recipe.image_url.slice(6) : <ChefHat className="w-16 h-16 text-white/60" />}</span>
                    </div>
                  )}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">{recipe.name}</h3>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Controls */}
        {count > 1 && (
          <div className="flex items-center gap-3 mt-6">
            <button onClick={flipPrev} className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 shadow">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-1.5">
              {recipes.map((_, d) => (
                <button
                  key={d}
                  onClick={() => setIndex(d)}
                  className={`w-2 h-2 rounded-full transition-colors ${d === safeIndex ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                />
              ))}
            </div>
            <button onClick={flipNext} className="p-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 hover:text-primary-600 shadow">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Detail sheet — full recipe on zoom */}
      <Portal><AnimatePresence>
        {zoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setZoomed(null)}
          >
            <motion.div
              initial={{ scale: 0.85, rotateX: -30, y: 40 }}
              animate={{ scale: 1, rotateX: 0, y: 0 }}
              exit={{ scale: 0.85, rotateX: 30, y: 40 }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-5 flex items-start justify-between z-10">
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{zoomed.name}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{(zoomed.prep_time || 0) + (zoomed.cook_time || 0)} min</span>
                    {zoomed.servings && <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{zoomed.servings} servings</span>}
                    <span>{getCategoryEmoji(zoomed.category)} {zoomed.category || 'recipe'}</span>
                  </div>
                </div>
                <button onClick={() => setZoomed(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {zoomed.description && <p className="text-sm text-gray-600 dark:text-gray-400">{zoomed.description}</p>}

                {detailLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
                  </div>
                ) : (
                  <>
                    {detail?.ingredients?.length > 0 && (
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-2">Ingredients</h3>
                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {detail.ingredients.map((ing, i) => (
                            <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-baseline gap-1.5">
                              <span className="text-primary-500">•</span>
                              <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{ing.quantity || ''} {ing.unit || ''}</span>
                              <span>
                                {ing.item_name}
                                {ing.is_optional && <span className="text-[10px] text-gray-400"> (opt)</span>}
                                {ing.is_pantry_staple && <span className="text-[10px] text-green-500"> 🏠</span>}
                              </span>
                            </li>
                          ))}
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
                  </>
                )}

                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {onAddToList && (
                    <button
                      onClick={() => { onAddToList(zoomed.id); setZoomed(null); }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
                    >
                      <ShoppingCart className="w-4 h-4" /> Add to List
                    </button>
                  )}
                  <button
                    onClick={() => onToggleFavorite?.(zoomed)}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <Star className={`w-4 h-4 ${zoomed.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={() => { onDeleteRecipe?.(zoomed.id); setZoomed(null); }}
                    className="px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence></Portal>
    </div>
  );
};

export default RecipeRolodex;
