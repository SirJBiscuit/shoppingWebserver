import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye } from 'lucide-react';

/**
 * HidableWidget — wraps a dashboard widget with hide/show controls.
 *
 * While visible: a subtle eye-off button appears on hover/tap in the
 * top-right corner. While hidden: collapses to a slim ghost pill that
 * restores the widget on click. Visibility itself is persisted by the
 * caller (see useHiddenWidgets — mdl_user_preferences), so the state
 * survives refresh, logout, and other devices.
 *
 * Props:
 *   id        — stable widget id used in the hidden_widgets preference
 *   label     — human name shown on the ghost pill ("Budget Tracker")
 *   hidden    — bool from useHiddenWidgets.isHidden(id)
 *   onHide    — () => void
 *   onUnhide  — () => void
 *   className — extra classes for the wrapper
 */
const HidableWidget = ({ id, label, hidden, onHide, onUnhide, className = '', children }) => (
  <div className={`relative group/hw ${className}`} data-hidable-widget={id}>
    <AnimatePresence mode="wait" initial={false}>
      {hidden ? (
        <motion.button
          key="ghost"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onUnhide}
          title={`Show ${label}`}
          className="w-full flex items-center justify-center gap-2 py-1.5 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 text-[11px] font-medium transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {label} hidden — show
        </motion.button>
      ) : (
        <motion.div
          key="body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          {/* hide affordance — fades in on hover, always faintly present on touch */}
          <button
            onClick={onHide}
            title={`Hide ${label}`}
            aria-label={`Hide ${label}`}
            className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 opacity-0 max-md:opacity-60 group-hover/hw:opacity-100 focus:opacity-100 transition-opacity"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default HidableWidget;
