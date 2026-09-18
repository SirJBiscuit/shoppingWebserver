import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Grid,
  Zap,
  Eye,
  Ruler,
  Palette,
  Save,
  X
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * EditorSettingsPanel - Comprehensive settings for the editor
 * 
 * Features:
 * - Performance modes
 * - Grid settings
 * - Snap settings
 * - Visual feedback options
 * - Auto-save settings
 * - Theme preferences
 */

const EditorSettingsPanel = ({ isOpen, onClose }) => {
  const {
    performanceMode,
    setPerformanceMode,
    showGrid,
    setShowGrid,
    showGuides,
    setShowGuides,
    snapToGrid,
    setSnapToGrid
  } = useEditor();
  
  const [gridSize, setGridSize] = useState(20);
  const [autoSaveInterval, setAutoSaveInterval] = useState(5);
  const [showSnapDistance, setShowSnapDistance] = useState(true);
  const [highlightOnHover, setHighlightOnHover] = useState(true);
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <>
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        />
        
        {/* Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          className="fixed right-6 top-1/2 -translate-y-1/2 w-full max-w-md max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Settings className="w-5 h-5" />
                Editor Settings
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Settings */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Performance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Performance
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Performance Mode
                  </label>
                  <select
                    value={performanceMode}
                    onChange={(e) => setPerformanceMode(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="minimal">Minimal - Fastest, least effects</option>
                    <option value="smooth">Smooth - Balanced performance</option>
                    <option value="rich">Rich - All effects enabled</option>
                    <option value="adaptive">Adaptive - Auto-adjust</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {performanceMode === 'minimal' && 'Best for low-end devices'}
                    {performanceMode === 'smooth' && 'Recommended for most users'}
                    {performanceMode === 'rich' && 'Best visual experience'}
                    {performanceMode === 'adaptive' && 'Automatically adjusts based on device'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Grid & Guides */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Grid className="w-4 h-4 text-blue-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Grid & Guides
                </h3>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Grid
                  </span>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Guides
                  </span>
                  <input
                    type="checkbox"
                    checked={showGuides}
                    onChange={(e) => setShowGuides(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Snap to Grid
                  </span>
                  <input
                    type="checkbox"
                    checked={snapToGrid}
                    onChange={(e) => setSnapToGrid(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grid Size: {gridSize}px
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="50"
                    step="5"
                    value={gridSize}
                    onChange={(e) => setGridSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            
            {/* Visual Feedback */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Eye className="w-4 h-4 text-green-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Visual Feedback
                </h3>
              </div>
              
              <div className="space-y-3">
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Highlight on Hover
                  </span>
                  <input
                    type="checkbox"
                    checked={highlightOnHover}
                    onChange={(e) => setHighlightOnHover(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
                
                <label className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Show Snap Distance
                  </span>
                  <input
                    type="checkbox"
                    checked={showSnapDistance}
                    onChange={(e) => setShowSnapDistance(e.target.checked)}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                </label>
              </div>
            </div>
            
            {/* Auto-Save */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Save className="w-4 h-4 text-orange-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Auto-Save
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto-Save Interval: {autoSaveInterval} seconds
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="5"
                    value={autoSaveInterval}
                    onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {autoSaveInterval === 0 ? 'Auto-save disabled' : `Saves every ${autoSaveInterval} seconds`}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Appearance */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Palette className="w-4 h-4 text-pink-500" />
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Appearance
                </h3>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Editor Theme
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="auto">Auto (System)</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium"
            >
              Done
            </button>
          </div>
        </motion.div>
      </>
    </AnimatePresence>
  );
};

export default EditorSettingsPanel;
