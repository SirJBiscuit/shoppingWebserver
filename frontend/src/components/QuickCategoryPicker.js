import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Wand2 } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';
import { Portal, useAnchoredPopup } from '../utils/autoPlacement';
import {
  CANONICAL_CATEGORIES,
  canonicalizeCategory,
  detectCategory,
  getCategoryIcon,
} from '../utils/categoryDetector';

/**
 * QuickCategoryPicker — compact anchored popover for fast category changes.
 * Same interaction pattern as QuickIconPicker: transparent backdrop, anchored
 * near the clicked chip, staggered spring-in tiles, click-outside to close.
 *
 * Emits the canonical category name (matches the `categories` table).
 */
const QuickCategoryPicker = ({ itemName, currentCategory, anchor, onSelect, onClose }) => {
  const [query, setQuery] = useState('');
  const canonical = canonicalizeCategory(currentCategory);
  const detected = detectCategory(itemName || '');

  const list = query.trim()
    ? CANONICAL_CATEGORIES.filter((c) => c.name.toLowerCase().includes(query.trim().toLowerCase()))
    : CANONICAL_CATEGORIES;

  // Anchored placement via the shared auto-placement API: below the chip
  // when it fits, above when there's more room, height-capped on short
  // screens. On mobile it's a bottom sheet — always reachable.
  const { pos, ref, maxHeight, side, isMobile } = useAnchoredPopup(anchor, { width: 288, height: 340 });

  const pick = (name) => {
    onSelect(name);
    onClose();
  };

  // Header (~40px) + detected-pill (~40px) + search (~48px) + padding
  const scrollMax = `${Math.max(120, maxHeight - 130)}px`;

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
            Category for “{itemName || 'item'}”
          </span>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {detected && detected !== canonical && (
          <button
            onClick={() => pick(detected)}
            className="mx-3 mt-2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/40 ring-1 ring-primary-300 dark:ring-primary-700 text-xs font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/60 transition-colors"
            title="Auto-detected category"
          >
            <Wand2 className="w-3.5 h-3.5" />
            {getCategoryIcon(detected)} Detected: {detected}
          </button>
        )}

        <div className="px-3 pt-2">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search categories…"
            className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:border-primary-500 focus:outline-none"
          />
        </div>

        <AnimatedScrollbar3D
          maxHeight={scrollMax}
          thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
          glowColor="primary"
          autoHide={false}
        >
          <div className="px-3 py-2">
            <div className="grid grid-cols-2 gap-1.5">
              {list.map((cat, i) => (
                <motion.button
                  key={cat.name}
                  initial={{ opacity: 0, y: 6, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: Math.min(i * 0.025, 0.3), type: 'spring', damping: 20, stiffness: 300 }}
                  onClick={() => pick(cat.name)}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-all hover:scale-[1.04] active:scale-95 ${
                    canonical === cat.name
                      ? 'bg-primary-100 dark:bg-primary-900/50 ring-1 ring-primary-500 text-primary-700 dark:text-primary-300'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                  }`}
                >
                  <span className="text-base leading-none">{cat.icon}</span>
                  <span className="truncate">{cat.name}</span>
                </motion.button>
              ))}
              {list.length === 0 && (
                <p className="col-span-2 text-center text-xs text-gray-400 py-3">No matches</p>
              )}
            </div>
          </div>
        </AnimatedScrollbar3D>
      </motion.div>
    </Portal>
  );
};

export default QuickCategoryPicker;
