import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

/**
 * RadialActionMenu - A beautiful radial/circular action menu
 * 
 * Features:
 * - Radial layout with smooth animations
 * - Opens at button position (no screen dimming)
 * - Text labels with icons for clarity
 * - Touch-friendly
 * - Responsive sizing
 * - Auto-closes after action
 * - No backdrop/dimming by default
 * 
 * @param {Object} props
 * @param {Object} props.primaryAction - Main action button { icon, label, onClick, className }
 * @param {Array} props.actions - Secondary actions [{ icon, label, onClick, color?, show? }]
 * @param {boolean} props.autoClose - Auto-close after action (default: true)
 * @param {string} props.size - Size: 'sm', 'md', 'lg' (default: 'md')
 * @param {boolean} props.showBackdrop - Show dimming backdrop (default: false)
 * @param {boolean} props.showLabels - Show text labels on buttons (default: true)
 */
const RadialActionMenu = ({ 
  primaryAction, 
  actions = [], 
  autoClose = true,
  size = 'md',
  showBackdrop = false,
  showLabels = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

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

  const handlePrimaryClick = (e) => {
    // Get button position for menu placement
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

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
            {/* Optional Backdrop (off by default) */}
            {showBackdrop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
              />
            )}

            {/* Click-away listener (invisible) */}
            {!showBackdrop && (
              <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[100]"
              />
            )}

            {/* Radial Action Buttons Container - Opens at button position */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed pointer-events-none z-[101]"
              style={{ 
                left: buttonPosition.x,
                top: buttonPosition.y,
                width: config.radius * 2 + config.button, 
                height: config.radius * 2 + config.button,
                transform: 'translate(-50%, -50%)'
              }}
            >
            {visibleActions.map((action, index) => {
              const pos = getButtonPosition(index);
              const Icon = action.icon;
              const colorClass = action.color || 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';

              return (
                <motion.div
                  key={index}
                  custom={index}
                  variants={buttonVariants}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  className="absolute pointer-events-auto"
                  style={{
                    left: `calc(50% + ${pos.x}px)`,
                    top: `calc(50% + ${pos.y}px)`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <motion.button
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => handleActionClick(action)}
                    className={`
                      ${colorClass}
                      text-white rounded-full shadow-lg hover:shadow-xl
                      flex flex-col items-center justify-center gap-1
                      transition-all
                      relative
                    `}
                    style={{
                      width: config.button,
                      height: config.button,
                      minWidth: config.button,
                      minHeight: config.button
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
                  
                  {/* Text Label */}
                  {showLabels && action.label && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 + 0.1 }}
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap"
                    >
                      <span className="bg-gray-900/90 dark:bg-gray-800/90 text-white text-xs px-2 py-1 rounded-lg shadow-lg backdrop-blur-sm">
                        {action.label}
                      </span>
                    </motion.div>
                  )}
                </motion.div>
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
