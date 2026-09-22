import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Edit3, Grid, Layout, Palette, Wand2 } from 'lucide-react';

/**
 * EditorOverlay - Visual overlay for AVE editor mode
 * 
 * Features:
 * - Animated grid pattern
 * - Pulsing border effect
 * - Corner indicators
 * - Hover highlights
 * - Works on Dashboard, Sidebar, and all widgets
 */
const EditorOverlay = ({ 
  isActive = false,
  targetName = 'Component',
  onSelect,
  isSelected = false,
  className = '',
  showGrid = true,
  showCorners = true,
  showLabel = true,
}) => {
  if (!isActive) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 pointer-events-none ${className}`}
        style={{ zIndex: 999 }}
      >
        {/* Animated Grid Pattern */}
        {showGrid && (
          <motion.div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(99, 102, 241, 0.1) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(99, 102, 241, 0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
            }}
            animate={{
              backgroundPosition: ['0px 0px', '20px 20px'],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        )}

        {/* Pulsing Border */}
        <motion.div
          className={`absolute inset-0 border-2 rounded-lg ${
            isSelected 
              ? 'border-primary-500 dark:border-primary-400' 
              : 'border-primary-300 dark:border-primary-600'
          }`}
          animate={{
            opacity: isSelected ? [0.8, 1, 0.8] : [0.3, 0.5, 0.3],
            boxShadow: isSelected 
              ? [
                  '0 0 0 0 rgba(99, 102, 241, 0.4)',
                  '0 0 0 8px rgba(99, 102, 241, 0)',
                  '0 0 0 0 rgba(99, 102, 241, 0.4)',
                ]
              : [
                  '0 0 0 0 rgba(99, 102, 241, 0.2)',
                  '0 0 0 4px rgba(99, 102, 241, 0)',
                  '0 0 0 0 rgba(99, 102, 241, 0.2)',
                ],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />

        {/* Corner Indicators */}
        {showCorners && (
          <>
            {/* Top Left */}
            <motion.div
              className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 dark:border-primary-400 rounded-tl-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
            />
            {/* Top Right */}
            <motion.div
              className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 dark:border-primary-400 rounded-tr-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
            />
            {/* Bottom Left */}
            <motion.div
              className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 dark:border-primary-400 rounded-bl-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            />
            {/* Bottom Right */}
            <motion.div
              className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 dark:border-primary-400 rounded-br-lg"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.25 }}
            />
          </>
        )}

        {/* Label Badge */}
        {showLabel && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="absolute -top-3 left-4 px-3 py-1 bg-primary-500 dark:bg-primary-600 text-white text-xs font-bold rounded-full shadow-lg flex items-center gap-1.5"
          >
            <Edit3 className="w-3 h-3" />
            <span>{targetName}</span>
          </motion.div>
        )}

        {/* Hover Highlight */}
        {onSelect && (
          <motion.div
            className="absolute inset-0 bg-primary-500/5 dark:bg-primary-400/5 rounded-lg cursor-pointer pointer-events-auto"
            whileHover={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
            }}
            onClick={onSelect}
          />
        )}

        {/* Selection Indicator */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 dark:bg-primary-400 rounded-full shadow-lg flex items-center justify-center"
          >
            <Wand2 className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * EditorModeIndicator - Floating indicator showing editor is active
 */
export const EditorModeIndicator = ({ isActive, targetArea }) => {
  if (!isActive) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 bg-gradient-to-r from-primary-500 to-purple-500 text-white rounded-full shadow-2xl flex items-center gap-3"
    >
      <motion.div
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'linear',
        }}
      >
        <Wand2 className="w-5 h-5" />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-xs font-medium opacity-90">AVE Editor Active</span>
        <span className="text-sm font-bold">{targetArea || 'Editing Mode'}</span>
      </div>
      <motion.div
        className="w-2 h-2 bg-white rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [1, 0.5, 1],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
        }}
      />
    </motion.div>
  );
};

/**
 * EditableContainer - Wrapper that adds editor overlay to any component
 */
export const EditableContainer = ({
  children,
  isEditorActive,
  componentName,
  onSelect,
  isSelected,
  className = '',
}) => {
  return (
    <div className={`relative ${className}`}>
      {children}
      <EditorOverlay
        isActive={isEditorActive}
        targetName={componentName}
        onSelect={onSelect}
        isSelected={isSelected}
      />
    </div>
  );
};

export default EditorOverlay;
