import { useRef, useState, useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * PinPad — swipe-chain pad.
 *
 * Swipe mode: hold and drag (left-click or touch) across the bubbles —
 * each digit the path passes near is reported via onDigit. Hit testing is
 * segment-based: the stroke between consecutive pointer events is tested
 * against every bubble, so even a fast flick can't skip a digit it crossed.
 * Lift and swipe again to chain passes into one long sequence.
 *
 * Arrange mode (`arrange` + `onLayoutChange`): drag a bubble anywhere on
 * the pad to shape your own layout — the positions persist per account,
 * so the shape is yours alone while an observer sees an unlabeled scatter.
 *
 * Visual aids: spring-in mount, pop per collected digit, live trail with
 * vertex dots that fades on lift, vibration tick, optional hidden digits.
 */
const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;
const DEFAULT_ORDER = ['1','2','3','4','5','6','7','8','9','0'];

const defaultLayout = () =>
  DEFAULT_ORDER.map((d, i) => {
    const angle = i * GOLDEN_ANGLE;
    const r = 7 + 29 * Math.sqrt((i + 0.5) / 10);
    return { d, x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
  });

// The collider is the bubble's own circle — 56px button minus its border,
// plus 4px of edge forgiveness. Passing near a bubble collects nothing;
// the stroke has to actually cross it.
const CELL_HIT_PX = 30;

// Distance from each cell centre to the a→b stroke segment. Returns cells
// genuinely crossed by the stroke, ordered along the path; distance breaks
// ties so an ambiguous graze goes to the nearest bubble, never both.
const hitsAlong = (a, b, cellsPx, hitR = CELL_HIT_PX) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  return cellsPx
    .map((c) => {
      const t = Math.max(0, Math.min(1, ((c.x - a.x) * dx + (c.y - a.y) * dy) / len2));
      const px = a.x + t * dx;
      const py = a.y + t * dy;
      return { d: c.d, t, dist: Math.hypot(c.x - px, c.y - py) };
    })
    .filter((h) => h.dist <= hitR)
    .sort((h1, h2) => h1.t - h2.t || h1.dist - h2.dist);
};

const PinPad = ({
  layout,
  onDigit,
  onSwipeEnd,
  disabled = false,
  hideDigits = false,
  arrange = false,
  onLayoutChange,
  tapMode = false,   // tap bubbles in order instead of dragging a path
  ghost = null,      // [{x,y}] guide path to trace (setup suggestions)
}) => {
  const padRef = useRef(null);
  const swiping = useRef(false);
  const last = useRef(null);      // last digit added this pass
  const prevPt = useRef(null);    // last pointer position this pass
  const dragDigit = useRef(null); // bubble being moved in arrange mode
  const vertexId = useRef(0);     // unique id per trail vertex (stable keys)
  const [active, setActive] = useState(null);
  const [near, setNear] = useState(null); // proximity magnet feedback
  const [dragging, setDragging] = useState(null);
  const [trail, setTrail] = useState([]);
  const [fading, setFading] = useState(false);
  const [finger, setFinger] = useState(null);

  const cells = useMemo(
    () => (Array.isArray(layout) && layout.length === 10 ? layout : defaultLayout()),
    [layout]
  );

  const rectOf = () => padRef.current?.getBoundingClientRect();

  const point = (e) => {
    const r = rectOf();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
  };

  const cellsPx = () => {
    const r = rectOf();
    return r ? cells.map((c) => ({ d: c.d, x: (c.x / 100) * r.width, y: (c.y / 100) * r.height })) : [];
  };

  const emit = (d, centre) => {
    if (d === last.current) return;
    last.current = d;
    setActive(d);
    setTimeout(() => setActive((a) => (a === d ? null : a)), 160);
    if (centre) setTrail((t) => [...t, { ...centre, id: vertexId.current++ }]);
    if (navigator.vibrate) navigator.vibrate(8);
    onDigit?.(d);
  };

  // ————— swipe collect —————
  const down = (e) => {
    if (disabled) return;
    const r = rectOf();
    const p = point(e);
    if (!r || !p) return;
    if (arrange) {
      const hit = hitsAlong(p, p, cellsPx(), CELL_HIT_PX * 1.3)[0];
      if (hit) {
        dragDigit.current = hit.d;
        setDragging(hit.d);
        padRef.current.setPointerCapture?.(e.pointerId);
      }
      return;
    }
    if (tapMode) {
      // Tap-to-connect — each press emits its bubble, no drag needed.
      const px = cellsPx();
      const hit = hitsAlong(p, p, px, CELL_HIT_PX)[0];
      if (hit) emit(hit.d, px.find((cell) => cell.d === hit.d));
      return;
    }
    swiping.current = true;
    // Capture the pointer to the pad — a swipe that drifts outside the
    // square keeps collecting instead of dying on pointerleave.
    e.currentTarget.setPointerCapture?.(e.pointerId);
    last.current = null;
    setTrail([]);
    setFading(false);
    prevPt.current = p;
    setFinger(p);
    const px0 = cellsPx();
    hitsAlong(p, p, px0).forEach((h) => {
      const c = px0.find((cell) => cell.d === h.d);
      emit(h.d, c);
    });
  };

  const move = (e) => {
    const r = rectOf();
    const p = point(e);
    if (!r || !p) return;
    if (arrange) {
      if (!dragDigit.current) return;
      // Clamp so the bubble stays fully inside the pad.
      const x = Math.max(8, Math.min(92, (p.x / r.width) * 100));
      const y = Math.max(8, Math.min(92, (p.y / r.height) * 100));
      onLayoutChange?.(
        cells.map((c) => (c.d === dragDigit.current ? { ...c, x, y } : c))
      );
      return;
    }
    const px = cellsPx();
    // Proximity magnet — the nearest bubble lifts only when the pointer is
    // genuinely about to land on it (just past the collider edge).
    const closest = px.reduce(
      (m, c) => {
        const d = Math.hypot(c.x - p.x, c.y - p.y);
        return d < m.dist ? { dist: d, digit: c.d } : m;
      },
      { dist: Infinity, digit: null }
    );
    setNear(closest.dist <= CELL_HIT_PX * 1.45 ? closest.digit : null);
    if (tapMode || !swiping.current) return;
    const from = prevPt.current || p;
    hitsAlong(from, p, px).forEach((h) => {
      const c = px.find((cell) => cell.d === h.d);
      emit(h.d, c);
    });
    prevPt.current = p;
    setFinger(p);
  };

  const up = (e) => {
    if (arrange) {
      dragDigit.current = null;
      setDragging(null);
      return;
    }
    setNear(null);
    if (!swiping.current) return;
    swiping.current = false;
    try { e?.currentTarget?.releasePointerCapture?.(e.pointerId); } catch { /* noop */ }
    last.current = null;
    prevPt.current = null;
    setFinger(null);
    setFading(true);
    setTimeout(() => { setTrail([]); setFading(false); }, 350);
    onSwipeEnd?.();
  };

  const linePts = finger && trail.length
    ? [...trail, finger].map((p) => `${p.x},${p.y}`).join(' ')
    : trail.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      ref={padRef}
      className="relative select-none w-[280px] h-[280px] mx-auto"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={arrange ? undefined : up}
    >
      {/* ghost guide path — a suggested shape to trace (setup only) */}
      {ghost?.length > 1 && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <polyline
            points={ghost.map((g) => `${g.x},${g.y}`).join(' ')}
            fill="none"
            stroke="rgb(99 102 241 / 0.5)"
            strokeDasharray="4 3"
            vectorEffect="non-scaling-stroke"
            strokeWidth="1.5"
          />
          <circle r="3" fill="rgb(99 102 241 / 0.8)">
            <animateMotion
              dur={`${ghost.length * 0.7}s`}
              repeatCount="indefinite"
              path={`M ${ghost.map((g) => `${g.x} ${g.y}`).join(' L ')}`}
            />
          </circle>
        </svg>
      )}
      {/* swipe trail — vertex dots per digit, fades out on lift */}
      {trail.length > 0 && (
        <svg
          aria-hidden="true"
          className="absolute inset-0 w-full h-full pointer-events-none z-10 transition-opacity duration-300"
          style={{ opacity: fading ? 0 : 1 }}
        >
          <polyline
            points={linePts}
            fill="none"
            stroke="rgb(99 102 241 / 0.55)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {trail.map((p) => (
            <circle key={p.id} cx={p.x} cy={p.y} r="5" fill="rgb(99 102 241 / 0.7)" />
          ))}
        </svg>
      )}
      {cells.map(({ d, x, y }, i) => (
        <motion.button
          key={d}
          type="button"
          data-pin-digit={d}
          disabled={disabled}
          initial={{ scale: 0, opacity: 0 }}
          animate={{
            scale: active === d ? 1.22 : dragging === d ? 1.15 : near === d ? 1.08 : 1,
            opacity: 1,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 28, delay: i * 0.03 }}
          whileHover={arrange ? { scale: 1.08 } : undefined}
          // Centered with -28px margins, NOT translate classes — framer-motion
          // writes an inline `transform` for scale, which would override the
          // Tailwind translate and leave the bubble offset half its size from
          // the collider centre.
          style={{ left: `${x}%`, top: `${y}%`, marginLeft: -28, marginTop: -28, touchAction: 'none' }}
          className={`absolute w-14 h-14 rounded-full border-2 text-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-50 ${
            arrange ? 'cursor-grab active:cursor-grabbing ' : ''
          }${
            active === d || dragging === d
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-lg shadow-primary-500/30'
              : near === d
                ? 'border-primary-400 dark:border-primary-500 bg-primary-50/60 dark:bg-primary-900/20'
                : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          {hideDigits ? '' : d}
        </motion.button>
      ))}
    </div>
  );
};

export default PinPad;
