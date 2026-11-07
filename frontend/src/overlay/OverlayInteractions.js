/**
 * OverlayInteractions — the app's unified interaction/overlay API.
 *
 * Mount <OverlayInteractionProvider> once (App.js). Any component then gets:
 *
 *   const oi = useOverlay();
 *   oi.openMenu({ x, y, title, items|render, payload, scopeEl, palette, width })
 *   oi.close() · oi.patch({...}) · oi.menu
 *
 * Gestures on any element:
 *   useOverlayTarget(ref, {
 *     contextMenu | onContextMenu,   // right-click; long-hold auto-fires it on touch/pen
 *     onTap, onDoubleTap,            // quick taps
 *     onHold, onLongHold,            // 350ms / 650ms (configurable)
 *     onSwipe,                       // left/right/up/down fling
 *     onPinch, onPinchIn, onPinchOut,// two-finger pinch, scale delta + center
 *     onDrag, onDragEnd,             // movement past threshold
 *     holdMs, longHoldMs, swipePx,
 *   })
 *
 * Hotkey/wheel registry (window-level capture — survives browser zoom handlers):
 *   useOverlayHotkeys({
 *     'ctrl+wheel':        (e) => ...,   // notepad zoom
 *     'ctrl+shift+wheel':  (e) => ...,   // text scale
 *     'ctrl+alt+wheel':    (e) => ...,   // UI scale
 *     'ctrl+f':            (e) => ...,
 *     'escape':            (e) => ...,
 *   }, { scopeRef, enabled })
 *
 * Convenience:
 *   useContextMenu(ref, (e) => itemsOrOpts)   // right-click + long-hold
 *   usePinch(ref, (scale, center) => ...)     // pinch in/out
 *   useHoldMenu(ref, itemsProvider)           // explicit long-hold menu only
 *
 * Menu item model (declarative `items`):
 *   oiRow({ icon, label, tint, danger, checked, disabled, hint, onClick, submenu })
 *   oiHeader(label, tint) · oiSep() · oiCustom(render)
 *   …or pass `render: (payload) => JSX` for fully custom bodies (Notepad does this).
 *
 * Palette (per-menu): { panel, text, muted, hover, side } — all CSS classes.
 */
import React, {
  createContext, useContext, useCallback, useEffect, useLayoutEffect,
  useMemo, useRef, useState,
} from 'react';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import AnimatedScrollbar3D from '../components/3DAnimatedScrollbar';

/* ============================== item factories ============================== */
export const oiRow    = (o) => ({ type: 'row', ...o });
export const oiHeader = (label, tint) => ({ type: 'header', label, tint });
export const oiSep    = () => ({ type: 'sep' });
export const oiCustom = (render) => ({ type: 'custom', render });
export const oiSub    = (label, icon, submenu, o = {}) => ({ type: 'row', label, icon, submenu, ...o });

/* ============================== context ===================================== */
const OIContext = createContext(null);
/** Overlay API — openMenu/close/patch/menu/stack nav. Throws outside provider. */
export const useOverlay = () => {
  const ctx = useContext(OIContext);
  if (!ctx) throw new Error('useOverlay must be used inside <OverlayInteractionProvider>');
  return ctx;
};

const useBreakpoint = (px = 640) => {
  const [m, setM] = useState(() => window.innerWidth < px);
  useEffect(() => {
    const h = () => setM(window.innerWidth < px);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, [px]);
  return m;
};

const DEFAULT_PALETTE = {
  panel: 'bg-gray-900/95 border-gray-600/60 text-gray-100',
  text: 'text-gray-100',
  muted: 'text-gray-400',
  hover: 'hover:bg-white/10',
  side: 'border-gray-600/60',
};

/* ============================== provider ==================================== */
export function OverlayInteractionProvider({ children }) {
  const [menu, setMenu] = useState(null);   // { x,y,title,items,render,payload,width,scopeEl,palette,draggable,id }
  const [stack, setStack] = useState([]);   // submenu stack (arrays of items)
  const menuDrag = useDragControls();
  const menuRef = useRef(null);
  const isMobile = useBreakpoint();
  const idRef = useRef(0);

  const openMenu = useCallback((m) => {
    const W = m.width || 208, H = m.height || 380;
    let { x = window.innerWidth / 2, y = window.innerHeight / 2 } = m;
    // pre-flip against the scope container (e.g. the notepad panel) then the viewport
    const r = m.scopeEl?.getBoundingClientRect?.();
    if (r) {
      if (x + W > r.right - 4) x = Math.max(r.left + 4, x - W + 10);
      if (y + H > r.bottom - 4) y = Math.max(r.top + 4, y - H + 10);
    }
    x = Math.max(4, Math.min(x, window.innerWidth - W - 4));
    y = Math.max(4, Math.min(y, window.innerHeight - 100));
    setStack([]);
    setMenu({ ...m, x, y, id: ++idRef.current });
  }, []);

  const close  = useCallback(() => { setMenu(null); setStack([]); }, []);
  const patch  = useCallback((p) => setMenu((m) => (m ? { ...m, ...p } : m)), []);
  const pushSub = useCallback((items, title) => setStack((s) => [...s, { items, title }]), []);
  const popSub  = useCallback(() => setStack((s) => s.slice(0, -1)), []);

  /* post-mount exact clamp — measure real menu size once it renders */
  useLayoutEffect(() => {
    if (!menu || !menuRef.current || isMobile) return;
    const r = menuRef.current.getBoundingClientRect();
    const nx = Math.max(4, Math.min(menu.x, window.innerWidth - r.width - 4));
    const ny = Math.max(4, Math.min(menu.y, window.innerHeight - r.height - 4));
    if (nx !== menu.x || ny !== menu.y) setMenu((m) => (m ? { ...m, x: nx, y: ny } : m));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menu?.id]);

  const api = useMemo(() => ({
    openMenu, close, patch, pushSub, popSub, menu, isMobile,
  }), [openMenu, close, patch, pushSub, popSub, menu, isMobile]);

  return (
    <OIContext.Provider value={api}>
      {children}
      <OIHost
        menu={menu} stack={stack} isMobile={isMobile}
        menuDrag={menuDrag} menuRef={menuRef}
        onClose={close} onPatch={patch} onPush={pushSub} onPop={popSub}
      />
    </OIContext.Provider>
  );
}

/* ============================== menu host =================================== */
const OIHost = ({ menu, stack, isMobile, menuDrag, menuRef, onClose, onPatch, onPush, onPop }) => {
  if (!menu) return null;
  const pal = { ...DEFAULT_PALETTE, ...(menu.palette || {}) };
  const cur = stack.length ? stack[stack.length - 1] : null;
  const body = cur ? cur.items : menu.items;

  return (
    <>
      {/* backdrop — click/right-click closes */}
      <div
        className="fixed inset-0 z-[80]"
        onClick={onClose}
        onContextMenu={(e) => { e.preventDefault(); onClose(); }}
      />
      <AnimatePresence>
        <motion.div
          key={`oi-menu-${menu.id}`}
          ref={menuRef}
          drag={!isMobile && menu.draggable !== false}
          dragControls={menuDrag}
          dragListener={false}
          dragMomentum={false}
          onDragEnd={(_, info) => onPatch({ x: menu.x + info.offset.x, y: menu.y + info.offset.y })}
          initial={isMobile ? { y: 80, opacity: 0 } : { scale: 0.9, opacity: 0 }}
          animate={isMobile ? { y: 0, opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={isMobile ? { y: 80, opacity: 0 } : { scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
          className={isMobile
            ? `fixed inset-x-0 bottom-0 z-[90] rounded-t-2xl border-t-2 shadow-2xl ${pal.panel}`
            : `fixed top-0 left-0 z-[90] rounded-lg border shadow-2xl ${pal.panel}`}
          style={isMobile
            ? { maxHeight: '62vh' }
            : { left: 0, top: 0, x: menu.x, y: menu.y, width: menu.width || 208 }}
        >
          {/* title strip — drag handle on desktop */}
          {menu.title !== null && (
            <div
              onPointerDown={!isMobile ? (e) => { e.stopPropagation(); menuDrag.start(e); } : undefined}
              className={`flex items-center justify-between px-3 py-1.5 border-b ${pal.side} ${isMobile ? '' : 'cursor-grab active:cursor-grabbing'}`}
            >
              {cur ? (
                <button onClick={onPop} className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${pal.muted}`}>
                  <ChevronLeft className="w-3 h-3" /> {cur.title || 'Back'}
                </button>
              ) : (
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-sky-400 via-amber-300 to-fuchsia-400 bg-clip-text text-transparent">
                  {menu.title || 'Menu'}
                </span>
              )}
              <button onClick={onClose} className={`${pal.muted} ${pal.hover} rounded p-0.5`}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          <AnimatedScrollbar3D maxHeight={isMobile ? '52vh' : (menu.maxH || '300px')} autoHide={false}>
            <div className="py-1 pb-3">
              {menu.render
                ? menu.render(menu.payload, { close: onClose, patch: onPatch })
                : <OIItems items={body || []} pal={pal} onClose={onClose} onPush={onPush} />}
            </div>
          </AnimatedScrollbar3D>
        </motion.div>
      </AnimatePresence>
    </>
  );
};

/* declarative item renderer */
const OIItems = ({ items, pal, onClose, onPush }) => (
  <>
    {items.map((it, i) => {
      if (it.type === 'sep') return <div key={i} className={`my-1 border-t ${pal.side}`} />;
      if (it.type === 'header') {
        return (
          <div key={i} className="px-3 pt-1.5 pb-0.5 text-[9px] font-black uppercase tracking-widest" style={{ color: it.tint || '#8ab' }}>
            {it.label}
          </div>
        );
      }
      if (it.type === 'custom') return <React.Fragment key={i}>{it.render({ close: onClose })}</React.Fragment>;
      const Icon = it.icon;
      return (
        <button
          key={i}
          disabled={it.disabled}
          onClick={() => {
            if (it.submenu) { onPush(it.submenu, it.label); return; }
            it.onClick?.();
            if (it.closeOnClick !== false) onClose();
          }}
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs ${pal.text} ${it.disabled ? 'opacity-40' : pal.hover} ${it.danger ? 'text-red-400' : ''}`}
        >
          {Icon && <Icon className="w-3.5 h-3.5" style={{ color: it.tint }} />}
          <span className="flex-1 text-left">{it.label}</span>
          {it.checked && <Check className="w-3.5 h-3.5" />}
          {it.hint && <span className={`text-[9px] ${pal.muted}`}>{it.hint}</span>}
          {it.submenu && <ChevronRight className={`w-3.5 h-3.5 ${pal.muted}`} />}
        </button>
      );
    })}
  </>
);

/* ============================== gestures ==================================== */
const mk = (e) => ({
  x: e.clientX, y: e.clientY,
  target: e.target,
  pointerType: e.pointerType || 'mouse',
  original: e,
});

/**
 * Unified pointer-gesture engine for an element.
 * Right-click fires onContextMenu + contextMenu; on touch/pen a long-hold fires the
 * same menu so mobile gets the desktop right-click experience for free.
 */
export function useOverlayTarget(targetRef, cfg = {}) {
  const oi = useOverlay();
  const cfgRef = useRef(cfg);
  cfgRef.current = cfg;
  const pts = useRef(new Map());
  const timers = useRef({ hold: null, long: null });
  const start = useRef(null);
  const pinchDist = useRef(0);
  const firedLong = useRef(false);
  const lastTap = useRef(0);

  useEffect(() => {
    if (cfg.enabled === false) return undefined;
    const el = targetRef.current;
    if (!el) return undefined;
    const C = () => cfgRef.current;
    const clearTimers = () => {
      clearTimeout(timers.current.hold); clearTimeout(timers.current.long);
      timers.current.hold = timers.current.long = null;
    };
    const fireMenu = (e) => {
      const c = C();
      const spec = typeof c.contextMenu === 'function' ? c.contextMenu(mk(e)) : c.contextMenu;
      if (spec) oi.openMenu({ x: e.clientX, y: e.clientY, scopeEl: el, ...spec });
    };

    const down = (e) => {
      if (e.button === 2) return;                       // contextmenu event handles right-click
      pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
      firedLong.current = false;
      const c = C();
      if (pts.current.size === 2) {
        clearTimers();
        const [a, b] = [...pts.current.values()];
        pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
        c.onPinchStart?.(mk(e));
        return;
      }
      if (pts.current.size !== 1) return;
      if (c.onHold || c.onLongHold || c.contextMenu) {
        const isMouse = e.pointerType === 'mouse';
        timers.current.hold = setTimeout(() => c.onHold?.(mk(e)), c.holdMs ?? 350);
        timers.current.long = setTimeout(() => {
          firedLong.current = true;
          c.onLongHold?.(mk(e));
          // touch/pen long-hold ≈ right-click; mouse holds only via explicit opt-in
          if (c.contextMenu && (!isMouse || c.mouseHold)) fireMenu(e);
        }, c.longHoldMs ?? 650);
      }
    };

    const move = (e) => {
      const p = pts.current.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;
      const s = start.current;
      if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) {
        clearTimers();
        C().onDrag?.({ dx: e.clientX - s.x, dy: e.clientY - s.y, ...mk(e) });
      }
      // pinch — two tracked pointers, distance ratio
      if (pts.current.size === 2) {
        const [a, b] = [...pts.current.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist.current > 4) {
          const scale = d / pinchDist.current;
          if (Math.abs(scale - 1) > 0.004) {
            const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            const c = C();
            c.onPinch?.(scale, center, e);
            if (scale > 1) c.onPinchOut?.(scale, center, e); else c.onPinchIn?.(scale, center, e);
            pinchDist.current = d;
          }
        } else pinchDist.current = d;
      }
    };

    const up = (e) => {
      pts.current.delete(e.pointerId);
      clearTimers();
      const s = start.current;
      if (s && pts.current.size === 0 && !firedLong.current) {
        const dx = e.clientX - s.x, dy = e.clientY - s.y;
        const dist = Math.hypot(dx, dy), dt = Date.now() - s.t;
        const c = C();
        if (dist > (c.swipePx ?? 40) && dt < 600) {
          const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
          c.onSwipe?.(dir, mk(e));
        } else if (dist < 10 && dt < 300) {
          const now = Date.now();
          if (now - lastTap.current < 350) c.onDoubleTap?.(mk(e));
          else c.onTap?.(mk(e));
          lastTap.current = now;
        }
      }
      if (pts.current.size < 2) pinchDist.current = 0;
      C().onDragEnd?.(mk(e));
      start.current = null;
    };

    const ctxm = (e) => {
      C().onContextMenu?.(e);
      if (C().contextMenu) {
        // resolve spec BEFORE suppressing the native menu — null = let browser have it
        const spec = typeof C().contextMenu === 'function' ? C().contextMenu(mk(e)) : C().contextMenu;
        if (spec) { e.preventDefault(); e.stopPropagation(); oi.openMenu({ x: e.clientX, y: e.clientY, scopeEl: el, ...spec }); }
      }
    };

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('contextmenu', ctxm);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('contextmenu', ctxm);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRef, cfg.enabled !== false]);
}

/** Shortcut: context menu on right-click + long-hold. `itemsProvider(e)` → menu opts | items array. */
export function useContextMenu(targetRef, itemsProvider, extra = {}) {
  const toSpec = (v) => (Array.isArray(v) ? { items: v } : v);
  useOverlayTarget(targetRef, {
    ...extra,
    contextMenu: (e) => { const v = itemsProvider(e); return v ? toSpec(v) : null; },
  });
}

/** Shortcut: pinch in/out on an element. */
export function usePinch(targetRef, onPinch, enabled = true) {
  useOverlayTarget(targetRef, { onPinch, enabled });
}

/** Shortcut: long-hold menu only (no right-click wiring). */
export function useHoldMenu(targetRef, itemsProvider, longHoldMs = 650) {
  const oi = useOverlay();
  useOverlayTarget(targetRef, {
    longHoldMs,
    onLongHold: (e) => {
      const v = itemsProvider(e);
      if (v) oi.openMenu({ x: e.x, y: e.y, scopeEl: targetRef.current, ...(Array.isArray(v) ? { items: v } : v) });
    },
  });
}

/* ============================== hotkeys ===================================== */
/** normalize "ctrl+shift+wheel" / "ctrl+k" → canonical chord. */
const normChord = (s) => {
  const parts = s.toLowerCase().split('+');
  const mods = ['ctrl', 'alt', 'shift'].filter((m) => parts.includes(m));
  const base = parts.filter((p) => !['ctrl', 'alt', 'shift', 'cmd', 'meta'].includes(p)).join('+');
  return [...mods, base].join('+');
};
const eventChord = (e, base) => {
  const mods = [];
  if (e.ctrlKey || e.metaKey) mods.push('ctrl');
  if (e.altKey) mods.push('alt');
  if (e.shiftKey) mods.push('shift');
  return [...mods, base].join('+');
};

/**
 * Hotkey + wheel-chord registry. Wheel handlers run at window CAPTURE phase with
 * passive:false — they kill the browser's native Ctrl+wheel page zoom in every
 * Chromium browser (incl. Opera) when the pointer is inside `scopeRef`.
 *
 * @param {Object} map      {'ctrl+wheel':fn,'ctrl+shift+wheel':fn,'ctrl+k':fn,'escape':fn}
 * @param {Object} opts     { scopeRef: RefObject|null (null=global), enabled: bool }
 */
export function useOverlayHotkeys(map, { scopeRef = null, enabled = true } = {}) {
  const mapRef = useRef(map);
  mapRef.current = map;
  useEffect(() => {
    if (!enabled) return undefined;
    const norm = {};
    Object.keys(mapRef.current).forEach((k) => { norm[normChord(k)] = mapRef.current[k]; });
    const inScope = (e) =>
      !scopeRef?.current || (e.target instanceof Node && scopeRef.current.contains(e.target));

    const wheelH = (e) => {
      if (!e.deltaY) return;
      const fn = norm[eventChord(e, 'wheel')] || norm['wheel'];
      if (!fn || !inScope(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fn(e);
    };
    const keyH = (e) => {
      const fn = norm[eventChord(e, e.key.toLowerCase())];
      if (!fn || !inScope(e)) return;
      e.preventDefault();
      fn(e);
    };
    window.addEventListener('wheel', wheelH, { passive: false, capture: true });
    window.addEventListener('keydown', keyH);
    return () => {
      window.removeEventListener('wheel', wheelH, { capture: true });
      window.removeEventListener('keydown', keyH);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scopeRef]);
}

export default OverlayInteractionProvider;
