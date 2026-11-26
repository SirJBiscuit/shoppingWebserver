import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wand2, MapPin, Eraser, Check } from 'lucide-react';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';
import { getAislePrediction } from '../api/mdl';

const QUICK_AISLES = Array.from({ length: 24 }, (_, i) => i + 1);

/**
 * QuickAislePicker — compact anchored popover for setting an item's aisle.
 * Same interaction pattern as QuickCategoryPicker: transparent backdrop,
 * anchored near the clicked chip, spring-in, click-outside to close.
 * On mobile it's a bottom sheet.
 *
 * Shows the MDL learned prediction as a one-tap suggestion, a quick-pick
 * grid of common aisle numbers, a custom number entry and an optional
 * aisle-name field. onSelect(number, name) applies; onClear() removes it.
 */
const QuickAislePicker = ({ itemName, currentAisle, currentAisleName, storeName, anchor, onSelect, onClear, onClose }) => {
  const [prediction, setPrediction] = useState(null);
  const [num, setNum] = useState(currentAisle != null ? String(currentAisle) : '');
  const [name, setName] = useState(currentAisleName || '');
  const [storeAisles, setStoreAisles] = useState([]);
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 420 });

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
    const n = parseInt(num, 10);
    if (!Number.isNaN(n) && n > 0) pick(n);
  };

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
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            Aisle for “{itemName || 'item'}”{storeName ? ` · ${storeName}` : ''}
          </span>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MDL learned suggestion */}
        {prediction && prediction.aisle !== currentAisle && (
          <button
            type="button"
            onClick={() => pick(prediction.aisle)}
            className="mx-3 mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/40 ring-1 ring-blue-300 dark:ring-blue-700 text-xs font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors"
            title={`Learned from ${prediction.reports || 0} report(s) · ${Math.round((prediction.confidence || 0) * 100)}% confidence`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            Suggested: Aisle {prediction.aisle}
          </button>
        )}

        {/* Store's configured aisles — named destinations from Configure
            Aisles take priority over the raw number grid */}
        {storeAisles.length > 0 && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-1.5">Store aisles</p>
            <div className="flex flex-wrap gap-1.5">
              {storeAisles.map((a) => (
                <button
                  key={a.id || a.aisle_number}
                  type="button"
                  onClick={() => pick(a.aisle_number, a.aisle_name)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                    String(currentAisle) === String(a.aisle_number)
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 hover:bg-blue-100'
                  }`}
                  title={a.aisle_name || `Aisle ${a.aisle_number}`}
                >
                  {a.aisle_number}{a.aisle_name ? ` · ${a.aisle_name}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick-pick grid */}
        <div className="px-3 py-2 grid grid-cols-6 gap-1.5">
          {QUICK_AISLES.map((n, i) => (
            <motion.button
              key={n}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.012, 0.25), type: 'spring', damping: 20, stiffness: 300 }}
              onClick={() => pick(n)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                currentAisle === n
                  ? 'bg-blue-600 text-white ring-1 ring-blue-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/40'
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>

        {/* Custom aisle number + optional name */}
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <input
            type="number"
            min="1"
            autoFocus
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
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-50 flex items-center gap-1"
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
