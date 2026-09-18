import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { customTheme } from '../utils/customTheme';

/**
 * CustomRadialMenu - Universal radial/dropdown menu system
 * 
 * Replaces RadialActionMenu with more options:
 * - Multiple shapes: circle, square, rectangle, grid, list
 * - Multiple directions: up, down, left, right, radial
 * - Vertical/horizontal layouts
 * - Text labels always visible
 * - No dimming by default
 * - Opens at button position
 * - Admin testing mode
 * 
 * Use cases:
 * - Quick actions menu
 * - Dropdown lists
 * - Context menus
 * - Tool palettes
 * - Navigation menus
 */
const CustomRadialMenu = ({
  // Core props
  primaryAction,
  actions = [],
  autoClose = true,
  
  // Layout props
  shape = 'circle', // 'circle', 'square', 'rectangle', 'grid', 'list', 'arc'
  direction = 'auto', // 'up', 'down', 'left', 'right', 'radial', 'auto'
  layout = 'auto', // 'vertical', 'horizontal', 'grid', 'radial', 'auto'
  
  // Appearance props
  size = 'md', // 'sm', 'md', 'lg'
  showLabels = true,
  showBackdrop = false,
  compact = false,
  
  // Grid props (for grid layout)
  columns = 3,
  
  // Arc props (for arc layout)
  arcAngle = 180, // Degrees of arc (90, 180, 270, 360)
  arcStart = -90, // Starting angle in degrees
  
  // Spacing
  spacing = 'md', // 'sm', 'md', 'lg'
  radius = 100, // Distance from center (for radial layouts)
  
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonPosition, setButtonPosition] = useState({ x: 0, y: 0 });

  // Size configurations
  const sizes = {
    sm: { button: 40, icon: 'w-4 h-4', text: 'text-xs', padding: 'px-2 py-1' },
    md: { button: 56, icon: 'w-5 h-5', text: 'text-sm', padding: 'px-3 py-2' },
    lg: { button: 64, icon: 'w-6 h-6', text: 'text-base', padding: 'px-4 py-3' }
  };

  // Spacing configurations
  const spacings = {
    sm: 60,
    md: 100,
    lg: 140
  };

  const config = sizes[size];
  const gap = spacings[spacing] || radius;
  const visibleActions = actions.filter(action => action.show !== false);

  const handlePrimaryClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setButtonPosition({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2
    });

    if (isOpen && primaryAction?.onClick) {
      primaryAction.onClick();
      if (autoClose) setIsOpen(false);
    } else {
      setIsOpen(!isOpen);
    }
  };

  const handleActionClick = (action) => {
    action.onClick?.();
    if (autoClose) setIsOpen(false);
  };

  // Calculate position based on shape and layout
  const getButtonPosition = (index, total) => {
    const actualLayout = layout === 'auto' ? getAutoLayout() : layout;
    
    switch (actualLayout) {
      case 'radial':
        return getRadialPosition(index, total);
      case 'arc':
        return getArcPosition(index, total);
      case 'grid':
        return getGridPosition(index, total);
      case 'vertical':
        return getVerticalPosition(index, total);
      case 'horizontal':
        return getHorizontalPosition(index, total);
      case 'list':
        return getListPosition(index, total);
      default:
        return getRadialPosition(index, total);
    }
  };

  // Auto-detect best layout based on shape and action count
  const getAutoLayout = () => {
    if (shape === 'circle') return 'radial';
    if (shape === 'arc') return 'arc';
    if (shape === 'grid') return 'grid';
    if (shape === 'list') return 'list';
    if (shape === 'square' || shape === 'rectangle') {
      return visibleActions.length <= 4 ? 'grid' : 'list';
    }
    return 'radial';
  };

  // Position calculators
  const getRadialPosition = (index, total) => {
    const angleStep = (2 * Math.PI) / total;
    const angle = angleStep * index - Math.PI / 2;
    return {
      x: Math.cos(angle) * gap,
      y: Math.sin(angle) * gap
    };
  };

  const getArcPosition = (index, total) => {
    const startRad = (arcStart * Math.PI) / 180;
    const arcRad = (arcAngle * Math.PI) / 180;
    const angleStep = arcRad / (total - 1 || 1);
    const angle = startRad + angleStep * index;
    return {
      x: Math.cos(angle) * gap,
      y: Math.sin(angle) * gap
    };
  };

  const getGridPosition = (index, total) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const itemSize = config.button + 16;
    return {
      x: (col - (columns - 1) / 2) * itemSize,
      y: (row - Math.floor((total - 1) / columns) / 2) * itemSize
    };
  };

  const getVerticalPosition = (index, total) => {
    const itemSize = config.button + 16;
    return {
      x: 0,
      y: (index - (total - 1) / 2) * itemSize
    };
  };

  const getHorizontalPosition = (index, total) => {
    const itemSize = config.button + 16;
    return {
      x: (index - (total - 1) / 2) * itemSize,
      y: 0
    };
  };

  const getListPosition = (index, total) => {
    const itemHeight = compact ? 40 : 48;
    return {
      x: 0,
      y: index * itemHeight - ((total - 1) * itemHeight) / 2,
      width: 200 // Fixed width for list items
    };
  };

  // Animation variants
  const containerVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25
      }
    }
  };

  const buttonVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i) => ({
      scale: 1,
      opacity: 1,
      transition: {
        delay: i * 0.04,
        type: 'spring',
        stiffness: 400,
        damping: 20
      }
    }),
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  };

  const labelVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: (i) => ({
      opacity: 1,
      scale: 1,
      transition: {
        delay: i * 0.04 + 0.1
      }
    })
  };

  return (
    <div className={`relative ${className}`}>
      {/* Primary Action Button */}
      <motion.button
        onClick={handlePrimaryClick}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`
          ${primaryAction?.className || 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'}
          text-white rounded-full shadow-lg hover:shadow-xl
          flex items-center justify-center
          transition-all
          relative z-10
        `}
        style={{
          width: config.button,
          height: config.button,
          minWidth: config.button,
          minHeight: config.button
        }}
        title={primaryAction?.label}
      >
        {isOpen ? (
          <X className={config.icon} />
        ) : primaryAction?.icon ? (
          <primaryAction.icon className={config.icon} />
        ) : (
          <Menu className={config.icon} />
        )}
      </motion.button>

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

            {/* Click-away listener */}
            {!showBackdrop && (
              <div
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 z-[100]"
              />
            )}

            {/* Action Buttons Container */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="fixed pointer-events-none z-[101]"
              style={{
                left: buttonPosition.x,
                top: buttonPosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              {visibleActions.map((action, index) => {
                const pos = getButtonPosition(index, visibleActions.length);
                const Icon = action.icon;
                const colorClass = action.color || 'bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
                const isListLayout = layout === 'list' || (layout === 'auto' && shape === 'list');

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
                      left: `${pos.x}px`,
                      top: `${pos.y}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Button */}
                    <motion.button
                      whileHover="hover"
                      whileTap="tap"
                      onClick={() => handleActionClick(action)}
                      disabled={action.disabled}
                      className={`
                        ${isListLayout 
                          ? 'flex items-center gap-3 justify-start bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-2 border-gray-200 dark:border-gray-700 rounded-lg'
                          : `${colorClass} text-white rounded-full`
                        }
                        shadow-lg hover:shadow-xl
                        transition-all
                        relative
                        ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        ${isListLayout ? config.padding : 'flex items-center justify-center'}
                      `}
                      style={
                        isListLayout
                          ? { width: pos.width, minHeight: config.button }
                          : {
                              width: config.button,
                              height: config.button,
                              minWidth: config.button,
                              minHeight: config.button
                            }
                      }
                      title={action.label}
                    >
                      {/* Icon */}
                      {Icon && (
                        <div className={isListLayout ? 'flex-shrink-0' : ''}>
                          <Icon className={config.icon} />
                        </div>
                      )}

                      {/* Label (inline for list layout) */}
                      {isListLayout && action.label && (
                        <span className={`flex-1 font-medium ${config.text}`}>
                          {action.label}
                        </span>
                      )}

                      {/* Badge */}
                      {action.badge && (
                        <span className={`
                          ${isListLayout ? 'flex-shrink-0' : 'absolute -top-1 -right-1'}
                          bg-red-500 text-white text-xs rounded-full
                          ${isListLayout ? 'px-2 py-0.5' : 'w-5 h-5'}
                          flex items-center justify-center font-bold
                        `}>
                          {action.badge}
                        </span>
                      )}
                    </motion.button>

                    {/* Text Label (for non-list layouts) */}
                    {!isListLayout && showLabels && action.label && (
                      <motion.div
                        custom={index}
                        variants={labelVariants}
                        initial="hidden"
                        animate="visible"
                        className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
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
    </div>
  );
};

export default CustomRadialMenu;
