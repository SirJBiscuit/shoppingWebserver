import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Crown, Check, X, Zap, Sparkles, TrendingUp, Shield, Smartphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';
import { useToast } from '../hooks/useToast';
import api from '../services/api';

const Premium = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [loading, setLoading] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [selectedTier, setSelectedTier] = useState('monthly');

  useEffect(() => {
    fetchSubscriptionStatus();
    
    // Check for successful checkout
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      success('🎉 Welcome to Premium! Your subscription is now active.');
      navigate('/premium', { replace: true });
    }
  }, [searchParams]);

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await api.get('/subscription/status');
      setSubscriptionStatus(response.data);
    } catch (err) {
      console.error('Error fetching subscription:', err);
    }
  };

  const handleSubscribe = async (tier) => {
    setLoading(true);
    try {
      const response = await api.post('/subscription/create-checkout-session', { tier });
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Error creating checkout:', err);
      error('Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await api.post('/subscription/create-portal-session');
      window.location.href = response.data.url;
    } catch (err) {
      console.error('Error opening portal:', err);
      error('Failed to open subscription management. Please try again.');
      setLoading(false);
    }
  };

  const isPremium = subscriptionStatus?.isPremium;

  const features = {
    free: [
      { name: 'Up to 3 shopping lists', included: true },
      { name: 'Up to 50 inventory items', included: true },
      { name: 'Up to 10 recipes', included: true },
      { name: 'Basic categories', included: true },
      { name: 'Dark mode', included: true },
      { name: 'Unlimited lists', included: false },
      { name: 'Unlimited inventory', included: false },
      { name: 'Unlimited recipes', included: false },
      { name: 'Meal planning', included: false },
      { name: 'Smart suggestions', included: false },
      { name: 'Multiple stores', included: false },
      { name: 'Price tracking', included: false },
      { name: 'Barcode scanning', included: false },
      { name: 'Voice input', included: false },
      { name: 'Share lists', included: false },
      { name: 'Export data', included: false },
      { name: 'Priority support', included: false },
    ],
    premium: [
      { name: 'Unlimited shopping lists', included: true },
      { name: 'Unlimited inventory items', included: true },
      { name: 'Unlimited recipes', included: true },
      { name: 'Meal planning (weekly)', included: true },
      { name: 'AI-powered smart suggestions', included: true },
      { name: 'Multiple custom stores', included: true },
      { name: 'Price tracking & analytics', included: true },
      { name: 'Barcode scanning', included: true },
      { name: 'Voice input', included: true },
      { name: 'Share lists with family', included: true },
      { name: 'Export data (CSV, PDF)', included: true },
      { name: 'Priority support', included: true },
      { name: 'Ad-free experience', included: true },
      { name: 'Early access to new features', included: true },
    ],
  };

  return (
    <PageTransition>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="text-center mb-12">
              <div className="flex items-center justify-center mb-4">
                <Crown className="w-16 h-16 text-yellow-500" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Upgrade to Premium
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Unlock unlimited features and supercharge your shopping experience
              </p>
            </div>

            {/* Current Status */}
            {isPremium && (
              <div className="mb-8 p-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-xl text-white text-center">
                <div className="flex items-center justify-center mb-2">
                  <Sparkles className="w-6 h-6 mr-2" />
                  <h2 className="text-2xl font-bold">You're Premium!</h2>
                </div>
                <p className="mb-4">
                  {subscriptionStatus.tier === 'weekly' ? 'Weekly' : 'Monthly'} subscription
                  {subscriptionStatus.cancelAtPeriodEnd && ' (Cancels at period end)'}
                </p>
                <button
                  onClick={handleManageSubscription}
                  disabled={loading}
                  className="bg-white text-orange-600 px-6 py-2 rounded-full font-bold hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Manage Subscription
                </button>
              </div>
            )}

            {/* Pricing Cards */}
            {!isPremium && (
              <div className="grid md:grid-cols-2 gap-8 mb-12">
                {/* Weekly Plan */}
                <div className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border-2 transition-all ${
                  selectedTier === 'weekly' 
                    ? 'border-primary-500 scale-105' 
                    : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="text-center mb-6">
                    <Zap className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Weekly
                    </h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-gray-900 dark:text-white">$5</span>
                      <span className="text-gray-600 dark:text-gray-400 ml-2">/week</span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      Perfect for trying Premium
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubscribe('weekly')}
                    disabled={loading}
                    className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-lg font-bold transition-colors disabled:opacity-50 mb-6"
                  >
                    {loading ? 'Loading...' : 'Start Weekly'}
                  </button>
                  <ul className="space-y-3 text-left">
                    <li className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited shopping lists</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited pantry items</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited recipes</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Advanced meal planning</span>
                    </li>
                    <li className="flex items-start text-gray-700 dark:text-gray-300">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>

                {/* Monthly Plan - Recommended */}
                <div className="relative bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl shadow-2xl p-8 border-2 border-primary-400 scale-105">
                  <div className="absolute top-0 right-0 bg-yellow-400 text-gray-900 px-4 py-1 rounded-bl-lg rounded-tr-lg font-bold text-sm">
                    SAVE 40%
                  </div>
                  <div className="text-center mb-6">
                    <Crown className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Monthly
                    </h3>
                    <div className="flex items-baseline justify-center">
                      <span className="text-5xl font-bold text-white">$15</span>
                      <span className="text-primary-100 ml-2">/month</span>
                    </div>
                    <p className="text-sm text-primary-100 mt-2 line-through">
                      $20/month if paid weekly
                    </p>
                    <p className="text-sm text-yellow-300 font-bold mt-1">
                      Save $5 every month!
                    </p>
                  </div>
                  <button
                    onClick={() => handleSubscribe('monthly')}
                    disabled={loading}
                    className="w-full bg-white text-primary-600 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors disabled:opacity-50 mb-6"
                  >
                    {loading ? 'Loading...' : 'Start Monthly'}
                  </button>
                  <ul className="space-y-3 text-left">
                    <li className="flex items-start text-white">
                      <Check className="w-5 h-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited shopping lists</span>
                    </li>
                    <li className="flex items-start text-white">
                      <Check className="w-5 h-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited pantry items</span>
                    </li>
                    <li className="flex items-start text-white">
                      <Check className="w-5 h-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Unlimited recipes</span>
                    </li>
                    <li className="flex items-start text-white">
                      <Check className="w-5 h-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Advanced meal planning</span>
                    </li>
                    <li className="flex items-start text-white">
                      <Check className="w-5 h-5 text-yellow-300 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Priority support</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Payment Methods Info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mb-12">
              <div className="flex items-start">
                <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-3 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                    Secure Payment Methods
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4 font-medium">
                    We accept all major credit and debit cards, Apple Pay, and Google Pay. Payments are securely processed by Stripe.
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">💳 Cards</p>
                      <p className="text-gray-600 dark:text-gray-400">Visa, Mastercard, Amex, Discover</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">🍎 Apple Pay</p>
                      <p className="text-gray-600 dark:text-gray-400">iPhone, iPad, Mac, Safari</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">📱 Google Pay</p>
                      <p className="text-gray-600 dark:text-gray-400">Android app (coming soon)</p>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white mb-1">🔗 Stripe Link</p>
                      <p className="text-gray-600 dark:text-gray-400">Fast checkout</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Features Comparison */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
                Premium Features
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {features.premium.map((feature, index) => (
                  <div key={index} className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <Check className="w-5 h-5 text-green-600 dark:text-green-400 mr-3 flex-shrink-0" />
                    <span className="text-gray-900 dark:text-white">{feature.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Trust Badges */}
            <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
              <div className="p-6">
                <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Secure Payments</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Powered by Stripe - Industry-leading security
                </p>
              </div>
              <div className="p-6">
                <TrendingUp className="w-12 h-12 text-blue-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Cancel Anytime</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  No long-term commitment required
                </p>
              </div>
              <div className="p-6">
                <Sparkles className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-2">Instant Access</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Premium features unlock immediately
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default Premium;
