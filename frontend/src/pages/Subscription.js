import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, Check, X, Zap, Star, TrendingDown, Truck, 
  ChefHat, Tag, Shield, Sparkles, ArrowRight 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import PageTransition from '../components/PageTransition';

const Subscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load user's current subscription status
    const savedPlan = localStorage.getItem('subscriptionPlan') || 'free';
    setCurrentPlan(savedPlan);
  }, []);

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      description: 'Everything you need to get started',
      features: [
        { text: 'Unlimited shopping lists', included: true },
        { text: '50+ beautiful icons', included: true },
        { text: 'All animations & UI polish', included: true },
        { text: 'Export lists (CSV/PDF)', included: true },
        { text: 'Share lists via link', included: true },
        { text: 'Recipe management', included: true },
        { text: 'Pantry & fridge tracking', included: true },
        { text: 'Statistics dashboard', included: true },
        { text: 'Voice input for items', included: true },
        { text: 'Barcode scanner', included: true },
        { text: 'Price tracking', included: true },
        { text: 'Basic budget tracker', included: true },
        { text: 'Dark mode', included: true },
        { text: 'Mobile app (PWA)', included: true },
        { text: 'Coupon & deals finder', included: false },
        { text: 'AI recipe assistant', included: false },
        { text: 'Grocery delivery integration', included: false },
        { text: 'Real-time collaboration', included: false },
        { text: 'Advanced nutrition tracking', included: false },
        { text: 'Voice assistant', included: false }
      ]
    },
    premium: {
      name: 'Premium',
      monthlyPrice: 6.99,
      yearlyPrice: 69.99,
      savings: 'Save $14/year',
      description: 'Everything you need for smart shopping',
      badge: 'Most Popular',
      features: [
        { text: 'Everything in Free', included: true, highlight: true },
        { text: '🎟️ Coupon & Deals Finder - Save $20+/month', included: true, premium: true },
        { text: '🤖 AI Recipe Assistant - Smart suggestions', included: true, premium: true },
        { text: '🚚 Grocery Delivery Integration', included: true, premium: true },
        { text: '📦 Order from Instacart/Amazon/Walmart+', included: true, premium: true },
        { text: '📍 Real-time delivery tracking', included: true, premium: true },
        { text: '⭐ Save favorite stores & preferences', included: true, premium: true },
        { text: '⏰ Schedule delivery time slots', included: true, premium: true },
        { text: '💵 Built-in tip calculator', included: true, premium: true },
        { text: '👥 Real-time list collaboration', included: true },
        { text: '🥗 Advanced nutrition tracking & goals', included: true },
        { text: '🎤 Voice assistant - Hands-free control', included: true },
        { text: '📅 Visual meal calendar & planning', included: true },
        { text: '💰 Advanced budget goals & analytics', included: true },
        { text: '🔔 Smart notifications & alerts', included: true },
        { text: '🎨 200+ premium icons', included: true },
        { text: '📤 Advanced export (Excel, Sheets)', included: true },
        { text: '☁️ Auto-backup to cloud', included: true },
        { text: '🏆 Priority support', included: true },
        { text: '✨ Premium badge & early access', included: true }
      ]
    }
  };

  const handleSubscribe = async (plan) => {
    setLoading(true);
    
    try {
      // In production, this will redirect to PayPal
      // For now, simulate the subscription
      
      const price = billingCycle === 'monthly' 
        ? plans.premium.monthlyPrice 
        : plans.premium.yearlyPrice;
      
      // Mock PayPal integration
      const paypalUrl = `https://www.paypal.com/subscribe?business=YOUR_PAYPAL_EMAIL&item_name=CloudMC Shop Premium ${billingCycle === 'monthly' ? 'Monthly' : 'Yearly'}&amount=${price}&currency_code=USD`;
      
      // Save pending subscription
      localStorage.setItem('pendingSubscription', JSON.stringify({
        plan: 'premium',
        cycle: billingCycle,
        price,
        timestamp: Date.now()
      }));
      
      // In production: window.location.href = paypalUrl;
      // For demo: just activate it
      localStorage.setItem('subscriptionPlan', 'premium');
      localStorage.setItem('subscriptionDate', new Date().toISOString());
      setCurrentPlan('premium');
      
      alert(`Premium ${billingCycle} subscription activated! In production, you would be redirected to PayPal.`);
      
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Failed to process subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = () => {
    if (window.confirm('Are you sure you want to cancel your premium subscription?')) {
      localStorage.setItem('subscriptionPlan', 'free');
      setCurrentPlan('free');
      alert('Subscription cancelled. You will retain premium features until the end of your billing period.');
    }
  };

  return (
    <PageTransition>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        <Sidebar />
        
        <div className="flex-1 p-8">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="inline-block p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full mb-4">
              <Crown className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              Upgrade to Premium
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Unlock powerful features for smarter shopping
            </p>
          </div>

          {/* Current Plan Badge */}
          {currentPlan === 'premium' && (
            <div className="max-w-4xl mx-auto mb-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Crown className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">You're on Premium!</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enjoying all premium features
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCancelSubscription}
                  className="text-sm text-red-600 dark:text-red-400 hover:underline"
                >
                  Cancel Subscription
                </button>
              </div>
            </div>
          )}

          {/* Billing Toggle */}
          <div className="max-w-4xl mx-auto mb-8 flex justify-center">
            <div className="inline-flex items-center space-x-4 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all relative ${
                  billingCycle === 'yearly'
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Yearly
                <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full">
                  Save 17%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            {/* Free Plan */}
            <div className={`p-8 rounded-2xl border-2 ${
              currentPlan === 'free'
                ? 'border-gray-400 dark:border-gray-600 bg-gray-50 dark:bg-gray-900'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.free.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {plans.free.description}
              </p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900 dark:text-white">$0</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/forever</span>
              </div>
              <ul className="space-y-3 mb-8">
                {plans.free.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                    ) : (
                      <X className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                    )}
                    <span className={feature.included ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              {currentPlan === 'free' ? (
                <div className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-center rounded-lg font-semibold">
                  Current Plan
                </div>
              ) : (
                <button
                  onClick={handleCancelSubscription}
                  className="w-full px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Downgrade to Free
                </button>
              )}
            </div>

            {/* Premium Plan */}
            <div className="relative p-8 rounded-2xl border-2 border-primary-500 bg-gradient-to-br from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20 shadow-xl">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-sm font-bold rounded-full flex items-center shadow-lg">
                  <Star className="w-4 h-4 mr-1" />
                  {plans.premium.badge}
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                {plans.premium.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {plans.premium.description}
              </p>
              <div className="mb-6">
                <span className="text-5xl font-bold text-gray-900 dark:text-white">
                  ${billingCycle === 'monthly' ? plans.premium.monthlyPrice : plans.premium.yearlyPrice}
                </span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
                {billingCycle === 'yearly' && (
                  <div className="mt-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-bold rounded-full">
                      {plans.premium.savings}
                    </span>
                  </div>
                )}
              </div>
              <ul className="space-y-3 mb-8 max-h-96 overflow-y-auto custom-scrollbar">
                {plans.premium.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <Check className={`w-5 h-5 mr-3 flex-shrink-0 mt-0.5 ${
                      feature.premium ? 'text-yellow-500' : 'text-primary-500'
                    }`} />
                    <span className={`${
                      feature.highlight ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
              {currentPlan === 'premium' ? (
                <div className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-center rounded-lg font-semibold flex items-center justify-center">
                  <Crown className="w-5 h-5 mr-2" />
                  Active Premium
                </div>
              ) : (
                <button
                  onClick={() => handleSubscribe('premium')}
                  disabled={loading}
                  className="w-full px-6 py-4 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-lg font-semibold text-lg hover:from-primary-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center disabled:opacity-50"
                >
                  {loading ? (
                    'Processing...'
                  ) : (
                    <>
                      Upgrade to Premium
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </button>
              )}
              <p className="text-center text-xs text-gray-600 dark:text-gray-400 mt-3">
                Secure payment via PayPal • Cancel anytime
              </p>
            </div>
          </div>

          {/* Premium Features Showcase */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-8">
              Premium Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={<Tag className="w-8 h-8" />}
                title="Coupon & Deals Finder"
                description="Automatically find coupons and price drops for items on your list. Save money on every shopping trip."
                color="from-green-500 to-emerald-500"
              />
              <FeatureCard
                icon={<ChefHat className="w-8 h-8" />}
                title="AI Recipe Assistant"
                description="Get personalized recipe suggestions based on what's in your pantry. Never wonder what to cook again."
                color="from-purple-500 to-pink-500"
              />
              <FeatureCard
                icon={<Truck className="w-8 h-8" />}
                title="Grocery Delivery"
                description="Order from Instacart, Amazon Fresh, or Walmart+ directly from the app. Track your delivery in real-time."
                color="from-blue-500 to-cyan-500"
              />
            </div>
          </div>

          {/* FAQ */}
          <div className="max-w-4xl mx-auto mt-16">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              <FAQItem
                question="Can I cancel anytime?"
                answer="Yes! You can cancel your subscription at any time. You'll retain premium features until the end of your billing period."
              />
              <FAQItem
                question="What payment methods do you accept?"
                answer="We accept all major credit cards and PayPal through our secure payment processor."
              />
              <FAQItem
                question="Is there a free trial?"
                answer="The free plan is available forever with no credit card required. You can upgrade to premium anytime."
              />
              <FAQItem
                question="Can I switch between monthly and yearly?"
                answer="Yes! You can change your billing cycle at any time from your account settings."
              />
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const FeatureCard = ({ icon, title, description, color }) => (
  <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
    <div className={`inline-block p-3 bg-gradient-to-br ${color} rounded-lg mb-4`}>
      <div className="text-white">{icon}</div>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
    <p className="text-gray-600 dark:text-gray-400 text-sm">{description}</p>
  </div>
);

const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        <span className="font-semibold text-gray-900 dark:text-white">{question}</span>
        <span className="text-gray-400">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-4 pt-0 text-gray-600 dark:text-gray-400">
          {answer}
        </div>
      )}
    </div>
  );
};

export default Subscription;
