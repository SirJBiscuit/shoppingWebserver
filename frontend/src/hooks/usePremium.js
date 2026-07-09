import { useState, useEffect } from 'react';

export const usePremium = () => {
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState('free');
  const [subscriptionDate, setSubscriptionDate] = useState(null);

  useEffect(() => {
    checkPremiumStatus();
    
    // Listen for subscription changes
    const handleStorageChange = () => {
      checkPremiumStatus();
    };
    
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('subscription-changed', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('subscription-changed', handleStorageChange);
    };
  }, []);

  const checkPremiumStatus = () => {
    const plan = localStorage.getItem('subscriptionPlan') || 'free';
    const date = localStorage.getItem('subscriptionDate');
    
    setSubscriptionPlan(plan);
    setIsPremium(plan === 'premium');
    setSubscriptionDate(date ? new Date(date) : null);
  };

  const upgradeToPremium = (cycle = 'monthly') => {
    localStorage.setItem('subscriptionPlan', 'premium');
    localStorage.setItem('subscriptionCycle', cycle);
    localStorage.setItem('subscriptionDate', new Date().toISOString());
    setIsPremium(true);
    setSubscriptionPlan('premium');
    
    // Dispatch event for other components
    window.dispatchEvent(new Event('subscription-changed'));
  };

  const cancelPremium = () => {
    localStorage.setItem('subscriptionPlan', 'free');
    localStorage.removeItem('subscriptionCycle');
    localStorage.removeItem('subscriptionDate');
    setIsPremium(false);
    setSubscriptionPlan('free');
    
    // Dispatch event for other components
    window.dispatchEvent(new Event('subscription-changed'));
  };

  return {
    isPremium,
    subscriptionPlan,
    subscriptionDate,
    upgradeToPremium,
    cancelPremium,
    checkPremiumStatus
  };
};
