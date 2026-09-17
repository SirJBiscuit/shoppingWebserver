import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { customTheme } from '../utils/customTheme';

/**
 * CustomSwipeActions - iOS/Android style swipe-to-reveal actions
 * 
 * Features:
 * - Left/right swipe gestures
 * - Multiple action buttons
 * - Color-coded actions
 * - Haptic feedback (if available)
 * - Smooth animations
 * - Auto-reset on release
 * - Threshold-based activation
 * 
 * Use Cases:
 * - Swipe item → Delete, Edit, Move
 * - Swipe recipe → Save, Share
 * - Swipe notification → Dismiss, Snooze
 */
const CustomSwipeActions = ({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  onSwipeComplete,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(null); // 'left' | 'right' | null
  const x = useMotionValue(0);
  const containerRef = useRef(null);

  // Calculate background colors based on swipe distance
  const leftBgColor = useTransform(
    x,
    [0, threshold],
    ['rgba(0, 0, 0, 0)', leftActions[0]?.bgColor || 'rgba(239, 68, 68, 1)']
  );

  const rightBgColor = useTransform(
    x,
    [-threshold, 0],
    [rightActions[0]?.bgColor || 'rgba(59, 130, 246, 1)', 'rgba(0, 0, 0, 0)']
  );

  // Handle drag end
  const handleDragEnd = (event, info) => {
    const swipeThreshold = threshold;

    // Swipe right (reveal left actions)
    if (info.offset.x > swipeThreshold && leftActions.length > 0) {
      setIsOpen('left');
      x.set(leftActions.length * 80);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
    // Swipe left (reveal right actions)
    else if (info.offset.x < -swipeThreshold && rightActions.length > 0) {
      setIsOpen('right');
      x.set(-rightActions.length * 80);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
    // Reset
    else {
      setIsOpen(null);
      x.set(0);
    }
  };

  // Handle action click
  const handleActionClick = (action) => {
    action.onClick?.();
    onSwipeComplete?.(action);
    
    // Reset swipe
    setTimeout(() => {
      setIsOpen(null);
      x.set(0);
    }, 200);
  };

  // Reset swipe
  const resetSwipe = () => {
    setIsOpen(null);
    x.set(0);
  };

  if (disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      {/* Left Actions Background */}
      {leftActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 left-0 flex items-center"
          style={{ backgroundColor: leftBgColor }}
        >
          {leftActions.map((action, index) => (
            <motion.button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`
                h-full px-6 flex items-center justify-center
                ${action.color || 'bg-red-500'}
                text-white font-medium
                transition-opacity
              `}
              style={{ width: 80 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ 
                opacity: isOpen === 'left' ? 1 : 0,
                x: isOpen === 'left' ? 0 : -20
              }}
              transition={{ delay: index * 0.05 }}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
              {action.label && !action.icon && (
                <span className="text-sm">{action.label}</span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Right Actions Background */}
      {rightActions.length > 0 && (
        <motion.div
          className="absolute inset-y-0 right-0 flex items-center"
          style={{ backgroundColor: rightBgColor }}
        >
          {rightActions.map((action, index) => (
            <motion.button
              key={index}
              onClick={() => handleActionClick(action)}
              className={`
                h-full px-6 flex items-center justify-center
                ${action.color || 'bg-blue-500'}
                text-white font-medium
                transition-opacity
              `}
              style={{ width: 80 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ 
                opacity: isOpen === 'right' ? 1 : 0,
                x: isOpen === 'right' ? 0 : 20
              }}
              transition={{ delay: index * 0.05 }}
            >
              {action.icon && <action.icon className="w-5 h-5" />}
              {action.label && !action.icon && (
                <span className="text-sm">{action.label}</span>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Swipeable Content */}
      <motion.div
        drag="x"
        dragConstraints={{
          left: rightActions.length > 0 ? -rightActions.length * 80 : 0,
          right: leftActions.length > 0 ? leftActions.length * 80 : 0
        }}
        dragElastic={0.2}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative bg-white dark:bg-gray-800 cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};

export default CustomSwipeActions;
