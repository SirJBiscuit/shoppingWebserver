import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAVEManager } from '../hooks/useAVEManager';

/**
 * EditorContext - Global state for AVE Visual Editor
 * 
 * Manages:
 * - Editor mode (on/off)
 * - Selected widget
 * - Drag state
 * - Performance settings
 * - Keyboard shortcuts
 */

const EditorContext = createContext(null);

export const useEditor = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useEditor must be used within EditorProvider');
  }
  return context;
};

export const EditorProvider = ({ children, userId }) => {
  // Editor state
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [hoveredWidget, setHoveredWidget] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState(null);
  
  // Performance settings
  const [performanceMode, setPerformanceMode] = useState('adaptive'); // minimal, smooth, rich, adaptive
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  
  // AVE Manager
  const aveManager = useAVEManager(userId);
  
  // Toggle editor mode
  const toggleEditor = useCallback(() => {
    setIsEditorActive(prev => !prev);
    if (isEditorActive) {
      // Exiting editor mode
      setSelectedWidget(null);
      setHoveredWidget(null);
    }
  }, [isEditorActive]);
  
  // Select widget
  const selectWidget = useCallback((widgetId, section) => {
    if (!isEditorActive) return;
    
    setSelectedWidget({
      id: widgetId,
      section: section // 'dashboard' or 'sidebar'
    });
  }, [isEditorActive]);
  
  // Deselect widget
  const deselectWidget = useCallback(() => {
    setSelectedWidget(null);
  }, []);
  
  // Hover widget
  const hoverWidget = useCallback((widgetId, section) => {
    if (!isEditorActive || isDragging) return;
    
    setHoveredWidget({
      id: widgetId,
      section: section
    });
  }, [isEditorActive, isDragging]);
  
  // Unhover widget
  const unhoverWidget = useCallback(() => {
    setHoveredWidget(null);
  }, []);
  
  // Start dragging
  const startDrag = useCallback((widgetId, section, event) => {
    if (!isEditorActive) return;
    
    setIsDragging(true);
    setDraggedWidget({
      id: widgetId,
      section: section,
      startX: event.clientX,
      startY: event.clientY
    });
    setSelectedWidget({ id: widgetId, section });
  }, [isEditorActive]);
  
  // End dragging
  const endDrag = useCallback(() => {
    setIsDragging(false);
    setDraggedWidget(null);
  }, []);
  
  // Update widget property
  const updateWidgetProperty = useCallback((property, value) => {
    if (!selectedWidget) return;
    
    const updates = {};
    
    // Handle nested properties (e.g., 'style.backgroundColor')
    const keys = property.split('.');
    let current = updates;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    // Update via AVE Manager
    aveManager.updateWidget(
      selectedWidget.section,
      selectedWidget.id,
      updates
    );
  }, [selectedWidget, aveManager]);
  
  // Delete selected widget
  const deleteSelectedWidget = useCallback(() => {
    if (!selectedWidget) return;
    
    aveManager.removeWidget(selectedWidget.section, selectedWidget.id);
    setSelectedWidget(null);
  }, [selectedWidget, aveManager]);
  
  // Duplicate selected widget
  const duplicateSelectedWidget = useCallback(() => {
    if (!selectedWidget) return;
    
    const layout = aveManager.layout;
    const widgets = layout[selectedWidget.section].widgets;
    const widget = widgets.find(w => w.id === selectedWidget.id);
    
    if (widget) {
      const duplicated = {
        ...widget,
        id: `${widget.type}_${Date.now()}`,
        layout: {
          ...widget.layout,
          x: (widget.layout?.x || 0) + 20,
          y: (widget.layout?.y || 0) + 20
        }
      };
      
      aveManager.addWidget(selectedWidget.section, duplicated);
      setSelectedWidget({ id: duplicated.id, section: selectedWidget.section });
    }
  }, [selectedWidget, aveManager]);
  
  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditorActive) return;
    
    const handleKeyDown = (e) => {
      // Ctrl+E or Cmd+E - Toggle editor
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        toggleEditor();
      }
      
      // Escape - Deselect
      if (e.key === 'Escape') {
        deselectWidget();
      }
      
      // Delete or Backspace - Delete selected widget
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWidget) {
        e.preventDefault();
        deleteSelectedWidget();
      }
      
      // Ctrl+D or Cmd+D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedWidget) {
        e.preventDefault();
        duplicateSelectedWidget();
      }
      
      // Ctrl+Z or Cmd+Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        aveManager.undo();
      }
      
      // Ctrl+Y or Cmd+Shift+Z - Redo
      if (((e.ctrlKey || e.metaKey) && e.key === 'y') || 
          ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        aveManager.redo();
      }
      
      // Ctrl+S or Cmd+S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        aveManager.save();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorActive, selectedWidget, toggleEditor, deselectWidget, deleteSelectedWidget, duplicateSelectedWidget, aveManager]);
  
  // Add editor class to body
  useEffect(() => {
    if (isEditorActive) {
      document.body.classList.add('aes-editor-active');
    } else {
      document.body.classList.remove('aes-editor-active');
    }
    
    return () => {
      document.body.classList.remove('aes-editor-active');
    };
  }, [isEditorActive]);
  
  const value = {
    // Editor state
    isEditorActive,
    toggleEditor,
    
    // Selection
    selectedWidget,
    selectWidget,
    deselectWidget,
    
    // Hover
    hoveredWidget,
    hoverWidget,
    unhoverWidget,
    
    // Drag & drop
    isDragging,
    draggedWidget,
    startDrag,
    endDrag,
    
    // Widget operations
    updateWidgetProperty,
    deleteSelectedWidget,
    duplicateSelectedWidget,
    
    // Performance settings
    performanceMode,
    setPerformanceMode,
    showGrid,
    setShowGrid,
    showGuides,
    setShowGuides,
    snapToGrid,
    setSnapToGrid,
    
    // AVE Manager
    aveManager
  };
  
  return (
    <EditorContext.Provider value={value}>
      {children}
    </EditorContext.Provider>
  );
};

export default EditorContext;
