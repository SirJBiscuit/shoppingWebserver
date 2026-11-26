import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Eraser } from 'lucide-react';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';

const QUICK_UNITS = [
  'each', 'pack', 'box', 'bag', 'bottle', 'can', 'jar', 'dozen',
  'lb', 'oz', 'kg', 'g', 'gal', 'qt', 'pt', 'L', 'ml',
  'bunch', 'loaf', 'roll', 'case', 'ct', 'oz bag', 'fl oz',
];

/**
 * QuickUnitPicker — compact anchored popover for setting an item's unit
 * of measurement. Same interaction pattern as QuickCategoryPicker /
 * QuickAislePicker: transparent backdrop, anchored near the clicked
 * unit chip, spring-in, click-outside to close. Bottom sheet on mobile.
 *
 * onSelect(unit) applies; onClear() removes the unit.
 */
const QuickUnitPicker = ({ itemName, currentUnit, anchor, onSelect, onClear, onClose }) => {
  const [custom, setCustom] = useState(currentUnit || '');
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 360 });

  const pick = (u) => {
    onSelect(u);
    onClose();
  };

  const submitCustom = () => {
    const u = custom.trim();
    if (u) pick(u);
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
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 truncate">
            Unit for “{itemName || 'item'}”
          </span>
          <button type="button" onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick-pick unit grid */}
        <div className="px-3 py-2 grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto scrollbar-3d">
          {QUICK_UNITS.map((u, i) => (
            <motion.button
              key={u}
              type="button"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3), type: 'spring', damping: 20, stiffness: 300 }}
              onClick={() => pick(u)}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                currentUnit === u
                  ? 'bg-teal-600 text-white ring-1 ring-teal-600'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-teal-50 dark:hover:bg-teal-900/30'
              }`}
            >
              {u}
            </motion.button>
          ))}
        </div>

        {/* Custom unit */}
        <div className="px-3 pb-2 flex items-center gap-1.5">
          <input
            type="text"
            autoFocus
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
