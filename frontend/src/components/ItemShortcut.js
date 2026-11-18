import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Search, Zap, Loader2, Check, Plus, Minus, Trash2,
  Sparkles, Package, BookmarkCheck, ShoppingCart,
} from 'lucide-react';
import api, { shoppingAPI } from '../services/api';
import {
  getAutocomplete, getSuggestions, searchProducts,
  getPriceEstimate, trackItem,
} from '../api/mdl';
import { detectIcon } from '../utils/categoryDetector';
import { playSound } from '../utils/soundEffects';
import { Portal } from '../utils/autoPlacement';
import { COMMON_GROCERY_ITEMS } from '../utils/autocomplete';

/**
 * ItemShortcut — MDL-powered "grab anything into the active list" picker.
 * Replaces the old Templates modal with one searchable, scrollable grid of
 * every item the system knows about — learned (MDL history, predictions,
 * catalog) and unlearned (type it, tap the "Shortcut it" tile, done).
 *
 * Sources merged per section:
 *  - Picks   : /mdl/suggestions (predicted-due) + /suggestions/smart-suggestions
 *              (recurring / low stock / frequent) + /mdl/popular fill
 *  - Catalog : /mdl/search product database (+ common grocery list fallback)
 *  - Sets    : saved list templates (same backend as before)
 *  - Search  : /mdl/autocomplete + product search + common items, deduped
 *
 * Tiles stage into a tray with per-item quantity steppers; "Add N" fires
 * onAddItems([{ name, quantity, unit, icon }]) — same contract TemplatesModal
 * used, plus fire-and-forget MDL tracking so picks keep learning.
 *
 * UX: springy staggered tiles, ring select, animated tray, sounds.
 * Opened from the Templates button slot, the Active List panel action,
 * or the '/' key anywhere outside an input.
 */

const TABS = [
  { id: 'picks', label: 'For You', icon: Sparkles },
  { id: 'catalog', label: 'Catalog', icon: Package },
  { id: 'sets', label: 'Saved Sets', icon: BookmarkCheck },
];

const SOURCE_BADGE = {
  due:      { label: 'due',      cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' },
  recurring:{ label: 'recurring',cls: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300' },
  low:      { label: 'low',      cls: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-300' },
  frequent: { label: 'frequent', cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-300' },
  popular:  { label: 'popular',  cls: 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300' },
  yours:    { label: 'yours',    cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300' },
  store:    { label: 'this store', cls: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-600 dark:text-fuchsia-300' },
  catalog:  { label: '',         cls: '' },
  new:      { label: 'new',      cls: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300' },
};

const norm = (n) => (n || '').trim().toLowerCase();
const fmtPrice = (p) => (p == null || isNaN(p) ? null : `$${Number(p).toFixed(2)}`);

// Merge candidate items into a keyed map, first-writer-wins on rank fields.
const mergeInto = (map, name, meta = {}) => {
  const k = norm(name);
  if (!k || map.has(k)) return;
  map.set(k, { name: name.trim(), icon: null, source: 'catalog', ...meta });
};

const ItemShortcut = ({ isOpen, onClose, onAddItems, store = '', activeItemNames = [] }) => {
  const [tab, setTab] = useState('picks');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [sets, setSets] = useState([]);       // saved templates
  const [setBusy, setSetBusy] = useState(null); // template id being applied
  const [remote, setRemote] = useState([]);   // debounced autocomplete+search hits
  const [tray, setTray] = useState([]);       // [{ name, icon, quantity, unit }]
  const [committing, setCommitting] = useState(false);
  const [estTotal, setEstTotal] = useState(null);
  const searchRef = useRef(null);
  const remoteTimer = useRef(null);
  const latestQuery = useRef('');

  const onList = useMemo(() => new Set(activeItemNames.map(norm)), [activeItemNames]);

  // ---- Data loading ------------------------------------------------------

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [dueRes, smartRes, popularRes, catalogRes, setsRes] = await Promise.allSettled([
      getSuggestions(),                                   // predicted-due
      api.get('/suggestions/smart-suggestions'),          // recurring / low / frequent
      api.get('/mdl/popular', { params: { limit: 30 } }), // popular catalog items
      searchProducts('', '', 60),                         // product catalog browse
      shoppingAPI.getTemplates(),                         // saved sets
    ]);

    const seen = new Map();
    // 1) predicted-due first — highest intent
    if (dueRes.status === 'fulfilled') {
      (Array.isArray(dueRes.value) ? dueRes.value : []).forEach((s) =>
        mergeInto(seen, s.item_name || s.name, {
          icon: s.predicted_icon || null,
          source: 'due',
        })
      );
    }
    // 2) smart suggestions (recurring / low_inventory / frequent)
    if (smartRes.status === 'fulfilled') {
      (smartRes.value.data || []).forEach((s) =>
        mergeInto(seen, s.item, {
          icon: s.icon || null,
          source: s.type === 'low_inventory' ? 'low' : s.type === 'recurring' ? 'recurring' : 'frequent',
        })
      );
    }
    // 3) popular catalog fill — keeps the grid alive for fresh accounts
    if (popularRes.status === 'fulfilled') {
      (popularRes.value.data || []).forEach((p) =>
        mergeInto(seen, p.name || p.item_name, { icon: p.icon || null, source: 'popular' })
      );
    }
    setPicks([...seen.values()].slice(0, 40));

    // Catalog browse — product DB, common list as fallback filler
    const cat = new Map();
    if (catalogRes.status === 'fulfilled') {
      (Array.isArray(catalogRes.value) ? catalogRes.value : []).forEach((p) =>
        mergeInto(cat, p.name || p.item_name, { icon: p.icon || null, source: 'catalog' })
      );
    }
    COMMON_GROCERY_ITEMS.slice(0, 60).forEach((n) => mergeInto(cat, n, { source: 'catalog' }));
    setCatalog([...cat.values()].slice(0, 90));

    setSets(setsRes.status === 'fulfilled' ? (setsRes.value.data || []) : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setTray([]);
      setTab('picks');
      setLoading(true);
      loadAll();
      setTimeout(() => searchRef.current?.focus(), 60);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Debounced remote search — MDL autocomplete (learned) + product search
  useEffect(() => {
    const term = search.trim();
    latestQuery.current = term;
    clearTimeout(remoteTimer.current);
    if (term.length < 2) { setRemote([]); return; }
    remoteTimer.current = setTimeout(async () => {
      const [ac, prod] = await Promise.all([
        getAutocomplete(term, store),
        searchProducts(term, '', 25),
      ]);
      if (latestQuery.current === term) setRemote([...(ac || []), ...(prod || [])]);
    }, 250);
    return () => clearTimeout(remoteTimer.current);
  }, [search, store]);

  // ---- Rows --------------------------------------------------------------

  const searchRows = useMemo(() => {
    const term = norm(search);
    if (term.length < 2) return [];
    const map = new Map();
    remote.forEach((r) =>
      mergeInto(map, r.name || r.item_name, {
        icon: r.icon || null,
        source: r.storeMatch ? 'store' : r.source === 'user' ? 'yours' : r.source === 'global' ? 'popular' : 'catalog',
      })
    );
    [...picks, ...catalog].forEach((r) => {
      if (norm(r.name).includes(term)) mergeInto(map, r.name, r);
    });
    COMMON_GROCERY_ITEMS.filter((n) => norm(n).includes(term))
      .slice(0, 20)
      .forEach((n) => mergeInto(map, n, { source: 'catalog' }));
    const rows = [...map.values()];
    rows.sort((a, b) => {
      const ap = norm(a.name).startsWith(term), bp = norm(b.name).startsWith(term);
      if (ap !== bp) return ap ? -1 : 1;
      const rank = { store: 0, yours: 1, due: 2, low: 3, frequent: 4, recurring: 5, popular: 6, catalog: 7 };
      return (rank[a.source] ?? 8) - (rank[b.source] ?? 8) || a.name.localeCompare(b.name);
    });
    return rows.slice(0, 48);
  }, [search, remote, picks, catalog]);

  const searching = search.trim().length >= 2;
  const exactMatch = searching && searchRows.some((r) => norm(r.name) === norm(search));
  const rows = searching ? searchRows : tab === 'picks' ? picks : tab === 'catalog' ? catalog : [];

  // ---- Tray --------------------------------------------------------------

  const inTray = (name) => tray.some((t) => norm(t.name) === norm(name));

  const toggle = useCallback((row, icon) => {
    const name = row.name || row;
    setTray((prev) => {
      if (prev.some((t) => norm(t.name) === norm(name))) {
        return prev.filter((t) => norm(t.name) !== norm(name));
      }
      playSound('pop');
      return [...prev, {
        name: name.trim(),
        icon: icon || row.icon || detectIcon(name) || '🛒',
        quantity: 1,
        unit: '',
        source: row.source || 'new',
      }];
    });
  }, []);

  const stepTray = (name, d) =>
    setTray((prev) => prev
      .map((t) => norm(t.name) === norm(name) ? { ...t, quantity: Math.max(1, t.quantity + d) } : t));

  const removeTray = (name) =>
    setTray((prev) => prev.filter((t) => norm(t.name) !== norm(name)));

  // Lazy estimate: when the tray changes, price the top items (cap 6 calls)
  useEffect(() => {
    let alive = true;
    (async () => {
      const prices = await Promise.all(
        tray.slice(0, 6).map(async (t) => {
          const p = await getPriceEstimate(t.name);
          const val = p?.price ?? p?.estimated_price ?? null;
          return val != null ? val * t.quantity : null;
        })
      );
      if (!alive) return;
      const nums = prices.filter((n) => n != null);
      setEstTotal(nums.length ? nums.reduce((a, b) => a + b, 0) : null);
    })();
    return () => { alive = false; };
  }, [tray]);

  const commit = async () => {
    if (!tray.length || committing) return;
    setCommitting(true);
    try {
      onAddItems(tray.map((t) => ({
        name: t.name, quantity: t.quantity, unit: t.unit, icon: t.icon,
      })));
      // Fire-and-forget learning — shortcut adds count as explicit intent
      tray.forEach((t) => trackItem({
        itemName: t.name, quantity: t.quantity, unit: t.unit,
        store, wasSuggestion: t.source !== 'new',
      }));
      playSound('check');
      setTray([]);
      onClose();
    } finally {
      setCommitting(false);
    }
  };

  const applySet = async (tpl) => {
    if (setBusy) return;
    setSetBusy(tpl.id);
    try {
      const { data } = await shoppingAPI.getTemplateItems(tpl.id);
      (data || []).forEach((i) => {
        const name = i.item_name;
        if (!name) return;
        setTray((prev) => prev.some((t) => norm(t.name) === norm(name)) ? prev : [...prev, {
          name: name.trim(),
          icon: i.item_icon || detectIcon(name) || '🛒',
          quantity: i.quantity || 1,
          unit: i.unit || '',
          source: 'catalog',
        }]);
      });
      playSound('pop');
    } catch { /* silent — sets are optional */ }
    finally { setSetBusy(null); }
  };

  // Enter stages the typed term (or its exact match); Enter with an empty
  // search commits the whole tray. Escape clears, then closes.
  const onKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const term = search.trim();
      if (term) {
        const match = searchRows.find((r) => norm(r.name) === norm(term));
        toggle(match || { name: term, source: 'new' }, match?.icon || null);
        setSearch('');
      } else if (tray.length) {
        commit();
      }
    } else if (e.key === 'Escape') {
      search ? setSearch('') : onClose();
    }
  };

  const sourceBadge = (s) => SOURCE_BADGE[s] || SOURCE_BADGE.catalog;

  // ---- Render ------------------------------------------------------------

  return (
    <Portal>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/10"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24, rotateX: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 16, rotateX: -6 }}
              transition={{ type: 'spring', stiffness: 280, damping: 26 }}
              style={{ transformPerspective: 900 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onKey}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-5 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center shadow-inner">
                      <Zap className="w-5 h-5 text-yellow-300" fill="currentColor" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white leading-tight">Item Shortcuts</h2>
                      <p className="text-xs text-indigo-100">
                        Tap to stage · Enter adds your search ·{' '}
                        <kbd className="px-1 py-0.5 rounded bg-white/20 text-[10px] font-mono">/</kbd> opens this anywhere
                      </p>
                    </div>
                  </div>
                  <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white/80">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search */}
                <div className="relative mt-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-200" />
                  <input
                    ref={searchRef}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search learned + unlearned items…"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/15 placeholder-indigo-200 text-white text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur"
                  />
                  {search && (
                    <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-indigo-200 hover:text-white">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Tabs */}
                <div className="flex gap-1.5 mt-3">
                  {TABS.map(({ id, label, icon: TIcon }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        tab === id ? 'bg-white text-indigo-700 shadow' : 'text-indigo-100 hover:bg-white/15'
                      }`}
                    >
                      <TIcon className="w-3.5 h-3.5" /> {label}
                      {id === 'sets' && sets.length > 0 && (
                        <span className="text-[10px] opacity-70">({sets.length})</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-2">
                    <Loader2 className="w-7 h-7 animate-spin" />
                    <span className="text-xs">Learning what you buy…</span>
                  </div>
                ) : tab === 'sets' && !searching ? (
                  /* ---- Saved sets (the old templates, folded in) ---- */
                  sets.length === 0 ? (
                    <div className="text-center py-14 text-gray-400">
                      <BookmarkCheck className="w-10 h-10 mx-auto mb-3 opacity-40" />
                      <p className="font-medium text-sm">No saved sets yet</p>
                      <p className="text-xs mt-1">Use “Save as Template” on a list — it shows up here.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {sets.map((tpl, i) => (
                        <motion.div
                          key={tpl.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.4), type: 'spring', stiffness: 300, damping: 24 }}
                          className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 flex items-center gap-3 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                            <BookmarkCheck className="w-5 h-5 text-indigo-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{tpl.name}</p>
                            <p className="text-xs text-gray-400">{tpl.item_count} items</p>
                          </div>
                          <button
                            onClick={() => applySet(tpl)}
                            disabled={setBusy === tpl.id}
                            className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 disabled:opacity-50 flex items-center gap-1"
                          >
                            {setBusy === tpl.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Stage
                          </button>
                        </motion.div>
                      ))}
                    </div>
                  )
                ) : rows.length === 0 && !searching ? (
                  <div className="text-center py-14 text-gray-400">
                    <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="font-medium text-sm">No shortcuts yet</p>
                    <p className="text-xs mt-1">Type any item name — even brand-new ones — and hit Enter.</p>
                  </div>
                ) : (
                  <>
                    {searching && (
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                        {rows.length} match{rows.length === 1 ? '' : 'es'}
                      </p>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5" style={{ perspective: 800 }}>
                      {/* Unlearned item — "just shortcut it" */}
                      {searching && !exactMatch && (
                        <motion.button
                          key="__new__"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          whileHover={{ y: -3 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => { toggle({ name: search.trim(), source: 'new' }, null); setSearch(''); }}
                          className="rounded-xl border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 p-3 text-left hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center"><Plus className="w-4 h-4" /></span>
                            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-500">Shortcut it</span>
                          </div>
                          <p className="mt-2 text-sm font-bold text-indigo-700 dark:text-indigo-300 truncate">“{search.trim()}”</p>
                          <p className="text-[10px] text-indigo-400 mt-0.5">brand-new item</p>
                        </motion.button>
                      )}

                      {rows.map((row, i) => {
                        const name = row.name;
                        const k = norm(name);
                        const icon = row.icon || detectIcon(name) || '🛒';
                        const selected = inTray(name);
                        const badge = sourceBadge(row.source);
                        const already = onList.has(k);
                        return (
                          <motion.button
                            key={k}
                            layout
                            initial={{ opacity: 0, y: 14, rotateX: -25 }}
                            animate={{ opacity: 1, y: 0, rotateX: 0 }}
                            transition={{ delay: Math.min(i * 0.015, 0.45), type: 'spring', stiffness: 320, damping: 24 }}
                            whileHover={{ y: -3, rotateX: 4 }}
                            whileTap={{ scale: 0.93 }}
                            onClick={() => toggle(row, icon)}
                            className={`relative rounded-xl border-2 p-3 text-left select-none transition-colors ${
                              selected
                                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 ring-2 ring-indigo-300 dark:ring-indigo-600'
                                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 hover:border-indigo-300 dark:hover:border-indigo-600'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <span className="text-2xl leading-none">{icon}</span>
                              <AnimatePresence>
                                {selected && (
                                  <motion.span
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0 }}
                                    className="w-5 h-5 rounded-full bg-indigo-500 text-white flex items-center justify-center shadow"
                                  >
                                    <Check className="w-3 h-3" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <p className="mt-2 text-xs font-semibold leading-tight text-gray-900 dark:text-white truncate" title={name}>
                              {name}
                            </p>
                            <div className="flex items-center gap-1 mt-1 min-h-[16px]">
                              {badge.label && (
                                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${badge.cls}`}>
                                  {badge.label}
                                </span>
                              )}
                              {already && (
                                <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                                  on list
                                </span>
                              )}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Staging tray */}
              <AnimatePresence>
                {tray.length > 0 && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                    className="border-t border-gray-200 dark:border-gray-700 bg-gray-50/95 dark:bg-gray-800/95 backdrop-blur px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto py-1">
                        {tray.map((t) => (
                          <motion.div
                            key={norm(t.name)}
                            layout
                            initial={{ scale: 0.6, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.6, opacity: 0 }}
                            className="flex items-center gap-1 shrink-0 pl-1.5 pr-1 py-1 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 shadow-sm"
                          >
                            <span className="text-sm">{t.icon}</span>
                            <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 max-w-[90px] truncate">{t.name}</span>
                            <button onClick={() => stepTray(t.name, -1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-300 w-4 text-center">{t.quantity}</span>
                            <button onClick={() => stepTray(t.name, 1)} className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500">
                              <Plus className="w-3 h-3" />
                            </button>
                            <button onClick={() => removeTray(t.name)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/40 text-gray-400 hover:text-red-500">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </motion.div>
                        ))}
                      </div>
                      {estTotal != null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                          ≈ <span className="font-bold text-gray-800 dark:text-gray-200">{fmtPrice(estTotal)}</span>
                        </span>
                      )}
                      <motion.button
                        onClick={commit}
                        disabled={committing}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-sm font-bold shadow-lg disabled:opacity-60"
                      >
                        {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                        Add {tray.reduce((n, t) => n + t.quantity, 0)}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default ItemShortcut;
