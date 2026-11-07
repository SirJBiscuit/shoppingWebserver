import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';

/**
 * MenuPanel — shared "new menu" shell extracted from CustomEditPanel.
 *
 * Every new modal/menu should use this so we get a consistent look:
 * - Animated overlay + springy panel entrance
 * - Gradient header with icon bubble, title, subtitle, close button
 * - Built-in always-visible 3D animated scrollbar (no missing/clipped content)
 *
 * Props:
 *   isOpen      — controls visibility
 *   onClose     — backdrop / X click handler
 *   title       — header text
 *   subtitle    — small caption under title
 *   icon        — Lucide icon component OR emoji string for the header bubble
 *   maxWidth    — tailwind max-w class (default 'max-w-2xl')
 *   scrollMaxH  — max height for the 3D scroll region (default 'calc(90vh - 180px)')
 *   children    — scrollable body content
 */
const MenuPanel = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  emoji,
  maxWidth = 'max-w-2xl',
  scrollMaxH = 'calc(90vh - 180px)',
  glowColor = 'primary',
  children,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/10 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl shadow-2xl ${maxWidth} w-full max-h-[90vh] overflow-hidden`}
          >
            {/* Gradient header */}
            <div className="relative bg-gradient-to-r from-primary-500 to-purple-600 p-6 text-white">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative flex justify-between items-center">
                <div className="flex items-center gap-3 min-w-0">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', delay: 0.1 }}
                    className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm text-2xl flex-shrink-0"
                  >
                    {Icon ? <Icon className="w-6 h-6" /> : (emoji || '✨')}
                  </motion.div>
                  <div className="min-w-0">
                    <h2 className="text-2xl font-bold truncate">{title}</h2>
                    {subtitle && <p className="text-sm text-white/80 truncate">{subtitle}</p>}
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="w-10 h-10 flex-shrink-0 bg-white/20 hover:bg-white/30 rounded-xl flex items-center justify-center backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Scrollable body with 3D scrollbar */}
            <AnimatedScrollbar3D
              maxHeight={scrollMaxH}
              thumbColor="bg-gradient-to-b from-primary-400 to-primary-600"
              glowColor={glowColor}
              autoHide={false}
            >
              {children}
            </AnimatedScrollbar3D>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MenuPanel;
