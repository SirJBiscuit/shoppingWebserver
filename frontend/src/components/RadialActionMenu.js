import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

/**
 * RadialActionMenu - A beautiful radial/circular action menu
 * 
 * Features:
 * - Radial layout with smooth animations
 * - Primary action in center
 * - Secondary actions arranged in circle
 * - Touch-friendly
 * - Responsive sizing
 * - Auto-closes after action
 * 
 * @param {Object} props
 * @param {Object} props.primaryAction - Main action button { icon, label, onClick, className }
 * @param {Array} props.actions - Secondary actions [{ icon, label, onClick, color?, show? }]
 * @param {boolean} props.autoClose - Auto-close after action (default: true)
 * @param {string} props.size - Size: 'sm', 'md', 'lg' (default: 'md')
 */
const RadialActionMenu = ({ 
  primaryAction, 
  actions = [], 
  autoClose = true,
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const sizes = {
    sm: { button: 48, radius: 80, icon: 'w-4 h-4' },
    md: { button: 56, radius: 100, icon: 'w-5 h-5' },
    lg: { button: 64, radius: 120, icon: 'w-6 h-6' }
  };

  const config = sizes[size];
  const visibleActions = actions.filter(action => action.show !== false);
  const angleStep = (2 * Math.PI) / visibleActions.length;

  const handleActionClick = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    if (autoClose) {
      setIsOpen(false);
    }
  };

  const handlePrimaryClick = () => {
    if (isOpen && primaryAction.onClick) {
      primaryAction.onClick();
      if (autoClose) {
        setIsOpen(false);
      }
    } else {
      setIsOpen(!isOpen);
    }
  };

  // Calculate position for each action button
  const getButtonPosition = (index) => {
    const angle = angleStep * index - Math.PI / 2; // Start from top
    const x = Math.cos(angle) * config.radius;
    const y = Math.sin(angle) * config.radius;
    return { x, y };
  };

  const containerVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: { 
      scale: 1, 
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 260,
        damping: 20
      }
    }
  };

  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.05,
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }),
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  const primaryVariants = {
    closed: { rotate: 0 },
    open: { rotate: 90 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 }
  };

  return (
    <>
      {/* Primary Action Button */}
      <motion.button
        variants={primaryVariants}
        animate={isOpen ? 'open' : 'closed'}
        whileHover="hover"
        whileTap="tap"
        onClick={handlePrimaryClick}
        className={`
          ${primaryAction.className || 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}
          text-white rounded-full shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-shadow
          relative z-10
        `}
        style={{ 
          width: config.button, 
          height: config.button,
          minWidth: config.button,
          minHeight: config.button
        }}
        title={primaryAction.label}
      >
        {isOpen ? (
          <X className={config.icon} />
        ) : (
          primaryAction.icon ? (
            <primaryAction.icon className={config.icon} />
          ) : (
            <Menu className={config.icon} />
          )
        )}
      </motion.button>

      {/* Overlay Widget */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[100]"
            />

            {/* Radial Action Buttons Container */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[101]"
              style={{ 
                width: config.radius * 2 + config.button, 
                height: config.radius * 2 + config.button 
              }}
            >
            {visibleActions.map((action, index) => {
              const pos = getButtonPosition(index);
              const Icon = action.icon;
              const colorClass = action.color || 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';

              return (
                <motion.button
                  key={index}
                  custom={index}
                  variants={buttonVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleActionClick(action)}
                  className={`
                    ${colorClass}
                    text-white rounded-full shadow-lg hover:shadow-xl
                    flex flex-col items-center justify-center
                    transition-shadow
                    absolute pointer-events-auto
                  `}
                  style={{
                    width: config.button,
                    height: config.button,
                    minWidth: config.button,
                    minHeight: config.button,
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  title={action.label}
                >
                  {Icon && <Icon className={config.icon} />}
                  {action.badge && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {action.badge}
                    </span>
                  )}
                </motion.button>
              );
            })}
          </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default RadialActionMenu;
