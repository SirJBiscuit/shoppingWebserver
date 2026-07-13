import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const XPNotification = ({ xpAmount, message, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 600ms (very fast for mobile)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Call onComplete immediately when hiding
      if (onComplete) onComplete();
    }, 600);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full shadow-xl flex items-center space-x-2 border-2 border-yellow-300"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-lg font-bold">+{xpAmount} XP</span>
          {message && (
            <span className="text-xs opacity-90 hidden sm:inline">{message}</span>
          )}
        </motion.div>
      )}
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
