import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Package, Check, Loader2, Sparkles, ChevronUp, ChevronDown, Minus, Plus, Send, Download, Ghost } from 'lucide-react';
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

// Units offered by the amount editor — weight, volume, and packaging-ish counts
const UNITS = ['ct', 'pc', 'cup', 'tbsp', 'tsp', 'oz', 'fl oz', 'lb', 'g', 'kg', 'ml', 'L', 'pt', 'qt', 'gal', 'stick', 'jar', 'can', 'pkg', 'box', 'bag', 'bunch', 'clove', 'slice', 'dozen', 'pinch'];

// Kitchen utilities — "do you have access to…" toggles shared across labs.
// Staple ingredients map onto these instead of living in inventory.
const ACCESS = [
  { id: 'sink',      label: 'Sink',      emoji: '🚰' },
  { id: 'stove',     label: 'Stove',     emoji: '🔥' },
  { id: 'oven',      label: 'Oven',      emoji: '♨️' },
  { id: 'freezer',   label: 'Freezer',   emoji: '🧊' },
  { id: 'microwave', label: 'Microwave', emoji: '📡' },
];

// Ingredient name -> utility that covers it (tap the tile to flip the utility)
const stapleAccessFor = (name) => {
  const n = name.toLowerCase();
  if (/\bice\b|ice cubes?|crushed ice/.test(n)) return 'freezer';
  if (/water/.test(n)) return 'sink';
  return null;
};

// Right-click menu choices
const ICON_CHOICES = ['🧂','🫙','🥫','🥬','🧄','🧅','🍯','🥛','🧈','🥚','🍋','🌶️','🌿','🍇','🥕','🍞','🧊','🍫'];
const BADGES = { seasoning: '🧂', fresh: '🥬', jarred: '🫙', canned: '🥫', frozen: '❄️', spice: '🌶️' };
const OTHER_LABS = ['Mix Lab', 'Meal Lab', 'Smoothie Lab', 'Jam Lab', 'Dough Lab', 'Canning Lab'];

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
  const [drafts, setDrafts] = useState({}); // key -> { qty?, est?, used? } inline edit buffers
  const [access, setAccess] = useState(() => {
    try { return JSON.parse(localStorage.getItem('labKitchenAccess')) || {}; } catch { return {}; }
  });
  const extrasKey = `labPickerExtras:${title}`;
  const [extras, setExtras] = useState(() => {
    try { return JSON.parse(localStorage.getItem(extrasKey)) || []; } catch { return []; }
  });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newUnit, setNewUnit] = useState('');

  // Per-lab hidden/ghost state + global icon & badge overrides (localStorage)
  const hiddenKey = `labPickerHidden:${title}`;
  const [hidden, setHidden] = useState(() => {
    try { return JSON.parse(localStorage.getItem(hiddenKey)) || {}; } catch { return {}; }
  });
  const [iconMap, setIconMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('labPickerIcons')) || {}; } catch { return {}; }
  });
  const [badgeMap, setBadgeMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('labPickerBadges')) || {}; } catch { return {}; }
  });
  const [menu, setMenu] = useState(null);        // { x, y, row } tile context menu
  const [iconPicking, setIconPicking] = useState(null); // row whose icon grid is open
  const [hiddenOpen, setHiddenOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentMsg, setSentMsg] = useState('');

  const setHiddenFor = (name, mode) => setHidden((p) => {
    const next = { ...p };
    if (mode) next[invKey(name)] = mode; else delete next[invKey(name)];
    localStorage.setItem(hiddenKey, JSON.stringify(next));
    return next;
  });

  const setIconFor = (name, emoji) => setIconMap((p) => {
    const next = { ...p };
    if (emoji) next[invKey(name)] = emoji; else delete next[invKey(name)];
    localStorage.setItem('labPickerIcons', JSON.stringify(next));
    return next;
  });

  const setBadgeFor = (name, badge) => setBadgeMap((p) => {
    const next = { ...p };
    if (badge) next[invKey(name)] = badge; else delete next[invKey(name)];
    localStorage.setItem('labPickerBadges', JSON.stringify(next));
    return next;
  });

  const toggleAccess = (id) => setAccess((p) => {
    const next = { ...p, [id]: !p[id] };
    localStorage.setItem('labKitchenAccess', JSON.stringify(next));
    return next;
  });

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

  // Recipe ingredients + user-added extras (deduped by name)
  const allItems = useMemo(() => {
    const known = new Set(items.map((i) => invKey(i.name)));
    return [
      ...items,
      ...extras.filter((n) => n && !known.has(invKey(n))).map((n) => ({ name: n, isExtra: true })),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, extras]);

  // Merge picker items with inventory state
  const rows = useMemo(() => allItems.map((it) => {
    const inv = inventory[invKey(it.name)] || null;
    const qty = inv ? parseFloat(inv.current_quantity) || 0 : 0;
    const owned = qty > 0;
    const tracked = !!inv;
    const est = inv ? parseFloat(inv.estimated_quantity) || 0 : 0;
    const estPct = est > 0 && owned ? Math.max(0, Math.min(100, Math.round((qty / est) * 100))) : null;
    const fillPct = owned
      ? (estPct !== null ? Math.max(estPct, 3) : inv.fill_level ? FILL_PCT[inv.fill_level] : (inv.percentage_left ?? 100))
      : 0;
    const stapleId = stapleAccessFor(it.name);
    const stapleCovered = !!(stapleId && access[stapleId]);
    const hiddenMode = hidden[invKey(it.name)] || null; // 'ghost' | 'hidden'
    return { ...it, inv, qty, est, estPct, owned, tracked, fillPct, stapleId, stapleCovered, hiddenMode };
  }), [allItems, inventory, access, hidden]);

  const isCovered = (r) => r.owned || r.stapleCovered;
  const stocked = rows.filter((r) => isCovered(r) && r.hiddenMode !== 'hidden').length;
  // Staples are utility-covered, never bulk-stocked; hidden rows excluded
  const missingRows = rows.filter((r) => !r.owned && !r.stapleId && !r.hiddenMode);
  const hiddenRows = rows.filter((r) => r.hiddenMode);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows
      .filter((r) => r.hiddenMode !== 'hidden')
      .filter((r) => (filter === 'have' ? isCovered(r) : filter === 'missing' ? !isCovered(r) : true))
      .filter((r) => !term || r.name.toLowerCase().includes(term));
  }, [rows, search, filter]);

  const notify = () => onChanged && onChanged();

  // Custom ingredient — created in inventory and remembered for this lab
  const addIngredient = async () => {
    const name = newName.trim();
    if (!name) return;
    const key = invKey(name);
    const qty = parseFloat(newQty) || 1;
    try {
      const { data } = await api.post('/inventory', {
        item_name: name,
        quantity: qty,
        unit: newUnit || '',
        storage_location: 'pantry',
      });
      setInventory((p) => ({ ...p, [key]: data }));
      if (!extras.includes(name) && !items.some((i) => invKey(i.name) === key)) {
        const next = [...extras, name];
        setExtras(next);
        localStorage.setItem(extrasKey, JSON.stringify(next));
      }
      setNewName(''); setNewQty(''); setNewUnit(''); setAdding(false);
      notify();
    } catch { /* leave form open */ }
  };

  const removeExtra = (name) => {
    const next = extras.filter((n) => n !== name);
    setExtras(next);
    localStorage.setItem(extrasKey, JSON.stringify(next));
  };

  // Push this ingredient's name onto another lab's extras list
  const sendToLab = (labTitle, name) => {
    const key = `labPickerExtras:${labTitle}`;
    let list = [];
    try { list = JSON.parse(localStorage.getItem(key)) || []; } catch { /* ignore */ }
    if (!list.includes(name)) {
      list = [...list, name];
      localStorage.setItem(key, JSON.stringify(list));
    }
  };

  // Pull every name another lab added to its own extras into this lab
  const importFromLabs = () => {
    const known = new Set(allItems.map((i) => invKey(i.name)));
    const found = [];
    Object.keys(localStorage)
      .filter((k) => k.startsWith('labPickerExtras:') && k !== extrasKey)
      .forEach((k) => {
        try {
          (JSON.parse(localStorage.getItem(k)) || []).forEach((n) => {
            if (n && !known.has(invKey(n)) && !found.some((f) => invKey(f) === invKey(n))) found.push(n);
          });
        } catch { /* ignore */ }
      });
    if (found.length) {
      const next = [...extras, ...found];
      setExtras(next);
      localStorage.setItem(extrasKey, JSON.stringify(next));
    }
    setSentMsg(found.length ? `Imported ${found.length} ingredient${found.length > 1 ? 's' : ''}` : 'Nothing new in other labs');
    setTimeout(() => setSentMsg(''), 3500);
  };

  // Push every unstocked (non-staple, unhidden) ingredient to this lab's list
  const sendToLabList = async () => {
    const targets = rows.filter((r) => !isCovered(r) && !r.hiddenMode && !r.stapleId);
    if (!targets.length) { setSentMsg('Everything is stocked'); setTimeout(() => setSentMsg(''), 3000); return; }
    setSending(true);
    try {
      const { data: lists } = await api.get('/shopping/lists');
      let list = (lists || []).find((l) => l.list_type === 'lab' && l.name === `${title} List` && l.status !== 'completed');
      if (!list) {
        const { data: created } = await api.post('/shopping/lists', { name: `${title} List`, list_type: 'lab' });
        list = created;
      }
      for (const r of targets) {
        // eslint-disable-next-line no-await-in-loop
        await api.post(`/shopping/lists/${list.id}/items`, {
          itemName: r.name,
          quantity: r.neededQty || 1,
          unit: r.neededUnit || '',
          icon: iconMap[invKey(r.name)] || r.icon || detectIcon(r.name) || defaultEmoji,
        });
      }
      setSentMsg(`Sent ${targets.length} to ${list.name}`);
    } catch {
      setSentMsg('Could not send to list');
    } finally {
      setSending(false);
      setTimeout(() => setSentMsg(''), 4000);
    }
  };

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
      setDrafts((p) => { const d = { ...p }; delete d[key]; return d; });
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

  // --- Amount editing --------------------------------------------------
  const setDraft = (key, field, value) =>
    setDrafts((p) => ({ ...p, [key]: { ...(p[key] || {}), [field]: value } }));

  // One commit path for qty/unit/est — drafts merged over current values
  const commitAmount = async (row, fields = {}) => {
    if (!row.inv) return;
    const key = invKey(row.name);
    const d = drafts[key] || {};
    const quantity = fields.quantity !== undefined
      ? fields.quantity
      : (d.qty !== undefined ? parseFloat(d.qty) || 0 : row.qty);
    const unit = fields.unit !== undefined ? fields.unit : (row.inv.unit || '');
    const estimated_quantity = fields.estimated_quantity !== undefined
      ? fields.estimated_quantity
      : (d.est !== undefined ? parseFloat(d.est) || null : row.inv.estimated_quantity ?? null);
    try {
      await api.patch(`/inventory/${row.inv.id}`, { quantity, unit, estimated_quantity });
      setInventory((p) => ({ ...p, [key]: { ...p[key], current_quantity: quantity, unit, estimated_quantity } }));
      setDrafts((p) => { const next = { ...p }; delete next[key]; return next; });
      notify();
    } catch { /* draft stays so the user can retry */ }
  };

  const stepQty = (row, delta) =>
    commitAmount(row, { quantity: Math.max(0, Math.round((row.qty + delta) * 100) / 100) });

  const applyUsed = (row) => {
    const used = parseFloat((drafts[invKey(row.name)] || {}).used);
    if (!used || used <= 0) return;
    commitAmount(row, { quantity: Math.max(0, Math.round((row.qty - used) * 100) / 100) });
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
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50"
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
                    {stocked} of {rows.length} stocked — tap to toggle, arrows & inputs track amounts
                  </p>
                  {rows.length > 0 && (
                    <div className="h-1 mt-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                      <motion.div
                        initial={false}
                        animate={{ width: `${Math.round((stocked / rows.length) * 100)}%` }}
                        className={`h-full rounded-full bg-gradient-to-r ${a.bar}`}
                      />
                    </div>
                  )}
                </div>
                <button
                  onClick={importFromLabs}
                  title="Import ingredients added in other labs"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"
                >
                  <Download className="w-4 h-4" />
                </button>
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

              {/* Kitchen access — utilities that auto-cover staples like water/ice */}
              <div className="flex items-center gap-1.5 px-5 pb-3 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mr-1">Kitchen</span>
                {ACCESS.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    onClick={() => toggleAccess(id)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors ${
                      access[id]
                        ? `${a.chip} text-white border-transparent`
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {emoji} {label}
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
                      const icon = iconMap[key] || row.inv?.item_icon || row.icon || detectIcon(row.name) || defaultEmoji;
                      const ghosted = row.hiddenMode === 'ghost';
                      return (
                        <motion.div
                          key={row.name}
                          layout
                          initial={{ opacity: 0, y: 18, rotateX: -35 }}
                          animate={{ opacity: 1, y: 0, rotateX: 0 }}
                          transition={{ delay: Math.min(i * 0.02, 0.5), type: 'spring', stiffness: 300, damping: 22 }}
                          whileHover={ghosted ? undefined : { y: -3, rotateX: 4 }}
                          whileTap={ghosted ? undefined : { scale: 0.94 }}
                          onClick={() => {
                            if (ghosted) return;
                            if (row.stapleId) toggleAccess(row.stapleId); else toggle(row);
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenu({ x: e.clientX, y: e.clientY, row });
                            setIconPicking(null);
                          }}
                          className={`relative overflow-hidden rounded-xl border-2 p-3 text-left select-none transition-colors ${
                            ghosted
                              ? 'opacity-45 grayscale border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/40 cursor-default'
                              : 'cursor-pointer'
                          } ${
                            row.owned || row.stapleCovered
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
                              <span className="text-2xl leading-none">
                                {row.stapleId ? ACCESS.find((x) => x.id === row.stapleId)?.emoji : icon}
                              </span>
                              {busy.has(key) ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
                              ) : row.owned || row.stapleCovered ? (
                                <Check className={`w-4 h-4 ${a.text}`} />
                              ) : row.isExtra ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeExtra(row.name); }}
                                  title="Remove from this lab's list"
                                  className="text-gray-300 dark:text-gray-600 hover:text-red-500"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                            <p className={`mt-2 text-xs font-semibold leading-tight flex items-center gap-1 ${
                              row.owned ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                            }`}>
                              <span className="truncate">{row.name}</span>
                              {badgeMap[key] && <span title={badgeMap[key]}>{BADGES[badgeMap[key]]}</span>}
                              {ghosted && <Ghost className="w-3 h-3 text-gray-400 shrink-0" />}
                            </p>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate">
                              {row.stapleId
                                ? `${ACCESS.find((x) => x.id === row.stapleId)?.label} ${row.stapleCovered ? 'on' : '— tap if you have one'}`
                                : row.owned
                                ? `${row.qty}${row.inv?.unit ? ` ${row.inv.unit}` : ''}${row.estPct !== null ? ` · ${row.estPct}%` : ''}${row.inv?.custom_location_name ? ` · ${row.inv.custom_location_name}` : row.inv?.storage_location ? ` · ${row.inv.storage_location}` : ''}`
                                : row.tracked
                                ? 'tracked — tap to restock'
                                : 'tap to stock'}
                            </p>

                            {/* Amount controls — how much do I have */}
                            {row.owned && !ghosted && (
                              <div className="mt-2 space-y-1.5" onClick={(e) => e.stopPropagation()}>
                                {/* % remaining bar when an estimate exists */}
                                {row.estPct !== null && (
                                  <div>
                                    <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                      <motion.div
                                        initial={false}
                                        animate={{ width: `${row.estPct}%` }}
                                        className={`h-full rounded-full bg-gradient-to-r ${a.bar}`}
                                      />
                                    </div>
                                    <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">{row.estPct}% left</p>
                                  </div>
                                )}

                                {/* qty stepper + unit */}
                                <div className="flex items-center gap-1">
                                  <button onClick={() => stepQty(row, -1)} title="Decrease" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                                    <ChevronDown className="w-3.5 h-3.5" />
                                  </button>
                                  <input
                                    type="number" min="0" step="any"
                                    value={(drafts[key] || {}).qty ?? row.qty}
                                    onChange={(e) => setDraft(key, 'qty', e.target.value)}
                                    onBlur={() => commitAmount(row)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                    className="w-10 px-0.5 py-0.5 text-center text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                                  />
                                  <button onClick={() => stepQty(row, 1)} title="Increase" className="p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500">
                                    <ChevronUp className="w-3.5 h-3.5" />
                                  </button>
                                  <select
                                    value={row.inv?.unit || ''}
                                    onChange={(e) => commitAmount(row, { unit: e.target.value })}
                                    className="flex-1 min-w-0 px-1 py-0.5 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                  >
                                    <option value="">unit</option>
                                    {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                                  </select>
                                </div>

                                {/* est + used + fill dots */}
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number" min="0" step="any" placeholder="est"
                                    title="Estimated full amount (for % left)"
                                    value={(drafts[key] || {}).est ?? (row.inv?.estimated_quantity ?? '')}
                                    onChange={(e) => setDraft(key, 'est', e.target.value)}
                                    onBlur={() => commitAmount(row)}
                                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                                    className="w-11 px-1 py-0.5 text-center text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                  />
                                  <input
                                    type="number" min="0" step="any" placeholder="used"
                                    title="Amount you used — subtracts from quantity"
                                    value={(drafts[key] || {}).used ?? ''}
                                    onChange={(e) => setDraft(key, 'used', e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && applyUsed(row)}
                                    className="w-11 px-1 py-0.5 text-center text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                                  />
                                  <button onClick={() => applyUsed(row)} title="Subtract used amount" className={`p-1 rounded text-white ${a.chip} hover:opacity-90`}>
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <div className="flex items-center gap-1 ml-auto">
                                    {FILL_ORDER.map((lvl) => (
                                      <button
                                        key={lvl}
                                        onClick={() => setFill(row, lvl)}
                                        title={lvl}
                                        className={`h-1.5 rounded-full transition-all ${
                                          (row.inv?.fill_level || 'full') === lvl
                                            ? `w-4 ${a.chip}`
                                            : 'w-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Add custom ingredient */}
                    {adding ? (
                      <div className="col-span-2 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-3 space-y-2">
                        <input
                          autoFocus
                          value={newName}
                          onChange={(e) => setNewName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                          placeholder="Ingredient name…"
                          className="w-full px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="number" min="0" step="any"
                            value={newQty}
                            onChange={(e) => setNewQty(e.target.value)}
                            placeholder="qty"
                            className="w-14 px-1.5 py-1 text-center text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          />
                          <select
                            value={newUnit}
                            onChange={(e) => setNewUnit(e.target.value)}
                            className="flex-1 px-1 py-1 text-[10px] rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                          >
                            <option value="">unit</option>
                            {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <button
                            onClick={addIngredient}
                            className={`px-3 py-1 rounded-lg text-[10px] font-semibold text-white ${a.chip} hover:opacity-90`}
                          >
                            Add
                          </button>
                          <button
                            onClick={() => { setAdding(false); setNewName(''); setNewQty(''); setNewUnit(''); }}
                            className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <motion.div
                        layout
                        whileHover={{ y: -3, rotateX: 4 }}
                        whileTap={{ scale: 0.94 }}
                        onClick={() => setAdding(true)}
                        className="rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 p-3 cursor-pointer select-none flex flex-col items-center justify-center gap-1 text-gray-400 min-h-[96px]"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-[10px] font-semibold">Add ingredient</span>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Hidden & ghosted — bring back later */}
              {hiddenRows.length > 0 && (
                <div className="px-5 pb-2">
                  <button
                    onClick={() => setHiddenOpen((o) => !o)}
                    className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {hiddenOpen ? '▾' : '▸'} Hidden & ghosted ({hiddenRows.length})
                  </button>
                  {hiddenOpen && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {hiddenRows.map((r) => (
                        <span key={r.name} className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-300">
                          {r.hiddenMode === 'ghost' ? '👻' : '🚫'} {r.name}
                          <button
                            onClick={() => setHiddenFor(r.name, null)}
                            title="Bring back"
                            className="text-gray-400 hover:text-green-500 font-bold"
                          >
                            ↩
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {sentMsg && (
                <div className="px-5 pb-2">
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{sentMsg}</p>
                </div>
              )}

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
                  <button
                    onClick={sendToLabList}
                    disabled={sending}
                    title={`Send ${missingRows.length} unstocked to ${title} List`}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900 hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    {sending ? 'Sending…' : 'Send to lab list'}
                  </button>
                </div>
              )}
            </motion.div>

            {/* Tile context menu — icon, badge, hide, send-to-lab */}
            {menu && (
              <>
                <div
                  className="fixed inset-0 z-[120]"
                  onClick={() => { setMenu(null); setIconPicking(null); }}
                  onContextMenu={(e) => { e.preventDefault(); setMenu(null); setIconPicking(null); }}
                />
                <div
                  className="fixed z-[121] w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl py-1.5 max-h-[70vh] overflow-y-auto"
                  style={{
                    left: Math.min(menu.x, window.innerWidth - 240),
                    top: Math.min(menu.y, window.innerHeight - 300),
                  }}
                >
                  <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wide text-gray-400 truncate border-b border-gray-100 dark:border-gray-700">
                    {menu.row.name}
                  </p>
                  {iconPicking ? (
                    <div className="grid grid-cols-6 gap-0.5 p-1.5">
                      {ICON_CHOICES.map((em) => (
                        <button
                          key={em}
                          className="text-lg rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          onClick={() => { setIconFor(menu.row.name, em); setMenu(null); setIconPicking(null); }}
                        >
                          {em}
                        </button>
                      ))}
                      <button
                        className="col-span-6 text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 py-1"
                        onClick={() => { setIconFor(menu.row.name, null); setMenu(null); setIconPicking(null); }}
                      >
                        Reset icon
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => setIconPicking(menu.row)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                      >
                        🎨 Change icon
                      </button>
                      <div className="px-3 py-1">
                        <p className="text-[9px] uppercase tracking-wide text-gray-400 mb-1">Badge</p>
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(BADGES).map(([id, em]) => (
                            <button
                              key={id}
                              onClick={() => { setBadgeFor(menu.row.name, badgeMap[invKey(menu.row.name)] === id ? null : id); setMenu(null); }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                badgeMap[invKey(menu.row.name)] === id
                                  ? `${a.chip} text-white`
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                              }`}
                            >
                              {em} {id}
                            </button>
                          ))}
                          <button
                            onClick={() => { setBadgeFor(menu.row.name, null); setMenu(null); }}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-400"
                          >
                            none
                          </button>
                        </div>
                      </div>
                      {menu.row.hiddenMode ? (
                        <button
                          onClick={() => { setHiddenFor(menu.row.name, null); setMenu(null); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                        >
                          ↩ Unhide / unghost
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => { setHiddenFor(menu.row.name, 'ghost'); setMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            👻 Ghost item (faded, stays visible)
                          </button>
                          <button
                            onClick={() => { setHiddenFor(menu.row.name, 'hidden'); setMenu(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"
                          >
                            🚫 Hide completely
                          </button>
                        </>
                      )}
                      <div className="px-3 py-1 border-t border-gray-100 dark:border-gray-700 mt-1">
                        <p className="text-[9px] uppercase tracking-wide text-gray-400 mb-1">Send to lab</p>
                        <div className="flex flex-wrap gap-1">
                          {OTHER_LABS.filter((t) => t !== title).map((t) => (
                            <button
                              key={t}
                              onClick={() => { sendToLab(t, menu.row.name); setMenu(null); }}
                              className="px-2 py-1 rounded-lg text-[10px] bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300"
                            >
                              {t.replace(' Lab', '')}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default LabPantryPicker;
