import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';
import { WIDGET_TYPES } from '../../utils/widgetConfig';

/**
 * CommandPalette - Quick search and add widgets (Cmd+K)
 * 
 * Features:
 * - Press Cmd+K or Ctrl+K to open
 * - Search for widgets
 * - Arrow keys to navigate
 * - Enter to add widget
 * - Escape to close
 */

const CommandPalette = () => {
  const { isEditorActive, aesManager } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  
  // Get all available widgets
  const allWidgets = Object.values(WIDGET_TYPES);
  
  // Filter widgets based on search
  const filteredWidgets = searchQuery
    ? allWidgets.filter(widget =>
        widget.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allWidgets;
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditorActive) return;
    
    const handleKeyDown = (e) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setSearchQuery('');
        setSelectedIndex(0);
      }
      
      // Escape to close
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
      
      // Arrow keys to navigate
      if (isOpen) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredWidgets.length - 1 ? prev + 1 : 0
          );
        }
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredWidgets.length - 1
          );
        }
        
        // Enter to add widget
        if (e.key === 'Enter' && filteredWidgets.length > 0) {
          e.preventDefault();
          handleAddWidget(filteredWidgets[selectedIndex]);
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorActive, isOpen, filteredWidgets, selectedIndex]);
  
  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);
  
  const handleAddWidget = (widgetType, section = 'dashboard') => {
    const newWidget = {
      id: `${widgetType}_${Date.now()}`,
      type: widgetType,
      name: widgetType.replace(/_/g, ' '),
      content: {},
      style: {},
      layout: {}
    };
    
    aesManager.addWidget(section, newWidget);
    setIsOpen(false);
    setSearchQuery('');
  };
  
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
          
          {/* Command palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          >
            {/* Search input */}
            <div className="relative border-b border-gray-200 dark:border-gray-700">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search widgets... (type to filter)"
                className="w-full pl-12 pr-4 py-4 text-lg bg-transparent focus:outline-none text-gray-900 dark:text-white placeholder-gray-400"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-xs text-gray-400">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  ↑↓
                </kbd>
                <span>navigate</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  ↵
                </kbd>
                <span>add</span>
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
                  esc
                </kbd>
                <span>close</span>
              </div>
            </div>
            
            {/* Results */}
            <div className="max-h-96 overflow-y-auto">
              {filteredWidgets.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Search className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No widgets found</p>
                  <p className="text-xs mt-1">Try a different search term</p>
                </div>
              ) : (
                <div className="p-2">
                  {filteredWidgets.map((widgetType, index) => (
                    <button
                      key={widgetType}
                      onClick={() => handleAddWidget(widgetType)}
                      onMouseEnter={() => setSelectedIndex(index)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-left transition-colors ${
                        index === selectedIndex
                          ? 'bg-purple-100 dark:bg-purple-900/30'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          index === selectedIndex
                            ? 'bg-purple-500'
                            : 'bg-gradient-to-br from-purple-400 to-indigo-500'
                        }`}>
                          <Command className="w-5 h-5 text-white" />
                        </div>
                        
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {widgetType.replace(/_/g, ' ')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Add {widgetType.replace(/_/g, ' ')} widget
                          </div>
                        </div>
                      </div>
                      
                      {index === selectedIndex && (
                        <ArrowRight className="w-5 h-5 text-purple-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Command className="w-3 h-3" />
                  <span>Command Palette</span>
                </div>
                <div>
                  {filteredWidgets.length} widget{filteredWidgets.length !== 1 ? 's' : ''} available
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
