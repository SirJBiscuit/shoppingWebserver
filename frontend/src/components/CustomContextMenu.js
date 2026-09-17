import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { customTheme, getAnimation } from '../utils/customTheme';

/**
 * CustomContextMenu - Right-click / long-press context menu
 * 
 * Features:
 * - Right-click support (desktop)
 * - Long-press support (mobile)
 * - Nested submenus
 * - Keyboard navigation
 * - Position-aware (stays on screen)
 * - Touch-friendly sizing
 * - Icon support
 * - Separators
 * - Disabled states
 * 
 * Use Cases:
 * - Right-click item → Edit, Delete, Move, Copy
 * - Long-press on mobile → Quick actions
 * - Context-aware options
 */
const CustomContextMenu = ({
  children,
  items = [],
  trigger = 'rightClick', // 'rightClick' | 'longPress' | 'both'
  longPressDuration = 500,
  disabled = false,
  onOpen,
  onClose,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [activeSubmenu, setActiveSubmenu] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const longPressTimer = useRef(null);

  // Handle right-click
  const handleContextMenu = (e) => {
    if (disabled || trigger === 'longPress') return;
    
    e.preventDefault();
    e.stopPropagation();
    
    openMenu(e.clientX, e.clientY);
  };

  // Handle long-press start
  const handleTouchStart = (e) => {
    if (disabled || trigger === 'rightClick') return;
    
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      openMenu(touch.clientX, touch.clientY);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, longPressDuration);
  };

  // Handle long-press end
  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  // Open menu
  const openMenu = (x, y) => {
    // Calculate position to keep menu on screen
    const menuWidth = 250;
    const menuHeight = items.length * 40 + 20;
    
    let finalX = x;
    let finalY = y;

    // Adjust horizontal position
    if (x + menuWidth > window.innerWidth) {
      finalX = window.innerWidth - menuWidth - 10;
    }

    // Adjust vertical position
    if (y + menuHeight > window.innerHeight) {
      finalY = window.innerHeight - menuHeight - 10;
    }

    setPosition({ x: finalX, y: finalY });
    setIsOpen(true);
    onOpen?.();
  };

  // Close menu
  const closeMenu = () => {
    setIsOpen(false);
    setActiveSubmenu(null);
    onClose?.();
  };

  // Handle item click
  const handleItemClick = (item) => {
    if (item.disabled) return;
    
    if (item.submenu) {
      setActiveSubmenu(activeSubmenu === item.label ? null : item.label);
    } else {
      item.onClick?.();
      closeMenu();
    }
  };

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        closeMenu();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        closeMenu();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <>
      {/* Trigger Element */}
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={className}
      >
        {children}
      </div>

      {/* Context Menu */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[109]"
              onClick={closeMenu}
            />

            {/* Menu */}
            <motion.div
              ref={menuRef}
              {...getAnimation('scale', 'smooth')}
              className={`
                fixed ${customTheme.zIndex.contextMenu}
                bg-white dark:bg-gray-800
                border-2 border-gray-200 dark:border-gray-700
                rounded-xl shadow-2xl
                py-2
                min-w-[200px] max-w-[300px]
              `}
              style={{
                left: position.x,
                top: position.y
              }}
            >
              {items.map((item, index) => (
                <div key={index}>
                  {/* Separator */}
                  {item.separator ? (
                    <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />
                  ) : (
                    <div className="relative">
                      {/* Menu Item */}
                      <button
                        onClick={() => handleItemClick(item)}
                        disabled={item.disabled}
                        className={`
                          w-full flex items-center gap-3 px-4 py-2.5
                          text-left text-sm
                          transition-colors
                          ${item.disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                          }
                          ${item.color || 'text-gray-900 dark:text-gray-100'}
                        `}
                      >
                        {/* Icon */}
                        {item.icon && (
                          <item.icon className="w-4 h-4 flex-shrink-0" />
                        )}

                        {/* Label */}
                        <span className="flex-1">{item.label}</span>

                        {/* Shortcut */}
                        {item.shortcut && (
                          <span className="text-xs text-gray-400">
                            {item.shortcut}
                          </span>
                        )}

                        {/* Submenu Indicator */}
                        {item.submenu && (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </button>

                      {/* Submenu */}
                      <AnimatePresence>
                        {item.submenu && activeSubmenu === item.label && (
                          <motion.div
                            {...getAnimation('slideRight', 'smooth')}
                            className={`
                              absolute left-full top-0 ml-2
                              bg-white dark:bg-gray-800
                              border-2 border-gray-200 dark:border-gray-700
                              rounded-xl shadow-2xl
                              py-2
                              min-w-[180px]
                              ${customTheme.zIndex.contextMenu}
                            `}
                          >
                            {item.submenu.map((subItem, subIndex) => (
                              <button
                                key={subIndex}
                                onClick={() => {
                                  if (!subItem.disabled) {
                                    subItem.onClick?.();
                                    closeMenu();
                                  }
                                }}
                                disabled={subItem.disabled}
                                className={`
                                  w-full flex items-center gap-3 px-4 py-2.5
                                  text-left text-sm
                                  transition-colors
                                  ${subItem.disabled
                                    ? 'opacity-50 cursor-not-allowed'
                                    : 'hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                                  }
                                  ${subItem.color || 'text-gray-900 dark:text-gray-100'}
                                `}
                              >
                                {subItem.icon && (
                                  <subItem.icon className="w-4 h-4 flex-shrink-0" />
                                )}
                                <span className="flex-1">{subItem.label}</span>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default CustomContextMenu;
