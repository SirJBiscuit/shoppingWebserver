import { useState, useEffect, useCallback } from 'react';
import { Zap, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../utils/autoPlacement';
import api from '../services/api';
import SpotlightTour from './SpotlightTour';

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
      '👆 Press Next to continue — ▶ plays it like a video · ESC skips',
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

  const steps = mode === 'quick'
    ? QUICK_STEP_IDX.map(i => WALKTHROUGH_STEPS[i])
    : WALKTHROUGH_STEPS;

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
        if (r.data?.never) {
          localStorage.setItem(neverKey(userId), 'true'); // server opt-out wins
        }
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
      api.post('/users/onboarding', { version: ONBOARDING_VERSION, never: dontShowAgain }).catch(() => {});
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
    if (onClose) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dontShowAgain, onClose, userId]);

  // Auto-close the skip hint after a few seconds.
  useEffect(() => {
    if (!showSkipMessage) return undefined;
    const t = setTimeout(() => {
      setShowSkipMessage(false);
      setIsOpen(false);
      if (onClose) onClose();
    }, 6000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSkipMessage]);

  if (!isOpen) return null;
  return (
    <Portal>
      <AnimatePresence>
        {showSkipMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 24, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 24, x: '-50%' }}
            className="fixed left-1/2 bottom-6 z-[10003] w-80 max-w-[calc(100vw-20px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-5 text-center"
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
            initial={{ opacity: 0, y: 30, rotateX: -35, scale: 0.95, x: '-50%' }}
            animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 30, rotateX: -25, scale: 0.95, x: '-50%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{ transformPerspective: 900 }}
            className="fixed left-1/2 bottom-6 z-[10003] w-[22rem] max-w-[calc(100vw-20px)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4"
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
          <SpotlightTour
            steps={steps}
            step={currentStep}
            onStepChange={setCurrentStep}
            onFinish={handleComplete}
            onSkip={handleSkip}
          />
        )}
      </AnimatePresence>
    </Portal>
  );
};

export default Onboarding;
