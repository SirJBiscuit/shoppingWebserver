import { useState } from 'react';
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
import HelpModal from './HelpModal';
import EditorSettingsPanel from './EditorSettingsPanel';
import { Portal } from '../../utils/autoPlacement';

/**
 * EditorToolbar - Top toolbar for AVE Visual Editor
 * 
 * Shows when editor is active
 * Contains: Undo, Redo, Save, Settings, Help
 */

const EditorToolbar = () => {
  const {
    isEditorActive,
    toggleEditor,
    aveManager,
    saveLayout,
    showGrid,
    setShowGrid,
    snapToGrid,
    setSnapToGrid,
    performanceMode,
    setPerformanceMode,
    gridSize
  } = useEditor();
  
  const [showHelp, setShowHelp] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  if (!isEditorActive) return null;
  
  const { canUndo, canRedo, isDirty, isSaving } = aveManager;
  
  return (
    <Portal><AnimatePresence>
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
                type="button"
                onClick={() => aveManager.undo()}
                disabled={!canUndo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white hover:bg-white/25 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" /> Undo
              </button>
              
              {/* Redo */}
              <button
                type="button"
                onClick={() => aveManager.redo()}
                disabled={!canRedo}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white hover:bg-white/25 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" /> Redo
              </button>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Save */}
              <button
                type="button"
                onClick={saveLayout}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                title="Save (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Grid toggle */}
              <button
                type="button"
                onClick={() => setShowGrid(!showGrid)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                  showGrid
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
                title="Toggle Grid"
              >
                <Grid className="w-3.5 h-3.5" /> Grid
              </button>
              
              {/* Snap to grid toggle */}
              <button
                type="button"
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                  snapToGrid
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/15 text-white/80 hover:bg-white/25'
                }`}
                title="Snap to Grid"
              >
                <Maximize2 className="w-3.5 h-3.5" /> Snap
              </button>
              
              {/* Performance mode */}
              <select
                value={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.value)}
                className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-semibold border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/40 cursor-pointer hover:bg-white/25 transition-colors"
                style={{ colorScheme: 'dark' }}
                title="Performance Mode"
              >
                <option value="minimal" className="bg-gray-800 text-white">Minimal</option>
                <option value="smooth" className="bg-gray-800 text-white">Smooth</option>
                <option value="rich" className="bg-gray-800 text-white">Rich</option>
                <option value="adaptive" className="bg-gray-800 text-white">Adaptive</option>
              </select>
              
              <div className="w-px h-6 bg-white/20" />
              
              {/* Help */}
              <button
                type="button"
                onClick={() => setShowHelp(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/15 text-white hover:bg-white/25 hover:scale-105 active:scale-95 transition-all"
                title="Help (Press ?)"
              >
                <HelpCircle className="w-3.5 h-3.5" /> Help
              </button>
              
              {/* Settings */}
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all hover:scale-105 active:scale-95 ${
                  showSettings
                    ? 'bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-md ring-1 ring-white/40'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
            
            {/* Right: Exit button */}
            <button
              type="button"
              onClick={toggleEditor}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-md hover:scale-105 active:scale-95 transition-all"
              title="Exit Editor (Ctrl+E)"
            >
              <X className="w-3.5 h-3.5" />
              Exit Editor
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Page grid overlay -- makes the grid toggle visible. */}
      {showGrid && (
        <div
          className="fixed inset-0 z-30 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgba(99,102,241,0.12) 1px, transparent 1px),' +
              'linear-gradient(to bottom, rgba(99,102,241,0.12) 1px, transparent 1px)',
            backgroundSize: gridSize + 'px ' + gridSize + 'px'
          }}
        />
      )}

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

      {/* Settings Panel */}
      <EditorSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </AnimatePresence></Portal>
  );
};

export default EditorToolbar;
