import React from 'react';
import { motion } from 'framer-motion';
import { Grid, List } from 'lucide-react';
import { Portal } from '../utils/autoPlacement';

// Floating action buttons — same visual scheme as the beta pin layer:
// circular buttons in one bottom-corner stack with a small visible label
// under each. Default corner is bottom-LEFT (pins own bottom-right) so
// the two stacks never overlap each other or the active-list panel.

const Label = ({ children }) => (
  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-white/85 dark:bg-slate-900/85 px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
    {children}
  </span>
);

const FloatingButtons = ({
  showApps = true,
  showActiveList = true,
  position = 'left',
  buttonColor = '#6366f1',
  spacing = 16,
  showAppsMenu,
  setShowAppsMenu,
  setShowCalculator,
  showListPanel,
  setShowListPanel,
  items = [],
}) => {
  const side = position === 'left' ? 'left-4 sm:left-5' : 'right-4 sm:right-5';

  return (
    <Portal>
      <div
        className={`fixed ${side} z-50 flex flex-col items-center gap-3`}
        style={{ bottom: `${spacing}px` }}
      >
        {/* Apps menu */}
        {showApps && (
          <div className="relative flex flex-col items-center gap-1">
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

            <motion.button
              onClick={() => setShowAppsMenu((v) => !v)}
              className={`w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition ${
                showAppsMenu
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Apps"
            >
              <Grid className="w-5 h-5" />
            </motion.button>
            <Label>Apps</Label>
          </div>
        )}

        {/* Active shopping list — toggles the slide-out panel open/closed */}
        {showActiveList && (
          <div className="flex flex-col items-center gap-1">
            <motion.button
              onClick={() => setShowListPanel((v) => !v)}
              className={`relative w-12 h-12 rounded-full shadow-xl flex items-center justify-center transition text-white ${
                showListPanel ? 'ring-2 ring-white/70' : ''
              }`}
              style={{ background: `linear-gradient(to bottom right, ${buttonColor}, ${buttonColor}dd)` }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title={showListPanel ? 'Close Active List' : 'Open Active List'}
            >
              <List className="w-6 h-6" />
              {items.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg"
                >
                  {items.length}
                </motion.span>
              )}
            </motion.button>
            <Label>Active List</Label>
          </div>
        )}
      </div>
    </Portal>
  );
};

export default FloatingButtons;
