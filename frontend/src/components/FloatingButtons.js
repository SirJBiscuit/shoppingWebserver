import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Grid, List, MoveHorizontal, BookOpen } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Portal, useIsMobile, useCornerOffset, usePanelShift, setPanelShift, useFloatSide, setFloatSide } from '../utils/autoPlacement';

// Floating action buttons — same visual scheme as the beta pin layer:
// circular buttons in one bottom-corner stack with a small visible label
// under each. Default corner is bottom-RIGHT, floating directly above the
// beta pin stack (it publishes its height on --bp-stack-h). When the
// Active List panel opens, both columns slide left via --list-panel-x so
// the panel sits underneath without hiding the buttons.

const Label = ({ children }) => (
  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 bg-white/85 dark:bg-slate-900/85 px-1.5 py-0.5 rounded-md shadow-sm whitespace-nowrap">
    {children}
  </span>
);

const FloatingButtons = ({
  showApps = true,
  showActiveList = true,
  showRecipes = true,
  // Bottom-right column by default — the beta pin stack sits at the
  // corner bottom and this column floats above it (see --bp-stack-h).
  position: positionProp = 'right',
  buttonColor = '#6366f1',
  spacing = 16,
  showAppsMenu,
  setShowAppsMenu,
  setShowCalculator,
  showListPanel,
  setShowListPanel,
  items = [],
}) => {
  // Shared side store — one switch moves EVERY corner column together
  // (apps/active-list + beta stack + admin sidebar). The `position` prop is
  // only the fallback until the user picks a side.
  const position = useFloatSide(positionProp);
  // On desktop the nav sidebar (w-72, z-60) is always visible — push
  // left-side columns past its right edge instead of hiding underneath.
  const side = position === 'left' ? 'left-4 lg:left-[304px] items-start' : 'right-4 items-end';
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const onRecipesPage = useLocation().pathname.startsWith('/recipes');
  const belowPx = useCornerOffset(['beta']); // beta controls live below us
  const panelShift = usePanelShift();

  // The Active List panel slides in from the right at z-201 — instead of
  // hiding this column underneath it, shift every corner column left so
  // the buttons stay reachable (BetaPinLayer reads the same offset).
  useEffect(() => {
    setPanelShift('list', showListPanel && position === 'right' && !isMobile ? 500 : 0);
    return () => setPanelShift('list', 0);
  }, [showListPanel, position, isMobile]);

  // The column sits directly above whatever the beta stack currently
  // occupies on the shared side — hidden beta controls publish 0 and the
  // column drops to the corner.
  const bottom = belowPx + spacing;

  return (
    <Portal>
      <div
        className={`fixed ${side} z-50 flex flex-col gap-3 transition-transform duration-300`}
        style={{ bottom, transform: `translateX(${-panelShift}px)` }}
      >
        {/* Apps menu */}
        {showApps && (
          <div className="relative flex flex-col w-12 items-center gap-1">
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
                <button
                  onClick={() => {
                    setFloatSide(position === 'left' ? 'right' : 'left');
                    setShowAppsMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 transition-colors text-left touch-manipulation border-t border-gray-100 dark:border-gray-700"
                >
                  <MoveHorizontal className="w-5 h-5 text-gray-500 dark:text-gray-300" />
                  <span className="font-medium text-gray-900 dark:text-white">
                    Move buttons {position === 'left' ? 'right' : 'left'}
                  </span>
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

        {/* Recipe book — quick jump to Recipes (hidden while on that page) */}
        {showRecipes && !onRecipesPage && (
          <div className="flex flex-col w-12 items-center gap-1">
            <motion.button
              onClick={() => navigate('/recipes')}
              className="w-11 h-11 rounded-full shadow-xl flex items-center justify-center transition bg-amber-500 text-white hover:bg-amber-600"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Recipe book"
            >
              <BookOpen className="w-5 h-5" />
            </motion.button>
            <Label>Recipes</Label>
          </div>
        )}

        {/* Active shopping list — toggles the slide-out panel open/closed */}
        {showActiveList && (
          <div className="flex flex-col w-12 items-center gap-1">
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
