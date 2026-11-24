import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Delete, ChevronDown, CornerDownLeft, ArrowBigUp, ArrowBigUpDash, Keyboard } from 'lucide-react';

/**
 * AnimatedKeyboard — on-screen keyboard with physical key-cap feel.
 *
 * Keys have a real "press" depth: a hard under-shadow collapses while the
 * cap sinks 3px, so it reads like a mechanical key. Rows spring in
 * staggered on open. Zero layout work while closed (AnimatePresence
 * unmounts it), so it costs nothing until asked for.
 *
 * Pure callbacks — the parent owns the focused field's value:
 *   onKey(char) / onBackspace() / onEnter() / onClose()
 */

const ROWS_LETTERS = [
  '1234567890'.split(''),
  'qwertyuiop'.split(''),
  'asdfghjkl'.split(''),
  'zxcvbnm'.split(''),
];
const ROWS_SYMBOLS = [
  '1234567890'.split(''),
  '!@#$%^&*()'.split(''),
  '-_=+[]{}/'.split(''),
  ';:,.<>?|\\\''.split(''),
];

const Key = ({ label, onPress, wide, big, compact, variant = 'letter', children, title }) => (
  <motion.button
    type="button"
    title={title}
    onPointerDown={(e) => {
      e.preventDefault(); // never steal focus from the field being typed in
      onPress();
    }}
    whileTap={{ y: 3 }}
    transition={{ type: 'spring', stiffness: 800, damping: 22 }}
    className={`${big ? 'flex-[3]' : wide ? 'flex-[1.6]' : 'flex-1'} ${compact ? 'h-9' : 'h-11'} rounded-lg select-none
      min-w-0 ${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center justify-center
      bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
      border border-gray-200 dark:border-gray-600
      shadow-[0_3px_0_rgba(0,0,0,0.18)] dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]
      active:shadow-[0_0px_0_rgba(0,0,0,0.18)]
      ${variant === 'action'
        ? 'bg-primary-600 text-white dark:bg-primary-600 border-primary-700'
        : variant === 'func'
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          : ''}`}
  >
    {children || label}
  </motion.button>
);

// Landscape OR narrow phones get compact keys so the sheet still fits.
const fitsCompact = () => window.innerHeight < 520 || window.innerWidth < 400;

const AnimatedKeyboard = ({ onKey, onBackspace, onEnter, onClose, onSwitchToOS }) => {
  const [shift, setShift] = useState(false); // sticky shift (one char), caps lock = double-tap
  const [caps, setCaps] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const [compact, setCompact] = useState(fitsCompact);
  useEffect(() => {
    const onResize = () => setCompact(fitsCompact());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const press = (k) => {
    const out = symbols ? k : (shift || caps ? k.toUpperCase() : k);
    onKey(out);
    if (shift && !caps) setShift(false); // shift applies to one key, like a real kb
    if (navigator.vibrate) { try { navigator.vibrate(4); } catch { /* optional */ } }
  };

  const lastTap = React.useRef(0);
  const tapShift = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) { setCaps((c) => !c); setShift(false); }
    else setShift((s) => !s);
    lastTap.current = now;
  };

  const rows = symbols ? ROWS_SYMBOLS : ROWS_LETTERS;

  return (
    <motion.div
      data-animated-kb
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 28, stiffness: 260 }}
      className={`fixed bottom-0 left-0 right-0 z-[90] ${compact ? 'p-1' : 'p-2'} pb-[max(0.5rem,env(safe-area-inset-bottom))]
        bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-md touch-none select-none
        border-t border-gray-300 dark:border-gray-700 shadow-2xl`}
    >
      <div className={`max-w-md mx-auto ${compact ? 'space-y-1' : 'space-y-1.5'}`}>
        {rows.map((row, ri) => (
          <motion.div
            key={row.join('')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * ri, duration: 0.18 }}
            className={`flex ${compact ? 'gap-1 px-0.5' : 'gap-1.5 px-1'}`}
          >
            {ri === 3 && (
              <Key wide compact={compact} variant="func" onPress={symbols ? () => setSymbols(false) : tapShift}
                title={symbols ? 'Back to letters' : caps ? 'Caps lock' : 'Shift'}>
                {symbols ? 'abc' : caps ? <ArrowBigUpDash className="w-5 h-5" /> : <ArrowBigUp className={`w-5 h-5 ${shift ? 'text-primary-500' : ''}`} />}
              </Key>
            )}
            {row.map((k) => (
              <Key key={k} compact={compact} label={symbols ? k : (shift || caps ? k.toUpperCase() : k)}
                onPress={() => press(k)} />
            ))}
            {ri === 3 && (
              <Key wide compact={compact} variant="func" onPress={onBackspace} title="Backspace">
                <Delete className="w-5 h-5" />
              </Key>
            )}
          </motion.div>
        ))}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.18 }}
          className={`flex ${compact ? 'gap-1 px-0.5' : 'gap-1.5 px-1'}`}
        >
          <Key compact={compact} variant="func" label={symbols ? 'abc' : '#+='} onPress={() => setSymbols((s) => !s)} title="Symbols" />
          <Key big compact={compact} onPress={() => press(' ')} title="Space">
            <span className="text-gray-400 text-xs">space</span>
          </Key>
          {onSwitchToOS && (
            <Key compact={compact} variant="func" onPress={onSwitchToOS} title="Use device keyboard">
              <Keyboard className="w-5 h-5" />
            </Key>
          )}
          <Key compact={compact} variant="func" onPress={onClose} title="Hide keyboard">
            <ChevronDown className="w-5 h-5" />
          </Key>
          <Key wide compact={compact} variant="action" onPress={onEnter} title="Enter">
            <CornerDownLeft className="w-5 h-5" />
          </Key>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default AnimatedKeyboard;
