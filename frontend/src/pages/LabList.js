import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Plus, X, FlaskConical, ArrowLeft, Search } from 'lucide-react';
import LabPantryPicker from '../components/lab/LabPantryPicker';
import api from '../services/api';
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
 * Props: list, items, onCheck(item), onDelete(id), onBack(), onRefresh()
 */

const THEMES = {
  violet:  { grad: 'from-violet-500 to-fuchsia-600',  chip: 'bg-violet-500',  ring: 'focus:ring-violet-400',  text: 'text-violet-600 dark:text-violet-400' },
  emerald: { grad: 'from-emerald-500 to-teal-600',    chip: 'bg-emerald-500', ring: 'focus:ring-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  amber:   { grad: 'from-amber-500 to-orange-600',    chip: 'bg-amber-500',   ring: 'focus:ring-amber-400',   text: 'text-amber-600 dark:text-amber-400' },
  rose:    { grad: 'from-rose-500 to-pink-600',       chip: 'bg-rose-500',    ring: 'focus:ring-rose-400',    text: 'text-rose-600 dark:text-rose-400' },
};

const LabList = ({ list, items = [], onCheck, onDelete, onBack, onRefresh }) => {
  const [themeId, setThemeId] = useState(() => localStorage.getItem('labListTheme') || 'violet');
  const t = THEMES[themeId] || THEMES.violet;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');
  const [doneOpen, setDoneOpen] = useState(true);
  const [justChecked, setJustChecked] = useState(new Set());
  const [adding, setAdding] = useState(false);

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

  const addItem = async () => {
    const name = newName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await api.post(`/shopping/lists/${list.id}/items`, {
        itemName: name,
        quantity: 1,
        unit: '',
        icon: detectIcon(name) || '🧪',
      });
      setNewName('');
      onRefresh && onRefresh();
    } catch { /* leave input */ } finally {
      setAdding(false);
    }
  };

  const remove = async (item) => {
    onDelete && onDelete(item.id);
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
            <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${t.grad} flex items-center justify-center shadow-lg`}>
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{list?.name || 'Lab List'}</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {open.length} to gather{done.length > 0 ? ` · ${done.length} found` : ''}
              </p>
            </div>
            {/* Theme picker */}
            <div className="flex items-center gap-1.5">
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

        {/* Add + search */}
        <div className="mt-4 flex gap-2">
          <div className="relative flex-1">
            <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addItem()}
              placeholder="Add an ingredient…"
              className={`w-full pl-9 pr-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 ${t.ring}`}
            />
          </div>
          <div className="relative w-40">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter…"
              className="w-full pl-9 pr-3 py-2.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Open items */}
        <div className="mt-4 space-y-2.5">
          <AnimatePresence initial={false}>
            {open.map((item) => (
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
                <span className="text-xl leading-none">{item.item_icon || detectIcon(item.item_name) || '🧪'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{item.item_name}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">
                    {item.quantity || 1}{item.unit ? ` ${item.unit}` : ''}{item.category ? ` · ${item.category}` : ''}
                  </p>
                </div>
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
            ))}
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

      {/* Floating universal picker */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
        whileHover={{ scale: 1.08, rotate: -4 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setPickerOpen(true)}
        title="My ingredients"
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br ${t.grad} shadow-2xl flex items-center justify-center z-40`}
      >
        <FlaskConical className="w-6 h-6 text-white" />
      </motion.button>

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
