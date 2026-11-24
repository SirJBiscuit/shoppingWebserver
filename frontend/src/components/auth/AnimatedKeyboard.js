import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Delete, ChevronDown, ChevronUp, CornerDownLeft, ArrowBigUp, ArrowBigUpDash,
  Keyboard, GripHorizontal, GripVertical,
} from 'lucide-react';
import { Portal, placeInViewport, useIsMobile } from '../../utils/autoPlacement';
import soundManager from '../../utils/soundEffects';

/**
 * AnimatedKeyboard — on-screen keyboard with physical key-cap feel.
 *
 * Two shells, same key grid:
 *  - Phones (<=768px): docked bottom sheet — where thumbs expect a kb.
 *  - Larger screens: floating popout — drag the handle anywhere,
 *    corner grip resizes, position+size persist per device.
 *
 * Both render through the autoPlacement Portal so `fixed` truly means
 * the viewport (transformed ancestors can't push it offscreen), and
 * floating positions clamp through placeInViewport.
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
  '-_=+[]{}/\\\''.split(''),
  ';:,.<>?|'.split(''),
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

// Landscape OR narrow phones get compact keys.
const fitsCompact = () => window.innerHeight < 520 || window.innerWidth < 400;

// units = width in "key units" — a letter key is 1, so rows stagger like a
// real keyboard instead of stretching shorter rows to full width.
// Presentational only — the grid's delegated pointer handlers fire keys,
// which also enables slide-to-type (swiping across keys types each one).
const Key = ({ kkey, label, units = 1, compact, variant = 'letter', pressed, children, title }) => (
  <motion.button
    type="button"
    title={title}
    data-kb-key={kkey}
    // Char keys (c:*) and space type when a swipe slides onto them.
    data-kb-char={kkey.startsWith('c:') || kkey === 'space' ? '1' : undefined}
    animate={pressed
      ? { y: -5, scale: 1.12, transition: { type: 'spring', stiffness: 900, damping: 15 } }
      : { y: 0, scale: 1, transition: { type: 'spring', stiffness: 500, damping: 25 } }}
    whileTap={{ y: -5, scale: 1.12 }}
    style={{ flex: units }}
    className={`${compact ? 'h-8' : 'h-10'} rounded-md select-none touch-none
      min-w-0 overflow-hidden ${compact ? 'text-xs' : 'text-sm'} font-medium flex items-center justify-center shrink
      bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100
      border border-gray-200 dark:border-gray-600
      shadow-[0_3px_0_rgba(0,0,0,0.18)] dark:shadow-[0_3px_0_rgba(0,0,0,0.5)]
      transition-[box-shadow,filter] duration-100
      ${pressed
        ? 'brightness-125 shadow-[0_0_14px_rgba(56,189,248,0.6)] ring-2 ring-primary-400 dark:ring-primary-500 border-primary-400'
        : ''}
      ${variant === 'action'
        ? 'bg-primary-600 text-white dark:bg-primary-600 border-primary-700'
        : variant === 'func'
          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'
          : ''}`}
  >
    {children || label}
  </motion.button>
);

// Half-key spacer that produces the qwerty stagger on shorter rows.
const Spacer = ({ units }) => <div style={{ flex: units }} className="shrink-0" />;

// Key grid — shared by the docked sheet and the floating popout.
// Real qwerty stagger: every row totals 10 "key units" (letter = 1 unit),
// so asdfghjkl sits offset under qwertyuiop like a physical keyboard.
// Slide-to-type: all firing is delegated to the grid's pointer handlers —
// dragging across the board types each char key the finger passes over.
const KeyGrid = ({ compact, onKey, onBackspace, onEnter, onClose, onSwitchToOS, tap }) => {
  const [shift, setShift] = useState(false); // sticky shift (one char), caps = double-tap
  const [caps, setCaps] = useState(false);
  const [symbols, setSymbols] = useState(false);
  const [swipeKey, setSwipeKey] = useState(null); // key under finger — pressed look
  const swiping = useRef(false);
  const lastKey = useRef(null);
  const lastTap = useRef(0);

  const press = (k) => {
    const out = symbols ? k : (shift || caps ? k.toUpperCase() : k);
    onKey(out);
    if (shift && !caps) setShift(false); // shift applies to one key, like a real kb
    tap('key');
  };
  const tapShift = () => {
    const now = Date.now();
    if (now - lastTap.current < 400) { setCaps((c) => !c); setShift(false); }
    else setShift((s) => !s);
    lastTap.current = now;
    tap('key');
  };

  const fire = (el) => {
    const id = el.dataset.kbKey;
    if (!id) return;
    if (id.startsWith('c:')) press(id.slice(2));
    else if (id === 'shift') { if (symbols) { setSymbols(false); tap('key'); } else tapShift(); }
    else if (id === 'back') { onBackspace(); tap('key'); }
    else if (id === 'space') press(' ');
    else if (id === 'sym') { setSymbols((s) => !s); tap('key'); }
    else if (id === 'oskb') { onSwitchToOS?.(); tap('key'); }
    else if (id === 'hide') { onClose(); tap('key'); }
    else if (id === 'enter') { onEnter(); tap('check'); }
  };

  const endSwipe = () => {
    swiping.current = false;
    lastKey.current = null;
    setSwipeKey(null);
    window.removeEventListener('pointerup', endSwipe);
    window.removeEventListener('pointercancel', endSwipe);
  };

  const onGridDown = (e) => {
    const el = e.target.closest?.('[data-kb-key]');
    if (!el) return;
    e.preventDefault(); // keep focus on the field being typed in
    swiping.current = true;
    lastKey.current = el.dataset.kbKey;
    setSwipeKey(el.dataset.kbKey);
    fire(el);
    window.addEventListener('pointerup', endSwipe);
    window.addEventListener('pointercancel', endSwipe);
  };

  const onGridMove = (e) => {
    if (!swiping.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-kb-key]');
    const id = el?.dataset.kbKey;
    if (!id || id === lastKey.current) return;
    lastKey.current = id;
    setSwipeKey(id);
    // Character keys + space type as the finger slides onto them; function
    // keys only fire on a direct touch — sliding over shift shouldn't toggle.
    if (el.dataset.kbChar) fire(el);
  };

  const rows = symbols ? ROWS_SYMBOLS : ROWS_LETTERS;
  const gap = compact ? 'gap-1 px-0.5' : 'gap-1.5 px-1';
  const ico = compact ? 'w-4 h-4' : 'w-5 h-5';
  // Bottom row: symbols-toggle + space + optional OS-kb switch + hide + enter.
  const enterUnits = 10 - 1.5 - 4.5 - 1 - (onSwitchToOS ? 1 : 0);

  return (
    // Keys are <button>s only for semantics — the grid owns the gesture.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className={compact ? 'space-y-1' : 'space-y-1.5'}
      onPointerDown={onGridDown}
      onPointerMove={onGridMove}
    >
      {rows.map((row, ri) => {
        // Row 2 indents half a key; row 3 gets shift/backspace sized to fill.
        const funcUnits = Math.max(0.75, (10 - row.length) / 2);
        return (
          <motion.div
            key={row.join('')}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04 * ri, duration: 0.18 }}
            className={`flex ${gap}`}
          >
            {ri === 2 && <Spacer units={0.5} />}
            {ri === 3 && (
              <Key kkey="shift" units={funcUnits} compact={compact} variant="func" pressed={swipeKey === 'shift'}
                title={symbols ? 'Back to letters' : caps ? 'Caps lock' : 'Shift'}>
                {symbols ? 'abc' : caps
                  ? <ArrowBigUpDash className={ico} />
                  : <ArrowBigUp className={`${ico} ${shift ? 'text-primary-500' : ''}`} />}
              </Key>
            )}
            {row.map((k) => (
              <Key key={k} kkey={`c:${k}`} compact={compact} pressed={swipeKey === `c:${k}`}
                label={symbols ? k : (shift || caps ? k.toUpperCase() : k)} />
            ))}
            {ri === 2 && <Spacer units={0.5} />}
            {ri === 3 && (
              <Key kkey="back" units={funcUnits} compact={compact} variant="func" pressed={swipeKey === 'back'} title="Backspace">
                <Delete className={ico} />
              </Key>
            )}
          </motion.div>
        );
      })}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.18 }}
        className={`flex ${gap}`}
      >
        <Key kkey="sym" units={1.5} compact={compact} variant="func" pressed={swipeKey === 'sym'}
          label={symbols ? 'abc' : '#+='} title="Symbols" />
        <Key kkey="space" units={4.5} compact={compact} pressed={swipeKey === 'space'} title="Space">
          <span className="text-gray-400 text-xs">space</span>
        </Key>
        {onSwitchToOS && (
          <Key kkey="oskb" units={1} compact={compact} variant="func" pressed={swipeKey === 'oskb'} title="Use device keyboard">
            <Keyboard className={ico} />
          </Key>
        )}
        <Key kkey="hide" units={1} compact={compact} variant="func" pressed={swipeKey === 'hide'} title="Hide keyboard">
          <ChevronDown className={ico} />
        </Key>
        <Key kkey="enter" units={enterUnits} compact={compact} variant="action" pressed={swipeKey === 'enter'} title="Enter">
          <CornerDownLeft className={ico} />
        </Key>
      </motion.div>
    </div>
  );
};

const AnimatedKeyboard = ({ onKey, onBackspace, onEnter, onClose, onSwitchToOS }) => {
  const isMobile = useIsMobile();
  const [compact, setCompact] = useState(fitsCompact);
  const kbHeight = compact ? 180 : 225;

  // A saved width can outlive the device it was resized on — never let the
  // popout exceed the viewport or the clamp can't pull it back on-screen.
  const [size, setSize] = useState(() =>
    Math.min(loadFloat()?.w || 360, window.innerWidth - 16));
  const [pos, setPos] = useState(() => {
    const saved = loadFloat();
    const w = Math.min(saved?.w || 360, window.innerWidth - 16);
    return placeInViewport(
      saved?.x ?? (window.innerWidth - w) / 2,
      saved?.y ?? window.innerHeight - 300,
      { width: w, height: kbHeight, margin: 8, offset: 0 }
    );
  });
  const rootRef = useRef(null);
  const drag = useRef(null);   // {dx, dy} while the handle is held
  const resize = useRef(null); // {startX, startW} while the corner is held
  const foldDrag = useRef(null); // {startY, done} while the grabber is held

  // Folded tray — the kb hides everything but a grabber bar; pull it back
  // up (or tap it) to get the keys. State persists per device.
  const [collapsed, setCollapsed] = useState(() => !!loadFloat()?.c);
  const setColl = (v) => {
    setCollapsed(v);
    const f = loadFloat() || {};
    saveFloat({ x: f.x ?? pos.x, y: f.y ?? pos.y, w: f.w ?? size, c: v });
  };

  // Pull gesture on the grabber: drag down folds, drag up (or tap) unfolds.
  const grabFold = (e) => {
    e.preventDefault();
    foldDrag.current = { startY: e.clientY, done: false };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const foldMove = (e) => {
    const d = foldDrag.current;
    if (!d || d.done) return;
    const dy = e.clientY - d.startY;
    if (!collapsed && dy > 36) { d.done = true; setColl(true); }
    else if (collapsed && dy < -16) { d.done = true; setColl(false); }
  };
  const foldRelease = (e) => {
    const d = foldDrag.current;
    if (d && collapsed && !d.done && Math.abs(e.clientY - d.startY) < 8) setColl(false);
    foldDrag.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };

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
      const w = Math.min(MAX_W, window.innerWidth - 16,
        Math.max(MIN_W, resize.current.startW + e.clientX - resize.current.startX));
      setSize(w);
      setPos((p) => clampPos(p.x, p.y));
    }
  };
  const release = (e) => {
    if (drag.current || resize.current) {
      drag.current = null;
      resize.current = null;
      setPos((p) => { saveFloat({ x: p.x, y: p.y, w: size, c: collapsed }); return p; });
    }
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  };
  const grabResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    resize.current = { startX: e.clientX, startW: size };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Key feedback — 'key' is a 25ms synthesized tick; honors sound prefs.
  const tap = (sound = 'key') => {
    soundManager.play(sound);
    if (navigator.vibrate) { try { navigator.vibrate(4); } catch { /* optional */ } }
  };

  const grid = (
    <KeyGrid
      compact={compact}
      onKey={onKey}
      onBackspace={onBackspace}
      onEnter={onEnter}
      onClose={onClose}
      onSwitchToOS={onSwitchToOS}
      tap={tap}
    />
  );

  // Phones — docked bottom sheet. This is where thumbs expect a keyboard;
  // making it draggable here just gets in the way.
  if (isMobile) {
    return (
      <Portal>
        <motion.div
          data-animated-kb
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`fixed bottom-0 left-0 right-0 z-[95] w-full overflow-hidden touch-none select-none
            ${compact ? 'p-1' : 'p-2'} pb-[max(0.5rem,env(safe-area-inset-bottom))]
            bg-gray-100/95 dark:bg-gray-900/95 backdrop-blur-md
            border-t border-gray-300 dark:border-gray-700 shadow-2xl`}
        >
          {/* Grabber — drag down to fold into a tray, pull up / tap to unfold */}
          <button
            type="button"
            tabIndex={-1}
            aria-label={collapsed ? 'Expand keyboard' : 'Collapse keyboard'}
            onPointerDown={grabFold}
            onPointerMove={foldMove}
            onPointerUp={foldRelease}
            onPointerCancel={foldRelease}
            className="w-full h-5 mb-0.5 flex items-center justify-center cursor-ns-resize
              text-gray-400 dark:text-gray-500"
          >
            {collapsed
              ? <ChevronUp className="w-4 h-4" />
              : <span className="w-9 h-1 rounded-full bg-gray-400/60 dark:bg-gray-500/60" />}
          </button>
          {!collapsed && <div className="max-w-md w-full min-w-0 mx-auto">{grid}</div>}
        </motion.div>
      </Portal>
    );
  }

  // Larger screens — floating popout.
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
        <div className={`w-full flex items-stretch
          ${compact ? 'h-6' : 'h-8'} text-gray-400 dark:text-gray-500
          bg-gray-200/70 dark:bg-gray-800/70 border-b border-gray-300 dark:border-gray-700`}
        >
          <button
            type="button"
            tabIndex={-1}
            aria-label="Drag keyboard"
            onPointerDown={grab}
            onPointerMove={dragMove}
            onPointerUp={release}
            onPointerCancel={release}
            className="flex-1 flex items-center justify-center cursor-grab active:cursor-grabbing"
          >
            <GripHorizontal className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
          </button>
          <button
            type="button"
            tabIndex={-1}
            aria-label={collapsed ? 'Expand keyboard' : 'Fold keyboard'}
            title={collapsed ? 'Expand keyboard' : 'Fold keyboard'}
            onClick={() => setColl(!collapsed)}
            className="px-2.5 flex items-center justify-center hover:text-gray-600 dark:hover:text-gray-300"
          >
            {collapsed
              ? <ChevronUp className="w-4 h-4" />
              : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
        {!collapsed && <div className={compact ? 'p-1' : 'p-1.5'}>{grid}</div>}
        {!collapsed && (
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
        )}
      </motion.div>
    </Portal>
  );
};

export default AnimatedKeyboard;
