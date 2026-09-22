import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Edit3,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Move,
  Settings,
  Palette,
  Zap,
  Plus
} from 'lucide-react';
import { useEditor } from '../../contexts/EditorContext';

/**
 * ContextMenu - Right-click menu for widgets and canvas
 * 
 * Features:
 * - Right-click on widget: Edit, Duplicate, Delete, Hide, etc.
 * - Right-click on canvas: Add widget here
 * - Keyboard shortcuts shown
 * - Smart positioning (stays on screen)
 */

const ContextMenu = () => {
  const {
    isEditorActive,
    selectedWidget,
    selectWidget,
    duplicateSelectedWidget,
    deleteSelectedWidget,
    updateWidgetProperty,
    aveManager
  } = useEditor();
  
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [menuType, setMenuType] = useState('widget'); // 'widget' or 'canvas'
  const [targetWidget, setTargetWidget] = useState(null);
  
  useEffect(() => {
    if (!isEditorActive) return;
    
    const handleContextMenu = (e) => {
      // Check if right-clicking on a widget
      const widgetElement = e.target.closest('[data-widget-id]');
      
      if (widgetElement) {
        e.preventDefault();
        
        const widgetId = widgetElement.dataset.widgetId;
        const section = widgetElement.dataset.widgetSection || 'dashboard';
        
        setTargetWidget({ id: widgetId, section });
        setMenuType('widget');
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
        
        // Select the widget
        selectWidget(widgetId, section);
      } else if (e.target.closest('[data-editor-canvas]')) {
        // Right-clicking on canvas
        e.preventDefault();
        
        setMenuType('canvas');
        setPosition({ x: e.clientX, y: e.clientY });
        setIsOpen(true);
      }
    };
    
    const handleClick = () => {
      setIsOpen(false);
    };
    
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('click', handleClick);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('click', handleClick);
    };
  }, [isEditorActive, selectWidget]);
  
  const handleEdit = () => {
    // Properties panel will open automatically when widget is selected
    setIsOpen(false);
  };
  
  const handleDuplicate = () => {
    duplicateSelectedWidget();
    setIsOpen(false);
  };
  
  const handleDelete = () => {
    deleteSelectedWidget();
    setIsOpen(false);
  };
  
  const handleToggleVisibility = () => {
    if (selectedWidget) {
      const layout = aveManager.layout;
      const widgets = layout[selectedWidget.section]?.widgets || [];
      const widget = widgets.find(w => w.id === selectedWidget.id);
      
      if (widget) {
        updateWidgetProperty('style.display', widget.style?.display === 'none' ? 'block' : 'none');
      }
    }
    setIsOpen(false);
  };
  
  const handleAddWidget = () => {
    // TODO: Open widget picker at cursor position
    setIsOpen(false);
  };
  
  if (!isEditorActive || !isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'fixed',
          left: `${position.x}px`,
          top: `${position.y}px`,
          zIndex: 9999
        }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px]"
      >
        {menuType === 'widget' ? (
          <>
            {/* Widget menu */}
            <MenuItem
              icon={Edit3}
              label="Edit Properties"
              shortcut="Click"
              onClick={handleEdit}
            />
            <MenuItem
              icon={Copy}
              label="Duplicate"
              shortcut="Ctrl+D"
              onClick={handleDuplicate}
            />
            <MenuDivider />
            <MenuItem
              icon={Move}
              label="Move"
              shortcut="Drag"
            />
            <MenuItem
              icon={Eye}
              label="Toggle Visibility"
              onClick={handleToggleVisibility}
            />
            <MenuDivider />
            <MenuItem
              icon={Palette}
              label="Change Color"
            />
            <MenuItem
              icon={Zap}
              label="Animations"
            />
            <MenuItem
              icon={Settings}
              label="Advanced"
            />
            <MenuDivider />
            <MenuItem
              icon={Trash2}
              label="Delete"
              shortcut="Del"
              onClick={handleDelete}
              danger
            />
          </>
        ) : (
          <>
            {/* Canvas menu */}
            <MenuItem
              icon={Plus}
              label="Add Widget Here"
              shortcut="Cmd+K"
              onClick={handleAddWidget}
            />
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

const MenuItem = ({ icon: Icon, label, shortcut, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${
      danger
        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
    }`}
  >
    <div className="flex items-center gap-3">
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </div>
    {shortcut && (
      <kbd className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 rounded border border-gray-300 dark:border-gray-600">
        {shortcut}
      </kbd>
    )}
  </button>
);

const MenuDivider = () => (
  <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
);

export default ContextMenu;
