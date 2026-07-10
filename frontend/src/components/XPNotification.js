import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const XPNotification = ({ xpAmount, message, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Fade out after 3 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Call onComplete after animation finishes
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 500);
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="fixed top-20 right-4 z-50 pointer-events-none"
      >
        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center space-x-3 border-2 border-yellow-300">
          <Sparkles className="w-5 h-5 animate-pulse" />
          <div className="flex flex-col">
            <span className="text-2xl font-bold">+{xpAmount} XP</span>
            {message && (
              <span className="text-xs opacity-90">{message}</span>
            )}
          </div>
          <TrendingUp className="w-5 h-5" />
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Container to manage multiple XP notifications
export const XPNotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Listen for XP events
    const handleXPGain = (event) => {
      const { xp, message } = event.detail;
      const id = Date.now();
      
      setNotifications(prev => [...prev, { id, xp, message }]);
    };

    window.addEventListener('xpGained', handleXPGain);
    
    return () => {
      window.removeEventListener('xpGained', handleXPGain);
    };
  }, []);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2">
      {notifications.map((notification, index) => (
        <motion.div
          key={notification.id}
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ delay: index * 0.1 }}
        >
          <XPNotification
            xpAmount={notification.xp}
            message={notification.message}
            onComplete={() => removeNotification(notification.id)}
          />
        </motion.div>
      ))}
    </div>
  );
};

// Helper function to trigger XP notification
export const showXPNotification = (xp, message) => {
  const event = new CustomEvent('xpGained', {
    detail: { xp, message }
  });
  window.dispatchEvent(event);
};

export default XPNotification;
