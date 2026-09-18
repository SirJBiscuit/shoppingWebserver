import React, { useState } from 'react';
import { X, Check, Crown, Zap, Star, CreditCard, Lock } from 'lucide-react';

const SubscriptionModal = ({ isOpen, onClose, onSubscribe, currentPlan = 'free' }) => {
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [loading, setLoading] = useState(false);

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      features: [
        'Basic shopping lists',
        'Recipe management',
        'Pantry tracking',
        'Statistics dashboard',
        'Up to 3 lists'
      ]
    },
    monthly: {
      name: 'Premium Monthly',
      price: 6.99,
      period: 'month',
      features: [
        'Everything in Free',
        'Unlimited shopping lists',
        'Grocery delivery integration',
        'Real-time collaboration',
        'Advanced nutrition tracking',
        'AI recipe suggestions',
        'Coupon & deals finder',
        'Priority support',
        'No ads'
      ]
    },
    yearly: {
      name: 'Premium Yearly',
      price: 69.99,
      period: 'year',
      savings: '17% off',
      features: [
        'Everything in Monthly',
        'Save $14/year',
        'Early access to new features',
        'Premium badge',
        'Exclusive recipes'
      ]
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await onSubscribe(selectedPlan);
      // In production, this would redirect to Stripe checkout
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-primary-600 to-purple-600">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-white">Upgrade to Premium</h2>
                <p className="text-white/90 mt-1">Unlock powerful features for smarter shopping</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Plan Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Free Plan */}
            <div className={`p-6 rounded-lg border-2 ${
              currentPlan === 'free' 
                ? 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Free</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-400">/forever</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plans.free.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <Check className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              {currentPlan === 'free' && (
                <div className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center rounded font-medium">
                  Current Plan
                </div>
              )}
            </div>

            {/* Monthly Plan */}
            <div className={`p-6 rounded-lg border-2 relative ${
              selectedPlan === 'monthly'
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="px-3 py-1 bg-primary-600 text-white text-xs font-bold rounded-full">
                  POPULAR
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Premium</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$4.99</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                {plans.monthly.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <Check className="w-4 h-4 text-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setSelectedPlan('monthly');
                  handleSubscribe();
                }}
                disabled={loading}
                className="w-full btn-primary"
              >
                {loading ? 'Processing...' : 'Subscribe Monthly'}
              </button>
            </div>

            {/* Yearly Plan */}
            <div className={`p-6 rounded-lg border-2 relative ${
              selectedPlan === 'yearly'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700'
            }`}>
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs font-bold rounded-full flex items-center">
                  <Star className="w-3 h-3 mr-1" />
                  BEST VALUE
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Premium Yearly</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$49.99</span>
                <span className="text-gray-600 dark:text-gray-400">/year</span>
                <div className="mt-1">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-bold rounded">
                    Save $10/year
                  </span>
                </div>
              </div>
              <ul className="space-y-3 mb-6">
                {plans.yearly.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-sm">
                    <Check className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => {
                  setSelectedPlan('yearly');
                  handleSubscribe();
                }}
                disabled={loading}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
              >
                {loading ? 'Processing...' : 'Subscribe Yearly'}
              </button>
            </div>
          </div>

          {/* Premium Features Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">Grocery Delivery</h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Order groceries directly from the app. Connect to Instacart, Amazon Fresh, and more.
              </p>
            </div>

            <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <h4 className="font-semibold text-gray-900 dark:text-white">AI Recipe Assistant</h4>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Get personalized recipe suggestions based on your pantry items and preferences.
              </p>
            </div>
          </div>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Lock className="w-4 h-4" />
            <span>Secure payment processing by Stripe</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Cancel anytime. No hidden fees.
            </p>
            <button onClick={onClose} className="btn-secondary">
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionModal;
