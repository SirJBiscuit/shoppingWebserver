import { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Portal } from '../utils/autoPlacement';
import api from '../services/api';

// Bump this when the tutorial content changes — re-fires the tour once for
// users who already completed the previous version.
const ONBOARDING_VERSION = 'v4';
const onboardingKey = (userId) => `onboarding_${ONBOARDING_VERSION}_${userId}`;
// Permanent opt-out — NOT versioned, so bumping the tutorial version never
// re-fires for users who explicitly asked not to see it.
const neverKey = (userId) => `onboarding_never_${userId || 'guest'}`;

const Onboarding = ({ userId, forceOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [targetRect, setTargetRect] = useState(null); // spotlight: focused element bounds
  const modalRef = useRef(null);
  const nextButtonRef = useRef(null);

  // One walkthrough — every step spotlights the real control and explains
  // what it does. Overlay is click-through during focused steps so the user
  // can try each control while the tour is open.
  const walkthroughSteps = [
    {
      title: 'Welcome to Listzy! 🎉',
      description: 'Your groceries, from list to pantry to plate',
      image: '🛒',
      focusElement: null,
      instructions: [
        '🔁 The loop: make a list → shop and check off → Unpack into Home Inventory → cook with Recipes and the Homemade Lab',
        '✨ Each step dims the page and spotlights one control',
        '🖱️ You can click the highlighted control as we go',
        '⌨️ ESC skips anytime — the Help button brings this back',
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
      handHold: 'Click any icon to jump to that section — the tour stays open.',
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
      handHold: 'The Help button in this toolbar reopens the walkthrough.',
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
      handHold: 'Green button — try it, lists are free.',
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
      handHold: 'Open it — every list shows its item count.',
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
      handHold: 'Try typing an item right now — the tour waits for you.',
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
      ],
      handHold: 'Check everything off and the app walks you to Unpack next.',
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
      handHold: 'Great for the staples you buy every week.',
    },
    {
      title: 'Smart Suggestions 🧠',
      description: 'Learns what you buy',
      image: '💡',
      focusElement: '[data-tutorial="suggestions"]',
      instructions: [
        'Suggests items from your history with learned prices',
        'Tap one to add it — it gets smarter every shop',
      ],
      handHold: 'Prices here come from what you actually paid.',
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
      handHold: 'Set prices as you add items — they stick for next time.',
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
      handHold: 'That is the loop — list, shop, unpack, cook, repeat.',
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

  // Allow reopening tutorial from Help button
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setCurrentStep(0);
      setShowSkipMessage(false);
    }
  }, [forceOpen]);

  // Focus management and keyboard navigation
  useEffect(() => {
    if (isOpen && nextButtonRef.current) {
      // Focus the next button when modal opens or step changes
      setTimeout(() => {
        nextButtonRef.current?.focus();
      }, 100);
    }

    // Keyboard navigation
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        handleSkip();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        nextStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevStep();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStep]);

  // Trap focus within modal
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [isOpen, currentStep]);

  const handleComplete = () => {
    markSeen();
    setIsOpen(false);
    // Remove focus highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
    // Notify parent component
    if (onClose) onClose();
  };

  const handleSkip = () => {
    markSeen();
    
    // Only show skip message once per user (not on every login)
    const hasSeenSkipMessage = localStorage.getItem(`onboarding_skip_message_${userId}`);
    
    if (!hasSeenSkipMessage) {
      // First time skipping - show helpful message
      setShowSkipMessage(true);
      setCurrentStep(0);
      localStorage.setItem(`onboarding_skip_message_${userId}`, 'true');
      
      // Remove focus highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      
      // Auto-close skip message after 5 seconds
      setTimeout(() => {
        setShowSkipMessage(false);
        setIsOpen(false);
        if (onClose) onClose();
      }, 5000);
    } else {
      // Already seen skip message before - just close
      setIsOpen(false);
      setCurrentStep(0);
      
      // Remove focus highlights
      document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
      });
      // Notify parent component
      if (onClose) onClose();
    }
  };

  const closeSkipMessage = () => {
    setShowSkipMessage(false);
    setIsOpen(false);
    if (onClose) onClose();
  };


  const steps = walkthroughSteps;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Highlight focused element
  useEffect(() => {
    if (showSkipMessage || !steps[currentStep]) return;

    const step = steps[currentStep];
    
    // Remove previous highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Add highlight to current focus element
    if (step.focusElement) {
      const element = document.querySelector(step.focusElement);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, showSkipMessage, steps]);

  // Spotlight: after the highlight effect scrolls the target into view, keep
  // its rect measured so the dim cutout + tooltip card track scroll/resize.
  useEffect(() => {
    if (showSkipMessage || !steps[currentStep]) { setTargetRect(null); return; }
    const sel = steps[currentStep].focusElement;
    if (!sel) { setTargetRect(null); return; }

    const measure = () => {
      const el = document.querySelector(sel);
      if (el) {
        const r = el.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          setTargetRect({ top: r.top, left: r.left, width: r.width, height: r.height });
          return;
        }
      }
      setTargetRect(null);
    };

    const t = setTimeout(measure, 350); // wait for the smooth scroll to land
    measure();
    window.addEventListener('scroll', measure, true); // capture: nested scroll areas
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('scroll', measure, true);
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, showSkipMessage]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  // Spotlight geometry: padded cutout rect + where to anchor the card.
  const CARD_W = 384, CARD_H = 420, M = 12, P = 8;
  const spotlighting = !showSkipMessage && !!targetRect;
  const spot = spotlighting
    ? { x: targetRect.left - P, y: targetRect.top - P, w: targetRect.width + P * 2, h: targetRect.height + P * 2 }
    : null;
  const cardStyle = !spot ? {} : (() => {
    const below = window.innerHeight - (spot.y + spot.h) > CARD_H;
    const top = below ? spot.y + spot.h + M : Math.max(M, spot.y - CARD_H - M);
    const left = Math.min(Math.max(spot.x + spot.w / 2 - CARD_W / 2, M), Math.max(M, window.innerWidth - CARD_W - M));
    return { position: 'fixed', top, left, width: 'min(24rem, calc(100vw - 24px))', maxHeight: '75vh' };
  })();

  return (
    <Portal><AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`fixed inset-0 flex items-center justify-center z-[70] p-2 sm:p-4${spot && !showSkipMessage ? ' pointer-events-none' : ' bg-black/10 backdrop-blur-sm'}`}
        onClick={(e) => {
          // Close on backdrop click
          if (e.target === e.currentTarget) {
            handleSkip();
          }
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="onboarding-title"
        aria-describedby="onboarding-description"
      >
        {/* Spotlight cutout — a padded ring whose box-shadow dims the page
            except over the focused element. Springs between step targets. */}
        {spot && (
          <motion.div
            className="fixed top-0 left-0 rounded-xl pointer-events-none"
            initial={false}
            animate={{ x: spot.x, y: spot.y, width: spot.w, height: spot.h }}
            transition={{ type: 'spring', stiffness: 180, damping: 26 }}
            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.6), 0 0 0 3px rgb(59 130 246), 0 0 30px rgba(59,130,246,0.45)' }}
          />
        )}
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`card pointer-events-auto ${spot ? '' : 'max-w-2xl w-full'} max-h-[90vh] overflow-y-auto shadow-2xl`}
          style={cardStyle}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary-600'
                      : index < currentStep
                      ? 'w-2 bg-primary-400'
                      : 'w-2 bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:ring-2 focus:ring-gray-400 rounded p-1"
              aria-label="Close tutorial"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          {showSkipMessage ? (
            // Skip Message - Show where to find Help
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">👋</div>
              <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Tutorial Skipped
              </h2>
              <p id="onboarding-description" className="text-gray-600 dark:text-gray-400 mb-6">
                No problem! You can access the tutorial anytime.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <HelpCircle className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    Find the Help Button
                  </h3>
                </div>
                <div className="space-y-3 text-left">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">1</div>
                    <p className="text-gray-900 dark:text-white">
                      Look for the <strong className="text-blue-600 dark:text-blue-400">Help</strong> button in the top right corner of the dashboard
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">2</div>
                    <p className="text-gray-900 dark:text-white">
                      Click it to reopen this walkthrough
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">3</div>
                    <p className="text-gray-900 dark:text-white">
                      The tutorial will walk you through everything step-by-step
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={closeSkipMessage}
                className="btn-primary w-full"
              >
                Got it! Let's Start Shopping
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                This message will auto-close in 5 seconds
              </p>
            </div>
          ) : (
            // Tutorial Steps
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">{step.image}</div>
              <h2 id="onboarding-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {step.title}
              </h2>
              <p id="onboarding-description" className="text-gray-600 dark:text-gray-400 mb-6">
                {step.description}
              </p>

              {/* Hand-holding text for full guide */}
              {step.handHold && (
                <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
                  <div className="flex items-start gap-3">
                    <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-left text-sm text-yellow-900 dark:text-yellow-100 font-medium">
                      👉 {step.handHold}
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {step.instructions.map((instruction, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-left"
                  >
                    <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-900 dark:text-white">
                      {instruction}
                    </span>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Navigation - Only show when tutorial mode is selected */}
          {!showSkipMessage && (
            <>
              <div className="flex items-center justify-between">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className={`btn-secondary flex items-center focus:ring-4 focus:ring-gray-300 dark:focus:ring-gray-600 ${
                    currentStep === 0 ? 'invisible' : ''
                  }`}
                  aria-label="Go to previous step"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </button>

                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {currentStep + 1} of {steps.length}
                </span>

                <button
                  ref={nextButtonRef}
                  onClick={nextStep}
                  className="btn-primary flex items-center focus:ring-4 focus:ring-primary-300 dark:focus:ring-primary-700"
                  aria-label={currentStep === steps.length - 1 ? 'Complete tutorial and get started' : 'Go to next step'}
                >
                  {currentStep === steps.length - 1 ? (
                    <>
                      Get Started
                      <Check className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </button>
              </div>

              {/* Skip Link + permanent opt-out */}
              {currentStep < steps.length - 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:ring-2 focus:ring-gray-400 rounded px-2 py-1"
                    aria-label="Skip tutorial and start using the app"
                  >
                    Skip tutorial (ESC)
                  </button>
                  <label className="inline-flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 cursor-pointer select-none hover:text-gray-700 dark:hover:text-gray-300">
                    <input
                      type="checkbox"
                      checked={dontShowAgain}
                      onChange={(e) => setDontShowAgain(e.target.checked)}
                      className="w-3.5 h-3.5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    Don't show again
                  </label>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence></Portal>
  );
};

export default Onboarding;
