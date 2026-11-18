import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Portal } from '../../utils/autoPlacement';

/**
 * ModalShell — shared non-dimming modal container.
 *
 * House rules baked in (don't re-implement per modal):
 * - NO heavy dimming: the backdrop is a barely-there `bg-black/10`
 *   (click-to-dismiss still works). Never use bg-black/50+.
 * - Portal to body, z-[80] overlay / z-[81] panel.
 * - Spring entrance (scale+y) with AnimatePresence exit support.
 * - `scrollbar-3d` on the scrollable body — never default scrollbars.
 * - `isOpen` controls render so the parent stays simple:
 *   <ModalShell isOpen={open} onClose={...} title="...">children</ModalShell>
 *
 * Props:
 *  isOpen        bool
 *  onClose       fn (backdrop click + X button)
 *  title         node/string rendered in the header (omit for no header)
 *  headerRight   node rendered next to the close button
 *  maxWidth      tailwind max-w-* class (default max-w-md)
 *  panelClass    extra classes on the panel
 *  bodyClass     extra classes on the scroll area
 *  showClose     show the X (default true when title or onClose given)
 *  children
 */
const ModalShell = ({
  isOpen,
  onClose,
  title,
  headerRight,
  maxWidth = 'max-w-md',
  panelClass = '',
  bodyClass = '',
  showClose = true,
  children,
}) => (
  <Portal>
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={onClose}
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/10"
        >
          <motion.div
            key="modal-panel"
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col overflow-hidden ${panelClass}`}
          >
            {(title || showClose || headerRight) && (
              <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                  {title}
                </h3>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {headerRight}
                  {showClose && onClose && (
                    <button
                      type="button"
                      onClick={onClose}
                      aria-label="Close"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <X size={20} />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className={`overflow-y-auto scrollbar-3d flex-1 ${bodyClass}`}>
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </Portal>
);

export default ModalShell;
