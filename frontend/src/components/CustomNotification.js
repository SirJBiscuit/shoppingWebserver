import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Info, CheckCircle, AlertCircle, AlertTriangle, HelpCircle } from 'lucide-react';

/**
 * CustomNotification - A versatile notification/messaging system
 * 
 * Types:
 * - 'info': Information message (blue)
 * - 'success': Success message (green)
 * - 'warning': Warning message (yellow)
 * - 'error': Error message (red)
 * - 'question': Interactive question (purple)
 * - 'custom': Custom styled message
 * 
 * Positions:
 * - 'top': Top center
 * - 'top-right': Top right corner
 * - 'top-left': Top left corner
 * - 'bottom': Bottom center
 * - 'bottom-right': Bottom right corner
 * - 'bottom-left': Bottom left corner
 * - 'center': Screen center (modal-style)
 * 
 * Features:
 * - Auto-dismiss with timer
 * - Interactive buttons/actions
 * - Progress bar for auto-dismiss
 * - Swipe to dismiss on mobile
 * - Stack multiple notifications
 * - Custom icons and colors
 * - Smooth animations
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Notification visibility
 * @param {function} props.onClose - Close callback
 * @param {string} props.type - Notification type (default: 'info')
 * @param {string} props.position - Screen position (default: 'top-right')
 * @param {string} props.title - Notification title
 * @param {string} props.message - Notification message
 * @param {ReactNode} props.icon - Custom icon component
 * @param {number} props.duration - Auto-dismiss duration in ms (0 = no auto-dismiss)
 * @param {boolean} props.showProgress - Show progress bar (default: true)
 * @param {Array} props.actions - Action buttons [{ label, onClick, color?, variant? }]
 * @param {boolean} props.dismissible - Show close button (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const CustomNotification = ({
  isOpen = false,
  onClose,
  type = 'info',
  position = 'top-right',
  title,
  message,
  icon: CustomIcon,
  duration = 5000,
  showProgress = true,
  actions = [],
  dismissible = true,
  className = ''
}) => {
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (!isOpen || duration === 0 || isPaused) return;

    const interval = 50; // Update every 50ms
    const decrement = (interval / duration) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - decrement;
        if (newProgress <= 0) {
          onClose?.();
          return 0;
        }
        return newProgress;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [isOpen, duration, onClose, isPaused]);

  // Reset progress when opened
  useEffect(() => {
    if (isOpen) {
      setProgress(100);
    }
  }, [isOpen]);

  // Type configurations
  const typeConfig = {
    info: {
      icon: Info,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-900 dark:text-blue-100',
      progress: 'bg-blue-500'
    },
    success: {
      icon: CheckCircle,
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-900 dark:text-green-100',
      progress: 'bg-green-500'
    },
    warning: {
      icon: AlertTriangle,
      gradient: 'from-yellow-500 to-yellow-600',
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-900 dark:text-yellow-100',
      progress: 'bg-yellow-500'
    },
    error: {
      icon: AlertCircle,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-900 dark:text-red-100',
      progress: 'bg-red-500'
    },
    question: {
      icon: HelpCircle,
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      text: 'text-purple-900 dark:text-purple-100',
      progress: 'bg-purple-500'
    },
    custom: {
      icon: Info,
      gradient: 'from-gray-500 to-gray-600',
      bg: 'bg-gray-50 dark:bg-gray-900/20',
      border: 'border-gray-200 dark:border-gray-800',
      text: 'text-gray-900 dark:text-gray-100',
      progress: 'bg-gray-500'
    }
  };

  const config = typeConfig[type] || typeConfig.info;
  const Icon = CustomIcon || config.icon;

  // Position classes
  const positionClasses = {
    'top': 'top-4 left-1/2 -translate-x-1/2',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom': 'bottom-4 left-1/2 -translate-x-1/2',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'center': 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
  };

  // Animation variants
  const variants = {
    'top': {
      hidden: { y: -100, opacity: 0, scale: 0.9 },
      visible: { y: 0, opacity: 1, scale: 1 },
      exit: { y: -100, opacity: 0, scale: 0.9 }
    },
    'top-right': {
      hidden: { x: 100, opacity: 0, scale: 0.9 },
      visible: { x: 0, opacity: 1, scale: 1 },
      exit: { x: 100, opacity: 0, scale: 0.9 }
    },
    'top-left': {
      hidden: { x: -100, opacity: 0, scale: 0.9 },
      visible: { x: 0, opacity: 1, scale: 1 },
      exit: { x: -100, opacity: 0, scale: 0.9 }
    },
    'bottom': {
      hidden: { y: 100, opacity: 0, scale: 0.9 },
      visible: { y: 0, opacity: 1, scale: 1 },
      exit: { y: 100, opacity: 0, scale: 0.9 }
    },
    'bottom-right': {
      hidden: { x: 100, opacity: 0, scale: 0.9 },
      visible: { x: 0, opacity: 1, scale: 1 },
      exit: { x: 100, opacity: 0, scale: 0.9 }
    },
    'bottom-left': {
      hidden: { x: -100, opacity: 0, scale: 0.9 },
      visible: { x: 0, opacity: 1, scale: 1 },
      exit: { x: -100, opacity: 0, scale: 0.9 }
    },
    'center': {
      hidden: { scale: 0.8, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
      exit: { scale: 0.8, opacity: 0 }
    }
  };

  const handleActionClick = (action) => {
    action.onClick?.();
    if (action.closeOnClick !== false) {
      onClose?.();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for center position */}
          {position === 'center' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={dismissible ? onClose : undefined}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[150]"
            />
          )}

          {/* Notification */}
          <motion.div
            variants={variants[position]}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={position !== 'center' ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(event, info) => {
              if (Math.abs(info.offset.x) > 100) {
                onClose?.();
              }
            }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            className={`
              fixed ${positionClasses[position]}
              ${config.bg} ${config.border} ${config.text}
              border-2 rounded-xl shadow-2xl
              max-w-md w-full sm:w-auto
              overflow-hidden
              ${position === 'center' ? 'z-[151]' : 'z-[100]'}
              ${className}
            `}
            style={{ minWidth: position === 'center' ? '320px' : '280px' }}
          >
            {/* Content */}
            <div className="p-4">
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Message */}
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="font-bold text-sm sm:text-base mb-1">
                      {title}
                    </h3>
                  )}
                  {message && (
                    <p className="text-xs sm:text-sm opacity-90">
                      {message}
                    </p>
                  )}

                  {/* Actions */}
                  {actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {actions.map((action, index) => (
                        <motion.button
                          key={index}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleActionClick(action)}
                          className={`
                            px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium
                            transition-colors
                            ${action.variant === 'outline'
                              ? `border-2 ${config.border} ${config.text} hover:bg-white/50 dark:hover:bg-black/20`
                              : action.color || `bg-gradient-to-br ${config.gradient} text-white hover:opacity-90`
                            }
                          `}
                        >
                          {action.label}
                        </motion.button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Close Button */}
                {dismissible && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="flex-shrink-0 p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {showProgress && duration > 0 && (
              <div className="h-1 bg-black/10 dark:bg-white/10">
                <motion.div
                  className={`h-full ${config.progress}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                />
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomNotification;
