import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Flame, Search, Plus, Trash2, Sparkles, Save, X, ChefHat,
  Wand2, Check, ShoppingCart, Minus,
} from 'lucide-react';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import ConfirmDialog from '../limbo/modals/ConfirmDialog';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';
import { playSound } from '../utils/soundEffects';

const HEAT_LABELS = ['No heat', 'Mild', 'Warm', 'Spicy', 'Hot', 'Inferno'];
const BLEND_ICONS = ['🧂', '🌶️', '🌿', '🔥', '🍛', '🌮', '🥘', '✨'];

// Parts → teaspoons (client mirror of the suggester scaling)
const partsToTsp = (ingredients) => {
  const total = ingredients.reduce((s, i) => s + parseFloat(i.parts || 1), 0) || 1;
  return (ing) => Math.max(0.25, Math.round((ing.parts / total) * 9 * 4) / 4);
};

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
  const [deleteBlend, setDeleteBlend] = useState(null);

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
  const toggleSpice = async (spice) => {
    const next = !spice.owned;
    setSpices((prev) => prev.map((s) => (s.id === spice.id ? { ...s, owned: next } : s)));
    playSound(next ? 'pop' : 'uncheck');
    try {
      await api.post('/spices/rack', { spiceId: spice.id, owned: next });
    } catch {
      setSpices((prev) => prev.map((s) => (s.id === spice.id ? { ...s, owned: !next } : s)));
      showError('Failed to update your rack');
    }
  };

  const ownedCount = spices.filter((s) => s.owned).length;
  const filteredSpices = useMemo(() => {
    const q = rackSearch.toLowerCase();
    return spices.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [spices, rackSearch]);

  // ------------------------------------------------------------------
  // Suggester
  // ------------------------------------------------------------------
  const runSuggest = async () => {
    if (!dishInput.trim()) return;
    setSuggesting(true);
    setSuggestion(null);
    try {
      const { data } = await api.get(`/spices/suggest?dish=${encodeURIComponent(dishInput.trim())}`);
      setSuggestion(data);
      playSound('check');
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

  // ------------------------------------------------------------------
  // Builder
  // ------------------------------------------------------------------
  const builderList = Object.entries(builderIngredients).map(([id, parts]) => {
    const s = spices.find((sp) => sp.id === Number(id));
    return s ? { spice_id: s.id, name: s.name, icon: s.icon, parts } : null;
  }).filter(Boolean);
  const builderTsp = partsToTsp(builderList);

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
    try {
      await api.post('/spices/blends', {
        name: builderName.trim(),
        description: builderDesc.trim(),
        icon: builderIcon,
        ingredients: builderList.map((i) => ({ spice_id: i.spice_id, parts: i.parts })),
      });
      await refreshBlends();
      setBuilderOpen(false);
      setBuilderName(''); setBuilderDesc(''); setBuilderIngredients({});
      success('Blend created!');
      playSound('check');
    } catch {
      showError('Could not create blend');
    } finally {
      setSavingBlend(false);
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
    <PageTransition>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        <div className="lg:ml-72">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center mr-4 shadow-lg">
                  <Flame className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Spice Lab</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {ownedCount} spices in your rack · {blends.length} blends
                  </p>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all ${
                    tab === t.id
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-orange-400'
                  }`}
                >
                  <t.icon className="w-4 h-4" />
                  {t.label}
                  {t.count != null && (
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20' : 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400'}`}>
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ============ RACK TAB ============ */}
            {tab === 'rack' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="relative mb-4 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={rackSearch}
                    onChange={(e) => setRackSearch(e.target.value)}
                    placeholder="Search spices…"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Tap spices you have at home — blends and suggestions will flag what you're missing.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {filteredSpices.map((s, i) => (
                    <motion.button
                      key={s.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleSpice(s)}
                      className={`relative p-3 rounded-xl border-2 text-left transition-all ${
                        s.owned
                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-400 dark:border-orange-600 shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-70 hover:opacity-100 hover:border-gray-300'
                      }`}
                    >
                      {s.owned && (
                        <div className="absolute -top-2 -right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">{s.name}</div>
                      <div className="mt-1"><HeatMeter level={s.heat_level} /></div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ============ BLENDS TAB ============ */}
            {tab === 'blends' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <button
                  onClick={() => setBuilderOpen(true)}
                  className="mb-4 flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium shadow-lg shadow-orange-500/30 hover:shadow-xl transition-shadow"
                >
                  <Plus className="w-4 h-4" /> Create a blend
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {blends.map((b) => {
                    const open = expandedBlend === b.id;
                    const tsp = partsToTsp(b.ingredients);
                    const owned = b.ingredients.filter((i) => i.owned).length;
                    return (
                      <motion.div
                        key={b.id}
                        layout
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <button onClick={() => setExpandedBlend(open ? null : b.id)} className="flex items-start gap-3 text-left flex-1">
                            <span className="text-3xl">{b.icon}</span>
                            <div>
                              <h3 className="font-bold text-gray-900 dark:text-white">{b.name}</h3>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{b.description}</p>
                              <p className="text-xs mt-1 text-orange-600 dark:text-orange-400 font-medium">
                                {owned}/{b.ingredients.length} in rack · {b.source === 'preset' ? 'Preset' : 'Yours'}
                              </p>
                            </div>
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

                        <AnimatePresence>
                          {open && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-1.5">
                                {b.ingredients.map((i) => (
                                  <div key={i.spice_id} className="flex items-center gap-2 text-sm">
                                    <span>{i.icon}</span>
                                    <span className={`flex-1 ${i.owned ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
                                      {i.name}
                                      {!i.owned && <span className="ml-1 text-[10px] text-red-400">(missing)</span>}
                                    </span>
                                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{tsp(i)} tsp</span>
                                  </div>
                                ))}
                                <p className="text-[11px] text-gray-400 pt-1">Amounts scaled for ~4 servings</p>
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
                            {suggestion.ingredients.map((i, idx) => (
                              <motion.div
                                key={i.spice_id}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08 }}
                                className={`flex items-center gap-3 p-3 rounded-xl ${
                                  i.owned
                                    ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                                }`}
                              >
                                <span className="text-2xl">{i.icon}</span>
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                                    {i.name} <span className="font-mono text-orange-600 dark:text-orange-400">· {i.amount}</span>
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{i.adds}</div>
                                </div>
                                {i.owned
                                  ? <Check className="w-4 h-4 text-green-500" />
                                  : <ShoppingCart className="w-4 h-4 text-red-400" />}
                              </motion.div>
                            ))}
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
          </div>
        </div>

        {/* ============ BLEND BUILDER MODAL ============ */}
        <AnimatePresence>
          {builderOpen && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[95] bg-black/50 flex items-center justify-center p-4"
              onClick={() => setBuilderOpen(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.92, y: 20 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto custom-scrollbar p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">New Blend</h2>
                  <button onClick={() => setBuilderOpen(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
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
                          {i.name} <span className="text-xs text-gray-400">≈{builderTsp(i)} tsp</span>
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
                  <Save className="w-4 h-4" /> {savingBlend ? 'Saving…' : 'Save Blend'}
                </button>
              </motion.div>
            </motion.div>
          )}
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
        <div className="fixed bottom-4 right-4 z-[120] space-y-2">
          {toasts.map((t) => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => hideToast(t.id)} />
          ))}
        </div>
      </div>
    </PageTransition>
  );
};

export default SpiceBlends;
