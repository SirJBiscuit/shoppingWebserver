import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

/* ---------- Toggle3D: pill switch with gradient + 3D knob ---------- */
export const Toggle3D = ({ on, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!on)}
    className="flex items-center gap-2.5 w-full py-1 cursor-pointer select-none"
  >
    <div
      className={`relative w-10 h-5.5 rounded-full transition-colors duration-200 flex-shrink-0
        ${on ? 'bg-gradient-to-r from-primary-500 to-purple-500' : 'bg-gray-500/40'}`}
      style={{ height: 22, width: 40 }}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="absolute top-0.5 rounded-full"
        style={{
          width: 18,
          height: 18,
          left: on ? 20 : 2,
          background: 'linear-gradient(145deg, #ffffff, #c8ccd4)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.35), inset 0 1px 1px rgba(255,255,255,0.9)',
        }}
      />
    </div>
    {label && <span className="text-xs">{label}</span>}
  </button>
);

/* ---------- Check3D: animated checkmark draw ---------- */
export const Check3D = ({ checked, onChange, size = 18 }) => (
  <motion.button
    type="button"
    whileTap={{ scale: 0.82 }}
    onClick={onChange}
    className="flex-shrink-0 rounded-[5px] flex items-center justify-center cursor-pointer"
    style={{
      width: size,
      height: size,
      background: checked
        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
        : 'linear-gradient(145deg, rgba(255,255,255,0.08), rgba(0,0,0,0.12))',
      border: checked ? 'none' : '2px solid rgba(148,163,184,0.55)',
      boxShadow: checked
        ? '0 2px 6px rgba(34,197,94,0.45), inset 0 1px 1px rgba(255,255,255,0.35)'
        : 'inset 0 2px 3px rgba(0,0,0,0.18), 0 1px 0 rgba(255,255,255,0.05)',
      transition: 'background 0.18s ease, box-shadow 0.18s ease',
    }}
  >
    <motion.svg
      width={size * 0.62}
      height={size * 0.62}
      viewBox="0 0 12 12"
      fill="none"
      initial={false}
      animate={{ opacity: checked ? 1 : 0.35 }}
    >
      <motion.path
        d="M2 6.5 L5 9.5 L10 3"
        stroke="#fff"
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={false}
        animate={{ pathLength: checked ? 1 : 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
      />
    </motion.svg>
  </motion.button>
);

/* ---------- Slider3D: gradient track + 3D thumb ---------- */
export const Slider3D = ({ value, min = 0, max = 1, step = 0.05, onChange, label, format }) => {
  const trackRef = useRef(null);

  const clamp = (v) => Math.min(max, Math.max(min, v));
  const pct = ((value - min) / (max - min)) * 100;

  const setFromClientX = (clientX) => {
    const r = trackRef.current.getBoundingClientRect();
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    const raw = min + t * (max - min);
    onChange(clamp(Math.round(raw / step) * step));
  };

  const onPointerDown = (e) => {
    e.preventDefault();
    trackRef.current.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  return (
    <div className="w-full py-1">
      {label && (
        <div className="flex justify-between text-[11px] mb-1 opacity-80">
          <span>{label}</span>
          <span className="font-semibold">{format ? format(value) : value}</span>
        </div>
      )}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={(e) => { if (e.buttons === 1) setFromClientX(e.clientX); }}
        onWheel={(e) => onChange(clamp(value + (e.deltaY < 0 ? step : -step)))}
        className="relative h-2.5 rounded-full cursor-pointer touch-none"
        style={{
          background: `linear-gradient(90deg, #8b5cf6 0%, #6366f1 ${pct}%, rgba(100,116,139,0.35) ${pct}%)`,
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.06)',
        }}
      >
        <motion.div
          layout
          className="absolute top-1/2 -translate-y-1/2 rounded-full"
          style={{
            left: `calc(${pct}% - 9px)`,
            width: 18,
            height: 18,
            background: 'linear-gradient(145deg, #ffffff, #b7bdc9)',
            boxShadow: '0 3px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.95), inset 0 -2px 3px rgba(0,0,0,0.12)',
            border: '1px solid rgba(255,255,255,0.5)',
          }}
          whileHover={{ scale: 1.12 }}
          whileTap={{ scale: 0.95 }}
        />
      </div>
    </div>
  );
};

/* ---------- Typewriter: animated text reveal with blinking caret ---------- */
export const Typewriter = ({ text, className = '', speed = 22, onDone, onClick }) => {
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setShown(0);
    doneRef.current = false;
    const len = text.length;
    if (!len) { doneRef.current = true; onDoneRef.current?.(); return; }
    // cap total animation at ~4s for long blocks
    const perTick = Math.max(1, Math.ceil(len / ((4000 / 1000) * speed)));
    const iv = setInterval(() => {
      setShown((s) => {
        const n = s + perTick;
        if (n >= len) {
          clearInterval(iv);
          if (!doneRef.current) { doneRef.current = true; onDoneRef.current?.(); }
          return len;
        }
        return n;
      });
    }, 40);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <div
      className={`whitespace-pre-wrap cursor-text ${className}`}
      onClick={(e) => { e.stopPropagation(); if (!doneRef.current) { doneRef.current = true; setShown(text.length); } onClick?.(); }}
      title="Click to edit"
    >
      {text.slice(0, shown)}
      {shown < text.length && (
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.7, repeat: Infinity }}
          className="inline-block w-[2px] h-[1em] align-middle bg-primary-400 ml-px"
        />
      )}
    </div>
  );
};
