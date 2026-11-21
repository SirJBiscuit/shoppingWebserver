import { useState, useEffect, useRef, useCallback } from 'react';
import { X, ChevronRight, ChevronLeft, Check, MousePointer2, Zap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal, anchoredPopupPos } from '../utils/autoPlacement';
import api from '../services/api';

// Bump this when the tutorial content changes — re-fires the tour once for
// users who already completed the previous version.
const ONBOARDING_VERSION = 'v5';
const onboardingKey = (userId) => `onboarding_${ONBOARDING_VERSION}_${userId}`;
// Permanent opt-out — NOT versioned, so bumping the tutorial version never
// re-fires for users who explicitly asked not to see it.
const neverKey = (userId) => `onboarding_never_${userId || 'guest'}`;

// Demo-style walkthrough: an animated cursor points at each real control
// while a floating box explains it. No dim, no required interaction —
// tap anywhere (or Next) to continue.
const WALKTHROUGH_STEPS = [
  {
    title: 'Welcome to Listzy! 🎉',
    description: 'Your groceries, from list to pantry to plate',
    image: '🛒',
    focusElement: null,
    instructions: [
      '🔁 The loop: make a list → shop and check off → Unpack into Home Inventory → cook with Recipes and the Homemade Lab',
      '🖱️ Watch the cursor — it points at each control and shows you how it works',
      '👆 Tap anywhere (or Next) to continue · ESC skips',
    ],
  },
  {
    title: 'The Sidebar 🧭',
    description: 'Your way around the app',
    image: '📱',
    focusElement: '[data-tutorial="sidebar"]',
    instructions: [
      '🏠 Home — your shopping lists (you are here)',
      '📦 Unpack — sort your haul after a shop',
      '🏪 Home Inventory — what you have at home',
      '🍳 Recipe Book — meals built from your inventory',
      '🧪 Homemade Lab — your own recipes and experiments',
    ],
  },
  {
    title: 'Top Toolbar 🛠️',
    description: 'Help and quick settings',
    image: '🔧',
    focusElement: '[data-tutorial="top-toolbar"]',
    instructions: [
      '❓ Help — reopens this tour',
      '🏪 Store and list controls sit here too',
    ],
  },
  {
    title: 'Create a List 📝',
    description: '"+ New List" starts a new shopping list',
    image: '➕',
    focusElement: '[data-tutorial="new-list-button"]',
    instructions: [
      'Click it and name your list — "Weekly Groceries"',
      'Each list keeps its own items, store and totals',
    ],
  },
  {
    title: 'Your Lists 🗂️',
    description: 'Switch, rename and delete lists',
    image: '📋',
    focusElement: '[data-tutorial="list-dropdown"]',
    instructions: [
      'The dropdown switches between lists with live item counts',
      '✏️ renames — ✕ in the menu deletes a list',
    ],
  },
  {
    title: 'Add Items ✍️',
    description: 'Type a name — suggestions fill in the rest',
    image: '⌨️',
    focusElement: '[data-tutorial="add-item-input"]',
    instructions: [
      'Type "Milk" — Smart Suggestions complete name, price and icon',
      'Enter or the Add button saves it to the list',
      'The Category pill sets the store aisle automatically',
    ],
  },
  {
    title: 'Item Rows 🛒',
    description: 'Every row is interactive',
    image: '✅',
    focusElement: '[data-tutorial="item-row"]',
    instructions: [
      'Tap the emoji — pick a new icon or upload your own',
      'The category chip changes where it lives in the store',
      'Check the box when it is in the cart — long-press for more',
      'Check everything off and the app walks you to Unpack',
    ],
  },
  {
    title: 'Looking For Next 🔁',
    description: 'Quick re-adds and regulars',
    image: '🔍',
    focusElement: '[data-tutorial="looking-for-next"]',
    instructions: [
      'Recently removed and frequently bought items live here',
      'One tap puts them straight back on the list',
    ],
  },
  {
    title: 'Smart Suggestions 🧠',
    description: 'Learns what you buy',
    image: '💡',
    focusElement: '[data-tutorial="suggestions"]',
    instructions: [
      'Suggests items from your history with learned prices',
      'Tap one to add it — it gets smarter every shop',
      'Tap a price badge for per-store prices and trends',
    ],
  },
  {
    title: 'Budget and Prices 💰',
    description: 'Watch the total as you shop',
    image: '💵',
    focusElement: '[data-tutorial="budget-tracker"]',
    instructions: [
      'Running total of checked items vs the whole list',
      'Per-item prices feed in from your purchase history',
    ],
  },
  {
    title: 'After the Shop 📦',
    description: 'Where your haul goes next',
    image: '🔄',
    focusElement: '[data-tutorial="sidebar"]',
    instructions: [
      '✅ Checked-off items ride to the Unpack page',
      '📦 Unpack sorts them into Home Inventory — what is at home, and how much',
      '🍳 Recipe Book and 🧪 Homemade Lab cook from that inventory',
      '🔁 Running low? Inventory levels feed your next suggestions',
    ],
  },
  {
    title: "You're Ready! 🚀",
    description: 'The whole loop, recap',
    image: '🎉',
    focusElement: null,
    instructions: [
      'Make a list → shop and check off → Unpack → Home Inventory → cook',
      'The Help button replays this anytime',
      'Everything you can interact with wears a soft ring',
    ],
  },
];

// Quick tour — the core loop only (indexes into WALKTHROUGH_STEPS).
const QUICK_STEP_IDX = [0, 1, 3, 5, 6, 10, 11];

const Onboarding = ({ userId, forceOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState(null); // null = chooser, 'quick' | 'full'
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState(null); // focused element bounds
  const [cursor, setCursor] = useState(null); // demo cursor target point
  const [pulseKey, setPulseKey] = useState(0); // retrigger the tap ripple per step
  const boxRef = useRef(null);

  const steps = mode === 'quick'
    ? QUICK_STEP_IDX.map(i => WALKTHROUGH_STEPS[i])
    : WALKTHROUGH_STEPS;
  const step = steps[currentStep];

  useEffect(() => {
    let cancelled = false;
    const localSeen = () =>
      !!localStorage.getItem(onboardingKey(userId)) ||
      !!localStorage.getItem(neverKey(userId));
    const show = () => { if (!cancelled) setIsOpen(true); };

    // Server flag wins — it follows the account across devices and lets a
    // bumped version re-fire for accounts that finished an older tour.
    // localStorage is the fallback for guests and API hiccups.
    if (!userId) {
      if (!localSeen()) show();
      return undefined;
    }
    api.get('/users/onboarding')
      .then((r) => {
        const serverSeen = r.data?.version === ONBOARDING_VERSION;
        if (!serverSeen && !localSeen()) show();
      })
      .catch(() => { if (!localSeen()) show(); });
    return () => { cancelled = true; };
  }, [userId]);

  // Persist "seen" both places — account flag (cross-device) + per-device
  // marker so the tour doesn't flicker open while the GET is in flight.
  const markSeen = () => {
    localStorage.setItem(onboardingKey(userId), 'true');
    if (dontShowAgain) {
      localStorage.setItem(neverKey(userId), 'true');
    }
    if (userId) {
      api.post('/users/onboarding', { version: ONBOARDING_VERSION }).catch(() => {});
    }
  };

  // Allow reopening tutorial from Help button — always lands on the chooser.
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setMode(null);
      setCurrentStep(0);
      setShowSkipMessage(false);
    }
  }, [forceOpen]);

  const handleComplete = useCallback(() => {
    markSeen();
    setIsOpen(false);
    setMode(null);
    setTargetRect(null);
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dontShowAgain, onClose, userId]);

  const handleSkip = useCallback(() => {
    markSeen();
    const hasSeenSkipMessage = localStorage.getItem(`onboarding_skip_message_${userId}`);
    if (!hasSeenSkipMessage) {
      localStorage.setItem(`onboarding_skip_message_${userId}`, 'true');
      setShowSkipMessage(true);
      setMode(null);
      return;
    }
    setIsOpen(false);
    setMode(null);
    setTargetRect(null);
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dontShowAgain, onClose, userId]);

  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, steps.length, handleComplete]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }, [currentStep]);

  // Auto-close the skip hint after a few seconds.
  useEffect(() => {
    if (!showSkipMessage) return undefined;
    const t = setTimeout(() => {
      setShowSkipMessage(false);
      setIsOpen(false);
      setTargetRect(null);
      if (onClose) onClose();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSkipMessage]);

  // Keyboard: ESC skip, arrows navigate.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') handleSkip();
      else if (e.key === 'ArrowRight' && mode) nextStep();
      else if (e.key === 'ArrowLeft' && mode) prevStep();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, mode, handleSkip, nextStep, prevStep]);

  // Measure the focused element — scroll it into view, then track its rect
  // through scroll/resize so the ring, cursor and tooltip stay attached.
  useEffect(() => {
    if (!mode || showSkipMessage || !step?.focusElement) { setTargetRect(null); return undefined; }
    const sel = step.focusElement;
    const el = document.querySelector(sel);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const measure = () => {
      const target = document.querySelector(sel);
      if (target) {
        const r = target.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          return;
        }
      }
      setTargetRect(null);
    };

    const t = setTimeout(measure, 350); // wait for the smooth scroll to land
    measure();
    window.addEventListener('scroll', measure, true); // capture nested scroll areas
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, mode, showSkipMessage]);

  // Demo cursor: glide to the element center and start the tap ripple.
  useEffect(() => {
    if (!targetRect) { setCursor(null); return; }
    setCursor({
      x: targetRect.left + targetRect.width / 2,
      y: targetRect.top + targetRect.height / 2,
    });
    setPulseKey(k => k + 1);
  }, [targetRect]);

  if (!isOpen) return null;

  // Floating box placement — anchored to the element when one is focused,
  // otherwise bottom-center. Never a backdrop card.
  const BOX_W = 300;
  const anchor = targetRect
    ? { cx: targetRect.left + targetRect.width / 2, top: targetRect.top, bottom: targetRect.top + targetRect.height }
    : null;
  const boxPos = anchor
    ? anchoredPopupPos(anchor, { width: BOX_W, height: 300, margin: 10, gap: 12 })
    : null;
  const boxStyle = boxPos
    ? { position: 'fixed', left: boxPos.left, top: boxPos.top, width: BOX_W, maxWidth: 'calc(100vw - 20px)', maxHeight: boxPos.maxHeight }
    : { position: 'fixed', left: '50%', bottom: 24, transform: 'translateX(-50%)', width: BOX_W, maxWidth: 'calc(100vw - 20px)' };

  return (
    <Portal>
      <AnimatePresence>
        {showSkipMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[10003] w-80 max-w-[calc(100vw-20px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 text-center"
            role="status"
          >
            <div className="text-4xl mb-2">👋</div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Tutorial Skipped</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              Look for the <strong className="text-blue-600 dark:text-blue-400">Help</strong> button in the top right — it reopens this anytime.
            </p>
            <p className="text-[11px] text-gray-400">Closing automatically…</p>
          </motion.div>
        ) : !mode ? (
          // Tour chooser — a small floating box, no backdrop.
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[10003] w-[22rem] max-w-[calc(100vw-20px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
            role="dialog"
            aria-label="Choose a tutorial"
          >
            <div className="text-center mb-3">
              <div className="text-3xl mb-1">🎓</div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Listzy Tour</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Watch — the cursor shows you around. No clicks needed.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => { setMode('quick'); setCurrentStep(0); }}
                className="p-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-left transition-colors"
              >
                <Zap className="w-5 h-5 mb-1" />
                <div className="text-sm font-bold">Quick tour</div>
                <div className="text-[10px] text-blue-100">{QUICK_STEP_IDX.length} stops · ~1 min</div>
              </button>
              <button
                type="button"
                onClick={() => { setMode('full'); setCurrentStep(0); }}
                className="p-3 rounded-xl bg-green-500 hover:bg-green-600 text-white text-left transition-colors"
              >
                <BookOpen className="w-5 h-5 mb-1" />
                <div className="text-sm font-bold">Full tour</div>
                <div className="text-[10px] text-green-100">{WALKTHROUGH_STEPS.length} stops · ~3 min</div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 underline underline-offset-2"
              >
                Skip tour
              </button>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={dontShowAgain}
                  onChange={(e) => setDontShowAgain(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                Don't show automatically
              </label>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Click-anywhere-to-continue layer — fully transparent, page stays visible. */}
            <div
              className="fixed inset-0 z-[10000] cursor-pointer"
              onClick={nextStep}
              role="presentation"
              aria-label="Continue tutorial"
            />

            {/* Soft ring around the focused element — points at it without dimming. */}
            {targetRect && (
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
                style={{ boxShadow: '0 0 0 3px rgba(59,130,246,0.85), 0 0 22px 4px rgba(59,130,246,0.35)' }}
              />
            )}

            {/* Animated demo cursor — glides to the element and pulses a tap. */}
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
                  initial={{ scale: 0.5, opacity: 0.9 }}
                  animate={{ scale: 2, opacity: 0 }}
                  transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.5, ease: 'easeOut' }}
                />
                <MousePointer2 className="w-6 h-6 text-gray-900 dark:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.55)]" />
              </motion.div>
            )}

            {/* Floating tutorial box — anchored near the element. */}
            <motion.div
              ref={boxRef}
              key={`box-${currentStep}`}
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              className="z-[10003] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
              style={boxStyle}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label={`Tutorial step ${currentStep + 1} of ${steps.length}`}
            >
              <div className="p-3.5 pb-2.5">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{step.image}</span>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{step.title}</h2>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-tight">{step.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex-shrink-0"
                    aria-label="Skip tutorial"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <ul className="space-y-1 overflow-y-auto" style={{ maxHeight: boxPos ? Math.max(boxPos.maxHeight - 130, 80) : 180 }}>
                  {step.instructions.map((line, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + i * 0.08 }}
                      className="text-xs text-gray-700 dark:text-gray-300 leading-snug"
                    >
                      {line}
                    </motion.li>
                  ))}
                </ul>
              </div>
              <div className="px-3.5 py-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/60 dark:bg-gray-800/60">
                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                      aria-label="Previous step"
                    >
                      <ChevronLeft className="w-4 h-4 text-gray-500" />
                    </button>
                  )}
                  <div className="flex gap-1">
                    {steps.map((_, i) => (
                      <span key={i} className={`w-1.5 h-1.5 rounded-full ${i === currentStep ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400">{currentStep + 1}/{steps.length}</span>
                </div>
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold flex items-center gap-1"
                >
                  {currentStep === steps.length - 1 ? 'Done' : 'Next'}
                  {currentStep === steps.length - 1 ? <Check className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            </motion.div>

            {/* Hint — tap anywhere to continue */}
            <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[10001] pointer-events-none">
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/55 text-white backdrop-blur-sm">
                tap anywhere to continue · ESC to skip
              </span>
            </div>
          </>
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default Onboarding;
