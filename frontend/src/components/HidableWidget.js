import { motion, AnimatePresence } from 'framer-motion';
import { EyeOff, Eye, GripVertical, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Lock, Unlock } from 'lucide-react';

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
 *   dragHandleProps — optional react-beautiful-dnd dragHandleProps from a
 *                  parent <Draggable>; renders a grip handle (top-left)
 *                  wired as the drag handle.
 *   onMove    — optional (direction) => void; renders a quick-move arrow
 *                  pad (click-to-move alternative to dragging).
 *   moves     — {up,down,left,right} booleans; unavailable directions
 *                  render disabled.
 *   locked    — bool; when true the drag grip and arrow pad are disabled
 *                  and a 3D padlock chip stays visible (persists via the
 *                  caller — useWidgetOrder's _locks map).
 *   onToggleLock — () => void; renders the lock toggle chip.
 */
const HidableWidget = ({ id, label, hidden, onHide, onUnhide, className = '', dragHandleProps = null, onMove = null, moves = null, locked = false, onToggleLock = null, children }) => (
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
            type="button"
            onClick={onHide}
            title={`Hide ${label}`}
            aria-label={`Hide ${label}`}
            className="absolute -top-2 -right-2 z-20 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 opacity-0 max-md:opacity-60 group-hover/hw:opacity-100 focus:opacity-100 transition-opacity"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>
          {/* drag affordance — same reveal as hide, opposite corner.
              dragHandleProps carries RBD's listeners/refs for the drag.
              Locked widgets show a dimmed non-draggable grip. */}
          {dragHandleProps && (
            <button
              type="button"
              title={locked ? `${label} is locked — unlock to move` : `Drag to move ${label}`}
              aria-label={locked ? `${label} is locked` : `Drag to move ${label}`}
              className={`absolute -top-2 -left-2 z-20 w-6 h-6 rounded-full bg-white dark:bg-gray-800 border shadow-sm flex items-center justify-center transition-opacity touch-none ${
                locked
                  ? 'border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600 opacity-0 max-md:opacity-40 group-hover/hw:opacity-70 cursor-not-allowed'
                  : 'border-gray-200 dark:border-gray-600 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 opacity-0 max-md:opacity-60 group-hover/hw:opacity-100 focus:opacity-100 cursor-grab active:cursor-grabbing'
              }`}
              {...(locked ? {} : dragHandleProps)}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
          )}
          {/* lock toggle — 3D chip with a padlock that "clicks" shut.
              Hangs half-off the right edge (below the hide button) so it
              never covers widget content; dimmed but visible while locked
              so it can still be unlocked, hover-reveal when unlocked. */}
          {onToggleLock && (
            <motion.button
              type="button"
              onClick={onToggleLock}
              title={locked ? `Unlock ${label}` : `Lock ${label} in place`}
              aria-label={locked ? `Unlock ${label}` : `Lock ${label}`}
              aria-pressed={locked}
              whileTap={{ scale: 0.82 }}
              className={`absolute -right-2.5 top-6 z-20 w-5 h-5 rounded-full border flex items-center justify-center transition-opacity ${
                locked
                  ? 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-700 text-white shadow-[0_2px_0_#92400e,inset_0_1px_0_rgb(255_255_255/0.35)] opacity-60 hover:opacity-100'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-400 hover:text-amber-600 hover:border-amber-400 shadow-sm opacity-0 max-md:opacity-60 group-hover/hw:opacity-100 focus:opacity-100'
              }`}
            >
              <motion.span
                key={locked ? 'locked' : 'unlocked'}
                initial={{ rotateY: 90, scale: 0.6 }}
                animate={{ rotateY: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="flex"
              >
                {locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </motion.span>
            </motion.button>
          )}
          {/* quick-move arrows — same reveal as the other corner
              affordances; a click-to-move alternative to dragging */}
          {onMove && !locked && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 flex gap-0.5 opacity-0 max-md:opacity-60 group-hover/hw:opacity-100 focus-within:opacity-100 transition-opacity">
              {[
                { dir: 'left', Icon: ChevronLeft },
                { dir: 'up', Icon: ChevronUp },
                { dir: 'down', Icon: ChevronDown },
                { dir: 'right', Icon: ChevronRight },
              ].map(({ dir, Icon }) => (
                <button
                  key={dir}
                  type="button"
                  onClick={() => onMove(dir)}
                  disabled={moves && !moves[dir]}
                  title={`Move ${label} ${dir}`}
                  aria-label={`Move ${label} ${dir}`}
                  className="w-5 h-5 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-sm flex items-center justify-center text-gray-400 hover:text-primary-600 dark:hover:text-primary-300 hover:border-primary-400 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                >
                  <Icon className="w-3 h-3" />
                </button>
              ))}
            </div>
          )}
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

export default HidableWidget;
