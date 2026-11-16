import { useEffect, useState } from 'react';

/**
 * pinLayer — occlusion-aware positioning for viewport-pinned markers.
 *
 * Answers the layering questions a fixed-position marker can't answer on
 * its own:
 *  - "Something transient is over me" (modal / popup / menu)  → UNDERLAP:
 *    the overlay should win, so the marker hides until it closes.
 *  - "A chrome bar covers my spot" (fixed toolbar, sidebar, edge panel,
 *    floating button column)                              → SMART LAYER:
 *    nudge the marker to the nearest free edge instead of leaving it
 *    buried (or floating on top of the chrome).
 *  - "My anchor moved inside a scroll container"            → RE-RESOLVE:
 *    usePinLayerTick listens to *every* scroll (capture phase), not just
 *    window scroll, so pages with inner scrollers (pantry, labs, panels)
 *    track correctly.
 *
 * Escape hatches for hand-tuning:
 *  - data-ap-overlay   : marks an element as a transient overlay
 *    (already applied by autoPlacement's Popup / ModalPortal)
 *  - data-pin-chrome   : marks an element as chrome to escape from even if
 *    it isn't position:fixed/sticky
 *  - data-pin-self     : marks an element as belonging to the pin layer
 *    (skipped when looking for occluders)
 */

const SELF_SEL = '.bp-marker, .bp-floating, .bp-popup, [data-pin-self]';
const TRANSIENT_SEL = '[data-ap-overlay], [role="dialog"], [role="alertdialog"]';

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Transient overlay — menus/modals/sheets that should UNDERLAP pins. */
const isTransient = (el) => {
  if (!el || !el.tagName) return false;
  if (el.closest(TRANSIENT_SEL)) return true;
  // A full-viewport fixed element is a modal-style backdrop/sheet.
  try {
    const cs = getComputedStyle(el);
    if (cs.position !== 'fixed') return false;
    const r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.7 && r.height >= window.innerHeight * 0.7;
  } catch {
    return false;
  }
};

/**
 * Walk ancestors looking for a chrome surface — fixed/sticky bars,
 * sidebars, panels — or an explicit [data-pin-chrome] marker. Returns the
 * outermost chrome ancestor (its rect is what pins escape from).
 */
const chromeAncestor = (el) => {
  let cur = el;
  let found = null;
  while (cur && cur !== document.body && cur !== document.documentElement) {
    if (cur.hasAttribute?.('data-pin-chrome')) { found = cur; break; }
    try {
      const pos = getComputedStyle(cur).position;
      if (pos === 'fixed' || pos === 'sticky') found = cur; // keep the outermost
    } catch { /* ignore */ }
    cur = cur.parentElement;
  }
  return found;
};

/**
 * What (if anything) meaningful sits on top of viewport point (x, y)?
 *
 * @param {number} x @param {number} y   viewport coords of the pin
 * @param {object} opts
 *   anchorEl {Element} the pin's anchored element — descendants of it are
 *                      the pin's own surface, not occluders
 *   skipSel  {string}  extra selectors to skip (pin-layer-owned UI)
 * @returns { blocked:boolean, transient:boolean, chrome:Element|null, rect:DOMRect|null }
 */
export const pinOcclusionAt = (x, y, { anchorEl = null, skipSel = '' } = {}) => {
  const stack = document.elementsFromPoint
    ? document.elementsFromPoint(x, y)
    : [document.elementFromPoint(x, y)];
  for (const el of stack) {
    if (!el || !el.tagName) continue;
    if (el.closest(SELF_SEL)) continue;                    // our own markers/chrome
    if (skipSel && el.closest(skipSel)) continue;
    if (anchorEl && (el === anchorEl || anchorEl.contains(el))) return { blocked: false };
    if (el === document.body || el === document.documentElement) return { blocked: false };
    if (isTransient(el)) return { blocked: true, transient: true, el, rect: null };
    const chrome = chromeAncestor(el);
    if (chrome && !(anchorEl && chrome.contains(anchorEl))) {
      return { blocked: true, transient: false, el, chrome, rect: chrome.getBoundingClientRect() };
    }
    // Ordinary page content above the point — the pin lives on content,
    // sibling overlap is normal, not a layering fault.
    return { blocked: false };
  }
  return { blocked: false };
};

/**
 * Find the nearest spot just outside a chrome rect that is itself clear.
 * Returns { x, y, moved } — `moved:false` means nowhere better was found.
 */
export const escapeChrome = (x, y, rect, opts = {}) => {
  const gap = 20;
  const edge = 14;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const candidates = [
    { x: rect.left - gap, y },
    { x: rect.right + gap, y },
    { x, y: rect.top - gap },
    { x, y: rect.bottom + gap },
  ]
    .map((p) => ({ x: clamp(p.x, edge, vw - edge), y: clamp(p.y, edge, vh - edge) }))
    .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));

  for (const c of candidates) {
    const occ = pinOcclusionAt(c.x, c.y, opts);
    if (!occ.blocked) return { x: c.x, y: c.y, moved: true };
    // Transient over the escape spot — the pin should hide, not dart around
    if (occ.transient) return { x: c.x, y: c.y, moved: true, transient: true };
  }
  return { x, y, moved: false };
};

/**
 * One-call cluster helper: resolve the display position for a pin/cluster.
 * @returns { x, y, mode: 'normal'|'nudged'|'hidden', trueX, trueY }
 *   - normal : render at x,y
 *   - nudged : render at x,y (escaped chrome); trueX/trueY is the real spot
 *   - hidden : a transient overlay underlaps it — don't render
 */
export const pinDisplayPos = (x, y, opts = {}) => {
  const occ = pinOcclusionAt(x, y, opts);
  if (!occ.blocked) return { x, y, mode: 'normal', trueX: x, trueY: y };
  if (occ.transient) return { x, y, mode: 'hidden', trueX: x, trueY: y };
  const esc = escapeChrome(x, y, occ.rect, opts);
  if (!esc.moved) return { x, y, mode: 'normal', trueX: x, trueY: y };
  if (esc.transient) return { x, y, mode: 'hidden', trueX: x, trueY: y };
  return { x: esc.x, y: esc.y, mode: 'nudged', trueX: x, trueY: y };
};

/**
 * Scroll/resize/poll tick for re-resolving pin positions.
 * Listens on document with capture:true so INNER scroll containers (pantry
 * grids, panels, lab lists) trigger re-resolution — scroll events don't
 * bubble but they do reach the capture phase on document.
 *
 * @param {number} pollMs  optional interval — catches overlays opening or
 *                         chrome appearing without a scroll (default 0)
 */
export const usePinLayerTick = (pollMs = 0) => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const bump = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setTick((t) => t + 1));
    };
    document.addEventListener('scroll', bump, { capture: true, passive: true });
    window.addEventListener('resize', bump);
    const iv = pollMs > 0 ? setInterval(bump, pollMs) : null;
    return () => {
      document.removeEventListener('scroll', bump, { capture: true });
      window.removeEventListener('resize', bump);
      if (iv) clearInterval(iv);
      cancelAnimationFrame(raf);
    };
  }, [pollMs]);
  return tick;
};
