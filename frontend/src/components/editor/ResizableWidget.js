import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

/**
 * ResizableWidget - Allows widgets to be resized via drag handles
 * 
 * Features:
 * - 8 resize handles (4 corners + 4 edges)
 * - Live dimension tooltip
 * - Min/max constraints
 * - Snap to grid
 * - Aspect ratio lock (optional)
 * - Syncs with AVE properties
 */
const ResizableWidget = ({
  children,
  widgetId,
  isEditorActive = false,
  isSelected = false,
  minWidth = 200,
  maxWidth = 1200,
  minHeight = 100,
  maxHeight = 800,
  snapToGrid = 0,
  maintainAspectRatio = false,
  onResize,
  className = '',
}) => {
  const containerRef = useRef(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dimensions, setDimensions] = useState({ width: 'auto', height: 'auto' });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [startDimensions, setStartDimensions] = useState({ width: 0, height: 0 });
  const [showTooltip, setShowTooltip] = useState(false);

  // Get initial dimensions
  useEffect(() => {
    if (containerRef.current && dimensions.width === 'auto') {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, [dimensions.width]);

  const snapToGridValue = useCallback((value) => {
    if (snapToGrid > 0) {
      return Math.round(value / snapToGrid) * snapToGrid;
    }
    return Math.round(value);
  }, [snapToGrid]);

  const handleResizeStart = useCallback((e, handle) => {
    if (!isEditorActive || !isSelected) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const rect = containerRef.current.getBoundingClientRect();
    
    setIsResizing(true);
    setResizeHandle(handle);
    setStartPos({ x: e.clientX, y: e.clientY });
    setStartDimensions({ width: rect.width, height: rect.height });
    setShowTooltip(true);
  }, [isEditorActive, isSelected]);

  const handleResizeMove = useCallback((e) => {
    if (!isResizing || !resizeHandle) return;

    const deltaX = e.clientX - startPos.x;
    const deltaY = e.clientY - startPos.y;

    let newWidth = startDimensions.width;
    let newHeight = startDimensions.height;

    // Calculate new dimensions based on handle
    switch (resizeHandle) {
      case 'top-left':
        newWidth = startDimensions.width - deltaX;
        newHeight = startDimensions.height - deltaY;
        break;
      case 'top':
        newHeight = startDimensions.height - deltaY;
        break;
      case 'top-right':
        newWidth = startDimensions.width + deltaX;
        newHeight = startDimensions.height - deltaY;
        break;
      case 'right':
        newWidth = startDimensions.width + deltaX;
        break;
      case 'bottom-right':
        newWidth = startDimensions.width + deltaX;
        newHeight = startDimensions.height + deltaY;
        break;
      case 'bottom':
        newHeight = startDimensions.height + deltaY;
        break;
      case 'bottom-left':
        newWidth = startDimensions.width - deltaX;
        newHeight = startDimensions.height + deltaY;
        break;
      case 'left':
        newWidth = startDimensions.width - deltaX;
        break;
      default:
        break;
    }

    // Maintain aspect ratio if enabled
    if (maintainAspectRatio) {
      const aspectRatio = startDimensions.width / startDimensions.height;
      if (resizeHandle.includes('left') || resizeHandle.includes('right')) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }

    // Apply constraints
    newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
    newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

    // Snap to grid
    newWidth = snapToGridValue(newWidth);
    newHeight = snapToGridValue(newHeight);

    setDimensions({ width: newWidth, height: newHeight });
  }, [isResizing, resizeHandle, startPos, startDimensions, minWidth, maxWidth, minHeight, maxHeight, snapToGridValue, maintainAspectRatio]);

  const handleResizeEnd = useCallback(() => {
    if (!isResizing) return;

    setIsResizing(false);
    setResizeHandle(null);
    setShowTooltip(false);

    // Notify parent of resize
    if (onResize && dimensions.width !== 'auto') {
      onResize(dimensions.width, dimensions.height);
    }
  }, [isResizing, dimensions, onResize]);

  // Add event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResizeMove);
      window.addEventListener('mouseup', handleResizeEnd);
      
      return () => {
        window.removeEventListener('mousemove', handleResizeMove);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResizeMove, handleResizeEnd]);

  const ResizeHandle = ({ position, cursor }) => {
    if (!isEditorActive || !isSelected) return null;

    const handleClasses = {
      'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2',
      'top': 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2',
      'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2',
      'right': 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2',
      'bottom-right': 'bottom-0 right-0 translate-x-1/2 translate-y-1/2',
      'bottom': 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2',
      'bottom-left': 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2',
      'left': 'top-1/2 left-0 -translate-x-1/2 -translate-y-1/2',
    };

    return (
      <motion.div
        className={`absolute w-3 h-3 bg-primary-500 border-2 border-white rounded-full shadow-lg z-50 ${handleClasses[position]}`}
        style={{ cursor }}
        onMouseDown={(e) => handleResizeStart(e, position)}
        whileHover={{ scale: 1.3 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      />
    );
  };

  return (
    <div
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        width: dimensions.width !== 'auto' ? `${dimensions.width}px` : 'auto',
        height: dimensions.height !== 'auto' ? `${dimensions.height}px` : 'auto',
      }}
    >
      {children}

      {/* Resize Handles */}
      {isEditorActive && isSelected && (
        <>
          {/* Corner Handles */}
          <ResizeHandle position="top-left" cursor="nwse-resize" />
          <ResizeHandle position="top-right" cursor="nesw-resize" />
          <ResizeHandle position="bottom-right" cursor="nwse-resize" />
          <ResizeHandle position="bottom-left" cursor="nesw-resize" />

          {/* Edge Handles */}
          <ResizeHandle position="top" cursor="ns-resize" />
          <ResizeHandle position="right" cursor="ew-resize" />
          <ResizeHandle position="bottom" cursor="ns-resize" />
          <ResizeHandle position="left" cursor="ew-resize" />
        </>
      )}

      {/* Dimension Tooltip */}
      {showTooltip && isResizing && dimensions.width !== 'auto' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full mb-2 px-3 py-1.5 bg-gray-900 text-white text-xs font-mono rounded shadow-lg z-50 whitespace-nowrap"
        >
          {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
        </motion.div>
      )}

      {/* Resizing Overlay */}
      {isResizing && (
        <div className="absolute inset-0 bg-primary-500/10 border-2 border-primary-500 rounded pointer-events-none z-40" />
      )}
    </div>
  );
};

export default ResizableWidget;
