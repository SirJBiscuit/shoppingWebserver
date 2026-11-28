import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check, MousePointer2, Play, Pause } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { Portal, anchoredPopupPos } from '../utils/autoPlacement';

/**
 * SpotlightTour — the shared spotlight engine behind every guided tour in
 * the app (main tutorial, beta tester onboarding, feature walkthroughs).
 *
 * What it draws per step:
 *   - a stray-click shield (stray clicks flash the Next button instead)
 *   - the breathing spotlight ring + halo on the focused element
 *   - a connector line drawn from the floating box to the element
 *   - the animated demo cursor with the isometric "floor tap" ripple
 *   - an anchored floating box (icon, title, instructions, dots, Next)
 *   - the top hint pill and optional auto-play ("video mode") progress
 *
 * Steps look like:
 *   {
 *     title: 'The Sidebar',
 *     description: 'Your way around the app',
 *     image: '📱',                    // emoji — or pass icon: LucideComponent
 *     icon: SomeLucideIcon,           // rendered in a gradient tile when set
 *     tint: 'from-blue-500 to-indigo-600', // icon tile gradient (icon steps)
 *     focusElement: '[data-tutorial="sidebar"]', // selector to spotlight (or null)
 *     instructions: ['line 1', 'line 2'],
 *   }
 *
 * Props:
 *   steps        — step array (shape above)
 *   step         — controlled current index
 *   onStepChange — (index) => void
 *   onFinish     — called when Next is pressed on the last step
 *   onSkip       — ESC / X / "skip" — host decides whether to mark seen
 *   onDrive      — optional (stepDef, index) => void fired whenever the step
 *                  changes; lets hosts open panels/set tabs before measuring
 *   autoPlayable — show the ▶ auto-play button (default true)
 */
const SpotlightTour = ({
  steps,
  step: currentStep,
  onStepChange,
  onFinish,
  onSkip,
  onDrive,
  autoPlayable = true,
}) => {
  const [targetRect, setTargetRect] = useState(null); // focused element bounds
  const [cursor, setCursor] = useState(null); // demo cursor target point
  const [pulseKey, setPulseKey] = useState(0); // retrigger the tap ripple per step
  const [autoPlay, setAutoPlay] = useState(false); // "video" mode — auto-advances
  const [nudge, setNudge] = useState(0); // flashes the Next button on stray clicks
  const [boxRect, setBoxRect] = useState(null); // measured box for the connector line
  const boxRef = useRef(null);
  const reduceMotion = useReducedMotion();

  const stepDef = steps[currentStep];

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      onStepChange(currentStep + 1);
    } else {
      onFinish();
    }
  }, [currentStep, steps.length, onStepChange, onFinish]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) onStepChange(currentStep - 1);
  }, [currentStep, onStepChange]);

  // Keyboard: ESC skip, arrows navigate.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onSkip();
      else if (e.key === 'ArrowRight') nextStep();
      else if (e.key === 'ArrowLeft') prevStep();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSkip, nextStep, prevStep]);

  // Per-step drive hook — hosts react before the target is measured (e.g.
  // the beta tour opens the Beta Viewer on a specific tab).
  useEffect(() => {
    if (onDrive) onDrive(stepDef, currentStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  // Measure the focused element — scroll it into view, then track its rect
  // through scroll/resize so the ring, cursor and tooltip stay attached.
  // Driven steps (a panel that opens, a tab that mounts) get a retry loop —
  // the target may not exist on the first pass.
  useEffect(() => {
    if (!stepDef?.focusElement) { setTargetRect(null); return undefined; }
    const sel = stepDef.focusElement;
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const measure = () => {
      const target = document.querySelector(sel);
      if (target) {
        const r = target.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          return true;
        }
      }
      setTargetRect(null);
      return false;
    };

    let tries = 0;
    const retry = setInterval(() => {
      tries += 1;
      if (measure() || tries >= 10) clearInterval(retry);
    }, 160);
    window.addEventListener('scroll', measure, true); // capture nested scroll areas
    window.addEventListener('resize', measure);
    return () => {
      clearInterval(retry);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, stepDef?.focusElement]);

  // Demo cursor: glide to the element center and start the tap ripple.
  useEffect(() => {
    if (!targetRect) { setCursor(null); return; }
    setCursor({
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    });
    setPulseKey(k => k + 1);
  }, [targetRect]);

  // Autoplay ("video") mode — advance on a timer scaled to step content.
  const stepMs = 3500 + (stepDef?.instructions?.length || 0) * 1400;
  useEffect(() => {
    if (!autoPlay) return undefined;
    const t = setTimeout(nextStep, stepMs);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, currentStep, nextStep]);

  // Measure the rendered box so the connector line anchors to its real edge.
  useLayoutEffect(() => {
    if (!boxRef.current || !targetRect) { setBoxRect(null); return; }
    const r = boxRef.current.getBoundingClientRect();
    setBoxRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, targetRect]);

  if (!stepDef) return null;

  // Floating box placement — anchored to the element when one is focused,
  // otherwise bottom-center. Never a backdrop card. Width scales with the
  // viewport so text stays readable on phones through desktops.
  const BOX_W = Math.max(320, Math.min(560, window.innerWidth - 24));
  const anchor = targetRect
    ? { cx: targetRect.left + targetRect.width / 2, top: targetRect.top, bottom: targetRect.top + targetRect.height }
    : null;
  const boxPos = anchor
    ? anchoredPopupPos(anchor, { width: BOX_W, height: 440, margin: 10, gap: 12 })
    : null;
  // Positioning lives on a static wrapper — framer-motion owns the inner
  // box's transform, so centering via translate classes would be clobbered.
  const outerStyle = boxPos
    ? { position: 'fixed', left: boxPos.left, top: boxPos.top }
    : { position: 'fixed', left: 0, right: 0, bottom: 24, display: 'flex', justifyContent: 'center' };
  const boxStyle = {
    width: BOX_W,
    maxWidth: 'calc(100vw - 20px)',
    maxHeight: boxPos ? boxPos.maxHeight : undefined,
  };

  const StepIcon = stepDef.icon;

  return (
    <Portal>
      {/* Stray-click shield — keeps the demo safe; flashes Next to guide. */}
      <div
        className="fixed inset-0 z-[10000]"
        onClick={() => setNudge(n => n + 1)}
        role="presentation"
        aria-hidden="true"
      />

      {/* Spotlight ring — breathes so the eye keeps finding the target. */}
      {targetRect && (
        <>
          <motion.div
            key={`ring-${currentStep}`}
            className="fixed z-[10001] pointer-events-none rounded-xl"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: targetRect.left - 6,
              top: targetRect.top - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ boxShadow: '0 0 0 3px rgba(59,130,246,0.9), 0 0 24px 6px rgba(59,130,246,0.4)' }}
          />
          {!reduceMotion && (
            <motion.div
              key={`halo-${currentStep}`}
              className="fixed z-[10000] pointer-events-none rounded-xl"
              animate={{
                left: targetRect.left - 6,
                top: targetRect.top - 6,
                width: targetRect.width + 12,
                height: targetRect.height + 12,
                scale: [1, 1.06, 1],
                opacity: [0.5, 0.9, 0.5],
              }}
              transition={{
                left: { type: 'spring', stiffness: 300, damping: 28 },
                top: { type: 'spring', stiffness: 300, damping: 28 },
                width: { type: 'spring', stiffness: 300, damping: 28 },
                height: { type: 'spring', stiffness: 300, damping: 28 },
                scale: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
                opacity: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{ boxShadow: '0 0 0 2px rgba(147,197,253,0.8)' }}
            />
          )}
        </>
      )}

      {/* Connector line — draws itself from the box edge to the element. */}
      {targetRect && boxRect && (() => {
        const ex = targetRect.left + targetRect.width / 2;
        const ey = targetRect.top + targetRect.height / 2;
        let bx, by;
        if (ey < boxRect.top) {
          by = boxRect.top;
          bx = Math.min(Math.max(ex, boxRect.left + 12), boxRect.left + boxRect.width - 12);
        } else if (ey > boxRect.top + boxRect.height) {
          by = boxRect.top + boxRect.height;
          bx = Math.min(Math.max(ex, boxRect.left + 12), boxRect.left + boxRect.width - 12);
        } else {
          by = Math.min(Math.max(ey, boxRect.top + 12), boxRect.top + boxRect.height - 12);
          bx = ex < boxRect.left ? boxRect.left : boxRect.left + boxRect.width;
        }
        const mx = (bx + ex) / 2, my = (by + ey) / 2 - Math.min(28, Math.abs(ey - by) / 3);
        return (
          <svg className="fixed inset-0 z-[10002] pointer-events-none w-full h-full" aria-hidden="true">
            <motion.path
              key={`conn-${currentStep}`}
              d={`M ${bx} ${by} Q ${mx} ${my} ${ex} ${ey}`}
              fill="none"
              stroke="rgba(59,130,246,0.85)"
              strokeWidth="2"
              strokeDasharray="1 0"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduceMotion ? 0 : 0.5, ease: 'easeOut', delay: 0.15 }}
            />
            <motion.circle
              key={`dot-${currentStep}`}
              cx={ex} cy={ey} r="4"
              fill="rgba(59,130,246,0.95)"
              stroke="white" strokeWidth="1.5"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: reduceMotion ? 0 : 0.6 }}
            />
            <circle cx={bx} cy={by} r="3" fill="rgba(59,130,246,0.9)" />
          </svg>
        );
      })()}

      {/* Animated demo cursor — glides to the element and pulses an
          isometric "floor tap" ripple (elliptical = depth cue). */}
      {cursor && (
        <motion.div
          className="fixed z-[10002] pointer-events-none"
          initial={false}
          animate={{ x: cursor.x - 3, y: cursor.y - 2 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        >
          <motion.span
            key={`pulse-${pulseKey}`}
            className="absolute -inset-2.5 rounded-full border-2 border-primary-400"
            initial={{ scaleX: 0.5, scaleY: 0.3, opacity: 0.9 }}
            animate={{ scaleX: 2.4, scaleY: 1.3, opacity: 0 }}
            transition={reduceMotion ? { duration: 0 } : { duration: 1.1, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
          />
          <motion.div
            animate={reduceMotion ? {} : { rotate: [-8, -4, -8], scale: [1, 0.92, 1] }}
            transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.5 }}
          >
            <MousePointer2 className="w-6 h-6 text-gray-900 dark:text-white drop-shadow-[0_3px_3px_rgba(0,0,0,0.45)]" />
          </motion.div>
        </motion.div>
      )}

      {/* Floating tutorial box — anchored near the element. */}
      <div className="z-[10003]" style={outerStyle}>
        <motion.div
          ref={boxRef}
          key={`box-${currentStep}`}
          initial={{ opacity: 0, y: 10, rotateX: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          style={{ ...boxStyle, transformPerspective: 800 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-label={`Tutorial step ${currentStep + 1} of ${steps.length}`}
        >
          {autoPlay && (
            <motion.div
              key={`autoplay-${currentStep}`}
              className="h-1 bg-primary-500"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: stepMs / 1000, ease: 'linear' }}
              style={{ transformOrigin: 'left' }}
            />
          )}
          <div className="p-4 pb-3">
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2 min-w-0">
                {StepIcon ? (
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stepDef.tint || 'from-blue-500 to-indigo-600'} flex items-center justify-center shadow-md flex-shrink-0`}>
                    <StepIcon className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <motion.span
                    key={`icon-${currentStep}`}
                    className="text-2xl flex-shrink-0 inline-block"
                    initial={reduceMotion ? false : { rotateY: 0 }}
                    animate={reduceMotion ? {} : { rotateY: 360 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                    style={{ transformPerspective: 400 }}
                  >
                    {stepDef.image}
                  </motion.span>
                )}
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{stepDef.title}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-tight mt-0.5">{stepDef.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSkip}
                className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-red-100 dark:hover:bg-red-900/40 hover:text-red-500 flex-shrink-0 transition-colors"
                aria-label="Skip tutorial"
                title="Close tutorial"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
              </button>
            </div>
            <ul className="space-y-2 overflow-y-auto" style={{ maxHeight: boxPos ? Math.max(boxPos.maxHeight - 170, 110) : 260 }}>
              {stepDef.instructions.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="text-base text-gray-700 dark:text-gray-300 leading-relaxed"
                >
                  {line}
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/60 dark:bg-gray-800/60">
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              )}
              {autoPlayable && (
                <button
                  type="button"
                  onClick={() => setAutoPlay(a => !a)}
                  className={`p-1.5 rounded-lg transition-colors ${autoPlay ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600' : 'hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400'}`}
                  aria-label={autoPlay ? 'Pause auto tour' : 'Auto-play tour'}
                  title={autoPlay ? 'Pause the auto tour' : 'Auto-play — walks through like a video'}
                >
                  {autoPlay ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
              )}
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <span key={i} className={`w-2 h-2 rounded-full ${i === currentStep ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                ))}
              </div>
              <span className="text-sm text-gray-400">{currentStep + 1}/{steps.length}</span>
            </div>
            <motion.button
              key={`next-${nudge}`}
              type="button"
              onClick={nextStep}
              animate={nudge > 0 ? { scale: [1, 1.14, 1] } : false}
              transition={{ duration: 0.35 }}
              className="px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-base font-bold flex items-center gap-1.5 shadow-md ring-1 ring-primary-500/50"
            >
              {currentStep === steps.length - 1 ? 'Done' : 'Next'}
              {currentStep === steps.length - 1 ? <Check className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </motion.button>
          </div>
        </motion.div>
      </div>

      {/* Hint */}
      <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none">
        <span className="text-sm px-3 py-1.5 rounded-full bg-black/55 text-white backdrop-blur-sm">
          {autoPlayable ? 'Next to continue · ▶ auto tour · ESC to skip' : 'Next to continue · ESC to skip'}
        </span>
      </div>

      {/* Always-visible close — sits above the shield so it stays tappable
          no matter where the anchored box lands. */}
      <button
        type="button"
        onClick={onSkip}
        className="fixed top-3 right-3 z-[10003] flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/55 hover:bg-red-600/80 text-white text-sm font-semibold backdrop-blur-sm transition-colors"
        aria-label="Close tutorial"
      >
        <X className="w-4 h-4" /> Skip
      </button>
    </Portal>
  );
};

export default SpotlightTour;
