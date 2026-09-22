import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  History,
  Clock,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  RotateCw,
  Camera,
  Trash2,
  X
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * HistoryTimeline - Visual history panel with undo/redo
 * 
 * Features:
 * - Timeline view of all changes
 * - Jump to any point in history
 * - Create snapshots (bookmarks)
 * - Visual diff preview
 * - Keyboard navigation
 */

const HistoryTimeline = () => {
  const { isEditorActive, aveManager } = useEditor();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  
  const { history, currentIndex, canUndo, canRedo } = aveManager;
  
  const handleJumpTo = (index) => {
    const diff = index - currentIndex;
    
    if (diff > 0) {
      // Redo multiple times
      for (let i = 0; i < diff; i++) {
        aveManager.redo();
      }
    } else if (diff < 0) {
      // Undo multiple times
      for (let i = 0; i < Math.abs(diff); i++) {
        aveManager.undo();
      }
    }
    
    setSelectedIndex(null);
  };
  
  const handleCreateSnapshot = () => {
    aveManager.createSnapshot(`Snapshot ${Date.now()}`);
  };
  
  const handleDeleteHistory = (index) => {
    // TODO: Implement history deletion
    console.log('Delete history at index:', index);
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };
  
  const getActionIcon = (action) => {
    switch (action?.type) {
      case 'add': return '+';
      case 'update': return '✎';
      case 'delete': return '×';
      case 'move': return '↔';
      default: return '•';
    }
  };
  
  const getActionColor = (action) => {
    switch (action?.type) {
      case 'add': return 'text-green-500';
      case 'update': return 'text-blue-500';
      case 'delete': return 'text-red-500';
      case 'move': return 'text-purple-500';
      default: return 'text-gray-500';
    }
  };
  
  if (!isEditorActive) return null;
  
  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed right-6 bottom-24 z-40 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-xl transition-colors"
        title="History Timeline"
      >
        <History className="w-5 h-5" />
      </button>
      
      {/* Timeline panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: 400, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            className="fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5" />
                  History Timeline
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => aveManager.undo()}
                  disabled={!canUndo}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Undo (Ctrl+Z)"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="text-sm font-medium">Undo</span>
                </button>
                
                <button
                  onClick={() => aveManager.redo()}
                  disabled={!canRedo}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Redo (Ctrl+Y)"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="text-sm font-medium">Redo</span>
                </button>
                
                <button
                  onClick={handleCreateSnapshot}
                  className="p-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  title="Create Snapshot"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No history yet</p>
                  <p className="text-xs mt-1">Make changes to see them here</p>
                </div>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />
                  
                  {/* History items */}
                  <div className="space-y-4">
                    {history.map((item, index) => {
                      const isCurrent = index === currentIndex;
                      const isPast = index < currentIndex;
                      const isFuture = index > currentIndex;
                      const isSnapshot = item.isSnapshot;
                      
                      return (
                        <motion.div
                          key={item.id || index}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="relative pl-14"
                        >
                          {/* Timeline dot */}
                          <div
                            className={`absolute left-4 top-2 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                              isCurrent
                                ? 'bg-purple-500 border-purple-500 text-white'
                                : isPast
                                ? 'bg-blue-500 border-blue-500 text-white'
                                : 'bg-gray-300 dark:bg-gray-600 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {isSnapshot ? (
                              <Bookmark className="w-3 h-3" />
                            ) : (
                              <span className={getActionColor(item.action)}>
                                {getActionIcon(item.action)}
                              </span>
                            )}
                          </div>
                          
                          {/* History card */}
                          <button
                            onClick={() => handleJumpTo(index)}
                            onMouseEnter={() => setSelectedIndex(index)}
                            onMouseLeave={() => setSelectedIndex(null)}
                            className={`w-full text-left p-3 rounded-lg border transition-all ${
                              isCurrent
                                ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                                : selectedIndex === index
                                ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600'
                                : isPast
                                ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-60'
                                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-40'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                  {item.description || item.action?.description || 'Change'}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {formatTimestamp(item.timestamp)}
                                </div>
                              </div>
                              
                              {isCurrent && (
                                <div className="px-2 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                                  Current
                                </div>
                              )}
                            </div>
                            
                            {/* Action details */}
                            {item.action && (
                              <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                                <span className={`font-medium ${getActionColor(item.action)}`}>
                                  {item.action.type?.toUpperCase()}
                                </span>
                                {item.action.widgetType && (
                                  <span className="ml-1">
                                    {item.action.widgetType}
                                  </span>
                                )}
                              </div>
                            )}
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{history.length} changes</span>
                </div>
                <div>
                  Position: {currentIndex + 1}/{history.length || 1}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HistoryTimeline;
