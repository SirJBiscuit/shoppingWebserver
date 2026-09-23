import React from 'react';
import { motion } from 'framer-motion';
import { Grid, List } from 'lucide-react';

const FloatingButtons = ({
  showApps = true,
  showActiveList = true,
  position = 'right',
  buttonSize = 'medium',
  buttonColor = '#6366f1',
  spacing = 16,
  showAppsMenu,
  setShowAppsMenu,
  setShowCalculator,
  setShowListPanel,
  items = [],
  activeList
}) => {
  // Button size classes
  const sizeClasses = {
    small: 'px-3 py-2 sm:px-4 sm:py-3',
    medium: 'px-4 py-3 sm:px-5 sm:py-4',
    large: 'px-5 py-4 sm:px-6 sm:py-5'
  };

  const iconSizes = {
    small: 'w-5 h-5 sm:w-6 sm:h-6',
    medium: 'w-6 h-6 sm:w-7 sm:h-7',
    large: 'w-7 h-7 sm:w-8 sm:h-8'
  };

  // Position classes
  const positionClass = position === 'left' ? 'left-4 sm:left-6' : 'right-4 sm:right-6';

  return (
    <>
      {/* Floating Apps Menu Button */}
      {showApps && (
        <div className={`fixed ${positionClass} z-50`} style={{ bottom: `${spacing * 11}px` }}>
          {/* Apps Dropdown Menu */}
          {showAppsMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className={`absolute bottom-full ${position === 'left' ? 'left-0' : 'right-0'} mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden min-w-[160px]`}
            >
              <button
                onClick={() => {
                  setShowCalculator(true);
                  setShowAppsMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors text-left touch-manipulation"
              >
                <span className="text-xl">🧮</span>
                <span className="font-medium text-gray-900 dark:text-white">Calculator</span>
              </button>
              {/* Add more apps here later */}
            </motion.div>
          )}
          
          {/* Apps Button */}
          <motion.button
            onClick={() => setShowAppsMenu(!showAppsMenu)}
            className={`flex flex-col items-center justify-center gap-1 ${sizeClasses[buttonSize]} rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 ${
              showAppsMenu
                ? 'bg-gradient-to-br from-purple-500 to-purple-600'
                : 'bg-gradient-to-br from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700'
            } text-white`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title="Apps"
          >
            <Grid className={iconSizes[buttonSize]} />
            <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">Apps</span>
          </motion.button>
        </div>
      )}

      {/* Floating Active Shopping List Button */}
      {showActiveList && (
        <motion.button
          onClick={() => setShowListPanel(true)}
          className={`fixed ${positionClass} z-50 flex flex-col items-center justify-center gap-1 ${sizeClasses[buttonSize]} text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300`}
          style={{
            bottom: `${spacing}px`,
            background: `linear-gradient(to bottom right, ${buttonColor}, ${buttonColor}dd)`
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Active Shopping List"
        >
          <List className={iconSizes[buttonSize]} />
          {items.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
            >
              {items.length}
            </motion.span>
          )}
          <span className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">Active List</span>
        </motion.button>
      )}
    </>
  );
};

export default FloatingButtons;
