import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Maximize2, Minimize2, GripVertical } from 'lucide-react';

/**
 * CustomPanel - A reusable, multi-mode panel component
 * 
 * Modes:
 * - 'slide-left': Slides in from left side
 * - 'slide-right': Slides in from right side
 * - 'slide-up': Slides up from bottom
 * - 'slide-down': Slides down from top
 * - 'overlay': Centered overlay with backdrop
 * - 'corner': Small corner panel (bottom-right)
 * - 'fullscreen': Full screen takeover
 * 
 * Features:
 * - Draggable (optional)
 * - Scrollable (optional)
 * - Resizable (optional)
 * - Auto-close on backdrop click
 * - Smooth animations
 * - Touch-friendly
 * - Responsive sizing
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen - Panel open state
 * @param {function} props.onClose - Close callback
 * @param {string} props.mode - Panel mode (see above)
 * @param {string} props.title - Panel title
 * @param {ReactNode} props.children - Panel content
 * @param {string} props.width - Width: 'sm', 'md', 'lg', 'xl', 'full' or custom px
 * @param {string} props.height - Height: 'auto', 'sm', 'md', 'lg', 'full' or custom px
 * @param {boolean} props.scrollable - Enable scrolling (default: true)
 * @param {boolean} props.draggable - Enable dragging (default: false)
 * @param {boolean} props.resizable - Enable resizing (default: false)
 * @param {boolean} props.showBackdrop - Show backdrop (default: true)
 * @param {boolean} props.closeOnBackdrop - Close on backdrop click (default: true)
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.actions - Action buttons [{ label, icon, onClick, color }]
 */
const CustomPanel = ({
  isOpen = false,
  onClose,
  mode = 'slide-right',
  title,
  children,
  width = 'md',
  height = 'full',
  scrollable = true,
  draggable = false,
  resizable = false,
  showBackdrop = true,
  closeOnBackdrop = true,
  className = '',
  actions = []
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [panelWidth, setPanelWidth] = useState(width);
  const [panelHeight, setPanelHeight] = useState(height);

  // Width presets
  const widthPresets = {
    sm: '320px',
    md: '480px',
    lg: '640px',
    xl: '800px',
    full: '100vw'
  };

  // Height presets
  const heightPresets = {
    auto: 'auto',
    sm: '40vh',
    md: '60vh',
    lg: '80vh',
    full: '100vh'
  };

  const getWidth = () => {
    if (isMaximized) return '100vw';
    return widthPresets[panelWidth] || panelWidth;
  };

  const getHeight = () => {
    if (isMaximized) return '100vh';
    return heightPresets[panelHeight] || panelHeight;
  };

  // Animation variants for different modes
  const variants = {
    'slide-left': {
      hidden: { x: '-100%', opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: '-100%', opacity: 0 }
    },
    'slide-right': {
      hidden: { x: '100%', opacity: 0 },
      visible: { x: 0, opacity: 1 },
      exit: { x: '100%', opacity: 0 }
    },
    'slide-up': {
      hidden: { y: '100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '100%', opacity: 0 }
    },
    'slide-down': {
      hidden: { y: '-100%', opacity: 0 },
      visible: { y: 0, opacity: 1 },
      exit: { y: '-100%', opacity: 0 }
    },
    'overlay': {
      hidden: { scale: 0.9, opacity: 0 },
      visible: { scale: 1, opacity: 1 },
      exit: { scale: 0.9, opacity: 0 }
    },
    'corner': {
      hidden: { scale: 0, opacity: 0, x: 100, y: 100 },
      visible: { scale: 1, opacity: 1, x: 0, y: 0 },
      exit: { scale: 0, opacity: 0, x: 100, y: 100 }
    },
    'fullscreen': {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
      exit: { opacity: 0 }
    }
  };

  // Position classes for different modes
  const positionClasses = {
    'slide-left': 'fixed top-0 left-0 h-full',
    'slide-right': 'fixed top-0 right-0 h-full',
    'slide-up': 'fixed bottom-0 left-0 w-full',
    'slide-down': 'fixed top-0 left-0 w-full',
    'overlay': 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2',
    'corner': 'fixed bottom-4 right-4',
    'fullscreen': 'fixed inset-0'
  };

  const handleBackdropClick = () => {
    if (closeOnBackdrop && onClose) {
      onClose();
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          {showBackdrop && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleBackdropClick}
              className="fixed inset-0 bg-black/50 z-[200]"
            />
          )}

          {/* Panel */}
          <motion.div
            variants={variants[mode]}
            initial="hidden"
            animate="visible"
            exit="exit"
            drag={draggable}
            dragConstraints={{
              left: -window.innerWidth / 2,
              right: window.innerWidth / 2,
              top: -window.innerHeight / 2,
              bottom: window.innerHeight / 2
            }}
            dragElastic={0.1}
            dragMomentum={false}
            className={`
              ${positionClasses[mode]}
              bg-white dark:bg-gray-800
              shadow-2xl
              z-[201]
              ${draggable ? 'cursor-move' : ''}
              ${className}
            `}
            style={{
              width: mode === 'slide-left' || mode === 'slide-right' || mode === 'overlay' ? getWidth() : undefined,
              height: mode === 'slide-up' || mode === 'slide-down' || mode === 'overlay' ? getHeight() : undefined,
              maxWidth: mode === 'overlay' ? '90vw' : undefined,
              maxHeight: mode === 'overlay' ? '90vh' : undefined
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
              {/* Drag Handle (if draggable) */}
              {draggable && (
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                  <GripVertical className="w-4 h-4" />
                </div>
              )}

              {/* Title */}
              <h2 className="text-lg font-bold text-gray-900 dark:text-white flex-1">
                {title}
              </h2>

              {/* Header Actions */}
              <div className="flex items-center gap-2">
                {/* Maximize/Minimize */}
                {resizable && (
                  <button
                    onClick={toggleMaximize}
                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title={isMaximized ? 'Minimize' : 'Maximize'}
                  >
                    {isMaximized ? (
                      <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    ) : (
                      <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    )}
                  </button>
                )}

                {/* Close Button */}
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-5 h-5 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className={`
                ${scrollable ? 'overflow-y-auto' : 'overflow-hidden'}
                ${mode === 'fullscreen' ? 'h-[calc(100vh-60px)]' : ''}
                ${mode === 'slide-left' || mode === 'slide-right' ? 'h-[calc(100vh-60px)]' : ''}
              `}
              style={{
                height: mode === 'overlay' || mode === 'slide-up' || mode === 'slide-down' 
                  ? 'auto' 
                  : undefined,
                maxHeight: mode === 'overlay' 
                  ? 'calc(90vh - 60px)' 
                  : undefined
              }}
            >
              {children}
            </div>

            {/* Footer Actions */}
            {actions && actions.length > 0 && (
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                {actions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <motion.button
                      key={index}
                      whileTap={{ scale: 0.95 }}
                      whileHover={{ scale: 1.05 }}
                      onClick={action.onClick}
                      className={`
                        flex items-center gap-2 px-4 py-2
                        ${action.color || 'bg-blue-500 hover:bg-blue-600'}
                        text-white rounded-lg font-semibold
                        shadow-md hover:shadow-lg
                        transition-shadow
                      `}
                    >
                      {Icon && <Icon className="w-4 h-4" />}
                      <span>{action.label}</span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CustomPanel;
