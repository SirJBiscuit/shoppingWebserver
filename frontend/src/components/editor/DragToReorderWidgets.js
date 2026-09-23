import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical } from 'lucide-react';

/**
 * DragToReorderWidgets - Drag widgets to reorder them in layout
 * 
 * Features:
 * - Visual drag handle
 * - Placeholder while dragging
 * - Smooth animations
 * - Keyboard support (Alt+Up/Down)
 * - Auto-scroll when near edges
 * - Works with any list of widgets
 */
const DragToReorderWidgets = ({
  children,
  widgets = [],
  onReorder,
  isEditorActive = false,
  className = '',
  itemClassName = '',
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleDragStart = useCallback((e, index) => {
    if (!isEditorActive) return;
    
    setDraggedIndex(index);
    setIsDragging(true);
    
    // Set drag data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.currentTarget);
    
    // Add dragging class after a brief delay to avoid flickering
    setTimeout(() => {
      e.currentTarget.classList.add('dragging');
    }, 0);
  }, [isEditorActive]);

  const handleDragOver = useCallback((e, index) => {
    if (!isDragging || draggedIndex === null) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (index !== dragOverIndex) {
      setDragOverIndex(index);
    }
  }, [isDragging, draggedIndex, dragOverIndex]);

  const handleDragEnd = useCallback((e) => {
    e.currentTarget.classList.remove('dragging');
    
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      // Reorder the widgets
      const newWidgets = [...widgets];
      const [removed] = newWidgets.splice(draggedIndex, 1);
      newWidgets.splice(dragOverIndex, 0, removed);
      
      if (onReorder) {
        onReorder(newWidgets);
      }
    }
    
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsDragging(false);
  }, [draggedIndex, dragOverIndex, widgets, onReorder]);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleKeyDown = useCallback((e, index) => {
    if (!isEditorActive) return;
    
    // Alt+Up to move up
    if (e.altKey && e.key === 'ArrowUp' && index > 0) {
      e.preventDefault();
      const newWidgets = [...widgets];
      [newWidgets[index - 1], newWidgets[index]] = [newWidgets[index], newWidgets[index - 1]];
      if (onReorder) {
        onReorder(newWidgets);
      }
    }
    
    // Alt+Down to move down
    if (e.altKey && e.key === 'ArrowDown' && index < widgets.length - 1) {
      e.preventDefault();
      const newWidgets = [...widgets];
      [newWidgets[index], newWidgets[index + 1]] = [newWidgets[index + 1], newWidgets[index]];
      if (onReorder) {
        onReorder(newWidgets);
      }
    }
  }, [isEditorActive, widgets, onReorder]);

  return (
    <div ref={containerRef} className={className}>
      <AnimatePresence>
        {widgets.map((widget, index) => {
          const isDraggedItem = draggedIndex === index;
          const isDropTarget = dragOverIndex === index && draggedIndex !== index;
          
          return (
            <motion.div
              key={widget.id || index}
              layout
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: isDraggedItem ? 0.5 : 1,
                y: 0,
                scale: isDraggedItem ? 0.95 : 1,
              }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ 
                layout: { duration: 0.2 },
                opacity: { duration: 0.15 },
              }}
              className={`relative ${itemClassName}`}
              draggable={isEditorActive}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              onDragLeave={handleDragLeave}
              onKeyDown={(e) => handleKeyDown(e, index)}
              tabIndex={isEditorActive ? 0 : -1}
            >
              {/* Drag Handle */}
              {isEditorActive && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-full pr-2 cursor-grab active:cursor-grabbing z-10"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <div className="p-1 bg-primary-500 text-white rounded shadow-lg">
                    <GripVertical className="w-4 h-4" />
                  </div>
                </motion.div>
              )}

              {/* Drop Indicator */}
              {isDropTarget && (
                <motion.div
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: 1, scaleY: 1 }}
                  exit={{ opacity: 0, scaleY: 0 }}
                  className="absolute inset-x-0 h-1 bg-primary-500 rounded-full shadow-lg z-20"
                  style={{
                    top: draggedIndex < dragOverIndex ? '100%' : '-2px',
                  }}
                />
              )}

              {/* Widget Content */}
              {typeof children === 'function' ? children(widget, index) : children}

              {/* Dragging Overlay */}
              {isDraggedItem && (
                <div className="absolute inset-0 bg-primary-500/10 border-2 border-primary-500 border-dashed rounded pointer-events-none z-10" />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Instructions Tooltip */}
      {isEditorActive && widgets.length > 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-800 dark:text-blue-200"
        >
          <p className="font-medium mb-1">💡 Reorder Widgets</p>
          <ul className="text-xs space-y-1 ml-4 list-disc">
            <li>Drag the grip handle to reorder</li>
            <li>Or use <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">Alt</kbd> + <kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">↑</kbd>/<kbd className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-xs">↓</kbd></li>
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default DragToReorderWidgets;
