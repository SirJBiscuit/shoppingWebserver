import { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Check, Eraser, Search, GripHorizontal, Scale, Wand2 } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';

const QUICK_UNITS = [
  'each', 'pack', 'box', 'bag', 'bottle', 'can', 'jar', 'dozen',
  'lb', 'oz', 'kg', 'g', 'gal', 'qt', 'pt', 'L', 'ml',
  'bunch', 'loaf', 'roll', 'case', 'ct', 'oz bag', 'fl oz',
];

const authHeaders = (json = false) => ({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
  ...(json ? { 'Content-Type': 'application/json' } : {}),
});

/**
 * QuickUnitPicker — compact anchored popover for an item's unit of
 * measurement. Same interaction pattern as the other quick pickers:
 * transparent backdrop, anchored spring-in, search, 3D scrollbar,
 * click-outside to close, bottom sheet on mobile, draggable header
 * grip on desktop.
 *
 * Learned units (mdl_custom_terms, kind 'unit') merge into the grid —
 * custom units a user sets are reported back so the MDL can suggest
 * them next time (pending admin approval for global suggestions).
 *
 * onSelect(unit) applies; onClear() removes the unit.
 */
const QuickUnitPicker = ({ itemName, currentUnit, anchor, onSelect, onClear, onClose }) => {
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(currentUnit || '');
  const [learnedUnits, setLearnedUnits] = useState([]);
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 420 });
  const dragControls = useDragControls();

  // MDL-learned units — approved suggestions + the user's own pending
  // ones; merged ahead of the stock grid so they read as first-class.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/mdl/terms?kind=unit', { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : []))
      .then((rows) => { if (!cancelled && Array.isArray(rows)) setLearnedUnits(rows.map((t) => t.term)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const pick = (u) => {
    onSelect(u);
    // Teach MDL — custom units enter the pending pool; stock units just
    // bump their usage count. Best-effort, never blocks the pick.
    if (u && !QUICK_UNITS.includes(u)) {
      fetch('/api/mdl/terms', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ kind: 'unit', term: u }),
      }).catch(() => {});
    }
    onClose();
  };

  const submitCustom = () => {
    const u = custom.trim();
    if (u) pick(u);
  };

  const q = query.trim().toLowerCase();
  const allUnits = [...new Set([...learnedUnits, ...QUICK_UNITS])];
  const list = q ? allUnits.filter((u) => u.toLowerCase().includes(q)) : allUnits;
  const learnedSet = new Set(learnedUnits);

  const panelStyle = isMobile
    ? { transformStyle: 'preserve-3d' }
    : {
        left: pos?.left ?? -9999,
        top: pos?.top ?? -9999,
        maxHeight,
        transformOrigin: side === 'above' ? 'bottom center' : 'top center',
        transformStyle: 'preserve-3d',
      };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70]" onClick={onClose} />
      <motion.div
        ref={ref}
        initial={isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }}
        animate={isMobile
          ? { opacity: 1, y: 0 }
          : { opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }}
        transition={{ type: 'spring', damping: 22, stiffness: 320 }}
        drag={!isMobile}
        dragControls={dragControls}
        dragListener={false}
        dragMomentum={false}
        style={panelStyle}
        className={`fixed z-[71] bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden ${
          isMobile
            ? 'inset-x-0 bottom-0 rounded-t-2xl max-h-[72vh] border-b-0'
            : 'w-72 max-w-[calc(100vw-16px)] rounded-2xl'
        }`}
      >
        {isMobile && (
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
        )}
        <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-gray-100 dark:border-gray-700">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate flex items-center gap-1.5">
            {!isMobile && (
              <GripHorizontal
                className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
                onPointerDown={(e) => dragControls.start(e)}
              />
            )}
            <Scale className="w-3.5 h-3.5 text-teal-500" />
            Unit for “{itemName || 'item'}”
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search — autofocus only on non-touch so the OS keyboard stays
            down until the user actually taps the field */}
        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              autoFocus={!isMobile}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search units…"
              className="w-full pl-7 pr-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none"
            />
          </div>
        </div>

        <AnimatedScrollbar3D
          maxHeight={`${Math.max(120, maxHeight - 220)}px`}
          thumbColor="bg-gradient-to-b from-teal-400 to-teal-600"
          glowColor="primary"
          autoHide={false}
        >
          {/* Learned units first — MDL suggestions from real usage */}
          {learnedUnits.length > 0 && !q && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5 flex items-center gap-1">
                <Wand2 className="w-3 h-3" /> Learned
              </p>
              <div className="flex flex-wrap gap-1.5">
                {learnedUnits.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => pick(u)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                      currentUnit === u
                        ? 'bg-teal-600 text-white'
                        : 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100'
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Unit grid */}
          <div className="px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">
              {q ? 'Matches' : 'Common units'}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {list.map((u, i) => (
                <motion.button
                  key={u}
                  type="button"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.012, 0.25), type: 'spring', damping: 20, stiffness: 300 }}
                  onClick={() => pick(u)}
                  className={`py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                    currentUnit === u
                      ? 'bg-teal-600 text-white ring-1 ring-teal-600'
                      : learnedSet.has(u)
                        ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 hover:bg-teal-100'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30'
                  }`}
                >
                  {u}
                </motion.button>
              ))}
              {list.length === 0 && (
                <p className="col-span-4 text-center text-xs text-gray-400 py-2">No matches — type a custom unit below</p>
              )}
            </div>
          </div>
        </AnimatedScrollbar3D>

        {/* Custom unit */}
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
            placeholder="Custom unit (e.g. sleeve)"
            className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-teal-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={submitCustom}
            disabled={!custom.trim()}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-teal-600 text-white disabled:opacity-50 flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" /> Set
          </button>
        </div>

        {/* Clear */}
        {currentUnit && onClear && (
          <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { onClear(); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" /> Clear unit
            </button>
          </div>
        )}
      </motion.div>
    </Portal>
  );
};

export default QuickUnitPicker;
