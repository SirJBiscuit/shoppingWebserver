import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, FlaskConical, ArrowLeft, Search, ChevronDown, Pencil, Loader2 } from 'lucide-react';
import LabPantryPicker from '../components/lab/LabPantryPicker';
import api from '../services/api';
import { createList, updateList } from '../api/shopping';
import { trackItem } from '../api/mdl';
import { detectIcon } from '../utils/categoryDetector';

/**
 * LabList — dedicated clean view for lab-type shopping lists.
 *
 * Lab lists are auto-created when a lab's pantry picker sends unstocked
 * ingredients to a list ("Jam Lab List", "Mix Lab List", …). This view is
 * intentionally stripped of dashboard widgets: just the ingredients, a
 * satisfying check-off, a theme picker, and a floating button that opens
 * the universal LabPantryPicker for this lab.
 *
 * The top bar is the unified ingredient entry point: it filters the list,
 * shows MDL autocomplete suggestions, adds items on Enter, and houses the
 * 🥬 button that opens the picker. Items show their MDL price — or an
 * "untrained" chip that opens a quick trainer writing to the shared items
 * dictionary.
 *
 * Props: list, items, onCheck(item), onDelete(id), onBack(), onRefresh(),
 *        labLists (all lab-type lists for the switcher), onSelectList(list)
 */

const THEMES = {
  violet:  { grad: 'from-violet-500 to-fuchsia-600',  chip: 'bg-violet-500',  ring: 'focus:ring-violet-400',  text: 'text-violet-600 dark:text-violet-400' },
  emerald: { grad: 'from-emerald-500 to-teal-600',    chip: 'bg-emerald-500', ring: 'focus:ring-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { grad: 'from-amber-500 to-orange-600',    chip: 'bg-amber-500',   ring: 'focus:ring-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
  rose:    { grad: 'from-rose-500 to-pink-600',       chip: 'bg-rose-500',    ring: 'focus:ring-rose-400',    text: 'text-rose-600 dark:text-rose-400' },
};

const fmtPrice = (n) => `$${parseFloat(n).toFixed(2)}`;

const LabList = ({ list, items = [], onCheck, onDelete, onBack, onRefresh, labLists = [], onSelectList }) => {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('labListTheme') || 'violet');
  const t = THEMES[themeId] || THEMES.violet;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');            // unified add + filter
  const [doneOpen, setDoneOpen] = useState(true);
  const [justChecked, setJustChecked] = useState(new Set());
  const [adding, setAdding] = useState(false);

  // MDL autocomplete + prices
  const [suggestions, setSuggestions] = useState([]);
  const [prices, setPrices] = useState({});          // itemName -> { avg, trained }
  const [trainFor, setTrainFor] = useState(null);    // item open in train popover
  const [trainIcon, setTrainIcon] = useState('');
  const [trainCategory, setTrainCategory] = useState('');
  const [trainLocation, setTrainLocation] = useState('');
  const [trainPrice, setTrainPrice] = useState('');
  const [trainBusy, setTrainBusy] = useState(false);
  const [trainNote, setTrainNote] = useState('');   // gate verdict feedback

  // List switcher / rename
  const [listMenu, setListMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const suggTimer = useRef(null);
  const labTitle = (list?.name || 'Lab').replace(/\s*list$/i, '').trim() || 'Lab';

  const { open, done } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (i) => i && (!q || (i.item_name || '').toLowerCase().includes(q));
    return {
      open: items.filter((i) => match(i) && !i.is_checked),
      done: items.filter((i) => match(i) && i.is_checked),
    };
  }, [items, query]);

  const total = open.length + done.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  // MDL autocomplete as the user types
  useEffect(() => {
    clearTimeout(suggTimer.current);
    const q = query.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    suggTimer.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/mdl/autocomplete', { params: { q } });
        setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch { setSuggestions([]); }
    }, 200);
    return () => clearTimeout(suggTimer.current);
  }, [query]);

  // MDL price lookups for open items (product_master_data.average_price)
  useEffect(() => {
    const names = [...new Set(open.map((i) => (i.item_name || '').toLowerCase()).filter(Boolean))];
    names.forEach(async (name) => {
      if (prices[name]) return;
      try {
        const { data } = await api.get('/mdl/search', { params: { q: name, limit: 3 } });
        const exact = (data || []).find((p) => (p.product_name || '').toLowerCase() === name) || (data || [])[0];
        const avg = exact?.average_price ?? exact?.default_price_low ?? null;
        setPrices((p) => ({ ...p, [name]: { avg, trained: avg != null } }));
      } catch {
        setPrices((p) => ({ ...p, [name]: { avg: null, trained: false } }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open.map((i) => i.item_name).join(',')]);

  const pickTheme = (id) => {
    setThemeId(id);
    localStorage.setItem('labListTheme', id);
  };

  const check = (item) => {
    // Pop animation flag so the circle fills with a spring before the row sinks
    if (!item.is_checked) {
      setJustChecked((p) => new Set(p).add(item.id));
      setTimeout(() => setJustChecked((p) => { const s = new Set(p); s.delete(item.id); return s; }), 900);
    }
    onCheck && onCheck(item);
  };

  // Add an item — from Enter or an MDL suggestion (carries its trained icon/category)
  const addItem = async (name, icon, category) => {
    const n = (name || '').trim();
    if (!n || adding) return;
    setAdding(true);
    try {
      await api.post(`/shopping/lists/${list.id}/items`, {
        itemName: n,
        quantity: 1,
        unit: '',
        icon: icon || detectIcon(n) || '🧪',
        category: category || undefined,
      });
      setQuery('');
      setSuggestions([]);
      onRefresh && onRefresh();
    } catch { /* leave input */ } finally {
      setAdding(false);
    }
  };

  const remove = async (item) => {
    onDelete && onDelete(item.id);
  };

  // Train an item — writes icon + price to the shared items dictionary
  // and onto this list row
  const saveTraining = async () => {
    if (!trainFor || trainBusy) return;
    setTrainBusy(true);
    const name = trainFor.item_name;
    const ic = trainIcon.trim() || detectIcon(name) || null;
    const cat = trainCategory.trim() || null;
    const loc = trainLocation || null;
    const pr = trainPrice.trim() ? parseFloat(trainPrice) : null;
    try {
      await api.post('/items', { name, icon: ic, category: cat, price: pr, storage_location: loc });
      // Submit to the global MDL quality gate. Verdicts: 'accept'/'known'
      // reach the catalog now; 'pending' waits for another user's
      // confirmation or admin review; 'rejected'/'blocked' is dropped.
      const tracked = await trackItem({
        itemName: name, price: pr, category: cat, icon: ic,
        quantity: trainFor.quantity || 1, unit: trainFor.unit || null,
        source: 'lab_trainer'
      });
      const q = tracked?.quality;
      const note = q === 'pending'
        ? 'Saved — sent for review before it joins global suggestions.'
        : q === 'auto_confirmed'
          ? 'Saved — confirmed by another user, now global.'
          : '';
      setTrainNote(note);
      await api.patch(`/shopping/lists/${list.id}/items/${trainFor.id}`, {
        ...(ic ? { item_icon: ic } : {}),
        ...(cat ? { category: cat } : {}),
        ...(pr != null ? { price: pr } : {}),
      });
      setPrices((p) => ({ ...p, [name.toLowerCase()]: { avg: pr ?? p[name.toLowerCase()]?.avg ?? null, trained: true } }));
      // Keep the popover open a moment so the review note is actually seen
      setTimeout(() => setTrainFor(null), note ? 1800 : 0);
      onRefresh && onRefresh();
    } catch { /* keep popover open */ } finally {
      setTrainBusy(false);
    }
  };

  const openTrain = (item) => {
    setTrainFor(item);
    setTrainNote('');
    setTrainIcon(item.item_icon || '');
    setTrainCategory(item.category || '');
    setTrainLocation('');
    setTrainPrice(item.price ?? prices[item.item_name?.toLowerCase()]?.avg ?? '');
  };

  // Switch / rename / create lab lists
  const saveRename = async () => {
    const name = renameVal.trim();
    if (!name) { setRenaming(false); return; }
    try {
      await updateList(list.id, { name });
      onSelectList && onSelectList({ ...list, name });
    } catch { /* noop */ }
    setRenaming(false);
  };

  const createLabList = async () => {
    const name = newListName.trim();
    if (!name) return;
    try {
      const { data } = await createList({ name, list_type: 'lab' });
      setNewListName('');
      setNewListOpen(false);
      setListMenu(false);
      onSelectList && onSelectList(data);
    } catch { /* noop */ }
  };

  const priceFor = (item) => {
    const key = (item.item_name || '').toLowerCase();
    if (item.price != null) return { shown: fmtPrice(item.price), trained: true };
    const p = prices[key];
    if (p?.avg != null) return { shown: `~${fmtPrice(p.avg)}`, trained: true };
    if (!p) return null; // still looking up
    return { shown: 'untrained', trained: false };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 pb-28">
      <div className="max-w-xl mx-auto px-4 pt-6" style={{ perspective: 900 }}>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: -14, rotateX: -12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg p-5"
        >
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                title="Back to your regular list"
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-lg flex-shrink-0`}>
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              {renaming ? (
                <input
                  autoFocus
                  value={renameVal}
                  onChange={(e) => setRenameVal(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') saveRename(); if (e.key === 'Escape') setRenaming(false); }}
                  onBlur={saveRename}
                  className="w-full px-2 py-1 text-sm font-bold rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              ) : (
                <div className="flex items-center gap-1 min-w-0">
                  <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{list?.name || 'Lab List'}</h1>
                  <button
                    onClick={() => { setRenameVal(list?.name || ''); setRenaming(true); }}
                    title="Rename list"
                    className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-300 flex-shrink-0"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {open.length} to gather{done.length > 0 ? ` · ${done.length} found` : ''}
              </p>
            </div>
            {/* List switcher */}
            <div className="relative">
              <button
                onClick={() => setListMenu((o) => !o)}
                title="Switch lab list"
                className="p-2 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${listMenu ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {listMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    className="absolute right-0 top-full mt-2 w-52 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl z-50 py-1 overflow-hidden"
                  >
                    <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 border-b border-gray-100 dark:border-gray-700">Lab lists</p>
                    {labLists.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setListMenu(false); onSelectList && onSelectList(l); }}
                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 truncate ${
                          l.id === list?.id ? `font-bold ${t.text}` : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {l.id === list?.id ? '● ' : ''}{l.name}
                      </button>
                    ))}
                    {newListOpen ? (
                      <div className="px-2 py-1.5 flex gap-1">
                        <input
                          autoFocus
                          value={newListName}
                          onChange={(e) => setNewListName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && createLabList()}
                          placeholder="e.g. Dough Lab List"
                          className="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                        />
                        <button onClick={createLabList} className={`px-2 py-1 rounded text-white ${t.chip}`}>
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setNewListOpen(true)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700"
                      >
                        ＋ New lab list
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* Theme picker */}
            <div className="hidden sm:flex items-center gap-1.5">
              {Object.entries(THEMES).map(([id, th]) => (
                <button
                  key={id}
                  onClick={() => pickTheme(id)}
                  title={`${id} theme`}
                  className={`w-5 h-5 rounded-full bg-gradient-to-br ${th.grad} transition-transform ${
                    themeId === id ? 'scale-125 ring-2 ring-offset-2 ring-gray-300 dark:ring-gray-600 dark:ring-offset-gray-800' : 'opacity-60 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Progress */}
          {total > 0 && (
            <div className="mt-4 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                <motion.div
                  initial={false}
                  animate={{ width: `${pct}%` }}
                  transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                  className={`h-full rounded-full bg-gradient-to-r ${t.grad}`}
                />
              </div>
              <span className={`text-xs font-bold ${t.text}`}>{pct}%</span>
            </div>
          )}
        </motion.div>

        {/* Unified ingredient bar — filter + MDL autocomplete + add + picker */}
        <div className="mt-4 relative z-30">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem(query)}
              onBlur={() => setTimeout(() => setSuggestions([]), 200)}
              placeholder="Search or add an ingredient…"
              className={`w-full pl-9 pr-16 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${t.ring}`}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {adding && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={() => setPickerOpen(true)}
                title="My ingredients (pantry picker)"
                className={`w-8 h-8 rounded-xl bg-gradient-to-br ${t.grad} text-white flex items-center justify-center text-sm shadow`}
              >
                🥬
              </motion.button>
            </div>
          </div>

          {/* MDL autocomplete — trained items carry icon + category */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="absolute left-0 right-0 top-full mt-1.5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden"
              >
                {suggestions.map((s) => (
                  <button
                    key={`${s.source}-${s.name}`}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => addItem(s.name, s.icon, s.category)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span className="text-lg">{s.icon || detectIcon(s.name) || '🧪'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.name}</p>
                      {s.category && <p className="text-[10px] text-gray-400">{s.category}</p>}
                    </div>
                    <span className="text-[9px] uppercase tracking-wide text-gray-300 dark:text-gray-600">
                      {s.source === 'user' ? 'learned' : 'mdl'}
                    </span>
                    <Plus className="w-4 h-4 text-gray-400" />
                  </button>
                ))}
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addItem(query)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 border-t border-gray-100 dark:border-gray-700"
                >
                  ＋ Add “{query.trim()}” as new ingredient
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Open items */}
        <div className="mt-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {open.map((item) => {
              const price = priceFor(item);
              return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 16, rotateX: -30 }}
                animate={{ opacity: 1, y: 0, rotateX: 0 }}
                exit={{ opacity: 0, y: -10, scale: 0.96 }}
                whileHover={{ y: -2, rotateX: 2 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md"
              >
                <button onClick={() => openTrain(item)} title="Train this item (icon / price)">
                  <span className="text-xl leading-none">{item.item_icon || detectIcon(item.item_name) || '🧪'}</span>
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.item_name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {item.quantity || 1}{item.unit ? ` ${item.unit}` : ''}{item.category ? ` · ${item.category}` : ''}
                  </p>
                </div>
                {/* MDL price — or needs-training chip */}
                {price && (
                  <button
                    onClick={() => openTrain(item)}
                    title={price.trained ? 'MDL price — tap to edit' : 'No MDL data — tap to train'}
                    className={`px-2 py-1 rounded-full text-[10px] font-bold flex-shrink-0 ${
                      price.trained
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 animate-pulse'
                    }`}
                  >
                    {price.shown}
                  </button>
                )}
                <button
                  onClick={() => remove(item)}
                  title="Remove from list"
                  className="p-1.5 rounded-lg text-gray-300 dark:text-gray-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                {/* Cool check-off: springy ring that fills */}
                <motion.button
                  whileTap={{ scale: 0.75 }}
                  onClick={() => check(item)}
                  title="Got it"
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors ${
                    justChecked.has(item.id)
                      ? `border-transparent bg-gradient-to-br ${t.grad}`
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
                  }`}
                >
                  <AnimatePresence>
                    {justChecked.has(item.id) && (
                      <motion.span
                        initial={{ scale: 0, rotate: -45 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
              );
            })}
          </AnimatePresence>

          {open.length === 0 && !query && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-gray-400 dark:text-gray-500"
            >
              <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium">All stocked — nothing to gather.</p>
            </motion.div>
          )}
        </div>

        {/* Found section */}
        {done.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setDoneOpen((o) => !o)}
              className="text-[11px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {doneOpen ? '▾' : '▸'} Found ({done.length})
            </button>
            <AnimatePresence initial={false}>
              {doneOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 space-y-2 overflow-hidden"
                >
                  {done.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 opacity-60"
                    >
                      <span className="text-xl leading-none grayscale">{item.item_icon || detectIcon(item.item_name) || '🧪'}</span>
                      <p className="flex-1 text-sm font-medium text-gray-500 dark:text-gray-400 line-through truncate">
                        {item.item_name}
                      </p>
                      <button
                        onClick={() => check(item)}
                        title="Put back on the list"
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.grad} flex items-center justify-center`}
                      >
                        <Check className="w-4 h-4 text-white" />
                      </button>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Train popover — icon + price go to the shared items dictionary */}
      <AnimatePresence>
        {trainFor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/10 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setTrainFor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xs bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <p className="font-bold text-gray-900 dark:text-white truncate mb-1">{trainFor.item_name}</p>
              <p className="text-[10px] text-gray-400 mb-3">Trains the item for every list &amp; lab — icon, category, price.</p>
              {trainNote && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400 mb-2">{trainNote}</p>
              )}
              <div className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 w-12">Icon</label>
                  <input
                    value={trainIcon}
                    onChange={(e) => setTrainIcon(e.target.value)}
                    placeholder="🐄"
                    maxLength={4}
                    className="w-16 px-2 py-1.5 text-center text-lg rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900"
                  />
                  <div className="flex gap-1">
                    {(detectIcon(trainFor.item_name) ? [detectIcon(trainFor.item_name)] : []).concat(['🍎','🥛','🥩','🍌']).slice(0, 4).map((ic) => (
                      <button key={ic} onClick={() => setTrainIcon(ic)} className="text-lg hover:scale-125 transition-transform">{ic}</button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 w-12">Type</label>
                  <input
                    value={trainCategory}
                    onChange={(e) => setTrainCategory(e.target.value)}
                    placeholder="Produce, Dairy…"
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 w-12">Store in</label>
                  <div className="flex gap-1">
                    {[['pantry', '🥫 Pantry'], ['fridge', '❄️ Fridge'], ['freezer', '🧊 Freezer']].map(([loc, label]) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setTrainLocation((cur) => (cur === loc ? '' : loc))}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold border ${
                          trainLocation === loc
                            ? `${t.chip} text-white border-transparent`
                            : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-gray-500 dark:text-gray-400 w-12">Price</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={trainPrice}
                    onChange={(e) => setTrainPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-24 px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setTrainFor(null)}
                  className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTraining}
                  disabled={trainBusy}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-semibold text-white ${t.chip} disabled:opacity-50`}
                >
                  {trainBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Train item'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LabPantryPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={labTitle}
        accent="violet"
        defaultEmoji="🧪"
        items={items.map((i) => ({
          name: i.item_name,
          icon: i.item_icon,
          neededQty: i.quantity,
          neededUnit: i.unit,
        }))}
        onChanged={onRefresh}
      />
    </div>
  );
};

export default LabList;
