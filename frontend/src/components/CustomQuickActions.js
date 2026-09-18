import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreVertical, X } from 'lucide-react';
import { customTheme, getAnimation } from '../utils/customTheme';

/**
 * CustomQuickActions - Alternative to RadialActionMenu
 * 
 * A cleaner, more intuitive action menu that:
 * - Opens as a vertical/horizontal list near the button
 * - Shows icons AND text labels clearly
 * - No dimming/backdrop by default
 * - Smooth slide animations
 * - Touch-friendly spacing
 * - Auto-positions to stay on screen
 * 
 * Better UX than radial menu for:
 * - Fewer actions (2-6 items)
 * - When text labels are important
 * - Mobile devices
 * - Quick scanning
 */
const CustomQuickActions = ({
  trigger, // Custom trigger button (optional)
  actions = [],
  direction = 'auto', // 'up', 'down', 'left', 'right', 'auto'
  showBackdrop = false,
  compact = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0, placement: 'down' });
  const triggerRef = React.useRef(null);

  const handleTriggerClick = (e) => {
    if (!isOpen) {
      // Calculate optimal position
      const rect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      let placement = direction;
      
      // Auto-detect best placement
      if (direction === 'auto') {
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        const spaceRight = viewportWidth - rect.right;
        const spaceLeft = rect.left;
        
        // Prefer down, then up, then right, then left
        if (spaceBelow > 200) {
          placement = 'down';
        } else if (spaceAbove > 200) {
          placement = 'up';
        } else if (spaceRight > 200) {
          placement = 'right';
        } else {
          placement = 'left';
        }
      }
      
      setPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        placement
      });
    }
    
    setIsOpen(!isOpen);
  };

  const handleActionClick = (action) => {
    action.onClick?.();
    setIsOpen(false);
  };

  // Get menu position based on placement
  const getMenuStyle = () => {
    const offset = 8; // Gap between trigger and menu
    
    switch (position.placement) {
      case 'up':
        return {
          left: position.x,
          bottom: `calc(100vh - ${position.y}px + ${offset}px)`,
          transform: 'translateX(-50%)'
        };
      case 'down':
        return {
          left: position.x,
          top: position.y + offset,
          transform: 'translateX(-50%)'
        };
      case 'left':
        return {
          right: `calc(100vw - ${position.x}px + ${offset}px)`,
          top: position.y,
          transform: 'translateY(-50%)'
        };
      case 'right':
        return {
          left: position.x + offset,
          top: position.y,
          transform: 'translateY(-50%)'
        };
      default:
        return {
          left: position.x,
          top: position.y + offset,
          transform: 'translateX(-50%)'
        };
    }
  };

  // Animation variants based on placement
  const menuVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: position.placement === 'up' ? 10 : position.placement === 'down' ? -10 : 0,
      x: position.placement === 'left' ? 10 : position.placement === 'right' ? -10 : 0
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      x: 0,
      transition: {
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      transition: {
        duration: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: (i) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.03,
        type: 'spring',
        stiffness: 400,
        damping: 25
      }
    })
  };

  const visibleActions = actions.filter(a => a.show !== false);

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      {trigger ? (
        <div ref={triggerRef} onClick={handleTriggerClick}>
          {trigger}
        </div>
      ) : (
        <motion.button
          ref={triggerRef}
          onClick={handleTriggerClick}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className={`
            ${customTheme.buttons.primary}
            rounded-full p-2
            transition-colors
          `}
        >
          {isOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <MoreVertical className="w-5 h-5" />
          )}
        </motion.button>
      )}

      {/* Menu Overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Optional Backdrop */}
            {showBackdrop && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[100]"
              />
            )}

            {/* Click-away (invisible) */}
            {!showBackdrop && (
              <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[100]"
              />
            )}

            {/* Actions Menu */}
            <motion.div
              variants={menuVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className={`
                fixed z-[101]
                bg-white dark:bg-gray-800
                border-2 border-gray-200 dark:border-gray-700
                rounded-xl shadow-2xl
                ${compact ? 'p-1' : 'p-2'}
                min-w-[160px]
              `}
              style={getMenuStyle()}
            >
              {/* Actions List */}
              <div className={`flex ${position.placement === 'left' || position.placement === 'right' ? 'flex-row' : 'flex-col'} gap-1`}>
                {visibleActions.map((action, index) => {
                  const Icon = action.icon;
                  
                  return (
                    <motion.button
                      key={index}
                      custom={index}
                      variants={itemVariants}
                      initial="hidden"
                      animate="visible"
                      onClick={() => handleActionClick(action)}
                      disabled={action.disabled}
                      className={`
                        flex items-center gap-3
                        ${compact ? 'px-3 py-2' : 'px-4 py-3'}
                        rounded-lg
                        transition-all
                        ${action.disabled 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                        }
                        ${action.color || 'text-gray-900 dark:text-gray-100'}
                        text-left
                        relative
                      `}
                    >
                      {/* Icon */}
                      {Icon && (
                        <div className={`
                          flex-shrink-0
                          ${action.iconColor || 'text-gray-600 dark:text-gray-400'}
                        `}>
                          <Icon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
                        </div>
                      )}
                      
                      {/* Label */}
                      <span className={`
                        flex-1 font-medium
                        ${compact ? 'text-sm' : 'text-base'}
                      `}>
                        {action.label}
                      </span>
                      
                      {/* Badge */}
                      {action.badge && (
                        <span className="flex-shrink-0 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
                          {action.badge}
                        </span>
                      )}
                      
                      {/* Shortcut */}
                      {action.shortcut && (
                        <span className="flex-shrink-0 text-xs text-gray-400">
                          {action.shortcut}
                        </span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomQuickActions;
