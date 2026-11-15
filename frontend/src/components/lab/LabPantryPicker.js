import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, Check, Loader2, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { detectIcon } from '../../utils/categoryDetector';
import { Portal } from '../../utils/autoPlacement';

/**
 * LabPantryPicker — shared "what do I have?" selector for every Homemade Lab.
 *
 * Popup grid of the ingredients a lab's recipes use. Tapping a tile toggles
 * it in home inventory — uncatalogued items get created on the spot, owned
 * items get zeroed (tracked, not deleted), tracked-but-empty items come back.
 * Owned tiles carry a jar-style fill bar driven by the fill-level endpoint,
 * so "how much do I have" is visible at a glance.
 *
 * Props:
 *  - open / onClose    : modal control
 *  - title             : lab name for the header ("Jam Lab")
 *  - accent            : 'pink' | 'orange' | 'green' | 'violet' | 'teal' | 'primary'
 *  - defaultEmoji      : fallback tile icon
 *  - items             : [{ name, icon?, neededQty?, neededUnit?, isStaple? }]
 *  - onChanged         : () => void — parent reloads inventory comparisons
 */

const FILL_PCT = { full: 100, half: 55, low: 20, empty: 4 };
const FILL_ORDER = ['full', 'half', 'low', 'empty'];
const FILL_LABEL = { full: 'F', half: 'H', low: 'L', empty: 'E' };

const ACCENT = {
  pink:    { tile: 'border-pink-400 dark:border-pink-600 bg-pink-50 dark:bg-pink-900/20',    bar: 'from-pink-400 to-rose-500',    text: 'text-pink-600 dark:text-pink-400',    chip: 'bg-pink-500' },
  orange:  { tile: 'border-orange-400 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20', bar: 'from-orange-400 to-amber-500', text: 'text-orange-600 dark:text-orange-400', chip: 'bg-orange-500' },
  green:   { tile: 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20',   bar: 'from-green-400 to-emerald-500', text: 'text-green-600 dark:text-green-400',   chip: 'bg-green-500' },
  violet:  { tile: 'border-violet-400 dark:border-violet-600 bg-violet-50 dark:bg-violet-900/20', bar: 'from-violet-400 to-purple-500', text: 'text-violet-600 dark:text-violet-400', chip: 'bg-violet-500' },
  teal:    { tile: 'border-teal-400 dark:border-teal-600 bg-teal-50 dark:bg-teal-900/20',      bar: 'from-teal-400 to-cyan-500',      text: 'text-teal-600 dark:text-teal-400',      chip: 'bg-teal-500' },
  primary: { tile: 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/20', bar: 'from-primary-400 to-primary-600', text: 'text-primary-600 dark:text-primary-400', chip: 'bg-primary-500' },
};

const LabPantryPicker = ({
  open,
  onClose,
  title = 'Lab',
  accent = 'orange',
  defaultEmoji = '🥣',
  items = [],
  onChanged,
}) => {
  const a = ACCENT[accent] || ACCENT.orange;
  const [inventory, setInventory] = useState({}); // lowerName -> merged inv row
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // all | have | missing
  const [stockingAll, setStockingAll] = useState(false);

  const invKey = (name) => name.trim().toLowerCase();

  const loadInventory = async () => {
    try {
      const { data } = await api.get('/inventory');
      // Multiple rows per name can exist (different locations) — merge them:
      // sum quantities, keep the fullest fill and first location seen.
      const map = {};
      (data || []).forEach((row) => {
        const k = invKey(row.item_name || '');
        if (!k) return;
        const prev = map[k];
        if (!prev) {
          map[k] = { ...row };
        } else {
          map[k] = {
            ...prev,
            current_quantity:
              (parseFloat(prev.current_quantity) || 0) + (parseFloat(row.current_quantity) || 0),
            fill_level:
              FILL_ORDER.indexOf(prev.fill_level) <= FILL_ORDER.indexOf(row.fill_level)
                ? prev.fill_level
                : row.fill_level,
          };
        }
      });
      setInventory(map);
    } catch {
      setInventory({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      setLoading(true);
      setSearch('');
      setFilter('all');
      loadInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Merge picker items with inventory state
  const rows = useMemo(() => items.map((it) => {
    const inv = inventory[invKey(it.name)] || null;
    const qty = inv ? parseFloat(inv.current_quantity) || 0 : 0;
    const owned = qty > 0;
    const tracked = !!inv;
    const fillPct = owned
      ? (inv.fill_level ? FILL_PCT[inv.fill_level] : (inv.percentage_left ?? 100))
      : 0;
    return { ...it, inv, qty, owned, tracked, fillPct };
  }), [items, inventory]);

  const stocked = rows.filter((r) => r.owned).length;
  const missingRows = rows.filter((r) => !r.owned);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => (filter === 'have' ? r.owned : filter === 'missing' ? !r.owned : true))
      .filter((r) => !term || r.name.toLowerCase().includes(term));
  }, [rows, search, filter]);

  const notify = () => onChanged && onChanged();

  const toggle = async (row) => {
    const key = invKey(row.name);
    if (busy.has(key)) return;
    setBusy((p) => new Set(p).add(key));
    try {
      if (!row.tracked) {
        // Not catalogued — create it in home inventory
        const { data } = await api.post('/inventory', {
          item_name: row.name,
          quantity: row.neededQty || 1,
          unit: row.neededUnit || '',
          storage_location: 'pantry',
        });
        setInventory((p) => ({ ...p, [key]: { ...data, current_quantity: row.neededQty || 1 } }));
      } else {
        const nextQty = row.owned ? 0 : (row.neededQty || 1);
        await api.patch(`/inventory/${row.inv.id}`, { quantity: nextQty });
        setInventory((p) => ({ ...p, [key]: { ...p[key], current_quantity: nextQty } }));
      }
      notify();
    } catch {
      // leave tile as-is; next open re-syncs
    } finally {
      setBusy((p) => { const s = new Set(p); s.delete(key); return s; });
    }
  };

  const setFill = async (row, level) => {
    if (!row.inv) return;
    setInventory((p) => ({ ...p, [invKey(row.name)]: { ...p[invKey(row.name)], fill_level: level } }));
    try {
      await api.patch(`/inventory/${row.inv.id}/fill-level`, { fill_level: level });
      notify();
    } catch { /* optimistic state stays */ }
  };

  const stockAll = async () => {
    setStockingAll(true);
    try {
      for (const row of missingRows) {
        // eslint-disable-next-line no-await-in-loop
        await toggle(row);
      }
    } finally {
      setStockingAll(false);
    }
  };

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, rotateX: -12, y: 24 }}
              animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, rotateX: -8, y: 16 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              style={{ transformPerspective: 900 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                <div className={`w-9 h-9 rounded-xl ${a.chip} flex items-center justify-center shadow`}>
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 dark:text-white truncate">My {title} Ingredients</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {stocked} of {rows.length} stocked — tap to toggle, fill dots set how much
                  </p>
                </div>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Search + filter */}
              <div className="flex items-center gap-2 px-5 py-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search ingredients…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                {['all', 'have', 'missing'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                      filter === f
                        ? `${a.chip} text-white`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto px-5 pb-4 min-h-0">
                {loading ? (
                  <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : visible.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 text-sm">
                    {rows.length === 0 ? 'No ingredients to track yet.' : 'Nothing matches this filter.'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3" style={{ perspective: 800 }}>
                    {visible.map((row, i) => {
                      const key = invKey(row.name);
                      const icon = row.inv?.item_icon || row.icon || detectIcon(row.name) || defaultEmoji;
                      return (
                        <motion.div
                          key={row.name}
                          layout
                          initial={{ opacity: 0, y: 18, rotateX: -35 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5), type: 'spring', stiffness: 300, damping: 22 }}
                          whileTap={{ scale: 0.94 }}
                          onClick={() => toggle(row)}
                          className={`relative overflow-hidden rounded-xl border-2 p-3 text-left cursor-pointer select-none transition-colors ${
                            row.owned
                              ? a.tile
                              : row.tracked
                              ? 'border-dashed border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-900/10'
                              : 'border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          {/* Jar fill */}
                          {row.owned && (
                            <motion.div
                              initial={false}
                              animate={{ height: `${row.fillPct}%` }}
                              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                              className={`absolute left-0 right-0 bottom-0 bg-gradient-to-t ${a.bar} opacity-20 pointer-events-none`}
                            />
                          )}

                          <div className="relative z-10">
                            <div className="flex items-start justify-between">
                              <span className="text-2xl leading-none">{icon}</span>
                              {busy.has(key) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              ) : row.owned ? (
                                <Check className={`w-4 h-4 ${a.text}`} />
                              ) : null}
                            </div>
                            <p className={`mt-2 text-xs font-semibold leading-tight ${
                              row.owned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              {row.name}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              {row.owned
                                ? `${row.qty}${row.inv?.unit ? ` ${row.inv.unit}` : ''}${row.inv?.custom_location_name ? ` · ${row.inv.custom_location_name}` : row.inv?.storage_location ? ` · ${row.inv.storage_location}` : ''}`
                                : row.tracked
                                ? 'tracked — tap to restock'
                                : 'tap to stock'}
                            </p>

                            {/* Fill dots — "how much do I have" */}
                            {row.owned && (
                              <div className="flex items-center gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                {FILL_ORDER.map((lvl) => (
                                  <button
                                    key={lvl}
                                    onClick={() => setFill(row, lvl)}
                                    title={lvl}
                                    className={`h-1.5 rounded-full transition-all ${
                                      (row.inv?.fill_level || 'full') === lvl
                                        ? `w-5 ${a.chip}`
                                        : 'w-2.5 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                                    }`}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer — bulk stock */}
              {missingRows.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {missingRows.length} ingredient{missingRows.length > 1 ? 's' : ''} not stocked
                  </span>
                  <button
                    onClick={stockAll}
                    disabled={stockingAll}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white ${a.chip} hover:opacity-90 disabled:opacity-50 transition-opacity`}
                  >
                    {stockingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {stockingAll ? 'Stocking…' : 'Stock all'}
                  </button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default LabPantryPicker;
