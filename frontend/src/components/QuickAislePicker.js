import { useEffect, useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Wand2, MapPin, Eraser, Check, Search, GripHorizontal, ChevronDown } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import PickerSettingsButton from './PickerSettingsButton';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';
import { usePickerPrefs } from '../utils/pickerPrefs';
import { getAislePrediction } from '../api/mdl';

const QUICK_AISLES = Array.from({ length: 24 }, (_, i) => i + 1);

/**
 * QuickAislePicker — compact anchored popover for setting an item's aisle.
 * Same interaction pattern as QuickCategoryPicker: transparent backdrop,
 * anchored near the clicked chip, spring-in, click-outside to close.
 * On mobile it's a bottom sheet.
 *
 * Shows the store's configured aisles as searchable named chips, the MDL
 * learned prediction as a one-tap suggestion, a quick-pick number grid,
 * and a custom number+name entry. onSelect(number, name) applies;
 * onClear() removes it. Desktop: draggable by the header grip.
 */
const QuickAislePicker = ({ itemName, currentAisle, currentAisleName, storeName, anchor, onSelect, onClear, onClose }) => {
  const [prediction, setPrediction] = useState(null);
  const [query, setQuery] = useState('');
  const [num, setNum] = useState(currentAisle != null ? String(currentAisle) : '');
  const [name, setName] = useState(currentAisleName || '');
  const [storeAisles, setStoreAisles] = useState([]);
  const [showGrid, setShowGrid] = useState(false);
  const { prefs, setPref } = usePickerPrefs('aisle');
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 460 });
  const dragControls = useDragControls();

  // MDL learned aisle for this item at this store — best-effort
  useEffect(() => {
    let cancelled = false;
    if (itemName && storeName) {
      getAislePrediction(itemName, storeName)
        .then((p) => { if (!cancelled && p?.aisle) setPrediction(p); })
        .catch(() => {});
    }
    return () => { cancelled = true; };
  }, [itemName, storeName]);

  // The store's configured aisle layout (name → number) from Configure
  // Aisles — these are the real destinations, not just numbers 1-24.
  useEffect(() => {
    let cancelled = false;
    if (!storeName) { setStoreAisles([]); return undefined; }
    (async () => {
      try {
        const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };
        const search = await fetch(`/api/mdl/stores/search?name=${encodeURIComponent(storeName)}`, { headers });
        if (!search.ok) return;
        const rows = await search.json();
        const store = rows.find((s) => (s.name || '').toLowerCase() === storeName.toLowerCase()) || rows[0];
        if (!store) return;
        const res = await fetch(`/api/stores/${store.id}/aisles`, { headers });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setStoreAisles(data);
      } catch { /* no configured aisles — number grid still works */ }
    })();
    return () => { cancelled = true; };
  }, [storeName]);

  const pick = (n, aisleName) => {
    onSelect(n, (aisleName ?? name).trim() || null);
    onClose();
  };

  const submitCustom = () => {
    const raw = num.trim();
    if (!raw) return;
    const n = /^\d+$/.test(raw) ? parseInt(raw, 10) : raw;
    // Teach MDL a custom aisle name — pending until an admin approves
    if (name.trim()) {
      fetch('/api/mdl/terms', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ kind: 'aisle', term: name.trim() }),
      }).catch(() => {});
    }
    pick(n, name);
  };

  const q = query.trim().toLowerCase();
  const configuredNums = new Set(storeAisles.map((a) => String(a.aisle_number)));
  const filteredAisles = q
    ? storeAisles.filter((a) =>
        String(a.aisle_number).toLowerCase().includes(q) ||
        (a.aisle_name || '').toLowerCase().includes(q) ||
        (Array.isArray(a.categories) && a.categories.some((c) => c.toLowerCase().includes(q)))
      )
    : storeAisles;

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
        initial={prefs.animations ? (isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }) : false}
        animate={isMobile
          ? { opacity: 1, y: 0 }
          : { opacity: 1, scale: 1, rotateX: 0, y: 0 }}
        exit={prefs.animations ? (isMobile
          ? { opacity: 0, y: 60 }
          : { opacity: 0, scale: 0.85, rotateX: -25, y: 8 }) : { opacity: 0 }}
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
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Aisle for “{itemName || 'item'}”{storeName ? ` · ${storeName}` : ''}
          </span>
          <div className="flex items-center gap-0.5">
            <PickerSettingsButton prefs={prefs} setPref={setPref} />
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-red-400 hover:text-white hover:bg-red-500 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MDL learned suggestion */}
        {prediction && prediction.aisle !== currentAisle && prefs.suggestions && (
          <button
            type="button"
            onClick={() => pick(prediction.aisle)}
            className="mx-3 mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-b from-blue-50 to-blue-100/80 dark:from-blue-900/50 dark:to-blue-900/30 border border-blue-300 dark:border-blue-700 text-xs font-semibold text-blue-700 dark:text-blue-300 shadow-[0_2px_0_rgb(147_197_253/0.7)] dark:shadow-[0_2px_0_rgb(30_58_138/0.6)] hover:-translate-y-px active:translate-y-px active:shadow-none transition-all"
            title={`Learned from ${prediction.reports || 0} report(s) · ${Math.round((prediction.confidence || 0) * 100)}% confidence`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Suggested: Aisle {prediction.aisle}
          </button>
        )}

        {/* Search — filters configured aisles by number, name or category */}
        {prefs.search && (
          <div className="px-3 pt-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search aisles…"
                className="w-full pl-7 pr-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        <AnimatedScrollbar3D
          maxHeight={`${Math.max(120, maxHeight - (storeAisles.length ? 250 : 230))}px`}
          thumbColor="bg-gradient-to-b from-blue-400 to-blue-600"
          glowColor="primary"
          autoHide={false}
        >
          {/* Store's configured aisles — named destinations from Configure
              Aisles take priority over the raw number grid */}
          {filteredAisles.length > 0 && (
            <div className="px-3 pt-2 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Store aisles</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredAisles.map((a, i) => {
                  const active = String(currentAisle) === String(a.aisle_number);
                  return (
                    <motion.button
                      key={a.id || a.aisle_number}
                      type="button"
                      initial={prefs.animations ? { opacity: 0, scale: 0.9, y: 4 } : { opacity: 1, scale: 1 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: prefs.animations ? Math.min(i * 0.02, 0.3) : 0, type: 'spring', damping: 20, stiffness: 300 }}
                      onClick={() => pick(a.aisle_number, a.aisle_name)}
                      className={`inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_0_#1e40af,inset_0_1px_0_rgb(255_255_255/0.25)]'
                          : 'bg-gradient-to-b from-blue-50 to-blue-100/70 dark:from-blue-900/40 dark:to-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shadow-[0_2px_0_rgb(191_219_254/0.9)] dark:shadow-[0_2px_0_rgb(30_58_138/0.6)] hover:-translate-y-px hover:shadow-[0_3px_0_rgb(191_219_254/0.9)] dark:hover:shadow-[0_3px_0_rgb(30_58_138/0.6)] active:translate-y-px active:shadow-none'
                      }`}
                      title={`${a.aisle_name || `Aisle ${a.aisle_number}`}${Array.isArray(a.categories) && a.categories.length ? ` — ${a.categories.join(', ')}` : ''}`}
                    >
                      <span className={`flex items-center justify-center min-w-[1.35rem] h-[1.35rem] px-1 rounded-full text-[10px] font-bold ${
                        active
                          ? 'bg-white/20 text-white'
                          : 'bg-blue-600/10 dark:bg-blue-400/10 text-blue-700 dark:text-blue-300'
                      }`}>
                        {a.aisle_number}
                      </span>
                      {a.aisle_name && <span className="truncate max-w-[9rem]">{a.aisle_name}</span>}
                      {active && <Check className="w-3 h-3 flex-shrink-0" />}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          )}
          {q && filteredAisles.length === 0 && storeAisles.length > 0 && (
            <p className="px-3 pt-2 text-xs text-gray-400">No aisles match “{query}”</p>
          )}

          {/* Quick-pick grid — raw numbers are a fallback: when the store
              has configured aisles the named chips above are the real
              destinations, so the grid starts collapsed behind a
              disclosure. Numbers matching a configured aisle stay tinted
              so the mapping stays visible. */}
          <div className="px-3 py-2">
            {storeAisles.length > 0 ? (
              <button
                type="button"
                onClick={() => setShowGrid((v) => !v)}
                className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 mb-1.5 transition-colors"
                aria-expanded={showGrid}
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showGrid ? '' : '-rotate-90'}`} />
                Any aisle number
              </button>
            ) : (
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">By number</p>
            )}
            {(showGrid || storeAisles.length === 0) && (
              <div className="grid grid-cols-6 gap-1.5">
                {QUICK_AISLES.map((n, i) => (
                  <motion.button
                    key={n}
                    type="button"
                    initial={prefs.animations ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: prefs.animations ? Math.min(i * 0.012, 0.25) : 0, type: 'spring', damping: 20, stiffness: 300 }}
                    onClick={() => pick(n)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      String(currentAisle) === String(n)
                        ? 'bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_0_#1e40af,inset_0_1px_0_rgb(255_255_255/0.25)]'
                        : configuredNums.has(String(n))
                          ? 'bg-gradient-to-b from-blue-100 to-blue-200/70 dark:from-blue-900/50 dark:to-blue-900/30 text-blue-800 dark:text-blue-200 shadow-[0_2px_0_rgb(147_197_253/0.8)] dark:shadow-[0_2px_0_rgb(30_58_138/0.6)] hover:-translate-y-px active:translate-y-px active:shadow-none'
                          : 'bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 border border-gray-200/80 dark:border-gray-600 shadow-[0_2px_0_rgb(209_213_219/0.9)] dark:shadow-[0_2px_0_rgb(17_24_39/0.9)] hover:-translate-y-px hover:text-blue-700 dark:hover:text-blue-300 active:translate-y-px active:shadow-none'
                    }`}
                    title={configuredNums.has(String(n)) ? `Aisle ${n} — configured at this store` : `Aisle ${n}`}
                  >
                    {n}
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </AnimatedScrollbar3D>

        {/* Custom aisle number + optional name */}
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <input
            type="text"
            autoFocus={!isMobile}
            value={num}
            onChange={(e) => setNum(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
            placeholder="Aisle #"
            className="w-20 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitCustom()}
            placeholder="Name (e.g. Bakery)"
            className="flex-1 px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={submitCustom}
            disabled={!num.trim()}
            className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white shadow-[0_2px_0_#1e40af] active:translate-y-px active:shadow-none disabled:opacity-50 disabled:shadow-none disabled:translate-y-0 flex items-center gap-1 transition-all"
          >
            <Check className="w-3.5 h-3.5" /> Set
          </button>
        </div>

        {/* Clear */}
        {currentAisle != null && onClear && (
          <div className="px-3 pb-3 pt-1.5 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={() => { onClear(); onClose(); }}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" /> Clear aisle
            </button>
          </div>
        )}
      </motion.div>
    </Portal>
  );
};

export default QuickAislePicker;
