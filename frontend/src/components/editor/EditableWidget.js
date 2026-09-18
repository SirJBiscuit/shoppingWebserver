import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Move, Copy, Trash2, Settings } from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * EditableWidget - Wrapper for widgets in editor mode
 * 
 * Features:
 * - Click to select
 * - Hover effects
 * - Drag to move
 * - Quick actions on hover
 * - Selection outline
 */

const EditableWidget = ({ 
  widget, 
  section, 
  children,
  onPropertiesClick 
}) => {
  const {
    isEditorActive,
    selectedWidget,
    hoveredWidget,
    selectWidget,
    hoverWidget,
    unhoverWidget,
    startDrag,
    endDrag,
    duplicateSelectedWidget,
    deleteSelectedWidget
  } = useEditor();
  
  const widgetRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  if (!isEditorActive) {
    return children;
  }
  
  const isSelected = selectedWidget?.id === widget.id && selectedWidget?.section === section;
  const isHovered = hoveredWidget?.id === widget.id && hoveredWidget?.section === section;
  
  const handleClick = (e) => {
    e.stopPropagation();
    selectWidget(widget.id, section);
  };
  
  const handleMouseEnter = () => {
    hoverWidget(widget.id, section);
  };
  
  const handleMouseLeave = () => {
    unhoverWidget();
  };
  
  const handleMouseDown = (e) => {
    if (e.target.closest('.widget-action-button')) {
      return; // Don't start drag if clicking action button
    }
    
    e.stopPropagation();
    
    const rect = widgetRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    
    setIsDragging(true);
    startDrag(widget.id, section, e);
    selectWidget(widget.id, section);
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging) return;
    
    // TODO: Update widget position
    // This will be implemented with proper positioning logic
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      endDrag();
    }
  };
  
  const handleDuplicate = (e) => {
    e.stopPropagation();
    selectWidget(widget.id, section);
    duplicateSelectedWidget();
  };
  
  const handleDelete = (e) => {
    e.stopPropagation();
    selectWidget(widget.id, section);
    deleteSelectedWidget();
  };
  
  const handleProperties = (e) => {
    e.stopPropagation();
    selectWidget(widget.id, section);
    onPropertiesClick?.(widget, section);
  };
  
  return (
    <motion.div
      ref={widgetRef}
      className={`relative group ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      whileHover={!isDragging ? { scale: 1.02 } : {}}
      transition={{ duration: 0.15 }}
    >
      {/* Selection outline */}
      {isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 border-2 border-purple-500 rounded-lg pointer-events-none z-10"
        >
          {/* Corner handles */}
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-500 rounded-full" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-purple-500 rounded-full" />
          <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-500 rounded-full" />
          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full" />
        </motion.div>
      )}
      
      {/* Hover outline */}
      {isHovered && !isSelected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 border-2 border-indigo-400 border-dashed rounded-lg pointer-events-none z-10"
        />
      )}
      
      {/* Quick actions (show on hover or select) */}
      {(isHovered || isSelected) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-10 left-0 flex items-center gap-1 bg-gray-900 rounded-lg shadow-xl p-1 z-20"
        >
          {/* Move handle */}
          <button
            className="widget-action-button p-1.5 hover:bg-gray-800 rounded transition-colors cursor-grab"
            title="Drag to move"
          >
            <Move className="w-4 h-4 text-white" />
          </button>
          
          {/* Duplicate */}
          <button
            onClick={handleDuplicate}
            className="widget-action-button p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-4 h-4 text-white" />
          </button>
          
          {/* Properties */}
          <button
            onClick={handleProperties}
            className="widget-action-button p-1.5 hover:bg-gray-800 rounded transition-colors"
            title="Properties"
          >
            <Settings className="w-4 h-4 text-white" />
          </button>
          
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="widget-action-button p-1.5 hover:bg-red-600 rounded transition-colors"
            title="Delete (Del)"
          >
            <Trash2 className="w-4 h-4 text-white" />
          </button>
          
          {/* Widget type label */}
          <div className="px-2 py-1 bg-gray-800 rounded text-xs text-white font-medium ml-1">
            {widget.type}
          </div>
        </motion.div>
      )}
      
      {/* Widget content */}
      <div className={isDragging ? 'opacity-50' : ''}>
        {children}
      </div>
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-purple-500/20 rounded-lg pointer-events-none z-10" />
      )}
    </motion.div>
  );
};

export default EditableWidget;
