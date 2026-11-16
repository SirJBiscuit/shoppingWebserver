import { useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/** Mobile/tablet breakpoint (px) — matches Tailwind `md`. */
export const MOBILE_BREAKPOINT = 768;

const subscribeWidth = (cb) => {
  window.addEventListener('resize', cb);
  return () => window.removeEventListener('resize', cb);
};

/**
 * True when the viewport is below `bp` (default 768px — phones & small tablets).
 * Reactive: re-renders on window resize.
 */
export const useIsMobile = (bp = MOBILE_BREAKPOINT) =>
  useSyncExternalStore(subscribeWidth, () => window.innerWidth < bp, () => false);

/**
 * AutoPlacement — centralized "GUI placement" API for popups, menus and modals.
 *
 * Why it exists:
 *  - `position: fixed` resolves against the nearest ancestor with a
 *    transform/filter/perspective — framer-motion wrappers make menus open
 *    "out of place". <Portal> escapes that entirely by rendering into body.
 *  - placeInViewport / useAutoPlacement clamp + flip coordinates so a popup
 *    always lands fully on screen, measured against its REAL size.
 *
 * Usage:
 *   const { pos, ref } = useAutoPlacement(e.clientX, e.clientY, { width: 240 });
 *   <Portal><div ref={ref} className="fixed z-[90]" style={{ left: pos.x, top: pos.y }}>...</div></Portal>
 *
 *   <Popup x={x} y={y} width={240} className="...">…</Popup>  // all-in-one
 */

/** Render children at document.body so `fixed` always means the viewport. */
export const Portal = ({ children }) => createPortal(children, document.body);

/**
 * Clamp an (x, y) point so a `width`×`height` popup stays inside the viewport.
 *
 * @param {number} x       desired left (e.g. mouse clientX)
 * @param {number} y       desired top  (e.g. mouse clientY)
 * @param {object} opts
 *   width/height {number} estimated popup size
 *   margin       {number} min distance from viewport edge (default 8)
 *   offset       {number} gap added below the anchor point (default 4)
 *   anchorEl     {Element} prefer keeping the popup inside this container,
 *                          falling back to the viewport when it doesn't fit
 */
export const placeInViewport = (x, y, opts = {}) => {
  const {
    width = 220,
    height = 320,
    margin = 8,
    offset = 4,
    anchorEl = null,
  } = opts;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let px = x;
  let py = y + offset;

  // Prefer staying inside a scope container (e.g. a panel) when one is given
  const rect = anchorEl?.getBoundingClientRect?.();
  if (rect && rect.width > 40 && rect.height > 40) {
    if (px + width > rect.right - margin) px = Math.max(rect.left + margin, px - width + 12);
    if (py + height > rect.bottom - margin) py = Math.max(rect.top + margin, py - height - offset - 12);
  }

  // Horizontal clamp — flip left of the cursor if needed, then hard-clamp
  if (px + width > vw - margin) px = Math.max(margin, x - width);
  if (px < margin) px = margin;
  px = Math.min(px, vw - width - margin);

  // Vertical clamp — flip above the cursor if needed, then hard-clamp
  if (py + height > vh - margin) py = Math.max(margin, y - height);
  if (py < margin) py = margin;
  py = Math.min(py, vh - height - margin);

  return { x: Math.round(px), y: Math.round(py) };
};

/**
 * Hook form of placeInViewport. Pass the raw anchor point once; the returned
 * `ref` measures the real popup after mount and re-clamps it in the same
 * layout pass (no visible jump).
 */
export const useAutoPlacement = (x, y, opts = {}) => {
  const ref = useRef(null);
  const isMobile = useIsMobile(opts.breakpoint);
  const [pos, setPos] = useState(() => placeInViewport(x, y, opts));
  // keep latest opts/x/y for the layout pass
  const args = useRef({ x, y, opts });
  args.current = { x, y, opts };

  useLayoutEffect(() => {
    if (!ref.current || isMobile) return undefined;
    const measure = () => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const { x: dx, y: dy, opts: o } = args.current;
      const next = placeInViewport(dx, dy, { ...o, width: r.width, height: r.height });
      setPos(prev => (prev.x !== next.x || prev.y !== next.y ? next : prev));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [x, y, isMobile]);

  return { pos, ref, isMobile };
};

/**
 * All-in-one fixed-position popup: portal + placement + ref measurement.
 * On small screens (or when `sheet` is forced) it becomes a bottom sheet
 * instead of a pointer-anchored popup.
 *
 * Props: x, y, width?, height?, margin?, offset?, anchorEl?, breakpoint?,
 *        sheet? — 'auto' (default) | true | false
 *        className — extra classes for the wrapper (popup mode: merged after
 *        `fixed`; sheet mode: merged into the sheet panel)
 *        sheetClassName — extra classes only applied in sheet mode
 *        style, children
 */
export const Popup = ({
  x = 0, y = 0, className = '', sheetClassName = '', style = {}, children, ...opts
}) => {
  const { pos, ref, isMobile } = useAutoPlacement(x, y, {
    width: opts.width ?? 240,
    height: opts.height ?? 320,
    margin: opts.margin,
    offset: opts.offset,
    anchorEl: opts.anchorEl,
    breakpoint: opts.breakpoint,
  });
  const sheet = opts.sheet === true || (opts.sheet !== false && isMobile);

  return (
    <Portal>
      {sheet ? (
        <div
          ref={ref}
          data-ap-overlay
          className={`fixed inset-x-0 bottom-0 rounded-t-2xl shadow-2xl max-h-[72vh] overflow-y-auto ${className} ${sheetClassName}`}
          style={style}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          {children}
        </div>
      ) : (
        <div
          ref={ref}
          data-ap-overlay
          className={`fixed ${className}`}
          style={{ left: pos.x, top: pos.y, ...style }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      )}
    </Portal>
  );
};

/**
 * Modal convenience — centered fixed overlay + panel through a Portal.
 * `sheet` slides the panel to the bottom edge on small screens (or always
 * when sheet === true).
 */
export const ModalPortal = ({
  onClose, panelClassName = '', backdropClassName = '', sheet = 'auto', children,
}) => {
  const isMobile = useIsMobile();
  const asSheet = sheet === true || (sheet === 'auto' && isMobile);
  return (
    <Portal>
      <div
        data-ap-overlay
        className={`fixed inset-0 bg-black/50 flex z-[80] p-0 sm:p-4 ${
          asSheet ? 'items-end justify-center' : 'items-center justify-center'
        } ${backdropClassName}`}
        onClick={onClose}
      >
        <div
          className={`${asSheet ? 'w-full rounded-t-2xl max-h-[85vh] overflow-y-auto' : ''} ${panelClassName}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
};

// ---------------------------------------------------------------------------
// Corner stacks — custom placement API for fixed button columns
// ---------------------------------------------------------------------------
// Named stacks publish how much vertical space they occupy measured from the
// viewport bottom to the stack's TOP edge. Columns sitting above read the
// cumulative height of the stacks below them, so buttons never overlap no
// matter how many controls each stack shows or hides.
//
//   useCornerStack('beta', ref, visible)   — a stack publishes its height
//   useCornerOffset(['beta'])              — a column reads what's below it
//   setPanelShift(px) / usePanelShift()    — shared horizontal shift so every
//                                            column slides together when a
//                                            side panel opens

const stackHeights = new Map(); // name → px occupied from viewport bottom
const stackSubs = new Set();
// Named shift sources — a side panel slides every corner column left while
// it's open. Multiple panels can coexist; columns move by the largest shift.
const panelShifts = new Map(); // source → px

const notifyStacks = () => { stackSubs.forEach((cb) => cb()); };

const belowHeight = (below) =>
  below.reduce((n, name) => n + (stackHeights.get(name) || 0), 0);

export const setCornerStack = (name, px) => {
  const v = Math.max(0, Math.round(px));
  if (stackHeights.get(name) === v) return;
  stackHeights.set(name, v);
  notifyStacks();
};

export const clearCornerStack = (name) => setCornerStack(name, 0);

/** Sum of the heights published by the named stacks below this column. */
export const useCornerOffset = (below) =>
  useSyncExternalStore(
    (cb) => { stackSubs.add(cb); return () => stackSubs.delete(cb); },
    () => belowHeight(below)
  );

/**
 * Measure a stack element and publish its occupied height while `active`.
 * When inactive/unmounted it publishes 0 so columns above drop back down.
 */
export const useCornerStack = (name, ref, active, deps = []) => {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) { clearCornerStack(name); return undefined; }
    const publish = () =>
      setCornerStack(name, window.innerHeight - el.getBoundingClientRect().top);
    publish();
    const ro = new ResizeObserver(publish);
    ro.observe(el);
    window.addEventListener('resize', publish);
    return () => { ro.disconnect(); window.removeEventListener('resize', publish); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, active, ...deps]);
  useLayoutEffect(() => () => clearCornerStack(name), [name]);
};

/** Shared horizontal shift (px) applied to every corner column — set by a
 *  side panel (identified by `source`) so stacks slide out from underneath
 *  it. The effective shift is the MAX across active sources. */
export const setPanelShift = (source, px) => {
  const v = Math.max(0, Math.round(px));
  const prev = panelShifts.get(source) || 0;
  if (prev === v) return;
  if (v) panelShifts.set(source, v); else panelShifts.delete(source);
  notifyStacks();
};

const maxPanelShift = () => {
  let m = 0;
  panelShifts.forEach((v) => { if (v > m) m = v; });
  return m;
};

export const usePanelShift = () =>
  useSyncExternalStore(
    (cb) => { stackSubs.add(cb); return () => stackSubs.delete(cb); },
    maxPanelShift
  );

/** Max shift across active sources EXCLUDING `exclude` — a side panel uses
 *  this to slide left of OTHER open panels without reacting to its own
 *  registered shift source. */
export const usePanelShiftExcept = (exclude) =>
  useSyncExternalStore(
    (cb) => { stackSubs.add(cb); return () => stackSubs.delete(cb); },
    () => {
      let m = 0;
      panelShifts.forEach((v, k) => { if (k !== exclude && v > m) m = v; });
      return m;
    }
  );

// ---------------------------------------------------------------------------
// Connector — the pin-layer line API, generalized.
// Draws a dashed tether between two viewport points plus a pulsing ring on
// `from`. Use it anywhere a floating card/popup needs to point back at the
// element it belongs to (pins, tooltips, inspectors, callouts).
//
//   <Connector from={{x,y}} to={{x,y}} color="#f43f5e" zIndex={56} />
export const Connector = ({ from, to, color = '#38bdf8', zIndex = 56, line = true, ring = true }) => {
  if (!from || !to) return null;
  return (
    <svg
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex }}
      width="100%" height="100%"
    >
      {line && (
        <line
          x1={from.x} y1={from.y} x2={to.x} y2={to.y}
          stroke={color} strokeWidth="2" strokeDasharray="5 4"
          strokeLinecap="round" opacity="0.85"
        />
      )}
      {ring && (
        <>
          <circle
            cx={from.x} cy={from.y} r="13"
            fill="none" stroke={color} strokeWidth="2.5" opacity="0.9"
          />
          <circle
            cx={from.x} cy={from.y} r="13"
            fill="none" stroke={color} strokeWidth="2"
          >
            <animate attributeName="r" values="13;26" dur="1.4s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.7;0" dur="1.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
    </svg>
  );
};

// ---------------------------------------------------------------------------
// Shared floating-column side — ONE switch moves every corner column
// (apps/active-list stack, beta stack, admin sidebar) between the left and
// right edge together. Persisted; `fallback` wins until the user picks a side.
const FLOAT_SIDE_KEY = 'floatSide';
let floatSide = null;
try { floatSide = localStorage.getItem(FLOAT_SIDE_KEY) || null; } catch { /* ignore */ }

export const setFloatSide = (side) => {
  const v = side === 'left' || side === 'right' ? side : null;
  if (floatSide === v) return;
  floatSide = v;
  try {
    if (v) localStorage.setItem(FLOAT_SIDE_KEY, v);
    else localStorage.removeItem(FLOAT_SIDE_KEY);
  } catch { /* ignore */ }
  notifyStacks();
};

export const useFloatSide = (fallback = 'right') =>
  useSyncExternalStore(
    (cb) => { stackSubs.add(cb); return () => stackSubs.delete(cb); },
    () => floatSide || fallback
  );

// ---------------------------------------------------------------------------
// ScrollStrip — automatic GUI arrangement for horizontal rows.
//
// Drop-in replacement for `flex` rows (tab bars, filter chips, toolbars,
// action rows) that must NEVER clip off-screen:
//   - children fit        → looks exactly like a normal flex row
//   - children overflow   → becomes a drag/wheel/touch scroll-strip with
//                           edge fades, so every item stays reachable
//
// Handles all three input modes so it's desktop/tablet/mobile safe:
//   mouse   → click-drag anywhere on the strip + wheel scrolls horizontally
//   touch   → native horizontal swiping (drag logic is mouse-only so it
//             never fights the browser's own touch scrolling)
//
// Props:
//   activeIndex {number|null} scroll this child into view when it changes
//   arrows      {bool}        show ‹ › nudge buttons on overflowing edges
//   fade        {number}      edge fade width in px (default 20)
//   className   applied to the outer wrapper (keep it `min-w-0` friendly —
//               e.g. `flex-1 min-w-0` inside a flex header)
//   innerClassName  applied to the scrolling row itself (gaps, padding)
//
//   <ScrollStrip className="flex-1 min-w-0" innerClassName="gap-2" arrows>
//     {tabs.map((t) => <button … />)}
//   </ScrollStrip>
// ---------------------------------------------------------------------------
export const ScrollStrip = ({
  children, className = '', innerClassName = '',
  activeIndex = null, arrows = false, fade = 20, style = {},
}) => {
  const ref = useRef(null);
  const drag = useRef({ down: false, moved: false, x: 0, left: 0 });
  const [edges, setEdges] = useState({ left: false, right: false });
  const [grabbing, setGrabbing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => {
      const left = el.scrollLeft > 4;
      const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
      setEdges((p) => (p.left === left && p.right === right ? p : { left, right }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    [...el.children].forEach((c) => ro.observe(c));
    el.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
    };
  }, [children]);

  // Wheel → horizontal (React's onWheel is passive; attach manually so we
  // can preventDefault only when the strip actually consumed the scroll).
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onWheel = (e) => {
      if (el.scrollWidth <= el.clientWidth) return;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const before = el.scrollLeft;
      el.scrollLeft += d;
      if (el.scrollLeft !== before) e.preventDefault();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  // Keep the active item visible when it changes (e.g. switching tabs).
  useLayoutEffect(() => {
    if (activeIndex == null) return;
    const child = ref.current?.children?.[activeIndex];
    child?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [activeIndex]);

  const mask = edges.left && edges.right
    ? `linear-gradient(to right, transparent, black ${fade}px, black calc(100% - ${fade}px), transparent)`
    : edges.left
      ? `linear-gradient(to right, transparent, black ${fade}px)`
      : edges.right
        ? `linear-gradient(to right, black calc(100% - ${fade}px), transparent)`
        : undefined;

  const nudge = (dir) =>
    ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.6, behavior: 'smooth' });

  const chevron = (dir) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      {dir < 0 ? <path d="M15 18l-6-6 6-6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );

  return (
    <div className={`relative min-w-0 ${className}`} style={style}>
      <div
        ref={ref}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          drag.current = { down: true, moved: false, x: e.clientX, left: ref.current.scrollLeft };
        }}
        onPointerMove={(e) => {
          if (!drag.current.down) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 4) drag.current.moved = true;
          if (drag.current.moved) {
            ref.current.scrollLeft = drag.current.left - dx;
            if (!grabbing) setGrabbing(true);
          }
        }}
        onPointerUp={() => { drag.current.down = false; setGrabbing(false); }}
        onPointerCancel={() => { drag.current.down = false; setGrabbing(false); }}
        onPointerLeave={() => { drag.current.down = false; setGrabbing(false); }}
        onClickCapture={(e) => {
          // Swallow the click that ends a drag so buttons don't fire
          if (drag.current.moved) {
            e.preventDefault(); e.stopPropagation();
            drag.current.moved = false;
          }
        }}
        className={`flex items-center flex-nowrap overflow-x-auto select-none [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden ${innerClassName}`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          touchAction: 'pan-x pan-y',
          cursor: grabbing ? 'grabbing' : undefined,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      >
        {children}
      </div>
      {arrows && edges.left && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 shadow"
          aria-label="Scroll left"
        >{chevron(-1)}</button>
      )}
      {arrows && edges.right && (
        <button
          type="button"
          onClick={() => nudge(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-1 rounded-full bg-slate-800/90 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 shadow"
          aria-label="Scroll right"
        >{chevron(1)}</button>
      )}
    </div>
  );
};

export default Portal;
