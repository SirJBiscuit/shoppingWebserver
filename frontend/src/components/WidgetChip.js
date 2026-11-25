import { motion } from 'framer-motion';

/**
 * WidgetChip — the standard action chip for the dashboard chrome.
 *
 * 3D press: a thick bottom edge stands in for depth and collapses on
 * press (border-b-4 → border-b-2 + translate), matching the app's
 * other tactile affordances. Always carries an icon + text label.
 *
 * Props:
 *   icon     — lucide component
 *   label    — text beside the icon (omit for icon-only)
 *   color    — key of CHIP_COLORS ('primary' | 'blue' | 'purple' |
 *              'indigo' | 'yellow' | 'green' | 'gray' | 'red')
 *   trailing — optional node after the label (e.g. a chevron)
 *   compact  — tighter padding for dense rows
 *   dragHandleProps — react-beautiful-dnd dragHandleProps; spread onto
 *              the chip so the chip itself is the drag handle
 */
export const CHIP_COLORS = {
  primary:
    'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800 border-b-primary-300 dark:border-b-primary-700 hover:bg-primary-100 dark:hover:bg-primary-900/40',
  blue:
    'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 border-b-blue-300 dark:border-b-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/40',
  purple:
    'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800 border-b-purple-300 dark:border-b-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/40',
  indigo:
    'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 border-b-indigo-300 dark:border-b-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-900/40',
  yellow:
    'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800 border-b-yellow-300 dark:border-b-yellow-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/40',
  green:
    'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800 border-b-green-300 dark:border-b-green-700 hover:bg-green-100 dark:hover:bg-green-900/40',
  gray:
    'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700 border-b-gray-300 dark:border-b-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700',
  red:
    'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800 border-b-red-300 dark:border-b-red-700 hover:bg-red-100 dark:hover:bg-red-900/40',
};

const WidgetChip = ({
  icon: Icon,
  label,
  color = 'primary',
  onClick,
  title,
  className = '',
  trailing = null,
  compact = false,
  dragHandleProps = null,
  disabled = false,
  ...rest
}) => (
  <motion.button
    type="button"
    whileTap={disabled ? undefined : { scale: 0.94, y: 2 }}
    onClick={onClick}
    title={title}
    disabled={disabled}
    className={`inline-flex items-center gap-1.5 ${
      compact ? 'px-2 py-1' : 'px-2.5 py-1.5'
    } rounded-lg border-2 border-b-4 active:border-b-2 text-xs font-semibold
    transition-colors select-none disabled:opacity-50 disabled:cursor-not-allowed ${
      CHIP_COLORS[color] || CHIP_COLORS.gray
    } ${className}`}
    {...(dragHandleProps || {})}
    {...rest}
  >
    {Icon && <Icon className="w-3.5 h-3.5 flex-shrink-0" />}
    {label && <span className="whitespace-nowrap">{label}</span>}
    {trailing}
  </motion.button>
);

export default WidgetChip;
