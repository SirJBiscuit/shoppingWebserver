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
          className={`fixed inset-x-0 bottom-0 rounded-t-2xl shadow-2xl max-h-[72vh] overflow-y-auto ${className} ${sheetClassName}`}
          style={style}
        >
          <div className="mx-auto mt-2 mb-1 h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          {children}
        </div>
      ) : (
        <div
          ref={ref}
          className={`fixed ${className}`}
          style={{ left: pos.x, top: pos.y, ...style }}
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

export default Portal;
