import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  X,
  Undo,
  Redo,
  Save,
  Settings,
  HelpCircle,
  Grid,
  Maximize2
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * EditorToolbar - Top toolbar for AES Visual Editor
 * 
 * Shows when editor is active
 * Contains: Undo, Redo, Save, Settings, Help
 */

const EditorToolbar = () => {
  const {
    isEditorActive,
    toggleEditor,
    aesManager,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    performanceMode,
    setPerformanceMode
  } = useEditor();
  
  if (!isEditorActive) return null;
  
  const { canUndo, canRedo, isDirty, isSaving } = aesManager;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-purple-600 to-indigo-600 dark:from-purple-800 dark:to-indigo-800 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Mode indicator */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg">
                <Edit3 className="w-4 h-4 text-white" />
                <span className="text-sm font-semibold text-white">
                  Editor Mode
                </span>
              </div>
              
              {isDirty && (
                <div className="flex items-center gap-1 text-xs text-white/80">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                  Unsaved changes
                </div>
              )}
            </div>
            
            {/* Center: Main actions */}
            <div className="flex items-center gap-2">
              {/* Undo */}
              <button
                onClick={() => aesManager.undo()}
                disabled={!canUndo}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-5 h-5 text-white" />
              </button>
              
              {/* Redo */}
              <button
                onClick={() => aesManager.redo()}
                disabled={!canRedo}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-5 h-5 text-white" />
              </button>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Save */}
              <button
                onClick={() => aesManager.save()}
                disabled={!isDirty || isSaving}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Save (Ctrl+S)"
              >
                <Save className="w-4 h-4 text-white" />
                <span className="text-sm font-medium text-white">
                  {isSaving ? 'Saving...' : 'Save'}
                </span>
              </button>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Grid toggle */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded-lg transition-colors ${
                  showGrid 
                    ? 'bg-white/30 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white/70'
                }`}
                title="Toggle Grid"
              >
                <Grid className="w-5 h-5" />
              </button>
              
              {/* Snap to grid toggle */}
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`p-2 rounded-lg transition-colors ${
                  snapToGrid 
                    ? 'bg-white/30 text-white' 
                    : 'bg-white/10 hover:bg-white/20 text-white/70'
                }`}
                title="Snap to Grid"
              >
                <Maximize2 className="w-5 h-5" />
              </button>
              
              {/* Performance mode */}
              <select
                value={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/10 text-white text-sm border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/30"
                title="Performance Mode"
              >
                <option value="minimal">Minimal</option>
                <option value="smooth">Smooth</option>
                <option value="rich">Rich</option>
                <option value="adaptive">Adaptive</option>
              </select>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Help */}
              <button
                onClick={() => {/* TODO: Show keyboard shortcuts */}}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Help (Press ?)"
              >
                <HelpCircle className="w-5 h-5 text-white" />
              </button>
              
              {/* Settings */}
              <button
                onClick={() => {/* TODO: Show settings panel */}}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Right: Exit button */}
            <button
              onClick={toggleEditor}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 transition-colors"
              title="Exit Editor (Ctrl+E)"
            >
              <X className="w-4 h-4 text-white" />
              <span className="text-sm font-medium text-white">
                Exit Editor
              </span>
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default EditorToolbar;
