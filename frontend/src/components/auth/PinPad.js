import { useRef, useState, useMemo } from 'react';

/**
 * PinPad — swipe-chain pad. Hold and drag (left-click or touch) across
 * the digits; each one the pointer passes over is reported via onDigit.
 * Lift and swipe again to start a new pass — passes stack into one long
 * sequence, so the password is a muscle-memory gesture chain.
 *
 * Layout: digits sit on a golden-angle scatter (sunflower spiral) in the
 * account-specific `order` the server sends — the same ring every login
 * for the owner, but nothing like a predictable numpad for an observer.
 *
 * Visual aids:
 *  - A trail line links the digits of the current pass while swiping
 *    (clears on lift — nothing persists for observers to study)
 *  - Each passed cell flashes and fires a short vibration tick
 *  - `hideDigits` renders blank cells — you can still swipe the shape
 *    from muscle memory while an observer sees nothing at all
 */
const DEFAULT_ORDER = ['1','2','3','4','5','6','7','8','9','0'];
const GOLDEN_ANGLE = (137.508 * Math.PI) / 180;

const PinPad = ({ onDigit, onSwipeEnd, disabled = false, hideDigits = false, order = DEFAULT_ORDER }) => {
  const padRef = useRef(null);
  const swiping = useRef(false);
  const last = useRef(null);
  const [active, setActive] = useState(null); // transient press flash
  const [trail, setTrail] = useState([]);     // [{x,y}] centres of current pass
  const [finger, setFinger] = useState(null); // live pointer point during swipe

  // Sunflower scatter — every digit gets a distinct position, no grid
  // alignment for a watcher to map back to "where 5 usually lives".
  const cells = useMemo(
    () =>
      order.map((d, i) => {
        const angle = i * GOLDEN_ANGLE;
        const r = 7 + 29 * Math.sqrt((i + 0.5) / order.length); // % of pad
        return { d, x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) };
      }),
    [order]
  );

  const centre = (digit) => {
    const pad = padRef.current?.getBoundingClientRect();
    const cell = padRef.current
      ?.querySelector(`[data-pin-digit="${digit}"]`)
      ?.getBoundingClientRect();
    if (!pad || !cell) return null;
    return {
      x: cell.left - pad.left + cell.width / 2,
      y: cell.top - pad.top + cell.height / 2,
    };
  };

  const point = (e) => {
    const pad = padRef.current?.getBoundingClientRect();
    return pad ? { x: e.clientX - pad.left, y: e.clientY - pad.top } : null;
  };

  const digitAt = (e) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    return el?.closest?.('[data-pin-digit]')?.dataset.pinDigit ?? null;
  };

  const tryAdd = (e) => {
    if (disabled) return;
    const d = digitAt(e);
    if (d === null || d === last.current) return;
    last.current = d;
    setActive(d);
    setTimeout(() => setActive((a) => (a === d ? null : a)), 140);
    const c = centre(d);
    if (c) setTrail((t) => [...t, c]);
    if (navigator.vibrate) navigator.vibrate(8); // tactile tick per digit
    onDigit?.(d);
  };

  const down = (e) => {
    if (disabled) return;
    swiping.current = true;
    last.current = null;
    setTrail([]);
    setFinger(point(e));
    tryAdd(e);
  };
  const move = (e) => {
    if (!swiping.current) return;
    setFinger(point(e));
    tryAdd(e);
  };
  const up = () => {
    if (!swiping.current) return;
    swiping.current = false;
    last.current = null;
    setFinger(null);
    setTrail([]); // trail is per-pass — gone the moment you lift
    onSwipeEnd?.();
  };

  const linePts = finger && trail.length
    ? [...trail, finger].map((p) => `${p.x},${p.y}`).join(' ')
    : trail.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      ref={padRef}
      className="relative select-none w-[260px] h-[260px] mx-auto"
      style={{ touchAction: 'none' }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerLeave={up}
    >
      {/* swipe trail — lives only for the duration of the current pass */}
      {trail.length > 0 && (
        <svg aria-hidden="true" className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <polyline
            points={linePts}
            fill="none"
            stroke="rgb(99 102 241 / 0.55)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {cells.map(({ d, x, y }) => (
        <button
          key={d}
          type="button"
          data-pin-digit={d}
          disabled={disabled}
          style={{ left: `${x}%`, top: `${y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-2 text-xl font-semibold flex items-center justify-center transition-colors disabled:opacity-50 ${
            active === d
              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
              : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-primary-300 dark:hover:border-primary-600'
          }`}
        >
          {hideDigits ? '' : d}
        </button>
      ))}
    </div>
  );
};

export default PinPad;
