import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Portal } from '../utils/autoPlacement';

/**
 * Universal animated toast.
 *
 * Two ways to render — pick one:
 *
 *   // 1) Drop-in (backwards compatible): each <Toast> portals itself to the
 *   //    top-right and claims a slot so multiple toasts fan out vertically
 *   //    instead of overlapping. Self-dismisses after `duration` with a
 *   //    slide-out, then calls onClose.
 *   {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={() => hide(t.id)} />)}
 *
 *   // 2) Preferred for new code — one stack container, proper
 *   //    AnimatePresence exits and layout shifts:
 *   <ToastStack toasts={toasts} onClose={hideToast} />
 */

const TYPES = {
  success: { icon: CheckCircle, bg: 'bg-green-500', bar: 'bg-green-300', text: 'text-white' },
  error: { icon: AlertCircle, bg: 'bg-red-500', bar: 'bg-red-300', text: 'text-white' },
  warning: { icon: AlertTriangle, bg: 'bg-yellow-500', bar: 'bg-yellow-300', text: 'text-white' },
  info: { icon: Info, bg: 'bg-blue-500', bar: 'bg-blue-300', text: 'text-white' },
};

// ---------------------------------------------------------------------------
// Slot registry — the legacy usage pattern maps N self-contained toasts, each
// of which is `fixed top-4 right-4`. Without coordination they'd stack on the
// exact same pixel. Every mounted toast claims the lowest free slot and
// offsets itself, so overlapping is impossible regardless of call site.
const slots = new Set();
const claimSlot = () => {
  let i = 0;
  while (slots.has(i)) i += 1;
  slots.add(i);
  return i;
};
const releaseSlot = (i) => slots.delete(i);

const SLOT_H = 72; // card height (~56) + gap
const TOP = 16;

/** Animated card body shared by <Toast> and <ToastStack>. */
const ToastCard = ({ message, type = 'info', onClose, duration = 3000, style, layout }) => {
  const config = TYPES[type] || TYPES.info;
  const Icon = config.icon;
  return (
    <motion.div
      layout={layout}
      initial={{ opacity: 0, x: 60, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={style}
      className={`${config.bg} ${config.text} relative overflow-hidden px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 min-w-[300px] max-w-md pointer-events-auto`}
    >
      <motion.span
        initial={{ scale: 0, rotate: -60 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.05 }}
      >
        <Icon className="w-5 h-5 flex-shrink-0" />
      </motion.span>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-80 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
      {duration > 0 && (
        <motion.span
          className={`absolute bottom-0 left-0 h-1 ${config.bar}`}
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: duration / 1000, ease: 'linear' }}
        />
      )}
    </motion.div>
  );
};

/**
 * Self-contained toast — portals itself, claims a stack slot, auto-dismisses
 * with an exit animation, then invokes onClose (so parents can drop it from
 * their toast list). Props contract is unchanged from the old component.
 */
const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  const [slot, setSlot] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const closeTimer = useRef(null);

  useLayoutEffect(() => {
    const s = claimSlot();
    setSlot(s);
    return () => releaseSlot(s);
  }, []);

  // Exit animation finishes before the parent's onClose removes us.
  useEffect(() => {
    if (!leaving) return undefined;
    closeTimer.current = setTimeout(() => onClose?.(), 220);
    return () => clearTimeout(closeTimer.current);
  }, [leaving, onClose]);

  const dismiss = () => setLeaving(true);

  useEffect(() => {
    if (duration <= 0) return undefined;
    const t = setTimeout(dismiss, duration);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration]);

  const top = TOP + (slot ?? 0) * SLOT_H;

  return (
    <Portal>
      <AnimatePresence>
        {!leaving && (
          <motion.div className="fixed right-4 z-50" style={{ top }}>
            <ToastCard
              message={message}
              type={type}
              duration={duration}
              onClose={dismiss}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Portal>
  );
};

/**
 * Preferred container — renders the whole toast list in one fixed column
 * with real AnimatePresence exits and springy layout shifts.
 *   <ToastStack toasts={[{ id, message, type, duration }]} onClose={hideToast} />
 */
export const ToastStack = ({ toasts = [], onClose }) => (
  <Portal>
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <ToastCard
            key={t.id}
            layout
            message={t.message}
            type={t.type}
            duration={t.duration ?? 3000}
            onClose={() => onClose?.(t.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  </Portal>
);

export default Toast;
