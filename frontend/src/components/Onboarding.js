import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Onboarding = ({ userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      title: 'Welcome to Smart Shopping List! 🎉',
      description: 'Your intelligent shopping companion with AI-powered features',
      image: '🛒',
      tips: [
        'Create multiple shopping lists',
        'Get smart suggestions based on your habits',
        'Track your budget and spending',
      ],
    },
    {
      title: 'Add Items Easily 📝',
      description: 'Multiple ways to add items to your list',
      image: '✨',
      tips: [
        'Type manually or use voice input',
        'Scan barcodes for instant add',
        'Search from 100+ auto-detected items',
      ],
    },
    {
      title: 'Smart Features 🧠',
      description: 'AI-powered tools to make shopping easier',
      image: '🎯',
      tips: [
        'Auto-sort by store layout',
        'Price tracking and history',
        'Recipe discovery with pantry check',
      ],
    },
    {
      title: 'Level Up & Earn Rewards 🏆',
      description: 'Gamified shopping experience',
      image: '⭐',
      tips: [
        'Earn XP for every action',
        'Unlock perks as you level up',
        'Complete achievements',
      ],
    },
    {
      title: 'Plan Your Meals 🍽️',
      description: 'Weekly meal planning made simple',
      image: '📅',
      tips: [
        'Drag recipes to calendar',
        'Auto-generate shopping lists',
        'Track pantry inventory',
      ],
    },
    {
      title: "You're All Set! 🚀",
      description: 'Start shopping smarter today',
      image: '✅',
      tips: [
        'Create your first shopping list',
        'Explore all features at your own pace',
        'Check Settings for customization',
      ],
    },
  ];

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem(`onboarding_${userId}`);
    if (!hasSeenOnboarding) {
      setIsOpen(true);
    }
  }, [userId]);

  const handleComplete = () => {
    localStorage.setItem(`onboarding_${userId}`, 'true');
    setIsOpen(false);
  };

  const handleSkip = () => {
    localStorage.setItem(`onboarding_${userId}`, 'true');
    setIsOpen(false);
  };

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

  if (!isOpen) return null;

  const step = steps[currentStep];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="card max-w-2xl w-full"
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
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">{step.image}</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {step.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {step.description}
            </p>

            <div className="space-y-3">
              {step.tips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-left text-gray-900 dark:text-white">
                    {tip}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`btn-secondary flex items-center ${
                currentStep === 0 ? 'invisible' : ''
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentStep + 1} of {steps.length}
            </span>

            <button
              onClick={nextStep}
              className="btn-primary flex items-center"
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
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                Skip tutorial
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Onboarding;
