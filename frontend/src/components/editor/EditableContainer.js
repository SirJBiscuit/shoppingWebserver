import React from 'react';
import { motion } from 'framer-motion';

/**
 * EditableContainer - Wraps components to make them editable in AVE mode
 * 
 * Shows overlay with selection border when editor is active
 * Handles click to select, hover effects
 */
const EditableContainer = ({
  children,
  isEditorActive,
  componentName,
  onSelect,
  isSelected,
  isHovered,
  className = ''
}) => {
  if (!isEditorActive) {
    // Editor not active - render children normally
    return <>{children}</>;
  }

  return (
    <div
      className={`ave-editable-container ${className}`}
      style={{ position: 'relative' }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={(e) => {
        e.stopPropagation();
      }}
    >
      {/* Overlay */}
      <motion.div
        className="ave-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          border: isSelected ? '2px solid #3b82f6' : isHovered ? '2px dashed #60a5fa' : '2px solid transparent',
          borderRadius: '8px',
          pointerEvents: 'none',
          zIndex: isSelected ? 1000 : 999,
          backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.1)' : isHovered ? 'rgba(96, 165, 250, 0.05)' : 'transparent',
          transition: 'all 0.2s ease'
        }}
      >
        {/* Component label */}
        {(isSelected || isHovered) && (
          <div
            style={{
              position: 'absolute',
              top: '-24px',
              left: '0',
              backgroundColor: isSelected ? '#3b82f6' : '#60a5fa',
              color: 'white',
              padding: '2px 8px',
              borderRadius: '4px 4px 0 0',
              fontSize: '11px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              pointerEvents: 'none'
            }}
          >
            {componentName}
          </div>
        )}
      </motion.div>

      {/* Actual component */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};

export default EditableContainer;
