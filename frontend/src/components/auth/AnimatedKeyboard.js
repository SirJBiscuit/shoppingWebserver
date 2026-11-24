import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Delete, ChevronDown, CornerDownLeft, ArrowBigUp, ArrowBigUpDash,
  Keyboard, GripHorizontal, GripVertical,
} from 'lucide-react';
import { Portal, placeInViewport } from '../../utils/autoPlacement';
import soundManager from '../../utils/soundEffects';

/**
 * AnimatedKeyboard — floating popout keyboard.
 *
 * Rendered through the autoPlacement Portal so `fixed` truly means the
 * viewport (transformed ancestors can't push it offscreen). It's a
 * draggable window, not a bottom sheet: grab the handle to float it
 * anywhere, drag the corner to resize, position + size persist per
 * device, and placeInViewport clamps every move so it can never leave
 * the screen.
 *
 * Pure callbacks — the parent owns the focused field's value:
 *   onKey(char) / onBackspace() / onEnter() / onClose() / onSwitchToOS?()
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

const POS_KEY = 'listzy_kb_float';   // {x, y, w} — per-device float state
const MIN_W = 280;
const MAX_W = 560;

const loadFloat = () => {
  try {
    const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p;
  } catch { /* fresh device */ }
  return null;
};
const saveFloat = (p) => {
  try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* optional */ }
};

// Landscape OR narrow phones get compact keys so the popout stays small.
const fitsCompact = () => window.innerHeight < 520 || window.innerWidth < 400;

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
      min-w-0 overflow-hidden ${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center justify-center shrink
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

const AnimatedKeyboard = ({ onKey, onBackspace, onEnter, onClose, onSwitchToOS }) => {
  const [shift, setShift] = useState(false); // sticky shift (one char), caps lock = double-tap
  const [caps, setCaps] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const [compact, setCompact] = useState(fitsCompact);
  const kbHeight = compact ? 200 : 240; // rows + handle estimate for clamping

  const [size, setSize] = useState(() => loadFloat()?.w || Math.min(360, window.innerWidth - 16));
  const [pos, setPos] = useState(() => {
    const saved = loadFloat();
    const w = saved?.w || Math.min(360, window.innerWidth - 16);
    return placeInViewport(
      saved?.x ?? (window.innerWidth - w) / 2,
      saved?.y ?? window.innerHeight - 300,
      { width: w, height: kbHeight, margin: 8, offset: 0 }
    );
  });
  const rootRef = useRef(null);
  const drag = useRef(null);   // {dx, dy} while the handle is held
  const resize = useRef(null); // {startX, startW} while the corner is held

  useEffect(() => {
    const onResize = () => {
      setCompact(fitsCompact());
      const r = rootRef.current?.getBoundingClientRect();
      setPos((p) => placeInViewport(p.x, p.y, {
        width: r?.width || size, height: r?.height || kbHeight, margin: 8, offset: 0,
      }));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [size, kbHeight]);

  const clampPos = useCallback((x, y) => {
    const r = rootRef.current?.getBoundingClientRect();
    return placeInViewport(x, y, {
      width: r?.width || size, height: r?.height || kbHeight, margin: 4, offset: 0,
    });
  }, [size, kbHeight]);

  // Drag the handle — pointer-captured so the float can't escape mid-drag.
  const grab = (e) => {
    e.preventDefault();
    drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const dragMove = (e) => {
    if (drag.current) {
      setPos(clampPos(e.clientX - drag.current.dx, e.clientY - drag.current.dy));
    } else if (resize.current) {
      const w = Math.min(MAX_W, Math.max(MIN_W, resize.current.startW + e.clientX - resize.current.startX));
      setSize(w);
      setPos((p) => clampPos(p.x, p.y));
    }
  };
  const release = (e) => {
    if (drag.current || resize.current) {
      drag.current = null;
      resize.current = null;
      setPos((p) => { saveFloat({ x: p.x, y: p.y, w: size }); return p; });
    }
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const grabResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resize.current = { startX: e.clientX, startW: size };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Key feedback — 'key' is a 25ms synthesized tick (falls back to any
  // uploaded file if the admin binds one); honors the app's sound prefs.
  const tap = (sound = 'key') => {
    soundManager.play(sound);
    if (navigator.vibrate) { try { navigator.vibrate(4); } catch { /* optional */ } }
  };

  const press = (k) => {
    const out = symbols ? k : (shift || caps ? k.toUpperCase() : k);
    onKey(out);
    if (shift && !caps) setShift(false); // shift applies to one key, like a real kb
    tap('key');
  };

  const lastTap = useRef(0);
  const tapShift = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) { setCaps((c) => !c); setShift(false); }
    else setShift((s) => !s);
    lastTap.current = now;
    tap('key');
  };
  const tapBackspace = () => { onBackspace(); tap('key'); };
  const tapEnter = () => { onEnter(); tap('check'); };

  const rows = symbols ? ROWS_SYMBOLS : ROWS_LETTERS;

  return (
    <Portal>
      <motion.div
        ref={rootRef}
        data-animated-kb
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        style={{ left: pos.x, top: pos.y, width: size }}
        className="fixed z-[95] rounded-2xl overflow-hidden touch-none select-none
          bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-md
          border border-gray-300 dark:border-gray-700 shadow-2xl"
      >
        {/* drag handle — grab anywhere on the bar to float it */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Drag keyboard"
          onPointerDown={grab}
          onPointerMove={dragMove}
          onPointerUp={release}
          onPointerCancel={release}
          className={`flex items-center justify-center cursor-grab active:cursor-grabbing
            ${compact ? 'h-6' : 'h-8'} text-gray-400 dark:text-gray-500
            bg-gray-200/70 dark:bg-gray-800/70 border-b border-gray-300 dark:border-gray-700`}
        >
          <GripHorizontal className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
        </button>

        <div className={`${compact ? 'p-1 space-y-1' : 'p-1.5 space-y-1.5'}`}>
          {rows.map((row, ri) => (
            <motion.div
              key={row.join('')}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.04 * ri, duration: 0.18 }}
              className={`flex ${compact ? 'gap-1 px-0.5' : 'gap-1.5 px-1'}`}
            >
              {ri === 3 && (
                <Key wide compact={compact} variant="func" onPress={symbols ? () => { setSymbols(false); tap('key'); } : tapShift}
                  title={symbols ? 'Back to letters' : caps ? 'Caps lock' : 'Shift'}>
                  {symbols ? 'abc' : caps
                    ? <ArrowBigUpDash className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                    : <ArrowBigUp className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} ${shift ? 'text-primary-500' : ''}`} />}
                </Key>
              )}
              {row.map((k) => (
                <Key key={k} compact={compact} label={symbols ? k : (shift || caps ? k.toUpperCase() : k)}
                  onPress={() => press(k)} />
              ))}
              {ri === 3 && (
                <Key wide compact={compact} variant="func" onPress={tapBackspace} title="Backspace">
                  <Delete className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
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
            <Key compact={compact} variant="func" label={symbols ? 'abc' : '#+='} onPress={() => { setSymbols((s) => !s); tap('key'); }} title="Symbols" />
            <Key big compact={compact} onPress={() => press(' ')} title="Space">
              <span className="text-gray-400 text-xs">space</span>
            </Key>
            {onSwitchToOS && (
              <Key compact={compact} variant="func" onPress={() => { onSwitchToOS(); tap('key'); }} title="Use device keyboard">
                <Keyboard className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
              </Key>
            )}
            <Key compact={compact} variant="func" onPress={() => { onClose(); tap('key'); }} title="Hide keyboard">
              <ChevronDown className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </Key>
            <Key wide compact={compact} variant="action" onPress={tapEnter} title="Enter">
              <CornerDownLeft className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </Key>
          </motion.div>
        </div>

        {/* corner resize grip */}
        <button
          type="button"
          tabIndex={-1}
          aria-label="Resize keyboard"
          onPointerDown={grabResize}
          onPointerMove={dragMove}
          onPointerUp={release}
          onPointerCancel={release}
          className="absolute bottom-0.5 right-0.5 p-1 text-gray-400 dark:text-gray-600
            cursor-nwse-resize rotate-90"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    </Portal>
  );
};

export default AnimatedKeyboard;
