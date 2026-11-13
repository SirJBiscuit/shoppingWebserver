import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Search, Plus, Trash2, Sparkles, Save, X, ChefHat,
  Wand2, Check, ShoppingCart, Minus, Pencil, Copy, Filter, ListChecks, Pin,
} from 'lucide-react';
import api from '../services/api';
import { getLists, addItem } from '../api/shopping';
import LabShell from '../components/lab/LabShell';
import MixingOverlay from '../components/lab/MixingOverlay';
import ConfirmDialog from '../limbo/modals/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { playSound } from '../utils/soundEffects';
import { Portal } from '../utils/autoPlacement';

const HEAT_LABELS = ['No heat', 'Mild', 'Warm', 'Spicy', 'Hot', 'Inferno'];
const BLEND_ICONS = ['🧂', '🌶️', '🌿', '🔥', '🍛', '🌮', '🥘', '✨'];

// Batch yield options — total blend output in teaspoons
// 1 fl oz ≈ 6 tsp, 1 tsp of dried spice ≈ 2.5 g
const YIELD_OPTIONS = [
  { label: '1x batch', tsp: 9 },
  { label: '2x batch', tsp: 18 },
  { label: '4 oz', tsp: 24 },
  { label: '8 oz', tsp: 48 },
  { label: '16 oz', tsp: 96 },
  { label: '100 g', tsp: 40 },
  { label: 'Bulk 500 g', tsp: 200 },
];
const TSP_PER_OZ = 6;
const G_PER_TSP = 2.5;

const formatAmount = (tsp, unitMode) => {
  if (unitMode === 'oz') return `${(tsp / TSP_PER_OZ).toFixed(2).replace(/\.?0+$/, '')} oz`;
  if (unitMode === 'g') return `${Math.round(tsp * G_PER_TSP)} g`;
  return `${Math.round(tsp * 4) / 4} tsp`;
};

// Parts → teaspoons at a given total yield
const partsToTsp = (ingredients, yieldTsp = 9) => {
  const total = ingredients.reduce((s, i) => s + parseFloat(i.parts || 1), 0) || 1;
  return (ing) => Math.max(0.25, Math.round((ing.parts / total) * yieldTsp * 4) / 4);
};

// Approx tsp the user has: level% × container size
const haveTsp = (ing) =>
  ing.owned ? Math.round(((ing.level_percent ?? 100) / 100) * (ing.container_tsp ?? 12) * 2) / 2 : null;

// Jar-style fill bar color by level
const levelColor = (pct) =>
  pct >= 50 ? 'bg-emerald-500' : pct >= 25 ? 'bg-amber-500' : 'bg-red-500';

const HeatMeter = ({ level }) => (
  <div className="flex items-center gap-0.5" title={HEAT_LABELS[level] || 'No heat'}>
    {Array.from({ length: 5 }, (_, i) => (
      <Flame
        key={i}
        className={`w-3.5 h-3.5 ${i < level ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'}`}
        fill={i < level ? 'currentColor' : 'none'}
      />
    ))}
  </div>
);

const SpiceBlends = () => {
  const { success, error: showError, toasts, hideToast } = useToast();
  const [tab, setTab] = useState('rack'); // rack | blends | suggest
  const [spices, setSpices] = useState([]);
  const [blends, setBlends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rackSearch, setRackSearch] = useState('');

  // Suggester
  const [dishInput, setDishInput] = useState('');
  const [suggestion, setSuggestion] = useState(null);
  const [suggesting, setSuggesting] = useState(false);

  // Blend builder
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderName, setBuilderName] = useState('');
  const [builderIcon, setBuilderIcon] = useState('🧂');
  const [builderDesc, setBuilderDesc] = useState('');
  const [builderIngredients, setBuilderIngredients] = useState({}); // spiceId -> parts
  const [builderSearch, setBuilderSearch] = useState('');
  const [savingBlend, setSavingBlend] = useState(false);

  const [expandedBlend, setExpandedBlend] = useState(null);
  const [pairMap, setPairMap] = useState({}); // spice_id → owned pairing names (swap hints)
  const [rackSelectMode, setRackSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchBusy, setBatchBusy] = useState(false);
  const [pinnedBlendId, setPinnedBlendId] = useState(null); // floating draggable card
  const [deleteBlend, setDeleteBlend] = useState(null);
  const [editingBlend, setEditingBlend] = useState(null); // blend id when editing
  const [makeableOnly, setMakeableOnly] = useState(false); // 'can I make it?' filter
  const [addingToList, setAddingToList] = useState(null); // blend id while adding

  // Batch yield + display unit
  const [yieldTsp, setYieldTsp] = useState(9);
  const [unitMode, setUnitMode] = useState('tsp');
  // Mixing animation
  const [mixing, setMixing] = useState(null); // {icons, onDone}

  useEffect(() => {
    const load = async () => {
      try {
        const [spiceRes, blendRes] = await Promise.all([
          api.get('/spices'),
          api.get('/spices/blends'),
        ]);
        setSpices(spiceRes.data || []);
        setBlends(blendRes.data || []);
      } catch (err) {
        console.error('Failed to load spices:', err);
        showError('Could not load the spice system — is migration 053 applied?');
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshBlends = async () => {
    const { data } = await api.get('/spices/blends');
    setBlends(data || []);
  };

  // ------------------------------------------------------------------
  // Rack
  // ------------------------------------------------------------------
  // Blends hold their own snapshot of owned/level per ingredient —
  // keep it in sync with rack changes so 'x/y in rack' is accurate
  const syncBlendIngredient = (spiceId, patch) =>
    setBlends((prev) => prev.map((b) => ({
      ...b,
      ingredients: (b.ingredients || []).map((i) =>
        i.spice_id === spiceId ? { ...i, ...patch } : i
      ),
    })));

  const toggleSpice = async (spice) => {
    const next = !spice.owned;
    setSpices((prev) => prev.map((s) => (s.id === spice.id ? { ...s, owned: next } : s)));
    syncBlendIngredient(spice.id, { owned: next });
    playSound(next ? 'pop' : 'uncheck');
    try {
      await api.post('/spices/rack', { spiceId: spice.id, owned: next });
    } catch {
      setSpices((prev) => prev.map((s) => (s.id === spice.id ? { ...s, owned: !next } : s)));
      syncBlendIngredient(spice.id, { owned: !next });
      showError('Failed to update your rack');
    }
  };

  // Swap hints — lazy-fetch pairings for missing/short ingredients when a blend opens
  const loadSwapHints = async (b) => {
    const need = partsToTsp(b.ingredients, yieldTsp);
    const ids = b.ingredients
      .filter((i) => !i.owned || (haveTsp(i) !== null && haveTsp(i) < need(i)))
      .map((i) => i.spice_id)
      .filter((id) => pairMap[id] === undefined);
    if (!ids.length) return;
    const results = await Promise.all(
      ids.map((id) =>
        api.get(`/spices/pairings/${id}`)
          .then((r) => [id, (r.data?.pairs || []).filter((p) => p.owned).map((p) => p.name)])
          .catch(() => [id, null])
      )
    );
    setPairMap((prev) => {
      const next = { ...prev };
      for (const [id, names] of results) if (names) next[id] = names;
      return next;
    });
  };

  const expandBlend = (b) => {
    const open = expandedBlend === b.id;
    setExpandedBlend(open ? null : b.id);
    if (!open) loadSwapHints(b);
  };

  // Rack multi-select — batch owned toggles for mobile users stocking a rack
  const toggleSelect = (s) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(s.id)) next.delete(s.id); else next.add(s.id);
      return next;
    });

  const batchSetOwned = async (owned) => {
    if (!selectedIds.size) return;
    setBatchBusy(true);
    const ids = [...selectedIds];
    setSpices((prev) => prev.map((s) => (ids.includes(s.id) ? { ...s, owned } : s)));
    ids.forEach((id) => syncBlendIngredient(id, { owned }));
    playSound(owned ? 'pop' : 'uncheck');
    try {
      await Promise.all(ids.map((id) => api.post('/spices/rack', { spiceId: id, owned })));
      success(`${ids.length} spice${ids.length > 1 ? 's' : ''} ${owned ? 'added to' : 'removed from'} your rack`);
    } catch {
      showError('Some rack updates failed');
    } finally {
      setBatchBusy(false);
      setSelectedIds(new Set());
      setRackSelectMode(false);
    }
  };

  const ownedCount = spices.filter((s) => s.owned).length;
  const pinnedBlend = blends.find((b) => b.id === pinnedBlendId) || null;
  const filteredSpices = useMemo(() => {
    const q = rackSearch.toLowerCase();
    return spices.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [spices, rackSearch]);

  // Update a spice's container fill level
  const setLevel = async (spice, level) => {
    const clamped = Math.max(0, Math.min(100, level));
    setSpices((prev) => prev.map((s) => (s.id === spice.id ? { ...s, level_percent: clamped } : s)));
    syncBlendIngredient(spice.id, { level_percent: clamped, owned: true });
    try {
      await api.patch(`/spices/rack/${spice.id}`, { level_percent: clamped });
    } catch {
      showError('Could not save level');
    }
  };

  // ------------------------------------------------------------------
  // Suggester
  // ------------------------------------------------------------------
  const runSuggest = async () => {
    if (!dishInput.trim()) return;
    setSuggesting(true);
    setSuggestion(null);
    try {
      const { data } = await api.get(`/spices/suggest?dish=${encodeURIComponent(dishInput.trim())}`);
      // Play mixing animation with the suggested spices before revealing
      const icons = (data.ingredients || []).map((i) => i.icon);
      if (icons.length) {
        setMixing({ icons, onDone: () => { setMixing(null); setSuggestion(data); playSound('check'); } });
      } else {
        setSuggestion(data);
        playSound('check');
      }
    } catch {
      showError('Suggestion failed — try again');
    } finally {
      setSuggesting(false);
    }
  };

  const saveSuggestion = async () => {
    if (!suggestion?.ingredients?.length) return;
    try {
      await api.post('/spices/blends', {
        name: `${suggestion.suggested_name || 'My Blend'} (${suggestion.dish})`,
        description: `Suggested for "${suggestion.dish}"`,
        icon: '✨',
        source: 'suggested',
        ingredients: suggestion.ingredients.map((i) => ({ spice_id: i.spice_id, parts: i.parts })),
      });
      await refreshBlends();
      success('Blend saved to your collection!');
      playSound('check');
    } catch {
      showError('Could not save blend');
    }
  };

  const startMixingSave = (icons, doSave) => {
    setMixing({ icons: icons.length ? icons : ['🧂'], onDone: () => { setMixing(null); doSave(); } });
  };

  // ------------------------------------------------------------------
  // Builder
  // ------------------------------------------------------------------
  const builderList = Object.entries(builderIngredients).map(([id, parts]) => {
    const s = spices.find((sp) => sp.id === Number(id));
    return s ? { spice_id: s.id, name: s.name, icon: s.icon, parts } : null;
  }).filter(Boolean);
  const builderTsp = partsToTsp(builderList, yieldTsp);

  const adjustPart = (id, delta) => {
    setBuilderIngredients((prev) => {
      const next = Math.max(0.25, Math.min(10, (prev[id] || 1) + delta));
      return { ...prev, [id]: Math.round(next * 4) / 4 };
    });
  };

  const saveBlend = async () => {
    if (!builderName.trim() || builderList.length === 0) {
      showError('Name your blend and add at least one spice');
      return;
    }
    setSavingBlend(true);
    const icons = builderList.map((i) => i.icon);
    const doSave = async () => {
      try {
        const payload = {
          name: builderName.trim(),
          description: builderDesc.trim(),
          icon: builderIcon,
          ingredients: builderList.map((i) => ({ spice_id: i.spice_id, parts: i.parts })),
        };
        if (editingBlend) {
          await api.put(`/spices/blends/${editingBlend}`, payload);
        } else {
          await api.post('/spices/blends', payload);
        }
        await refreshBlends();
        closeBuilder();
        setBuilderName(''); setBuilderDesc(''); setBuilderIngredients({});
        success(editingBlend ? 'Blend updated!' : 'Blend created!');
        playSound('check');
      } catch {
        showError(editingBlend ? 'Could not update blend' : 'Could not create blend');
      } finally {
        setSavingBlend(false);
      }
    };
    startMixingSave(icons, doSave);
  };

  // Edit an owned blend, or clone a preset into an editable copy
  const openBlendEditor = (b) => {
    setBuilderName(b.name);
    setBuilderIcon(b.icon || '🧂');
    setBuilderDesc(b.description || '');
    setBuilderIngredients(
      Object.fromEntries((b.ingredients || []).map((i) => [i.spice_id, parseFloat(i.parts) || 1]))
    );
    setEditingBlend(b.user_id ? b.id : null); // preset -> POSTs a new copy
    setBuilderSearch('');
    setBuilderOpen(true);
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setEditingBlend(null);
  };

  // "I made this" — deduct the tsp consumed from each container
  const markMade = async (b) => {
    try {
      await api.post(`/spices/blends/${b.id}/made`, { yield_tsp: yieldTsp });
      const { data: freshSpices } = await api.get('/spices');
      setSpices(freshSpices || []);
      await refreshBlends();
      success('Nice! Container levels updated');
      playSound('check');
    } catch {
      showError('Could not record usage');
    }
  };

  // Push missing + too-low ingredients onto the active shopping list
  const addMissingToList = async (b, need) => {
    const missing = b.ingredients.filter((i) => {
      const have = haveTsp(i);
      return !i.owned || (have !== null && have < need(i));
    });
    if (!missing.length) return;
    setAddingToList(b.id);
    try {
      const { data: lists } = await getLists();
      const list = (lists || []).find((l) => !l.is_completed) || (lists || [])[0];
      if (!list) {
        showError('No shopping list found — create one first');
        return;
      }
      for (const i of missing) {
        await addItem(list.id, {
          itemName: i.name,
          quantity: 1,
          unit: 'jar',
          category: 'Condiments & Sauces',
          icon: i.icon,
        });
      }
      success(`Added ${missing.length} spice${missing.length > 1 ? 's' : ''} to "${list.name || 'your list'}"`);
    } catch {
      showError('Could not add to shopping list');
    } finally {
      setAddingToList(null);
    }
  };

  const confirmDeleteBlend = async () => {
    try {
      await api.delete(`/spices/blends/${deleteBlend.id}`);
      setBlends((prev) => prev.filter((b) => b.id !== deleteBlend.id));
      success('Blend deleted');
    } catch {
      showError('Could not delete blend');
    } finally {
      setDeleteBlend(null);
    }
  };

  // Can the user actually mix this blend right now?
  const canMake = (b) => {
    const need = partsToTsp(b.ingredients || [], yieldTsp);
    return (b.ingredients || []).length > 0 &&
      b.ingredients.every((i) => i.owned && haveTsp(i) >= need(i));
  };

  const visibleBlends = useMemo(() => {
    const list = makeableOnly ? blends.filter(canMake) : blends;
    return [...list].sort((a, b) => Number(canMake(b)) - Number(canMake(a)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blends, makeableOnly, yieldTsp]);

  const tabs = [
    { id: 'rack', label: 'My Spice Rack', icon: ChefHat, count: ownedCount },
    { id: 'blends', label: 'Blends', icon: Sparkles, count: blends.length },
    { id: 'suggest', label: 'What am I making?', icon: Wand2 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading spices...</div>
      </div>
    );
  }

  return (
    <LabShell
      icon={Flame}
      gradient="from-orange-500 to-red-600"
      title="Spice Lab"
      subtitle={`${ownedCount} spices in your rack · ${blends.length} blends`}
      tabs={tabs}
      activeTab={tab}
      onTabChange={(id) => { setTab(id); if (id === 'blends') refreshBlends(); }}
      accent="orange"
    >


            {/* ============ RACK TAB ============ */}
            {tab === 'rack' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex items-center gap-2 mb-4 max-w-md">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      value={rackSearch}
                      onChange={(e) => setRackSearch(e.target.value)}
                      placeholder="Search spices…"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <button
                    onClick={() => { setRackSelectMode((m) => !m); setSelectedIds(new Set()); }}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                      rackSelectMode
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                    }`}
                    title="Select multiple spices to add/remove at once"
                  >
                    <ListChecks className="w-4 h-4" /> Select
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  {rackSelectMode
                    ? 'Tap spices to select, then use the bar below to update them all.'
                    : "Tap spices you have at home — blends and suggestions will flag what you're missing."}
                </p>
                {rackSelectMode && (
                  <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gray-900/95 dark:bg-gray-700 text-white shadow-2xl">
                    <span className="text-xs font-medium whitespace-nowrap">{selectedIds.size} selected</span>
                    <button
                      onClick={() => setSelectedIds(new Set(filteredSpices.map((s) => s.id)))}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-semibold"
                    >
                      All
                    </button>
                    <button
                      onClick={() => batchSetOwned(true)}
                      disabled={!selectedIds.size || batchBusy}
                      className="px-2.5 py-1.5 rounded-lg bg-green-500 hover:bg-green-600 text-xs font-semibold disabled:opacity-40"
                    >
                      Own
                    </button>
                    <button
                      onClick={() => batchSetOwned(false)}
                      disabled={!selectedIds.size || batchBusy}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-semibold disabled:opacity-40"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => { setRackSelectMode(false); setSelectedIds(new Set()); }}
                      className="px-2.5 py-1.5 rounded-lg bg-gray-600 hover:bg-gray-500 text-xs font-semibold"
                    >
                      Done
                    </button>
                  </div>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredSpices.map((s, i) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => (rackSelectMode ? toggleSelect(s) : toggleSpice(s))}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        s.owned
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100 hover:border-gray-300'
                      } ${rackSelectMode && selectedIds.has(s.id) ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
                    >
                      {s.owned && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {rackSelectMode && (
                        <div className={`absolute top-2 left-2 w-4 h-4 rounded border-2 flex items-center justify-center ${
                          selectedIds.has(s.id)
                            ? 'bg-blue-500 border-blue-500'
                            : 'border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-800/60'
                        }`}>
                          {selectedIds.has(s.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                      )}
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{s.name}</div>
                      <div className="mt-1"><HeatMeter level={s.heat_level} /></div>
                      {/* Container fill level */}
                      {s.owned && (
                        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{s.level_percent}%</span>
                            <div className="flex gap-0.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); setLevel(s, s.level_percent - 25); }}
                                className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 text-[10px] leading-none text-gray-600 dark:text-gray-300"
                              >−</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setLevel(s, s.level_percent + 25); }}
                                className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 text-[10px] leading-none text-gray-600 dark:text-gray-300"
                              >+</button>
                            </div>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                            <motion.div
                              className={`h-full ${levelColor(s.level_percent)}`}
                              animate={{ width: `${s.level_percent}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ============ BLENDS TAB ============ */}
            {tab === 'blends' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <button
                    onClick={() => setBuilderOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl transition-shadow"
                  >
                    <Plus className="w-4 h-4" /> Create a blend
                  </button>

                  {/* Batch yield selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Batch:</span>
                    <div className="flex flex-wrap gap-1">
                      {YIELD_OPTIONS.map((y) => (
                        <button
                          key={y.tsp}
                          onClick={() => setYieldTsp(y.tsp)}
                          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                            yieldTsp === y.tsp
                              ? 'bg-orange-500 text-white'
                              : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {y.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Display unit toggle */}
                  <div className="flex items-center gap-1">
                    {['tsp', 'oz', 'g'].map((u) => (
                      <button
                        key={u}
                        onClick={() => setUnitMode(u)}
                        className={`px-2 py-1 rounded-lg text-xs font-mono font-medium transition-colors ${
                          unitMode === u
                            ? 'bg-purple-500 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                        }`}
                      >
                        {u}
                      </button>
                    ))}
                  </div>

                  {/* Can-I-make-it filter */}
                  <button
                    onClick={() => setMakeableOnly((v) => !v)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      makeableOnly
                        ? 'bg-green-500 text-white'
                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    <Filter className="w-3.5 h-3.5" /> Can I make it?
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visibleBlends.map((b) => {
                    const open = expandedBlend === b.id;
                    const tsp = partsToTsp(b.ingredients, yieldTsp);
                    const owned = b.ingredients.filter((i) => i.owned).length;
                    // "can I make this batch?" — need vs estimated on-hand
                    const shortages = b.ingredients.filter((i) => {
                      const have = haveTsp(i);
                      return have !== null && have < tsp(i);
                    }).length;
                    return (
                      <motion.div
                        key={b.id}
                        layout
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <button onClick={() => expandBlend(b)} className="flex items-start gap-3 text-left flex-1">
                            <span className="text-3xl">{b.icon}</span>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white">{b.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{b.description}</p>
                              <p className="text-xs mt-1 text-orange-600 dark:text-orange-400 font-medium">
                                {owned}/{b.ingredients.length} in rack · {b.source === 'preset' ? 'Preset' : 'Yours'}
                                {shortages > 0 && <span className="ml-1 text-red-500">· {shortages} too low for this batch</span>}
                              </p>
                            </div>
                          </button>
                          <div className="flex items-center">
                            <button
                              onClick={() => setPinnedBlendId(pinnedBlendId === b.id ? null : b.id)}
                              title={pinnedBlendId === b.id ? 'Unpin card' : 'Pin as floating card'}
                              className={`p-1.5 transition-colors ${pinnedBlendId === b.id ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}
                            >
                              <Pin className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openBlendEditor(b)}
                              title={b.user_id ? 'Edit blend' : 'Make it mine (edit a copy)'}
                              className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                            >
                              {b.user_id ? <Pencil className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </button>
                            {b.user_id && (
                              <button
                                onClick={() => setDeleteBlend(b)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                                {b.ingredients.map((i) => {
                                  const need = tsp(i);
                                  const have = haveTsp(i);
                                  const short = have !== null && have < need;
                                  return (
                                    <div key={i.spice_id} className="text-sm">
                                      <div className="flex items-center gap-2">
                                        <span>{i.icon}</span>
                                        <span className={`flex-1 ${i.owned ? (short ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white') : 'text-gray-400 dark:text-gray-500'}`}>
                                          {i.name}
                                          {!i.owned && <span className="ml-1 text-[10px] text-red-400">(missing)</span>}
                                          {short && <span className="ml-1 text-[10px] text-red-400">(only ~{formatAmount(have, unitMode)} left)</span>}
                                        </span>
                                        <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{formatAmount(need, unitMode)}</span>
                                      </div>
                                      {(!i.owned || short) && pairMap[i.spice_id]?.length > 0 && (
                                        <p className="ml-6 mt-0.5 text-[10px] text-amber-600 dark:text-amber-400">
                                          try instead: {pairMap[i.spice_id].slice(0, 3).join(', ')} — in your rack
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                                <p className="text-[11px] text-gray-400 pt-1">
                                  Yield ≈ {formatAmount(yieldTsp, unitMode)} total · amounts scale with your batch size
                                </p>

                                {/* Card actions */}
                                <div className="flex gap-2 pt-2">
                                  <button
                                    onClick={() => markMade(b)}
                                    disabled={!canMake(b)}
                                    title={canMake(b) ? 'Record this batch — deducts from containers' : 'You are missing spices or running too low'}
                                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5" /> Made this
                                  </button>
                                  {(() => {
                                    const need = partsToTsp(b.ingredients, yieldTsp);
                                    const missing = b.ingredients.filter((i) => !i.owned || (haveTsp(i) !== null && haveTsp(i) < need(i))).length;
                                    return missing > 0 ? (
                                      <button
                                        onClick={() => addMissingToList(b, need)}
                                        disabled={addingToList === b.id}
                                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                                      >
                                        <ShoppingCart className="w-3.5 h-3.5" />
                                        {addingToList === b.id ? 'Adding…' : `${missing} missing → list`}
                                      </button>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* ============ SUGGESTER TAB ============ */}
            {tab === 'suggest' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 mb-5">
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                    What are you trying to make?
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={dishInput}
                      onChange={(e) => setDishInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && runSuggest()}
                      placeholder="tacos, curry, bbq ribs, stir fry, pumpkin pie…"
                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={runSuggest}
                      disabled={suggesting}
                      className="px-5 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-medium shadow-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      <Wand2 className={`w-4 h-4 ${suggesting ? 'animate-spin' : ''}`} />
                      {suggesting ? 'Mixing…' : 'Suggest'}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                  {suggestion && (
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="bg-gradient-to-br from-white to-orange-50 dark:from-gray-800 dark:to-gray-800 border-2 border-orange-300 dark:border-orange-700 rounded-2xl p-5 shadow-xl"
                    >
                      {suggestion.ingredients?.length ? (
                        <>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                              ✨ {suggestion.suggested_name}
                            </h2>
                            <HeatMeter level={suggestion.max_heat} />
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {suggestion.flavor_profile.map((f) => (
                              <span key={f} className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                                {f}
                              </span>
                            ))}
                          </div>

                          <div className="space-y-2 mb-4">
                            {suggestion.ingredients.map((i, idx) => {
                              const scale = yieldTsp / 9; // suggester base yield is 9 tsp
                              const need = Math.round(i.tsp * scale * 4) / 4;
                              const have = i.have_tsp;
                              const short = i.owned && have !== null && have < need;
                              return (
                                <motion.div
                                  key={i.spice_id}
                                  initial={{ opacity: 0, x: -15 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.08 }}
                                  className={`flex items-center gap-3 p-3 rounded-xl ${
                                    !i.owned
                                      ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                      : short
                                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800'
                                      : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                  }`}
                                >
                                  <span className="text-2xl">{i.icon}</span>
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                      {i.name} <span className="font-mono text-orange-600 dark:text-orange-400">· {formatAmount(need, unitMode)}</span>
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {i.adds}
                                      {i.owned && (
                                        <span className={`ml-1 font-medium ${short ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                          · have ~{formatAmount(have, unitMode)}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {short && (
                                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">LOW</span>
                                  )}
                                  {!short && (i.owned
                                    ? <Check className="w-4 h-4 text-green-500" />
                                    : <ShoppingCart className="w-4 h-4 text-red-400" />)}
                                </motion.div>
                              );
                            })}
                          </div>

                          {suggestion.missing.length > 0 && (
                            <p className="text-xs text-red-500 dark:text-red-400 mb-3">
                              Missing: {suggestion.missing.join(', ')} — add them to your next list!
                            </p>
                          )}

                          <button
                            onClick={saveSuggestion}
                            className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 hover:shadow-xl transition-shadow"
                          >
                            <Save className="w-4 h-4" /> Save this blend
                          </button>
                        </>
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400">{suggestion.message}</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

        {/* ============ BLEND BUILDER MODAL ============ */}
        <Portal><AnimatePresence>
          {builderOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4"
              onClick={closeBuilder}
            >
              <motion.div
                initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{editingBlend ? 'Edit Blend' : 'New Blend'}</h2>
                  <button onClick={closeBuilder} className="p-1.5 text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex gap-3 mb-3">
                  <input
                    value={builderName}
                    onChange={(e) => setBuilderName(e.target.value)}
                    placeholder="Blend name (e.g. Dad's Steak Dust)"
                    className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="flex gap-1.5 mb-3 flex-wrap">
                  {BLEND_ICONS.map((ic) => (
                    <button
                      key={ic}
                      onClick={() => setBuilderIcon(ic)}
                      className={`w-9 h-9 rounded-lg text-xl flex items-center justify-center border-2 transition-colors ${
                        builderIcon === ic ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/30' : 'border-transparent hover:border-gray-300'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
                <input
                  value={builderDesc}
                  onChange={(e) => setBuilderDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm mb-4"
                />

                {/* Selected ingredients with part steppers */}
                {builderList.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {builderList.map((i) => (
                      <div key={i.spice_id} className="flex items-center gap-2 p-2 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                        <span className="text-lg">{i.icon}</span>
                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                          {i.name} <span className="text-xs text-gray-400">≈{formatAmount(builderTsp(i), unitMode)}</span>
                        </span>
                        <button onClick={() => adjustPart(i.spice_id, -0.25)} className="p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-sm font-mono">{i.parts}x</span>
                        <button onClick={() => adjustPart(i.spice_id, 0.25)} className="p-1 rounded bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600">
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setBuilderIngredients((p) => { const n = { ...p }; delete n[i.spice_id]; return n; })}
                          className="p-1 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Spice picker */}
                <div className="relative mb-2">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={builderSearch}
                    onChange={(e) => setBuilderSearch(e.target.value)}
                    placeholder="Add spices…"
                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mb-5 max-h-40 overflow-y-auto custom-scrollbar">
                  {spices
                    .filter((s) => !builderIngredients[s.id] && (!builderSearch || s.name.toLowerCase().includes(builderSearch.toLowerCase())))
                    .map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setBuilderIngredients((p) => ({ ...p, [s.id]: 1 }))}
                        className={`px-2.5 py-1 rounded-full text-xs border transition-colors ${
                          s.owned
                            ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200'
                            : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {s.icon} {s.name}
                      </button>
                    ))}
                </div>

                <button
                  onClick={saveBlend}
                  disabled={savingBlend}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" /> {savingBlend ? 'Saving…' : editingBlend ? 'Save Changes' : 'Save Blend'}
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence></Portal>

        {/* Draggable pinned recipe card — float a blend while you work */}
        <Portal>
          {pinnedBlend && (() => {
            const b = pinnedBlend;
            const need = partsToTsp(b.ingredients, yieldTsp);
            const missing = b.ingredients.filter((i) => !i.owned || (haveTsp(i) !== null && haveTsp(i) < need(i))).length;
            return (
              <motion.div
                drag
                dragMomentum={false}
                whileDrag={{ scale: 1.03 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="fixed bottom-4 left-4 z-[110] w-64 bg-white dark:bg-gray-800 border border-orange-300 dark:border-orange-700 rounded-2xl shadow-2xl p-3 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl">{b.icon}</span>
                    <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{b.name}</span>
                  </div>
                  <button
                    onClick={() => setPinnedBlendId(null)}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                  {b.ingredients.map((i) => {
                    const n = need(i);
                    const have = haveTsp(i);
                    const short = have !== null && have < n;
                    return (
                      <div key={i.spice_id} className="flex items-center gap-1.5 text-xs">
                        <span>{i.icon}</span>
                        <span className={`flex-1 truncate ${i.owned && !short ? 'text-gray-700 dark:text-gray-300' : 'text-red-400'}`}>
                          {i.name}{!i.owned ? ' (missing)' : short ? ' (low)' : ''}
                        </span>
                        <span className="font-mono text-[10px] text-gray-400">{formatAmount(n, unitMode)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-1.5 mt-2.5">
                  <button
                    onClick={() => markMade(b)}
                    disabled={!canMake(b)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-green-500 text-white hover:bg-green-600 disabled:opacity-40"
                  >
                    <Check className="w-3 h-3" /> Made
                  </button>
                  {missing > 0 && (
                    <button
                      onClick={() => addMissingToList(b, need)}
                      disabled={addingToList === b.id}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-50"
                    >
                      <ShoppingCart className="w-3 h-3" /> {addingToList === b.id ? '…' : `${missing} → list`}
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })()}
        </Portal>

        {/* Mixing animation overlay */}
        <AnimatePresence>
          {mixing && <MixingOverlay icons={mixing.icons} onDone={mixing.onDone} />}
        </AnimatePresence>

        {/* Delete confirm */}
        <ConfirmDialog
          isOpen={!!deleteBlend}
          onCancel={() => setDeleteBlend(null)}
          onConfirm={confirmDeleteBlend}
          title="Delete blend?"
          message={`Delete "${deleteBlend?.name}"? This can't be undone.`}
          type="danger"
          confirmText="Delete"
        />

        {/* Toasts */}
        <Portal><div className="fixed bottom-4 right-4 z-[120] space-y-2">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
          ))}
        </div></Portal>
    </LabShell>
  );
};

export default SpiceBlends;
