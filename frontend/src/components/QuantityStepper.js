import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatQuantityPlain } from '../utils/formatQuantity';
import { learnQuantity } from '../utils/userPreferences';
import { useRipple } from '../utils/interactable';

/**
 * QuantityStepper — reusable animated − qty + control.
 *
 * The number slides up/down in the direction of the change and the
 * buttons press-shrink. When `itemName` is provided the chosen quantity
 * is learned (localStorage prefs + the server-side preferred_quantity
 * learned through the normal item-update path), so the next time the
 * item is added it defaults to the amount the user actually buys.
 *
 * Props:
 *   value     - current quantity (number or "1.00" string)
 *   unit      - unit label rendered after the number
 *   onAdjust  - (delta) => void — parent applies the change
 *   itemName  - optional; enables quantity learning
 *   size      - 'sm' (inline rows, touch-friendly on mobile) | 'lg' (menus)
 */
const QuantityStepper = ({ value = 1, unit = '', onAdjust, itemName, size = 'sm', className = '', onUnitClick }) => {
  const dirRef = useRef(1);
  const ripple = useRipple();
  const qty = parseFloat(value) || 1;

  const adjust = (delta) => {
    dirRef.current = delta > 0 ? 1 : -1;
    const next = Math.max(1, qty + delta);
    if (onAdjust) onAdjust(delta);
    if (itemName) learnQuantity(itemName, next);
  };

  const btnSize = size === 'lg' ? 'w-10 h-10 text-lg' : 'w-8 h-8 sm:w-5 sm:h-5 text-base sm:text-xs';
  const btnBase = `${btnSize} rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-primary-200 dark:hover:bg-primary-800 text-gray-700 dark:text-gray-200 font-bold flex items-center justify-center tap-target select-none transition-colors`;

  return (
    <span className={`inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 ${className}`}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.78 }}
        onPointerDown={ripple}
        onClick={() => adjust(-1)}
        disabled={qty <= 1}
        className={`${btnBase} disabled:opacity-40 disabled:pointer-events-none`}
        title="Decrease quantity"
      >
        −
      </motion.button>
      <span
        className="relative inline-block min-w-[1.5rem] text-center overflow-hidden align-middle"
        style={{ height: '1.25em' }}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={qty}
            initial={{ y: 14 * dirRef.current, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -14 * dirRef.current, opacity: 0 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="inline-block"
          >
            {formatQuantityPlain(qty)}
          </motion.span>
        </AnimatePresence>
      </span>
      <motion.button
        type="button"
        whileTap={{ scale: 0.78 }}
        onPointerDown={ripple}
        onClick={() => adjust(1)}
        className={btnBase}
        title="Increase quantity"
      >
        +
      </motion.button>
      {onUnitClick ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.85 }}
          onClick={onUnitClick}
          title="Tap to change unit"
          className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 text-xs font-semibold hover:bg-primary-100 dark:hover:bg-primary-900/40 hover:text-primary-600 dark:hover:text-primary-300 transition-colors"
        >
          {unit || 'unit'}
        </motion.button>
      ) : (
        unit && <span>{unit}</span>
      )}
    </span>
  );
};

export default QuantityStepper;
