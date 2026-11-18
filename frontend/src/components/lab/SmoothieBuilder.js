import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wand2, BookPlus, X, Loader, Package, Plus, EyeOff } from 'lucide-react';
import api from '../../services/api';
import MixingOverlay from './MixingOverlay';
import LabPantryPicker from './LabPantryPicker';
import Toast from '../Toast';
import { useToast } from '../../hooks/useToast';
import { playSound } from '../../utils/soundEffects';
import { Portal } from '../../utils/autoPlacement';

// ---------- ingredient classification ----------
const FLUID_RE = /milk|juice|water|yogurt|kefir|oat\s?milk|almond\s?milk|coconut\s?(milk|water)|soy\s?milk|cream(?!er)|lemonade|kombucha|drink|beverage|smoothie\s?base/i;
const FROZEN_RE = /frozen|ice\s?cream|ice$|sorbet/i;
const FRUIT_RE = /berr(y|ies)|strawberr|blueberr|raspberr|blackberr|banana|mango|pineapple|peach|apple|orange|kiwi|melon|watermelon|grape|cherr(y|ies)|papaya|guava|dragon\s?fruit|fruit|acai|avocado|spinach|kale|carrot|beet|celery|ginger|lemon|lime/i;
const FLAVOR_RE = /protein|honey|sugar|syrup|vanilla|cocoa|chocolate|cinnamon|nutmeg|peanut|almond|peanut\s?butter|nut\s?butter|seed|chia|flax|hemp|oats?|granola|coconut\s?flakes|mint|matcha|extract|spice|salt|agave|maple/i;

const FLUID_CATS = /dairy|beverage|drink/i;
const FRUIT_CATS = /produce|fruit|vegetable/i;

const BUCKETS = [
  { key: 'fruit',   label: 'Fruits & Greens', emoji: '🍓' },
  { key: 'frozen',  label: 'Frozen',          emoji: '❄️' },
  { key: 'fluid',   label: 'Fluids',          emoji: '🥛' },
  { key: 'flavor',  label: 'Flavorings',      emoji: '🍯' },
  { key: 'other',   label: 'Other',           emoji: '📦' },
];

const bucketFor = (it) => {
  const name = it.item_name || '';
  const cat = it.category || '';
  const loc = (it.storage_location || it.custom_location_name || '').toLowerCase();
  if (loc === 'freezer' || FROZEN_RE.test(name)) return 'frozen';
  if (FLUID_RE.test(name) || FLUID_CATS.test(cat)) return 'fluid';
  if (FRUIT_RE.test(name) || FRUIT_CATS.test(cat)) return 'fruit';
  if (FLAVOR_RE.test(name)) return 'flavor';
  return 'other';
};

// ---------- glass layer colors ----------
const LAYER_COLORS = [
  [/strawberr|raspberr|cherr|watermelon|beet|cranberr/i, 'bg-rose-400'],
  [/blueberr|acai|blackberr|grape|plum/i, 'bg-indigo-400'],
  [/banana|mango|peach|pineapple|orange|papaya|lemon/i, 'bg-amber-300'],
  [/spinach|kale|matcha|kiwi|avocado|celery|mint|green/i, 'bg-emerald-400'],
  [/milk|yogurt|kefir|cream|oat|almond|soy|coconut\s?milk|water|juice/i, 'bg-sky-200'],
  [/chocolate|cocoa|peanut|nut\s?butter|coffee/i, 'bg-amber-700'],
  [/honey|syrup|maple|agave/i, 'bg-yellow-400'],
  [/protein|oats?|granola|flax|chia|hemp|seed/i, 'bg-stone-400'],
  [/dragon\s?fruit|guava|cranberr/i, 'bg-pink-400'],
  [/ice|frozen|sorbet/i, 'bg-cyan-200'],
];
const FALLBACK_COLORS = ['bg-violet-400', 'bg-fuchsia-400', 'bg-teal-400', 'bg-lime-400', 'bg-orange-400'];
const layerColor = (name, idx) => {
  for (const [re, cls] of LAYER_COLORS) if (re.test(name)) return cls;
  return FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
};

/**
 * SmoothieBuilder — pick on-hand ingredients → layered glass → blend & save.
 * Every blend posts a category='smoothie' recipe staged in "Can Create" —
 * the user sends it to the Recipe Book manually. "Blend it!" also marks
 * it cooked (deducts from home inventory) just like markMade in CategoryRecipeLab.
 */
const SmoothieBuilder = ({ onSaved }) => {
  const { success, error: showError, toasts, hideToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState({});   // item_id -> scoops
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [mixing, setMixing] = useState(null); // { after: 'blend' | 'save' }
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  // Persisted preference: hide the catch-all 'Other' bucket
  const [hideOther, setHideOther] = useState(() => localStorage.getItem('smoothieBuilderHideOther') === '1');

  const loadItems = async () => {
    try {
      const { data } = await api.get('/inventory');
      setItems(data || []);
    } catch {
      showError('Could not load home inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add something the builder doesn't list yet — creates the inventory row
  // and puts a scoop in the glass in one step.
  const addIngredient = async () => {
    const n = addName.trim();
    if (!n || addBusy) return;
    setAddBusy(true);
    try {
      const { data } = await api.post('/inventory', {
        item_name: n,
        quantity: 1,
        unit: '',
        storage_location: 'pantry',
      });
      setItems((p) => [...p, data]);
      setPicked((p) => ({ ...p, [data.id]: 1 }));
      setAddName('');
      playSound('pop');
    } catch {
      showError('Could not add ingredient');
    } finally {
      setAddBusy(false);
    }
  };

  const toggleOther = () => setHideOther((v) => {
    localStorage.setItem('smoothieBuilderHideOther', v ? '0' : '1');
    return !v;
  });

  const usable = useMemo(
    () => items.filter((i) => (i.percentage_left ?? 1) > 0),
    [items]
  );

  const buckets = useMemo(() => {
    const map = Object.fromEntries(BUCKETS.map((b) => [b.key, []]));
    usable.forEach((i) => map[bucketFor(i)].push(i));
    return map;
  }, [usable]);

  const pickedItems = useMemo(
    () => usable.filter((i) => picked[i.id]),
    [usable, picked]
  );

  const autoName = useMemo(() => {
    if (!pickedItems.length) return '';
    const first = pickedItems.slice(0, 2).map((i) => i.item_name).join(' & ');
    return `${first}${pickedItems.length > 2 ? '+' : ''} Smoothie`;
  }, [pickedItems]);

  const toggle = (item) => {
    setPicked((p) => {
      const next = { ...p };
      if (next[item.id] >= 3) delete next[item.id];
      else next[item.id] = (next[item.id] || 0) + 1;
      return next;
    });
    playSound(picked[item.id] ? 'pop' : 'check');
  };

  const clearPick = (id) => setPicked((p) => { const n = { ...p }; delete n[id]; return n; });

  const buildPayload = () => ({
    name: (nameTouched && name.trim()) || autoName || 'Custom Smoothie',
    description: 'Custom blend from the Smoothie Lab builder',
    category: 'smoothie',
    difficulty: 'easy',
    servings: 1,
    prep_time: 5,
    image_url: 'emoji:🥤',
    tags: ['smoothie', 'custom-builder'],
    // Staged in "Can Create" — user sends it to the Recipe Book manually
    in_recipe_book: false,
    instructions: 'Add all ingredients to a blender. Blend until smooth, about 30–60 seconds. Serve immediately.',
    ingredients: pickedItems.map((i) => ({
      item_name: i.item_name,
      quantity: picked[i.id],
      unit: 'scoop',
    })),
  });

  const doSave = async (deduct) => {
    setSaving(true);
    try {
      const payload = buildPayload();
      const { data: recipe } = await api.post('/recipes', payload);
      if (deduct) {
        try {
          await api.post(`/recipes/${recipe.id}/mark-cooked`, { servings_made: 1, deduct_inventory: true });
        } catch { /* recipe saved even if deduction fails */ }
      }
      success(`"${payload.name}" saved to Can Create${deduct ? ' — inventory updated' : ''} — send it to your Recipe Book when ready!`);
      playSound('pop');
      setPicked({});
      setName('');
      setNameTouched(false);
      onSaved?.();
    } catch {
      showError('Could not save smoothie');
    } finally {
      setSaving(false);
    }
  };

  const startAction = (kind) => {
    if (!pickedItems.length || saving) return;
    setMixing({
      icons: pickedItems.slice(0, 8).map((i) => i.item_icon || '🥤'),
      onDone: () => { setMixing(null); doSave(kind === 'blend'); },
    });
  };

  const totalScoops = Object.values(picked).reduce((a, b) => a + b, 0);

  if (loading) {
    return <div className="text-center text-sm text-gray-400 py-10">Loading your ingredients…</div>;
  }

  return (
    <div>
      {/* ---- Glass ---- */}
      <div className="flex flex-col items-center mb-5">
        <div className="relative w-28">
          {/* straw */}
          <AnimatePresence>
            {pickedItems.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute -top-7 left-1/2 -translate-x-1/2 text-xl rotate-12 pointer-events-none"
              >
                🥤
              </motion.div>
            )}
          </AnimatePresence>
          <div className="w-28 h-40 border-4 border-gray-300 dark:border-gray-600 border-t-2 rounded-b-3xl rounded-t-lg bg-white/40 dark:bg-gray-800/40 overflow-hidden flex flex-col-reverse">
            {pickedItems.map((i, idx) => (
              <motion.div
                key={i.id}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                exit={{ scaleY: 0 }}
                style={{ originY: 0, flexGrow: picked[i.id] }}
                onClick={() => clearPick(i.id)}
                title={`${i.item_name} ×${picked[i.id]} — tap to remove`}
                className={`${layerColor(i.item_name, idx)} w-full cursor-pointer flex items-center justify-center min-h-[14px]`}
              >
                <span className="text-[9px] font-bold text-white/90 drop-shadow truncate px-1">
                  {picked[i.id] > 1 ? `×${picked[i.id]}` : ''}
                </span>
              </motion.div>
            ))}
            {pickedItems.length === 0 && (
              <div className="flex-1 flex items-center justify-center text-2xl opacity-20 select-none">🥤</div>
            )}
          </div>
          <div className="text-center mt-1.5 text-[10px] text-gray-400">
            {totalScoops === 0 ? 'Tap ingredients below to fill the glass' : `${totalScoops} scoop${totalScoops > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ---- Add ingredient + pantry ---- */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1">
          <Plus className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
            placeholder="Add an ingredient (scoops into the glass)…"
            className="w-full pl-8 pr-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-gray-800 dark:text-gray-200"
          />
        </div>
        <button
          onClick={addIngredient}
          disabled={!addName.trim() || addBusy}
          className="px-3 py-2 rounded-xl text-xs font-semibold text-white bg-pink-500 hover:bg-pink-600 disabled:opacity-40 transition-colors"
        >
          {addBusy ? '…' : 'Add'}
        </button>
        <button
          onClick={() => setPickerOpen(true)}
          title="My Ingredients — toggle what you have"
          className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <Package className="w-3.5 h-3.5" /> Pantry
        </button>
      </div>

      {/* ---- Buckets ---- */}
      <div className="space-y-3 mb-5">
        {BUCKETS.map((b) => {
          const list = buckets[b.key];
          if (!list.length) return null;
          if (b.key === 'other' && hideOther) {
            return (
              <button
                key={b.key}
                onClick={toggleOther}
                className="w-full text-left px-3 py-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {b.emoji} Other hidden ({list.length}) — tap to show
              </button>
            );
          }
          return (
            <div key={b.key} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
              <p className="flex items-center justify-between text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                <span>{b.emoji} {b.label} <span className="font-normal">({list.length})</span></span>
                {b.key === 'other' && (
                  <button
                    onClick={toggleOther}
                    title="Hide this section (remembers your choice)"
                    className="flex items-center gap-1 text-[10px] font-normal normal-case text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <EyeOff className="w-3 h-3" /> hide
                  </button>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {list.map((i) => {
                  const n = picked[i.id] || 0;
                  return (
                    <button
                      key={i.id}
                      onClick={() => toggle(i)}
                      title={n ? `Tap for another scoop (${n}/3) — tap at 3 to remove` : 'Add a scoop'}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border-2 transition-colors ${
                        n
                          ? 'border-pink-400 bg-pink-50 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-pink-300'
                      }`}
                    >
                      {i.item_icon && <span className="mr-0.5">{i.item_icon}</span>}
                      {i.item_name}{n ? ` ×${n}` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {usable.length === 0 && (
          <p className="text-center text-sm text-gray-400 py-4">
            Nothing on hand yet — stock your Home Inventory to start building.
          </p>
        )}
      </div>

      {/* ---- Name + actions ---- */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3">
        <input
          value={nameTouched ? name : autoName}
          onChange={(e) => { setNameTouched(true); setName(e.target.value); }}
          placeholder="Name your smoothie"
          disabled={!pickedItems.length}
          className="w-full px-3 py-2 mb-2.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 disabled:opacity-40"
        />
        <div className="flex gap-2">
          <button
            onClick={() => startAction('blend')}
            disabled={!pickedItems.length || saving}
            title="Blend, stage in Can Create & deduct from inventory"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-40 transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Blend it!'}
          </button>
          <button
            onClick={() => startAction('save')}
            disabled={!pickedItems.length || saving}
            title="Save to Can Create without deducting inventory"
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
          >
            <BookPlus className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save recipe'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mixing && <MixingOverlay icons={mixing.icons} bowl="🥤" onDone={mixing.onDone} text="Blending it up…" />}
      </AnimatePresence>

      {/* Universal picker — same pantry, same ingredient tracking as the lab page */}
      <LabPantryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title="Smoothie Lab"
        accent="pink"
        defaultEmoji="🥤"
        items={usable.map((i) => ({ name: i.item_name, icon: i.item_icon }))}
        onChanged={loadItems}
      />

      <Portal><div className="fixed bottom-4 right-4 z-[120] space-y-2">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
        ))}
      </div></Portal>
    </div>
  );
};

export default SmoothieBuilder;
