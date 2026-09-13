import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Check, Zap, BookOpen, Plus, ShoppingCart, Package, ChefHat, Settings as SettingsIcon, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Onboarding = ({ userId, forceOpen, onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tutorialMode, setTutorialMode] = useState(null); // 'quick' or 'full'
  const [currentStep, setCurrentStep] = useState(0);
  const [showSkipMessage, setShowSkipMessage] = useState(false);
  const modalRef = useRef(null);
  const nextButtonRef = useRef(null);

  // Quick Guide - Essential features only (5 steps)
  const quickSteps = [
    {
      title: 'Welcome to Listzy! 🎉',
      description: 'Let\'s get you started with the essentials',
      image: '🛒',
      focusElement: null,
      instructions: [
        '✨ This quick guide takes 2 minutes',
        '📝 Learn the core features you need',
        '🚀 Start shopping smarter right away',
      ],
    },
    {
      title: 'Create Your First List 📝',
      description: 'Click "+ New List" to start',
      image: '➕',
      focusElement: '[data-tutorial="new-list-button"]',
      instructions: [
        'Click the green "+ New List" button at the top',
        'Give your list a name (e.g., "Weekly Groceries")',
        'Optional: Set a store location for smart sorting',
      ],
      handHold: 'Look for the green button with a plus icon near the top of the page.',
    },
    {
      title: 'Add Items to Your List ✍️',
      description: 'Type item names in the input box',
      image: '�️',
      focusElement: '[data-tutorial="add-item-input"]',
      instructions: [
        'Type an item name (e.g., "Milk", "Bread")',
        'Press Enter or click Add to save',
        'Auto-suggestions will help you type faster',
      ],
      handHold: 'Find the text box that says "Add new item..." and start typing.',
    },
    {
      title: 'Know Your Sidebar 🎯',
      description: 'Three main buttons for navigation',
      image: '📱',
      focusElement: '[data-tutorial="sidebar"]',
      instructions: [
        '🛒 Shopping - Your lists and items (main page)',
        '📦 Pantry - Track what you have at home',
        '🍳 Recipes - Discover meals and meal planning',
      ],
      handHold: 'The sidebar on the left has three colorful icons. Click them to switch between sections.',
    },
    {
      title: 'Dashboard Sections �',
      description: 'Everything you need in one place',
      image: '✅',
      focusElement: null,
      instructions: [
        '📋 Left: Your shopping list with checkboxes',
        '🎯 Right: Smart suggestions and nearby items',
        '💰 Bottom: Budget tracker and cart summary',
      ],
      handHold: 'The main area shows your list on the left and helpful suggestions on the right. Check off items as you shop!',
    },
  ];

  // Full Guide - Comprehensive walkthrough (12 steps)
  const fullSteps = [
    {
      title: 'Welcome to Listzy! 🎉',
      description: 'Your complete guide to smart shopping',
      image: '🛒',
      focusElement: null,
      instructions: [
        '📚 This full guide covers everything',
        '🎓 Perfect for first-time users',
        '⏱️ Takes about 5 minutes',
      ],
    },
    {
      title: 'The Top Toolbar 🔝',
      description: 'Important controls at your fingertips',
      image: '⚡',
      focusElement: '[data-tutorial="top-toolbar"]',
      instructions: [
        '⚡ Optimization Mode - Toggle for faster performance on tablets',
        '🔔 Notifications - See your XP gains and updates',
        '🚪 Logout - Sign out when you\'re done',
      ],
      handHold: 'Look at the very top of the page. You\'ll see a yellow lightning bolt (Optimization), a bell (Notifications), and a red logout button.',
    },
    {
      title: 'Create Your First List 📝',
      description: 'Let\'s make a shopping list',
      image: '➕',
      focusElement: '[data-tutorial="new-list-button"]',
      instructions: [
        'Click the green "+ New List" button',
        'Enter a name like "Weekly Groceries" or "Party Supplies"',
        'Optionally set a store (helps with smart sorting)',
        'Click Create to save your list',
      ],
      handHold: 'Find the bright green button near the top that says "+ New List". Click it, type a name, and press Create. Easy!',
    },
    {
      title: 'Switch Between Lists 🔄',
      description: 'Manage multiple shopping lists',
      image: '📋',
      focusElement: '[data-tutorial="list-dropdown"]',
      instructions: [
        'Use the dropdown menu to switch lists',
        'Each list can have a different store',
        'Lists are saved automatically',
      ],
      handHold: 'See the dropdown menu showing your current list name? Click it to see all your lists and switch between them.',
    },
    {
      title: 'Add Items - Multiple Ways! ✍️',
      description: 'Choose your preferred method',
      image: '🛍️',
      focusElement: '[data-tutorial="add-item-input"]',
      instructions: [
        '⌨️ Type manually - Just start typing',
        '� Voice input - Click the microphone icon',
        '📷 Barcode scan - Click the scan icon',
        '💡 Auto-suggestions appear as you type',
      ],
      handHold: 'The input box says "Add new item...". Type anything and watch suggestions appear! Or try the microphone/camera icons for hands-free adding.',
    },
    {
      title: 'Item Details & Options 🎨',
      description: 'Customize each item',
      image: '⚙️',
      focusElement: '[data-tutorial="item-row"]',
      instructions: [
        '✏️ Edit - Change name, quantity, price, notes',
        '🎨 Color code - Organize by category',
        '📍 Store location - Set which aisle',
        '🗑️ Delete - Remove items you don\'t need',
      ],
      handHold: 'Each item has small icons on the right. Click the pencil to edit, the palette for colors, or the trash to delete.',
    },
    {
      title: 'Looking For Next �',
      description: 'Your smart shopping assistant',
      image: '👀',
      focusElement: '[data-tutorial="looking-for-next"]',
      instructions: [
        '✅ Shows the next unchecked item',
        '🏪 Displays "Grab These Too" - nearby items',
        '⏭️ Skip button - Move to next item',
        '✏️ Quick edit - Change details on the fly',
      ],
      handHold: 'The green box at the top right shows what to look for next. It even suggests other items in the same aisle!',
    },
    {
      title: 'The Sidebar Navigation 🗺️',
      description: 'Three main sections',
      image: '�',
      focusElement: '[data-tutorial="sidebar"]',
      instructions: [
        '🛒 Shopping - Your lists (where you are now)',
        '📦 Pantry - Track home inventory',
        '🍳 Recipes - Meal planning and discovery',
      ],
      handHold: 'The colorful sidebar on the left lets you switch between Shopping, Pantry, and Recipes. Click any icon to explore!',
    },
    {
      title: 'Smart Suggestions 💡',
      description: 'AI learns your shopping habits',
      image: '🤖',
      focusElement: '[data-tutorial="suggestions"]',
      instructions: [
        '📊 Based on your purchase history',
        '📅 Considers time since last purchase',
        '🏪 Suggests items you might need',
        '➕ One-click to add to your list',
      ],
      handHold: 'Scroll down to see "Smart Suggestions". These are items you might have forgotten, based on what you usually buy.',
    },
    {
      title: 'Budget Tracker �',
      description: 'Stay on budget while shopping',
      image: '💵',
      focusElement: '[data-tutorial="budget-tracker"]',
      instructions: [
        '🎯 Set a budget for your trip',
        '📊 See real-time spending',
        '⚠️ Get warnings when approaching limit',
        '📈 Track spending over time',
      ],
      handHold: 'At the bottom, you\'ll see your budget and current total. Set a budget to get alerts when you\'re close to the limit.',
    },
    {
      title: 'XP & Leveling System 🏆',
      description: 'Earn rewards for shopping',
      image: '⭐',
      focusElement: null,
      instructions: [
        '✨ Earn XP for every action',
        '📈 Level up to unlock perks',
        '🎁 Complete achievements',
        '🔔 Notifications show your progress',
      ],
      handHold: 'Every time you add items, check them off, or complete a trip, you earn XP! Watch for the notifications in the top right.',
    },
    {
      title: 'Need Help? 🆘',
      description: 'We\'re here for you',
      image: '❓',
      focusElement: null,
      instructions: [
        '❓ Click the help icon (?) in "Looking For Next"',
        '⚙️ Visit Settings for customization',
        '📖 Check the guide anytime',
        '💬 Tooltips appear when you hover over buttons',
      ],
      handHold: 'If you ever get stuck, look for the question mark icon or hover over buttons to see what they do. You\'ve got this!',
    },
  ];

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_${userId}`);
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [userId]);

  // Allow reopening tutorial from Help button
  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      setTutorialMode(null);
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
    localStorage.setItem(`onboarding_${userId}`, 'true');
    setIsOpen(false);
    // Remove focus highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });
    // Notify parent component
    if (onClose) onClose();
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_${userId}`, 'true');
    
    // Only show skip message once per user (not on every login)
    const hasSeenSkipMessage = localStorage.getItem(`onboarding_skip_message_${userId}`);
    
    if (!hasSeenSkipMessage) {
      // First time skipping - show helpful message
      setShowSkipMessage(true);
      setTutorialMode(null);
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
      setTutorialMode(null);
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

  const selectMode = (mode) => {
    setTutorialMode(mode);
    setCurrentStep(0);
  };

  const steps = tutorialMode === 'quick' ? quickSteps : fullSteps;

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
    if (!tutorialMode || !steps[currentStep]) return;

    const step = steps[currentStep];
    
    // Remove previous highlights
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
      el.classList.remove('tutorial-highlight');
    });

    // Add highlight to current focus element
    if (step.focusElement) {
      const element = document.querySelector(step.focusElement);
      if (element) {
        element.classList.add('tutorial-highlight');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStep, tutorialMode, steps]);

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
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
        <motion.div
          ref={modalRef}
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="card max-w-2xl w-full shadow-2xl"
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
                      Click it to choose between <strong>Quick Guide</strong> or <strong>Full Guide</strong>
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
          ) : !tutorialMode ? (
            // Mode Selection Screen
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">🎓</div>
              <h2 id="onboarding-title" className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
                Welcome to Listzy!
              </h2>
              <p id="onboarding-description" className="text-lg text-gray-600 dark:text-gray-400 mb-8">
                Choose your tutorial experience
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-xl mx-auto">
                {/* Quick Guide */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectMode('quick')}
                  className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl shadow-lg transition-all"
                >
                  <Zap className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-2">Quick Guide</h3>
                  <p className="text-sm text-blue-100 mb-3">Perfect for tech-savvy users</p>
                  <div className="text-xs text-left space-y-1 bg-blue-600/30 rounded-lg p-3">
                    <div>⏱️ 2 minutes</div>
                    <div>📝 5 essential steps</div>
                    <div>🎯 Core features only</div>
                  </div>
                </motion.button>

                {/* Full Guide */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectMode('full')}
                  className="p-6 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl shadow-lg transition-all"
                >
                  <BookOpen className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-xl font-bold mb-2">Full Guide</h3>
                  <p className="text-sm text-green-100 mb-3">Detailed walkthrough with hand-holding</p>
                  <div className="text-xs text-left space-y-1 bg-green-600/30 rounded-lg p-3">
                    <div>⏱️ 5 minutes</div>
                    <div>📚 12 comprehensive steps</div>
                    <div>🤝 Perfect for beginners</div>
                  </div>
                </motion.button>
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-6">
                You can skip the tutorial anytime by pressing ESC
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
              {tutorialMode === 'full' && step.handHold && (
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
          {tutorialMode && (
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
                  {currentStep + 1} of {steps.length} • {tutorialMode === 'quick' ? 'Quick' : 'Full'} Guide
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

              {/* Skip Link */}
              {currentStep < steps.length - 1 && (
                <div className="text-center mt-4">
                  <button
                    onClick={handleSkip}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white focus:ring-2 focus:ring-gray-400 rounded px-2 py-1"
                    aria-label="Skip tutorial and start using the app"
                  >
                    Skip tutorial (ESC)
                  </button>
                </div>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Onboarding;
