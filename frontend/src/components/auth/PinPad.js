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

// Distance from cell centre to the a→b segment; returns digits under the
// stroke ordered along it, so multi-digit crossings report in path order.
const hitsAlong = (a, b, cellsPx, hitR) => {
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
    .sort((h1, h2) => h1.t - h2.t);
};

const PinPad = ({
  layout,
  onDigit,
  onSwipeEnd,
  disabled = false,
  hideDigits = false,
  arrange = false,
  onLayoutChange,
}) => {
  const padRef = useRef(null);
  const swiping = useRef(false);
  const last = useRef(null);      // last digit added this pass
  const prevPt = useRef(null);    // last pointer position this pass
  const dragDigit = useRef(null); // bubble being moved in arrange mode
  const vertexId = useRef(0);     // unique id per trail vertex (stable keys)
  const [active, setActive] = useState(null);
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
    if (arrange) {
      const r = rectOf();
      const p = point(e);
      if (!r || !p) return;
      const hitR = r.width * 0.16;
      const hit = hitsAlong(p, p, cellsPx(), hitR)[0];
      if (hit) {
        dragDigit.current = hit.d;
        setDragging(hit.d);
        padRef.current.setPointerCapture?.(e.pointerId);
      }
      return;
    }
    swiping.current = true;
    last.current = null;
    setTrail([]);
    setFading(false);
    const p = point(e);
    prevPt.current = p;
    setFinger(p);
    if (p) {
      const px = cellsPx();
      hitsAlong(p, p, px, rectOf().width * 0.135).forEach((h) => {
        const c = px.find((cell) => cell.d === h.d);
        emit(h.d, c);
      });
    }
  };

  const move = (e) => {
    if (arrange) {
      const r = rectOf();
      const p = point(e);
      if (!dragDigit.current || !r || !p) return;
      // Clamp so the bubble stays fully inside the pad.
      const x = Math.max(8, Math.min(92, (p.x / r.width) * 100));
      const y = Math.max(8, Math.min(92, (p.y / r.height) * 100));
      onLayoutChange?.(
        cells.map((c) => (c.d === dragDigit.current ? { ...c, x, y } : c))
      );
      return;
    }
    if (!swiping.current) return;
    const p = point(e);
    if (!p) return;
    const px = cellsPx();
    const hitR = rectOf().width * 0.135;
    const from = prevPt.current || p;
    hitsAlong(from, p, px, hitR).forEach((h) => {
      const c = px.find((cell) => cell.d === h.d);
      emit(h.d, c);
    });
    prevPt.current = p;
    setFinger(p);
  };

  const up = () => {
    if (arrange) {
      dragDigit.current = null;
      setDragging(null);
      return;
    }
    if (!swiping.current) return;
    swiping.current = false;
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
            scale: active === d ? 1.22 : dragging === d ? 1.15 : 1,
            opacity: 1,
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 28, delay: i * 0.03 }}
          whileHover={arrange ? { scale: 1.08 } : undefined}
          style={{ left: `${x}%`, top: `${y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 text-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-50 ${
            arrange ? 'cursor-grab active:cursor-grabbing ' : ''
          }${
            active === d || dragging === d
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-lg shadow-primary-500/30'
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
