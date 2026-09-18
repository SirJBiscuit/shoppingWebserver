import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, Search, X } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * KeyboardShortcutsPanel - Cheat sheet for all keyboard shortcuts
 * 
 * Features:
 * - Press ? to open
 * - Searchable shortcuts
 * - Categorized by function
 * - Visual key representations
 * - Customizable (future)
 */

const SHORTCUTS = {
  editor: {
    name: 'Editor',
    shortcuts: [
      { keys: ['Ctrl', 'E'], description: 'Toggle editor mode' },
      { keys: ['Esc'], description: 'Deselect widget / Close panels' },
      { keys: ['Ctrl', 'S'], description: 'Save layout' },
      { keys: ['?'], description: 'Show keyboard shortcuts' }
    ]
  },
  widgets: {
    name: 'Widgets',
    shortcuts: [
      { keys: ['Ctrl', 'K'], description: 'Open command palette' },
      { keys: ['Click'], description: 'Select widget' },
      { keys: ['Ctrl', 'D'], description: 'Duplicate selected widget' },
      { keys: ['Del'], description: 'Delete selected widget' },
      { keys: ['Backspace'], description: 'Delete selected widget' },
      { keys: ['Right Click'], description: 'Context menu' }
    ]
  },
  history: {
    name: 'History',
    shortcuts: [
      { keys: ['Ctrl', 'Z'], description: 'Undo' },
      { keys: ['Ctrl', 'Y'], description: 'Redo' },
      { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo (alternative)' }
    ]
  },
  navigation: {
    name: 'Navigation',
    shortcuts: [
      { keys: ['↑', '↓'], description: 'Navigate in command palette' },
      { keys: ['Enter'], description: 'Confirm selection' },
      { keys: ['Tab'], description: 'Next field' },
      { keys: ['Shift', 'Tab'], description: 'Previous field' }
    ]
  },
  view: {
    name: 'View',
    shortcuts: [
      { keys: ['G'], description: 'Toggle grid' },
      { keys: ['Ctrl', 'G'], description: 'Toggle snap to grid' },
      { keys: ['H'], description: 'Toggle guides' },
      { keys: ['Ctrl', 'H'], description: 'Toggle history timeline' }
    ]
  }
};

const KeyboardShortcutsPanel = () => {
  const { isEditorActive } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    if (!isEditorActive) return;
    
    const handleKeyDown = (e) => {
      // Press ? to open
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        // Only if not typing in an input
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          e.preventDefault();
          setIsOpen(true);
        }
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorActive, isOpen]);
  
  // Filter shortcuts based on search
  const filteredShortcuts = Object.entries(SHORTCUTS).reduce((acc, [key, category]) => {
    const filtered = category.shortcuts.filter(shortcut =>
      shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shortcut.keys.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    if (filtered.length > 0) {
      acc[key] = { ...category, shortcuts: filtered };
    }
    
    return acc;
  }, {});
  
  if (!isEditorActive) return null;
  
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />
          
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[80vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  <Command className="w-6 h-6" />
                  Keyboard Shortcuts
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shortcuts..."
                  className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Shortcuts list */}
            <div className="flex-1 overflow-y-auto p-6">
              {Object.keys(filteredShortcuts).length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No shortcuts found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Object.entries(filteredShortcuts).map(([key, category]) => (
                    <div key={key} className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide">
                        {category.name}
                      </h3>
                      
                      <div className="space-y-2">
                        {category.shortcuts.map((shortcut, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              {shortcut.description}
                            </span>
                            
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {shortcut.keys.map((key, i) => (
                                <React.Fragment key={i}>
                                  <kbd className="px-2 py-1 text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                                    {key}
                                  </kbd>
                                  {i < shortcut.keys.length - 1 && (
                                    <span className="text-gray-400 text-xs">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3" />
                  <span>Press <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">?</kbd> to toggle this panel</span>
                </div>
                <div>
                  {Object.values(filteredShortcuts).reduce((acc, cat) => acc + cat.shortcuts.length, 0)} shortcuts
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcutsPanel;
