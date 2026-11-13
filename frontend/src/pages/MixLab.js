import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UtensilsCrossed, Check, ShoppingCart, ChevronDown, XCircle, FlaskConical, Timer, Users,
} from 'lucide-react';
import api from '../services/api';
import { getLists, addItem } from '../api/shopping';
import LabShell from '../components/lab/LabShell';
import MixingOverlay from '../components/lab/MixingOverlay';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { playSound } from '../utils/soundEffects';
import { Portal } from '../utils/autoPlacement';

// Emoji per preset recipe — recipes table has no icon column
const MIX_ICONS = {
  'Classic Basil Pesto': '🌿',
  'Tzatziki': '🥒',
  'Guacamole': '🥑',
  'Hummus': '🫘',
  'Ranch Dressing': '🥗',
  'Chimichurri': '🌱',
  'Pico de Gallo': '🍅',
  'Honey Mustard': '🍯',
};
const mixIcon = (r) => MIX_ICONS[r.name] || '🥣';

const fmtQty = (q, u) => {
  const n = parseFloat(q);
  const num = Number.isFinite(n) ? (Math.round(n * 4) / 4) : q;
  return `${num}${u && u !== 'whole' ? ` ${u}` : ''}`;
};

const MixLab = () => {
  const { success, error: showError, toasts, hideToast } = useToast();
  const [tab, setTab] = useState('all'); // all | makeable
  const [recipes, setRecipes] = useState([]);
  const [comparisons, setComparisons] = useState({}); // recipeId -> {matched,insufficient,missing,canMake}
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [omitted, setOmitted] = useState({}); // recipeId -> Set(item_name)
  const [addingToList, setAddingToList] = useState(null);
  const [mixing, setMixing] = useState(null); // {icons, onDone}
  const [making, setMaking] = useState(null);

  // Load mix recipes + inventory comparisons for each
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

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/recipes?category=mix');
        const list = data || [];
        setRecipes(list);
        setComparisons(await loadComparisons(list));
      } catch (err) {
        console.error('Mix Lab load failed:', err);
        showError('Could not load mix recipes — is migration 061 applied?');
      } finally {
        setLoading(false);
      }
    })();
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

  // Ingredients needing purchase = missing + insufficient, minus user-omitted
  const needList = (rId) => {
    const c = comparisons[rId];
    if (!c) return [];
    return [...(c.missing || []), ...(c.insufficient || [])]
      .filter((i) => !isOmitted(rId, i.item_name));
  };

  const visible = useMemo(() => {
    const list = tab === 'makeable'
      ? recipes.filter((r) => comparisons[r.id]?.canMake)
      : recipes;
    return [...list].sort((a, b) => Number(comparisons[b.id]?.canMake) - Number(comparisons[a.id]?.canMake));
  }, [tab, recipes, comparisons]);

  const makeableCount = recipes.filter((r) => comparisons[r.id]?.canMake).length;

  // Push un-omitted missing/insufficient ingredients to the active list
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

  // "I made this" — record cook + deduct from home inventory behind the swirl animation
  const markMade = (r) => {
    const c = comparisons[r.id];
    const icons = c ? [...c.matched, ...c.insufficient].slice(0, 8).map((i) => '🥄') : ['🥣'];
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
    { id: 'all', label: 'Mix Recipes', icon: UtensilsCrossed, count: recipes.length },
    { id: 'makeable', label: 'Makeable Now', icon: FlaskConical, count: makeableCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading mix recipes...</div>
      </div>
    );
  }

  return (
    <LabShell
      icon={UtensilsCrossed}
      gradient="from-amber-500 to-orange-600"
      title="Mix & Blend Lab"
      subtitle={`${recipes.length} recipes · ${makeableCount} makeable with your current inventory`}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      accent="orange"
      maxWidth="max-w-5xl"
    >
      {recipes.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="font-medium">No mix recipes yet</p>
          <p className="text-xs mt-1">Preset mixes arrive with migration 061 — or import a recipe tagged “mix”.</p>
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
                className={`bg-white dark:bg-gray-800 border-2 rounded-2xl p-4 shadow-sm transition-colors ${
                  canMake ? 'border-green-300 dark:border-green-700' : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setExpanded(open ? null : r.id)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                    <span className="text-3xl flex-shrink-0">{mixIcon(r)}</span>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 dark:text-white leading-tight">{r.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{r.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className={`font-semibold ${canMake ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {c ? (canMake ? '✓ All ingredients' : `${have}/${total} have`) : 'Checking…'}
                        </span>
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
                  <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 mt-1 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded detail */}
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

                        {/* Instructions */}
                        {r.instructions && (
                          <div className="pt-2">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">How to make it</p>
                            <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-line leading-relaxed">{r.instructions}</p>
                          </div>
                        )}

                        {/* Actions */}
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

      {/* Mixing animation */}
      <AnimatePresence>
        {mixing && <MixingOverlay icons={mixing.icons} text="Mixing it up…" onDone={mixing.onDone} />}
      </AnimatePresence>

      {/* Toasts */}
      <Portal><div className="fixed bottom-4 right-4 z-[120] space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
        ))}
      </div></Portal>
    </LabShell>
  );
};

export default MixLab;
