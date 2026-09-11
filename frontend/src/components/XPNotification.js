import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const XPNotification = ({ xpAmount, message, onComplete }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 800ms (quick but visible)
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Call onComplete after animation
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 200);
    }, 800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: [0.3, 1.1, 1], 
            y: 0,
            rotate: [0, -5, 5, 0]
          }}
          exit={{ opacity: 0, scale: 0.8, y: -20 }}
          transition={{ 
            duration: 0.3, 
            ease: 'easeOut',
            scale: { times: [0, 0.6, 1], duration: 0.4 }
          }}
          className="bg-gradient-to-br from-yellow-400 via-orange-500 to-pink-500 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-full shadow-2xl flex items-center space-x-2 border-2 border-yellow-300 relative overflow-hidden"
        >
          {/* Shine effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
            initial={{ x: '-100%' }}
            animate={{ x: '200%' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          />
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </motion.div>
          <span className="text-base sm:text-lg font-bold relative z-10">+{xpAmount} XP</span>
          {message && (
            <span className="text-xs opacity-90 hidden sm:inline relative z-10">{message}</span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Container to manage multiple XP notifications
export const XPNotificationContainer = () => {
  const [notifications, setNotifications] = useState([]);
  const [consolidatedXP, setConsolidatedXP] = useState(null);

  useEffect(() => {
    // Listen for XP events
    const handleXPGain = (event) => {
      // Check if XP notifications are enabled in settings
      const settings = JSON.parse(localStorage.getItem('appSettings') || '{}');
      if (settings.showXPNotifications === false) {
        return; // Don't show notification if disabled
      }

      const { xp, message } = event.detail;
      
      // Consolidate XP notifications if they come within 500ms of each other
      setConsolidatedXP(prev => {
        if (prev && Date.now() - prev.timestamp < 500) {
          // Add to existing consolidated notification
          return {
            ...prev,
            xp: prev.xp + xp,
            count: prev.count + 1,
            timestamp: Date.now()
          };
        } else {
          // Start new consolidated notification
          return {
            id: Date.now(),
            xp: xp,
            message: message,
            count: 1,
            timestamp: Date.now()
          };
        }
      });
    };

    window.addEventListener('xpGained', handleXPGain);
    
    return () => {
      window.removeEventListener('xpGained', handleXPGain);
    };
  }, []);

  useEffect(() => {
    // When consolidated XP changes, show it as a notification after a brief delay
    if (consolidatedXP) {
      const timer = setTimeout(() => {
        setNotifications(prev => [...prev, consolidatedXP]);
        setConsolidatedXP(null);
      }, 100); // Small delay to allow more XP to consolidate

      return () => clearTimeout(timer);
    }
  }, [consolidatedXP]);

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-20 right-2 sm:right-4 z-50 space-y-2">
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
            message={notification.count > 1 ? `${notification.count}x actions!` : notification.message}
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
