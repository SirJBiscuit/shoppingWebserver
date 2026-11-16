import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check, ShoppingCart, ChevronDown, XCircle, FlaskConical, Timer, Users, BookPlus,
  Package, MoreVertical, EyeOff, Undo2, Info,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getLists, addItem } from '../../api/shopping';
import LabShell from './LabShell';
import MixingOverlay from './MixingOverlay';
import LabPantryPicker from './LabPantryPicker';
import TasteRatingModal from './TasteRatingModal';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import { playSound } from '../../utils/soundEffects';
import { Portal } from '../../utils/autoPlacement';

const fmtQty = (q, u) => {
  const n = parseFloat(q);
  const num = Number.isFinite(n) ? (Math.round(n * 4) / 4) : q;
  return `${num}${u && u !== 'whole' ? ` ${u}` : ''}`;
};

/**
 * CategoryRecipeLab — generic "what can I make" lab page.
 * Powers Mix Lab, Smoothie Lab, and Meal Lab via props.
 *
 * Props:
 *  - category     : recipes WHERE category = X  (omit to fetch all user+public)
 *  - icon         : lucide icon for LabShell + tab
 *  - gradient     : tailwind gradient classes for the shell header
 *  - accent       : LabShell accent color
 *  - title        : shell title
 *  - iconMap      : { [recipeName]: emoji }
 *  - defaultEmoji : fallback card emoji
 *  - mixingText   : overlay caption during mark-cooked animation
 *  - allLabel     : label for the "all" tab
 *  - emptyHint    : hint shown when no recipes are returned
 */
const CategoryRecipeLab = ({
  category,
  icon: Icon,
  gradient,
  accent = 'orange',
  title,
  iconMap = {},
  defaultEmoji = '🥣',
  mixingText = 'Mixing it up…',
  allLabel = 'Recipes',
  emptyHint = 'No recipes found for this lab yet.',
  builder, // optional <Component onSaved={fn}/> — adds a 'Build' tab
}) => {
  const { success, error: showError, toasts, hideToast } = useToast();
  const { user } = useAuth();
  const [tab, setTab] = useState('all');
  const [recipes, setRecipes] = useState([]);
  const [comparisons, setComparisons] = useState({});
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [omitted, setOmitted] = useState({});
  const [addingToList, setAddingToList] = useState(null);
  const [mixing, setMixing] = useState(null);
  const [making, setMaking] = useState(null);
  const [savingToBook, setSavingToBook] = useState(null);
  const [pantryOpen, setPantryOpen] = useState(false);

  // Recipe visibility & staging — persisted per lab
  const hiddenKey = `labHiddenRecipes:${title}`;
  const promotedKey = `labPromoted:${title}`;
  const [hiddenR, setHiddenR] = useState(() => {
    try { return JSON.parse(localStorage.getItem(hiddenKey)) || {}; } catch { return {}; }
  });
  const [promoted, setPromoted] = useState(() => {
    try { return JSON.parse(localStorage.getItem(promotedKey)) || {}; } catch { return {}; }
  });
  const [rMenu, setRMenu] = useState(null);      // { x, y, r } recipe context menu
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [ratingFor, setRatingFor] = useState(null); // recipe open in the taste modal

  const hideRecipe = (r) => setHiddenR((p) => {
    const next = { ...p, [r.id]: true };
    localStorage.setItem(hiddenKey, JSON.stringify(next));
    success(`"${r.name}" hidden — restore it from the hidden tray below`);
    return next;
  });

  const unhideRecipe = (id) => setHiddenR((p) => {
    const next = { ...p };
    delete next[id];
    localStorage.setItem(hiddenKey, JSON.stringify(next));
    return next;
  });

  // User-built recipes live in 'Can Create' until promoted into the main tab
  const isCreation = (r) => r.user_id === user?.id || (r.tags || []).includes('custom-builder');

  const promoteRecipe = (r) => setPromoted((p) => {
    const next = { ...p, [r.id]: true };
    localStorage.setItem(promotedKey, JSON.stringify(next));
    success(`"${r.name}" moved to ${allLabel}`);
    playSound('pop');
    return next;
  });

  const saveToBook = async (r) => {
    setSavingToBook(r.id);
    try {
      await api.post(`/recipes/${r.id}/copy`);
      success(`"${r.name}" saved to your Recipe Book`);
      playSound('pop');
    } catch {
      showError('Could not save to Recipe Book');
    } finally {
      setSavingToBook(null);
    }
  };

  const recipeIcon = (r) => iconMap[r.name] || defaultEmoji;

  const loadComparisons = async (list) => {
    const entries = await Promise.all(
      list.map(async (r) => {
        try {
          const { data } = await api.get(`/recipes/${r.id}/inventory-comparison`);
          return [r.id, data];
        } catch {
          return [r.id, null];
        }
      })
    );
    return Object.fromEntries(entries);
  };

  const load = async () => {
    try {
      const { data } = await api.get(category ? `/recipes?category=${category}` : '/recipes');
      const list = data || [];
      setRecipes(list);
      setComparisons(await loadComparisons(list));
    } catch (err) {
      console.error(`${title} load failed:`, err);
      showError(`Could not load ${title.toLowerCase()} recipes`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshComparison = async (recipeId) => {
    try {
      const { data } = await api.get(`/recipes/${recipeId}/inventory-comparison`);
      setComparisons((p) => ({ ...p, [recipeId]: data }));
    } catch { /* badge just stays stale */ }
  };

  const isOmitted = (rId, name) => omitted[rId]?.has(name);
  const toggleOmit = (rId, name) =>
    setOmitted((p) => {
      const s = new Set(p[rId] || []);
      s.has(name) ? s.delete(name) : s.add(name);
      return { ...p, [rId]: s };
    });

  const needList = (rId) => {
    const c = comparisons[rId];
    if (!c) return [];
    return [...(c.missing || []), ...(c.insufficient || [])]
      .filter((i) => !isOmitted(rId, i.item_name));
  };

  const visible = useMemo(() => {
    let list;
    if (tab === 'create') {
      // Staging: un-promoted creations + anything makeable right now
      list = recipes.filter((r) =>
        (isCreation(r) && !promoted[r.id]) || comparisons[r.id]?.canMake
      );
    } else {
      // Main tab: presets + promoted creations
      list = recipes.filter((r) => !isCreation(r) || promoted[r.id]);
    }
    return [...list].sort((a, b) => Number(comparisons[b.id]?.canMake) - Number(comparisons[a.id]?.canMake));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, recipes, comparisons, promoted]);

  const hiddenRecipes = recipes.filter((r) => hiddenR[r.id]);
  const makeableCount = recipes.filter((r) => comparisons[r.id]?.canMake).length;
  const stagedCount = recipes.filter((r) => isCreation(r) && !promoted[r.id] && !hiddenR[r.id]).length;

  // Union of every ingredient this lab's recipes need — feeds the pantry picker
  const pantryItems = useMemo(() => {
    const map = new Map();
    Object.values(comparisons).forEach((c) => {
      [...(c?.matched || []), ...(c?.missing || []), ...(c?.insufficient || [])].forEach((i) => {
        const name = i.item_name;
        if (!name) return;
        const key = name.trim().toLowerCase();
        const prev = map.get(key);
        const qty = parseFloat(i.quantity) || 1;
        map.set(key, {
          name,
          neededQty: prev ? Math.max(prev.neededQty, qty) : qty,
          neededUnit: i.unit || prev?.neededUnit || '',
          icon: i.icon || i.item_icon || prev?.icon || null,
        });
      });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [comparisons]);

  const missingIngredientCount = useMemo(() => {
    const names = new Set();
    Object.values(comparisons).forEach((c) =>
      (c?.missing || []).forEach((i) => i.item_name && names.add(i.item_name.trim().toLowerCase()))
    );
    return names.size;
  }, [comparisons]);

  const refreshAllComparisons = async () => {
    setComparisons(await loadComparisons(recipes));
  };

  const addMissingToList = async (r) => {
    const need = needList(r.id);
    if (!need.length) return;
    setAddingToList(r.id);
    try {
      const { data: lists } = await getLists();
      const list = (lists || []).find((l) => !l.is_completed) || (lists || [])[0];
      if (!list) {
        showError('No shopping list found — create one first');
        return;
      }
      for (const i of need) {
        await addItem(list.id, {
          itemName: i.item_name,
          quantity: Math.ceil(parseFloat(i.quantity) || 1),
          unit: i.unit || '',
        });
      }
      success(`Added ${need.length} item${need.length > 1 ? 's' : ''} to "${list.name || 'your list'}"`);
      playSound('pop');
    } catch {
      showError('Could not add to shopping list');
    } finally {
      setAddingToList(null);
    }
  };

  const markMade = (r) => {
    const c = comparisons[r.id];
    const icons = c ? [...c.matched, ...c.insufficient].slice(0, 8).map(() => '🥄') : [defaultEmoji];
    setMaking(r.id);
    setMixing({
      icons,
      onDone: async () => {
        setMixing(null);
        try {
          await api.post(`/recipes/${r.id}/mark-cooked`, {
            servings_made: r.servings || 1,
            deduct_inventory: true,
          });
          await refreshComparison(r.id);
          success(`Made ${r.name}! Inventory updated.`);
          playSound('check');
        } catch {
          showError('Recorded, but inventory update failed');
        } finally {
          setMaking(null);
        }
      },
    });
  };

  const tabs = [
    { id: 'all', label: allLabel, icon: Icon, count: recipes.filter((r) => !hiddenR[r.id] && (!isCreation(r) || promoted[r.id])).length },
    { id: 'create', label: 'Can Create', icon: FlaskConical, count: makeableCount + stagedCount },
    ...(builder ? [{ id: 'build', label: 'Build', icon: BookPlus }] : []),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading {title.toLowerCase()} recipes...</div>
      </div>
    );
  }

  return (
    <LabShell
      icon={Icon}
      gradient={gradient}
      title={title}
      subtitle={`${recipes.length} recipes · ${makeableCount} makeable with your current inventory`}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      accent={accent}
      maxWidth="max-w-5xl"
      headerAction={
        <button
          onClick={() => setPantryOpen(true)}
          className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur transition-colors"
          title="What ingredients do you have?"
        >
          <Package className="w-4 h-4" />
          <span className="hidden sm:inline">My Ingredients</span>
          {missingIngredientCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow">
              {missingIngredientCount}
            </span>
          )}
        </button>
      }
    >
      {builder && tab === 'build' ? (
        React.cloneElement(builder, { onSaved: load })
      ) : (
        <>
      {/* How labs chain together — collapsible explainer */}
      <div className="mb-4">
        <button
          onClick={() => setInfoOpen((o) => !o)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <Info className="w-3.5 h-3.5" />
          {infoOpen ? 'Hide' : 'How labs, inventory & recipe staging work'}
        </button>
        {infoOpen && (
          <div className="mt-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-3 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400 space-y-1">
            <p>1. <strong>My Ingredients</strong> toggles what you have in <strong>Home Inventory</strong> — steppers, units, estimates and "used" all write back to the same inventory.</p>
            <p>2. <strong>Can Create</strong> lists recipes you can make right now, plus anything you built that isn't promoted yet.</p>
            <p>3. <strong>Keep in Recipes</strong> (right-click a card) moves a creation into the main list — nothing lands there automatically.</p>
            <p>4. <strong>Made this</strong> deducts the recipe amounts from Home Inventory.</p>
            <p>5. <strong>Send to Recipe Book</strong> copies a preset into your book; right-click also hides recipes you don't want to see.</p>
          </div>
        )}
      </div>
          {recipes.length === 0 ? (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nothing here yet</p>
              <p className="text-xs mt-1">{emptyHint}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {visible.map((r) => {
            const c = comparisons[r.id];
            const open = expanded === r.id;
            const have = c ? c.matched.length : 0;
            const total = c ? c.totalIngredients : (r.ingredient_count || 0);
            const need = needList(r.id);
            const canMake = c?.canMake;
            const omittedCount = (c ? c.missing.length + c.insufficient.length : 0) - need.length;

            return (
              <motion.div
                key={r.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                onContextMenu={(e) => { e.preventDefault(); setRMenu({ x: e.clientX, y: e.clientY, r }); }}
                className={`bg-white dark:bg-gray-800 border-2 rounded-2xl p-4 shadow-sm transition-colors ${
                  canMake ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setExpanded(open ? null : r.id)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                    <span className="text-3xl flex-shrink-0">{recipeIcon(r)}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{r.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{r.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className={`font-semibold ${canMake ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {c ? (canMake ? '✓ All ingredients' : `${have}/${total} have`) : 'Checking…'}
                        </span>
                        {r.avg_rating && (
                          <span className="text-amber-500 font-semibold" title={`${r.rating_count} rating${Number(r.rating_count) !== 1 ? 's' : ''}`}>
                            ★{r.avg_rating}
                          </span>
                        )}
                        {r.prep_time && (
                          <span className="flex items-center gap-0.5 text-gray-400">
                            <Timer className="w-3 h-3" />{r.prep_time}m
                          </span>
                        )}
                        {r.servings && (
                          <span className="flex items-center gap-0.5 text-gray-400">
                            <Users className="w-3 h-3" />{r.servings}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 flex-shrink-0 mt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); setRMenu({ x: e.clientX, y: e.clientY, r }); }}
                      className="p-1 rounded-lg text-gray-300 dark:text-gray-600 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      title="Recipe options"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                <AnimatePresence>
                  {open && c && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                        {[...c.matched.map((i) => ({ ...i, _st: 'have' })),
                          ...c.insufficient.map((i) => ({ ...i, _st: 'low' })),
                          ...c.missing.map((i) => ({ ...i, _st: 'miss' }))].map((i) => {
                          const om = isOmitted(r.id, i.item_name);
                          const canOmit = i._st !== 'have';
                          return (
                            <div
                              key={i.item_name}
                              className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1 ${
                                om ? 'opacity-40 line-through' :
                                i._st === 'have' ? 'text-gray-800 dark:text-gray-100' :
                                i._st === 'low' ? 'text-amber-600 dark:text-amber-400' :
                                'text-red-500 dark:text-red-400'
                              }`}
                            >
                              <span className="w-4 text-center flex-shrink-0">
                                {i._st === 'have' ? '✓' : i._st === 'low' ? '◐' : '✗'}
                              </span>
                              <span className="flex-1 truncate">
                                {i.item_name}
                                {i.is_optional && <span className="ml-1 text-[10px] text-gray-400">(optional)</span>}
                                {i._st === 'low' && (
                                  <span className="ml-1 text-[10px] text-amber-500">have ~{fmtQty(i.available, i.inventoryItem?.unit)}</span>
                                )}
                              </span>
                              <span className="font-mono text-xs text-gray-400">{fmtQty(i.quantity, i.unit)}</span>
                              {canOmit && (
                                <button
                                  onClick={() => toggleOmit(r.id, i.item_name)}
                                  title={om ? 'Un-omit' : 'Omit this item'}
                                  className="p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {omittedCount > 0 && (
                          <p className="text-[11px] text-gray-400 pt-0.5">{omittedCount} item{omittedCount > 1 ? 's' : ''} omitted</p>
                        )}

                        {r.instructions && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">How to make it</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{r.instructions}</p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={() => markMade(r)}
                            disabled={!canMake || making === r.id}
                            title={canMake ? 'Record this batch — deducts from home inventory' : 'Missing ingredients'}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            {making === r.id ? 'Recording…' : 'Made this'}
                          </button>
                          {r.user_id !== user?.id && (
                            <button
                              onClick={() => saveToBook(r)}
                              disabled={savingToBook === r.id}
                              title="Copy this preset into your Recipe Book"
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
                            >
                              <BookPlus className="w-3.5 h-3.5" />
                              {savingToBook === r.id ? 'Saving…' : 'Send to Recipe Book'}
                            </button>
                          )}
                          {need.length > 0 && (
                            <button
                              onClick={() => addMissingToList(r)}
                              disabled={addingToList === r.id}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                              {addingToList === r.id ? 'Adding…' : `${need.length} needed → list`}
                            </button>
                          )}
                          <button
                            onClick={() => setRatingFor(r)}
                            title="Rate it & log taste notes — builds an improved variant"
                            className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-400 text-white hover:bg-amber-500 transition-colors"
                          >
                            ★
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
            </div>
          )}
        </>
      )}

      {/* Hidden recipes — bring them back anytime */}
      {hiddenRecipes.length > 0 && tab !== 'build' && (
        <div className="mt-4">
          <button
            onClick={() => setHiddenOpen((o) => !o)}
            className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            {hiddenOpen ? '▾' : '▸'} Hidden recipes ({hiddenRecipes.length})
          </button>
          {hiddenOpen && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {hiddenRecipes.map((r) => (
                <span key={r.id} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-300">
                  {recipeIcon(r)} {r.name}
                  <button
                    onClick={() => unhideRecipe(r.id)}
                    title="Bring back"
                    className="text-gray-400 hover:text-green-500"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Recipe context menu — promote, book, hide */}
      {rMenu && (
        <Portal>
          <div
            className="fixed inset-0 z-[115]"
            onClick={() => setRMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setRMenu(null); }}
          />
          <div
            className="fixed z-[116] w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1.5"
            style={{
              left: Math.min(rMenu.x, window.innerWidth - 240),
              top: Math.min(rMenu.y, window.innerHeight - 200),
            }}
          >
            <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 truncate border-b border-gray-100 dark:border-gray-700">
              {rMenu.r.name}
            </p>
            {isCreation(rMenu.r) && !promoted[rMenu.r.id] && (
              <button
                onClick={() => { promoteRecipe(rMenu.r); setRMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                ⭐ Keep in {allLabel} — promote out of Can Create
              </button>
            )}
            {rMenu.r.user_id !== user?.id && (
              <button
                onClick={() => { saveToBook(rMenu.r); setRMenu(null); }}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
              >
                📖 Send to Recipe Book
              </button>
            )}
            <button
              onClick={() => { setRatingFor(rMenu.r); setRMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
            >
              ⭐ Rate / taste notes
            </button>
            <button
              onClick={() => { hideRecipe(rMenu.r); setRMenu(null); }}
              className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-red-600 dark:text-red-400"
            >
              <EyeOff className="w-3 h-3 inline mr-1" /> Hide this recipe
            </button>
          </div>
        </Portal>
      )}

      <LabPantryPicker
        open={pantryOpen}
        onClose={() => setPantryOpen(false)}
        title={title}
        accent={accent}
        defaultEmoji={defaultEmoji}
        items={pantryItems}
        onChanged={refreshAllComparisons}
      />

      <Portal>
        <TasteRatingModal
          recipe={ratingFor}
          onClose={() => setRatingFor(null)}
          onSaved={load}
        />
      </Portal>

      <AnimatePresence>
        {mixing && <MixingOverlay icons={mixing.icons} text={mixingText} onDone={mixing.onDone} />}
      </AnimatePresence>

      <Portal><div className="fixed bottom-4 right-4 z-[120] space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
        ))}
      </div></Portal>
    </LabShell>
  );
};

export default CategoryRecipeLab;
